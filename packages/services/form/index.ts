import { randomUUID } from "node:crypto";

import { ZodError } from "zod";

import { and, asc, db, desc, eq, gt, gte, isNotNull, isNull, lt, or, sql } from "@repo/database";
import {
  formFieldsTable,
  formVersionsTable,
  formsTable,
  submissionAuditEventsTable,
  submissionResponsesTable,
  submissionsTable,
} from "@repo/database/schema";
import type { FieldConfigJson } from "@repo/database/schema";
import type { SubmissionAnswerJson } from "@repo/database/schema";

import type {
  CreateFormInput,
  FormField,
  FormFieldInput,
  PaginationInput,
  SubmissionPaginationInput,
  SubmitFormInput,
  UpdateFormInput,
} from "./model";
import { parseCreateFormInput, parseSubmitFormInput, parseUpdateFormInput } from "./model";
import { createUniqueSlug } from "./slug";
import { notifyCreatorOfFormDeletion, notifyCreatorOfSubmission } from "./notifications";
import { expiresAtFromRetention, expiresAtFromRetentionChange, isFormExpired } from "./retention";
import { sanitizeLabel } from "./sanitize";
import { fieldsChanged, fieldsToVersionSnapshot } from "./versioning";
import { validateSubmissionAnswers } from "./validation";
import { cacheDelete } from "../cache/kv-store";
import { isTurnstileMandatoryInProduction, isTurnstileRequired, verifyTurnstileToken } from "../turnstile";
import type { UserRole } from "../auth/roles";

type FormDbClient = Pick<typeof db, "insert" | "select" | "update">;
const MAX_EXPORT_SUBMISSIONS = 10000;

export class FormError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "FORBIDDEN" | "BAD_REQUEST",
    message: string,
  ) {
    super(message);
    this.name = "FormError";
  }
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function completionRate(submissions: number, views: number) {
  if (views <= 0) return submissions > 0 ? 100 : 0;
  return Number(((submissions / views) * 100).toFixed(1));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseSubmissionDateFilter(value: string | undefined, endExclusive = false) {
  if (!value?.trim()) return undefined;

  const trimmed = value.trim();
  const hasTime = trimmed.includes("T");
  const date = new Date(hasTime ? trimmed : `${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new FormError("BAD_REQUEST", "Invalid submission date filter");
  }

  if (endExclusive && !hasTime) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date;
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function normalizeValidationConfig(validation: FieldConfigJson["validation"] | undefined) {
  if (!validation) return undefined;
  const normalized = {
    minLength: validation.minLength,
    maxLength: validation.maxLength,
    minValue: validation.minValue,
    maxValue: validation.maxValue,
  };
  return Object.values(normalized).some((value) => value !== undefined) ? normalized : undefined;
}

function mapFieldRow(row: typeof formFieldsTable.$inferSelect): FormField {
  const base = {
    id: row.id,
    label: row.label,
    required: row.required,
  };
  const config = (row.config as FieldConfigJson | null) ?? undefined;

  switch (row.type) {
    case "select":
      return {
        ...base,
        type: "select",
        config: {
          options: config?.options?.length ? config.options : ["Option 1"],
          placeholder: config?.placeholder,
          ...(config?.showWhen ? { showWhen: config.showWhen } : {}),
        },
      };
    case "rating":
      return {
        ...base,
        type: "rating",
        config: {
          maxRating: config?.maxRating ?? 5,
          ...(config?.lowLabel ? { lowLabel: config.lowLabel } : {}),
          ...(config?.highLabel ? { highLabel: config.highLabel } : {}),
          ...(config?.showWhen ? { showWhen: config.showWhen } : {}),
        },
      };
    case "checkbox": {
      const options = config?.options?.map((option) => option.trim()).filter(Boolean);
      if (options?.length) {
        return {
          ...base,
          type: "checkbox",
          config: {
            options,
            ...(config?.showWhen ? { showWhen: config.showWhen } : {}),
          },
        };
      }
      if (config?.checkboxLabel) {
        return {
          ...base,
          type: "checkbox",
          config: {
            checkboxLabel: config.checkboxLabel,
            ...(config?.showWhen ? { showWhen: config.showWhen } : {}),
          },
        };
      }
      return {
        ...base,
        type: "checkbox",
        config: config?.showWhen ? { showWhen: config.showWhen } : undefined,
      };
    }
    case "text":
    case "textarea":
    case "email":
    case "number":
    case "date": {
      const fieldConfig =
        config?.placeholder || config?.validation || config?.showWhen
          ? {
              ...(config.placeholder ? { placeholder: config.placeholder } : {}),
              ...(config.validation ? { validation: normalizeValidationConfig(config.validation) } : {}),
              ...(config.showWhen ? { showWhen: config.showWhen } : {}),
            }
          : undefined;
      return {
        ...base,
        type: row.type,
        config: fieldConfig,
      };
    }
    case "description":
      return {
        ...base,
        required: false,
        type: "description",
        config: {
          style: config?.style === "heading" ? "heading" : "body",
          ...(config?.showWhen ? { showWhen: config.showWhen } : {}),
        },
      };
    default:
      return { ...base, type: "text" };
  }
}

function defaultConfig(type: FormFieldInput["type"]): FieldConfigJson | undefined {
  if (type === "select") return { options: ["Option 1", "Option 2"] };
  if (type === "rating") return { maxRating: 5 };
  if (type === "checkbox") return { options: ["Option 1"] };
  if (type === "description") return { style: "body" };
  return undefined;
}

class FormService {
  private assertValidationConfigs(fields: FormField[]) {
    fields.forEach((field) => {
      const validation =
        field.config && "validation" in field.config ? field.config.validation : undefined;
      if (!validation) return;

      if (
        validation.minLength !== undefined &&
        validation.maxLength !== undefined &&
        validation.minLength > validation.maxLength
      ) {
        throw new FormError("BAD_REQUEST", `"${field.label}" minimum length cannot exceed maximum length`);
      }

      if (
        validation.minValue !== undefined &&
        validation.maxValue !== undefined &&
        validation.minValue > validation.maxValue
      ) {
        throw new FormError("BAD_REQUEST", `"${field.label}" minimum value cannot exceed maximum value`);
      }

    });
  }

  private assertVisibilityRules(fields: FormField[]) {
    const fieldIndex = new Map(fields.map((field, index) => [field.id, index]));

    fields.forEach((field, index) => {
      const rule = field.config?.showWhen;
      if (!rule) return;

      const dependencyIndex = fieldIndex.get(rule.fieldId);
      if (dependencyIndex === undefined) {
        throw new FormError("BAD_REQUEST", `"${field.label}" has an invalid conditional field`);
      }
      if (dependencyIndex >= index) {
        throw new FormError(
          "BAD_REQUEST",
          `"${field.label}" can only depend on a question that appears before it`,
        );
      }

      const dependency = fields[dependencyIndex];
      const expected = rule.value.trim();
      if (!expected) {
        throw new FormError("BAD_REQUEST", `"${field.label}" conditional value is required`);
      }

      if (dependency?.type === "select") {
        const options = dependency.config?.options ?? [];
        if (!options.includes(expected)) {
          throw new FormError("BAD_REQUEST", `"${field.label}" conditional value must match an option`);
        }
      }

      if (dependency?.type === "rating") {
        const maxRating = dependency.config?.maxRating ?? 5;
        const rating = Number(expected);
        if (!Number.isInteger(rating) || rating < 1 || rating > maxRating) {
          throw new FormError("BAD_REQUEST", `"${field.label}" conditional rating is out of range`);
        }
      }

      if (dependency?.type === "checkbox") {
        const options = dependency.config?.options?.map((option) => option.trim()).filter(Boolean) ?? [];
        const allowed = options.length > 0 ? options : ["true", "false"];
        if (!allowed.includes(expected)) {
          throw new FormError("BAD_REQUEST", `"${field.label}" conditional checkbox value is invalid`);
        }
      }
    });
  }

  private normalizeInputFields(fields: FormFieldInput[], preserveIds = false): FormField[] {
    if (preserveIds) {
      const uuids = fields.map((field) => field.id).filter(isUuid);
      if (new Set(uuids).size !== uuids.length) {
        throw new FormError("BAD_REQUEST", "Duplicate field IDs are not allowed");
      }
    }

    const normalizedIds = new Map(
      fields.map((field) => [field.id, preserveIds && isUuid(field.id) ? field.id : randomUUID()]),
    );

    const normalized = fields.map((field) => {
      const config = field.config ?? defaultConfig(field.type);
      const showWhen = config?.showWhen;
      const normalizedConfig = config
        ? {
            ...config,
            ...("validation" in config && config.validation
              ? { validation: normalizeValidationConfig(config.validation) }
              : {}),
            ...(showWhen
              ? {
                  showWhen: {
                    ...showWhen,
                    fieldId: normalizedIds.get(showWhen.fieldId) ?? showWhen.fieldId,
                    value: showWhen.value.trim(),
                  },
                }
              : {}),
          }
        : undefined;

      return {
        ...field,
        id: normalizedIds.get(field.id) ?? randomUUID(),
        label: sanitizeLabel(field.label),
        config: normalizedConfig,
      };
    }) as FormField[];

    this.assertVisibilityRules(normalized);
    this.assertValidationConfigs(normalized);
    return normalized;
  }

  private async getSchemaVersion(currentVersionId: string | null | undefined) {
    if (!currentVersionId) return null;
    const [version] = await db
      .select({ versionNumber: formVersionsTable.versionNumber })
      .from(formVersionsTable)
      .where(eq(formVersionsTable.id, currentVersionId))
      .limit(1);
    return version?.versionNumber ?? null;
  }

  private async bumpFormVersion(formId: string, fields: FormField[], tx?: FormDbClient) {
    const client = tx ?? db;
    const [latest] = await client
      .select({ versionNumber: formVersionsTable.versionNumber })
      .from(formVersionsTable)
      .where(eq(formVersionsTable.formId, formId))
      .orderBy(desc(formVersionsTable.versionNumber))
      .limit(1);

    const versionNumber = (latest?.versionNumber ?? 0) + 1;
    const [version] = await client
      .insert(formVersionsTable)
      .values({
        formId,
        versionNumber,
        schemaSnapshot: fieldsToVersionSnapshot(fields),
      })
      .returning();

    if (!version) throw new FormError("BAD_REQUEST", "Unable to save form version");

    await client
      .update(formsTable)
      .set({ currentVersionId: version.id })
      .where(eq(formsTable.id, formId));

    return version;
  }

  private async loadFields(formId: string) {
    const rows = await db
      .select()
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, formId))
      .orderBy(asc(formFieldsTable.sortOrder));

    return rows.map(mapFieldRow);
  }

  private async insertFields(formId: string, fields: FormField[], tx?: FormDbClient) {
    if (fields.length === 0) return;

    const client = tx ?? db;
    await client.insert(formFieldsTable).values(
      fields.map((field, index) => ({
        id: field.id,
        formId,
        label: field.label,
        type: field.type,
        required: field.required,
        sortOrder: index,
        config: field.config ?? {},
      })),
    );
  }

  private async mapForm(
    row: typeof formsTable.$inferSelect,
    submissionCount = 0,
  ) {
    const fields = await this.loadFields(row.id);
    const schemaVersion = await this.getSchemaVersion(row.currentVersionId);

    return {
      id: row.id,
      slug: row.slug ?? null,
      title: row.title,
      description: row.description ?? null,
      visibility: row.visibility,
      theme: row.theme ?? "default",
      fields,
      submissionCount,
      viewCount: row.viewCount ?? 0,
      completionRate: completionRate(submissionCount, row.viewCount ?? 0),
      allowMultipleSubmissions: row.allowMultipleSubmissions ?? true,
      requireAuthentication: row.requireAuthentication ?? false,
      expiresAt: toIso(row.expiresAt),
      schemaVersion,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  private assertFormAvailable(row: typeof formsTable.$inferSelect) {
    if (row.deletedAt) {
      throw new FormError("NOT_FOUND", "Form not found");
    }
    if (row.visibility === "draft") {
      throw new FormError("NOT_FOUND", "Form not available");
    }
    if (isFormExpired(row.expiresAt)) {
      throw new FormError("NOT_FOUND", "This form has expired and is no longer accepting responses.");
    }
  }

  private async purgeExpiredForms() {
    const now = new Date();
    const expiredRows = await db
      .select({
        form: formsTable,
        submissionCount: sql<number>`count(${submissionsTable.id})::int`,
      })
      .from(formsTable)
      .leftJoin(submissionsTable, eq(submissionsTable.formId, formsTable.id))
      .where(and(isNotNull(formsTable.expiresAt), lt(formsTable.expiresAt, now), isNull(formsTable.deletedAt)))
      .groupBy(formsTable.id);

    if (expiredRows.length === 0) return 0;

    for (const row of expiredRows) {
      void notifyCreatorOfFormDeletion({
        ownerUserId: row.form.userId,
        formTitle: row.form.title,
        formId: row.form.id,
        submissionCount: row.submissionCount ?? 0,
        reason: "expired",
        expiredAt: row.form.expiresAt,
      }).catch(() => undefined);
    }

    await db
      .delete(formsTable)
      .where(and(isNotNull(formsTable.expiresAt), lt(formsTable.expiresAt, now), isNull(formsTable.deletedAt)));

    return expiredRows.length;
  }

  /** Run from cron/keep-warm — never during form list reads. */
  async purgeExpiredFormsJob() {
    return this.purgeExpiredForms();
  }

  async createForm(userId: string, input: CreateFormInput) {
    const parsedInput = parseCreateFormInput(input);
    if (!parsedInput.success) {
      throw new FormError("BAD_REQUEST", parsedInput.message);
    }
    input = parsedInput.data;
    const fields = this.normalizeInputFields(input.fields);
    const slug = await createUniqueSlug(input.title);

    const [created] = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(formsTable)
        .values({
          userId,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          visibility: input.visibility,
          theme: input.theme ?? "default",
          slug,
          viewCount: 0,
          expiresAt: expiresAtFromRetention(input.retention ?? "forever"),
          allowMultipleSubmissions: input.allowMultipleSubmissions ?? true,
          requireAuthentication: input.requireAuthentication ?? false,
        })
        .returning();

      if (!row) throw new FormError("BAD_REQUEST", "Unable to create form");

      await this.insertFields(row.id, fields, tx);
      await this.bumpFormVersion(row.id, fields, tx);
      return [row];
    });

    return this.mapForm(created, 0);
  }

  async updateForm(userId: string, input: UpdateFormInput, actorRole: UserRole = "user") {
    const parsedInput = parseUpdateFormInput(input);
    if (!parsedInput.success) {
      throw new FormError("BAD_REQUEST", parsedInput.message);
    }
    input = parsedInput.data;
    const existing = await this.getOwnedForm(userId, input.formId, actorRole);
    const previousFields = await this.loadFields(input.formId);
    const fields = input.fields ? this.normalizeInputFields(input.fields, true) : undefined;

    let slug = existing.slug;
    if (input.slug !== undefined) {
      slug = await createUniqueSlug(input.slug.trim(), input.formId);
    }

    let expiresAt = existing.expiresAt;
    if (input.retention !== undefined) {
      expiresAt = expiresAtFromRetentionChange(input.retention);
    }

    const shouldBumpVersion = fields ? fieldsChanged(previousFields, fields) : false;

    const [updated] = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(formsTable)
        .set({
          title: input.title?.trim() ?? existing.title,
          description: input.description !== undefined ? input.description.trim() || null : existing.description,
          visibility: input.visibility ?? existing.visibility,
          theme: input.theme ?? existing.theme ?? "default",
          slug,
          expiresAt,
          allowMultipleSubmissions:
            input.allowMultipleSubmissions ?? existing.allowMultipleSubmissions ?? true,
          requireAuthentication:
            input.requireAuthentication ?? existing.requireAuthentication ?? false,
          updatedAt: new Date(),
        })
        .where(eq(formsTable.id, input.formId))
        .returning();

      if (!row) throw new FormError("BAD_REQUEST", "Unable to update form");

      if (fields) {
        await tx.delete(formFieldsTable).where(eq(formFieldsTable.formId, input.formId));
        if (fields.length > 0) {
          await tx.insert(formFieldsTable).values(
            fields.map((field, index) => ({
              id: field.id,
              formId: input.formId,
              label: field.label,
              type: field.type,
              required: field.required,
              sortOrder: index,
              config: field.config ?? {},
            })),
          );
        }
      }

      if (fields && shouldBumpVersion) {
        const version = await this.bumpFormVersion(input.formId, fields, tx);
        return [{ ...row, currentVersionId: version.id }];
      }

      return [row];
    });

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(submissionsTable)
      .where(eq(submissionsTable.formId, input.formId));

    return this.mapForm(updated, countRow?.count ?? 0);
  }

  async deleteForm(userId: string, formId: string, actorRole: UserRole = "user") {
    const row = await this.getOwnedForm(userId, formId, actorRole);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(submissionsTable)
      .where(eq(submissionsTable.formId, formId));

    void notifyCreatorOfFormDeletion({
      ownerUserId: row.userId,
      formTitle: row.title,
      formId: row.id,
      submissionCount: countRow?.count ?? 0,
      reason: "manual",
    }).catch(() => undefined);

    await db
      .update(formsTable)
      .set({ deletedAt: new Date() })
      .where(eq(formsTable.id, formId));
    return { success: true as const };
  }

  async getFormById(userId: string, formId: string, actorRole: UserRole = "user") {
    const row = await this.getOwnedForm(userId, formId, actorRole);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(submissionsTable)
      .where(eq(submissionsTable.formId, formId));

    return this.mapForm(row, countRow?.count ?? 0);
  }

  async listForms(userId: string, pagination: PaginationInput = { limit: 20 }) {
    const limit = pagination.limit ?? 20;

    const conditions = [eq(formsTable.userId, userId), isNull(formsTable.deletedAt)];
    if (pagination.cursor) {
      const [cursorRow] = await db
        .select({ createdAt: formsTable.createdAt })
        .from(formsTable)
        .where(eq(formsTable.id, pagination.cursor))
        .limit(1);
      if (cursorRow?.createdAt) {
        conditions.push(lt(formsTable.createdAt, cursorRow.createdAt));
      }
    }

    const rows = await db
      .select({
        form: formsTable,
        submissionCount: sql<number>`count(${submissionsTable.id})::int`,
      })
      .from(formsTable)
      .leftJoin(submissionsTable, eq(submissionsTable.formId, formsTable.id))
      .where(and(...conditions))
      .groupBy(formsTable.id)
      .orderBy(desc(formsTable.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const items = await Promise.all(
      pageRows.map((row) => this.mapForm(row.form, row.submissionCount ?? 0)),
    );

    return {
      items,
      nextCursor: hasMore ? (pageRows[pageRows.length - 1]?.form.id ?? null) : null,
    };
  }

  async recordView(formId: string, viewerKey?: string) {
    const [row] = await db
      .select()
      .from(formsTable)
      .where(and(eq(formsTable.id, formId), isNull(formsTable.deletedAt)))
      .limit(1);
    if (!row) throw new FormError("NOT_FOUND", "Form not found");
    this.assertFormAvailable(row);

    // Deduplication: skip incrementing viewCount if this viewer already counted
    // within the last 30 minutes. Uses the viewerKey (a per-session UUID stored
    // in the client) as the fingerprint. Gracefully falls through if no key.
    if (viewerKey) {
      const dedupeKey = `view-seen:${formId}:${viewerKey}`;
      const { cacheGet, cacheSet } = await import("../cache/kv-store");
      const alreadySeen = await cacheGet(dedupeKey);
      if (alreadySeen) {
        return { success: true as const };
      }
      await cacheSet(dedupeKey, "1", 30 * 60 * 1000);
    }

    await db
      .update(formsTable)
      .set({ viewCount: sql`${formsTable.viewCount} + 1` })
      .where(eq(formsTable.id, formId));

    return { success: true as const };
  }

  private async findExistingSubmission(
    formId: string,
    respondentKey: string | undefined,
    emailFieldIds: string[],
    emailValue: string | undefined,
    submitterUserId: string | undefined,
  ) {
    if (submitterUserId) {
      const [byUser] = await db
        .select({ id: submissionsTable.id })
        .from(submissionsTable)
        .where(
          and(eq(submissionsTable.formId, formId), eq(submissionsTable.submitterUserId, submitterUserId)),
        )
        .limit(1);
      if (byUser) return byUser;
    }

    if (respondentKey) {
      const [byKey] = await db
        .select({ id: submissionsTable.id })
        .from(submissionsTable)
        .where(and(eq(submissionsTable.formId, formId), eq(submissionsTable.respondentKey, respondentKey)))
        .limit(1);
      if (byKey) return byKey;
    }

    const normalizedEmail = emailValue?.trim().toLowerCase();
    if (normalizedEmail && emailFieldIds.length > 0) {
      for (const fieldId of emailFieldIds) {
        const [byEmail] = await db
          .select({ id: submissionsTable.id })
          .from(submissionsTable)
          .innerJoin(
            submissionResponsesTable,
            eq(submissionResponsesTable.submissionId, submissionsTable.id),
          )
          .where(
            and(
              eq(submissionsTable.formId, formId),
              eq(submissionResponsesTable.fieldId, fieldId),
              sql`lower(${submissionResponsesTable.value}) = ${normalizedEmail}`,
            ),
          )
          .limit(1);
        if (byEmail) return byEmail;
      }
    }

    return null;
  }

  async hasSubmitted(formId: string, respondentKey: string | undefined, submitterUserId?: string | null) {
    const [formRow] = await db
      .select()
      .from(formsTable)
      .where(and(eq(formsTable.id, formId), isNull(formsTable.deletedAt)))
      .limit(1);
    if (!formRow) throw new FormError("NOT_FOUND", "Form not found");
    if (formRow.allowMultipleSubmissions) {
      return { submitted: false as const };
    }

    const existing = await this.findExistingSubmission(
      formId,
      respondentKey,
      [],
      undefined,
      submitterUserId ?? undefined,
    );
    return { submitted: Boolean(existing) };
  }

  async getPublicForm(formId: string) {
    const [row] = await db
      .select()
      .from(formsTable)
      .where(and(eq(formsTable.id, formId), isNull(formsTable.deletedAt)))
      .limit(1);
    if (!row) throw new FormError("NOT_FOUND", "Form not found");
    this.assertFormAvailable(row);

    const fields = await this.loadFields(row.id);

    return {
      id: row.id,
      slug: row.slug ?? null,
      title: row.title,
      description: row.description ?? null,
      theme: row.theme ?? "default",
      allowMultipleSubmissions: row.allowMultipleSubmissions ?? true,
      requireAuthentication: row.requireAuthentication ?? false,
      fields,
    };
  }

  async getPublicFormBySlug(slug: string) {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) throw new FormError("NOT_FOUND", "Form not found");

    const [row] = await db
      .select()
      .from(formsTable)
      .where(and(sql`lower(${formsTable.slug}) = ${normalizedSlug}`, isNull(formsTable.deletedAt)))
      .limit(1);
    if (!row) throw new FormError("NOT_FOUND", "Form not found");
    this.assertFormAvailable(row);

    const fields = await this.loadFields(row.id);

    return {
      id: row.id,
      slug: row.slug ?? null,
      title: row.title,
      description: row.description ?? null,
      theme: row.theme ?? "default",
      allowMultipleSubmissions: row.allowMultipleSubmissions ?? true,
      requireAuthentication: row.requireAuthentication ?? false,
      fields,
    };
  }

  async listPublicForms(pagination: PaginationInput = { limit: 20 }) {
    const limit = pagination.limit ?? 20;

    const conditions = [
      eq(formsTable.visibility, "public"),
      isNull(formsTable.deletedAt),
      or(isNull(formsTable.expiresAt), gt(formsTable.expiresAt, new Date())),
    ];
    if (pagination.cursor) {
      const [cursorRow] = await db
        .select({ createdAt: formsTable.createdAt })
        .from(formsTable)
        .where(eq(formsTable.id, pagination.cursor))
        .limit(1);
      if (cursorRow?.createdAt) {
        conditions.push(lt(formsTable.createdAt, cursorRow.createdAt));
      }
    }

    const rows = await db
      .select({
        form: formsTable,
        submissionCount: sql<number>`count(${submissionsTable.id})::int`,
      })
      .from(formsTable)
      .leftJoin(submissionsTable, eq(submissionsTable.formId, formsTable.id))
      .where(and(...conditions))
      .groupBy(formsTable.id)
      .orderBy(desc(formsTable.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const items = pageRows.map((row) => ({
      id: row.form.id,
      slug: row.form.slug ?? null,
      title: row.form.title,
      description: row.form.description ?? null,
      theme: row.form.theme ?? "default",
      submissionCount: row.submissionCount ?? 0,
      viewCount: row.form.viewCount ?? 0,
      createdAt: toIso(row.form.createdAt),
    }));

    return {
      items,
      nextCursor: hasMore ? (pageRows[pageRows.length - 1]?.form.id ?? null) : null,
    };
  }

  private async getOwnedForm(userId: string, formId: string, actorRole: UserRole = "user") {
    const [row] = await db
      .select()
      .from(formsTable)
      .where(and(eq(formsTable.id, formId), isNull(formsTable.deletedAt)))
      .limit(1);
    if (!row) throw new FormError("NOT_FOUND", "Form not found");
    if (row.userId !== userId && actorRole !== "admin") {
      throw new FormError("FORBIDDEN", "Not allowed");
    }
    return row;
  }

  private buildSubmissionConditions(formId: string, pagination: SubmissionPaginationInput) {
    const conditions = [eq(submissionsTable.formId, formId)];

    if (pagination.search?.trim()) {
      const pattern = `%${pagination.search.trim()}%`;
      conditions.push(
        sql`exists (
          select 1 from ${submissionResponsesTable} sr
          where sr.submission_id = ${submissionsTable.id}
          and sr.value ilike ${pattern}
        )`,
      );
    }

    const submittedFrom = parseSubmissionDateFilter(pagination.submittedFrom);
    if (submittedFrom) {
      conditions.push(gte(submissionsTable.submittedAt, submittedFrom));
    }

    const submittedTo = parseSubmissionDateFilter(pagination.submittedTo, true);
    if (submittedTo) {
      conditions.push(lt(submissionsTable.submittedAt, submittedTo));
    }

    return conditions;
  }

  /**
   * Submits a form response and persists answers in two complementary stores:
   *
   * 1. **JSONB column** (`submissions.answers`): a denormalized snapshot of all
   *    answers attached directly to the submission row. Used for fast API reads
   *    (e.g. `listSubmissions`, `getSubmission`, CSV export) without an extra
   *    join to `submission_responses`.
   *
   * 2. **Normalized rows** (`submission_responses`): one row per non-empty answer,
   *    indexed on `(field_id, submission_id)`. Used by all analytics queries
   *    (field breakdown, funnel, option counts, `allFieldStats`) which aggregate
   *    across many submissions — a SQL GROUP BY on this table is far cheaper than
   *    unwinding JSONB arrays at query time.
   *
   * The two stores must remain in sync. Never update one without the other.
   */
  async submitForm(input: SubmitFormInput, submitterUserId?: string | null, remoteIp?: string | null) {
    const parsedInput = parseSubmitFormInput(input);
    if (!parsedInput.success) {
      throw new FormError("BAD_REQUEST", parsedInput.message);
    }
    input = parsedInput.data;
    if (input.website.length > 0) {
      throw new FormError("BAD_REQUEST", "Submission rejected");
    }

    if (isTurnstileMandatoryInProduction() && !isTurnstileRequired()) {
      throw new FormError(
        "BAD_REQUEST",
        "CAPTCHA is required in production. Configure TURNSTILE_SECRET_KEY on the API.",
      );
    }

    if (isTurnstileRequired()) {
      if (!input.turnstileToken) {
        throw new FormError("BAD_REQUEST", "Please complete the CAPTCHA check.");
      }
      const captchaOk = await verifyTurnstileToken(input.turnstileToken, remoteIp ?? undefined);
      if (!captchaOk) {
        throw new FormError("BAD_REQUEST", "CAPTCHA verification failed. Please try again.");
      }
    }

    const [formRow] = await db
      .select()
      .from(formsTable)
      .where(and(eq(formsTable.id, input.formId), isNull(formsTable.deletedAt)))
      .limit(1);
    if (!formRow) throw new FormError("NOT_FOUND", "Form not found");
    this.assertFormAvailable(formRow);

    if (formRow.requireAuthentication && !submitterUserId) {
      throw new FormError("FORBIDDEN", "Sign in to ChaiForm to submit this form.");
    }

    const form = await this.getPublicForm(input.formId);

    if (input.idempotencyKey) {
      const [existingByKey] = await db
        .select()
        .from(submissionsTable)
        .where(
          and(
            eq(submissionsTable.formId, input.formId),
            eq(submissionsTable.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1);
      if (existingByKey) {
        return {
          id: existingByKey.id,
          formId: existingByKey.formId,
          formVersionId: existingByKey.formVersionId ?? null,
          formTitle: form.title,
          answers: existingByKey.answers as SubmissionAnswerJson[],
          submittedAt: toIso(existingByKey.submittedAt),
        };
      }
    }

    let validated: Record<string, string>;

    try {
      validated = validateSubmissionAnswers(form.fields, input.answers);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new FormError("BAD_REQUEST", error.issues[0]?.message ?? "Invalid submission");
      }
      throw new FormError("BAD_REQUEST", error instanceof Error ? error.message : "Invalid submission");
    }

    const answers: SubmissionAnswerJson[] = form.fields.map((field) => ({
      fieldId: field.id,
      label: field.label,
      type: field.type,
      value: validated[field.id] ?? "",
    }));

    if (!formRow.allowMultipleSubmissions) {
      if (!formRow.requireAuthentication && (!input.respondentKey || !isUuid(input.respondentKey))) {
        throw new FormError(
          "BAD_REQUEST",
          "This form only accepts one response per person. Refresh the page and try again.",
        );
      }

      const emailFieldIds = form.fields.filter((field) => field.type === "email").map((field) => field.id);
      const emailValue = emailFieldIds
        .map((fieldId) => validated[fieldId])
        .find((value) => (value ?? "").trim().length > 0);

      const existing = await this.findExistingSubmission(
        form.id,
        input.respondentKey,
        emailFieldIds,
        emailValue,
        submitterUserId ?? undefined,
      );

      if (existing) {
        throw new FormError(
          "BAD_REQUEST",
          "You have already submitted this form. Contact the form owner if you need to send another response.",
        );
      }
    }

    let created: typeof submissionsTable.$inferSelect;
    try {
      [created] = await db.transaction(async (tx) => {
        const storesRepeatIdentity = !(formRow.allowMultipleSubmissions ?? true);
        const [submission] = await tx
          .insert(submissionsTable)
          .values({
            formId: form.id,
            formVersionId: formRow.currentVersionId ?? null,
            submitterUserId: storesRepeatIdentity ? (submitterUserId ?? null) : null,
            respondentKey: storesRepeatIdentity ? (input.respondentKey ?? null) : null,
            idempotencyKey: input.idempotencyKey ?? null,
            answers,
          })
          .returning();

        if (!submission) throw new FormError("BAD_REQUEST", "Unable to save submission");

        const responseRows = answers
          .filter((answer) => answer.value.length > 0)
          .map((answer) => ({
            submissionId: submission.id,
            fieldId: answer.fieldId,
            value: answer.value,
          }));

        if (responseRows.length > 0) {
          await tx.insert(submissionResponsesTable).values(responseRows);
        }

        return [submission];
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        if (input.idempotencyKey) {
          const [existing] = await db
            .select()
            .from(submissionsTable)
            .where(
              and(
                eq(submissionsTable.formId, input.formId),
                eq(submissionsTable.idempotencyKey, input.idempotencyKey),
              ),
            )
            .limit(1);
          if (existing) {
            return {
              id: existing.id,
              formId: existing.formId,
              formVersionId: existing.formVersionId ?? null,
              formTitle: form.title,
              answers: existing.answers as SubmissionAnswerJson[],
              submittedAt: toIso(existing.submittedAt),
            };
          }
        }

        throw new FormError(
          "BAD_REQUEST",
          "You have already submitted this form. Contact the form owner if you need to send another response.",
        );
      }
      throw error;
    }

    void Promise.all([
      cacheDelete(`analytics:summary:${formRow.userId}:all`),
      cacheDelete(`analytics:summary:${formRow.userId}:${form.id}`),
    ]).catch(() => undefined);

    void notifyCreatorOfSubmission({
      ownerUserId: formRow.userId,
      formTitle: form.title,
      formSlug: form.slug,
      formId: form.id,
      answers,
    }).catch(() => undefined);

    return {
      id: created.id,
      formId: created.formId,
      formVersionId: created.formVersionId ?? null,
      formTitle: form.title,
      answers: created.answers as SubmissionAnswerJson[],
      submittedAt: toIso(created.submittedAt),
    };
  }

  async listSubmissions(
    userId: string,
    formId: string,
    pagination: SubmissionPaginationInput = { limit: 20 },
    actorRole: UserRole = "user",
  ) {
    await this.getOwnedForm(userId, formId, actorRole);
    const limit = pagination.limit ?? 20;

    const conditions = this.buildSubmissionConditions(formId, pagination);
    if (pagination.cursor) {
      const [cursorRow] = await db
        .select({ submittedAt: submissionsTable.submittedAt })
        .from(submissionsTable)
        .where(eq(submissionsTable.id, pagination.cursor))
        .limit(1);
      if (cursorRow?.submittedAt) {
        conditions.push(lt(submissionsTable.submittedAt, cursorRow.submittedAt));
      }
    }

    const rows = await db
      .select({
        submission: submissionsTable,
        formTitle: formsTable.title,
      })
      .from(submissionsTable)
      .innerJoin(formsTable, eq(formsTable.id, submissionsTable.formId))
      .where(and(...conditions))
      .orderBy(desc(submissionsTable.submittedAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const items = pageRows.map((row) => ({
      id: row.submission.id,
      formId: row.submission.formId,
      formVersionId: row.submission.formVersionId ?? null,
      formTitle: row.formTitle,
      answers: row.submission.answers as SubmissionAnswerJson[],
      submittedAt: toIso(row.submission.submittedAt),
    }));

    return {
      items,
      nextCursor: hasMore ? (pageRows[pageRows.length - 1]?.submission.id ?? null) : null,
    };
  }

  async exportSubmissions(
    userId: string,
    formId: string,
    filters: Omit<SubmissionPaginationInput, "limit" | "cursor"> = {},
    actorRole: UserRole = "user",
  ) {
    const form = await this.getOwnedForm(userId, formId, actorRole);
    const fields = await this.loadFields(formId);
    const conditions = this.buildSubmissionConditions(formId, {
      limit: 100,
      search: filters.search,
      submittedFrom: filters.submittedFrom,
      submittedTo: filters.submittedTo,
    });

    const rows = await db
      .select({ submission: submissionsTable })
      .from(submissionsTable)
      .where(and(...conditions))
      .orderBy(desc(submissionsTable.submittedAt))
      .limit(MAX_EXPORT_SUBMISSIONS);

    return {
      formTitle: form.title,
      fields: fields.map((field) => ({
        id: field.id,
        label: field.label,
        type: field.type,
      })),
      items: rows.map((row) => ({
        id: row.submission.id,
        formId: row.submission.formId,
        formVersionId: row.submission.formVersionId ?? null,
        formTitle: form.title,
        answers: row.submission.answers as SubmissionAnswerJson[],
        submittedAt: toIso(row.submission.submittedAt),
      })),
    };
  }

  async getSubmission(userId: string, submissionId: string, actorRole: UserRole = "user") {
    const [row] = await db
      .select({
        submission: submissionsTable,
        formTitle: formsTable.title,
        ownerId: formsTable.userId,
      })
      .from(submissionsTable)
      .innerJoin(formsTable, eq(formsTable.id, submissionsTable.formId))
      .where(eq(submissionsTable.id, submissionId))
      .limit(1);

    if (!row) throw new FormError("NOT_FOUND", "Submission not found");
    if (row.ownerId !== userId && actorRole !== "admin") {
      throw new FormError("FORBIDDEN", "Not allowed");
    }

    return {
      id: row.submission.id,
      formId: row.submission.formId,
      formVersionId: row.submission.formVersionId ?? null,
      formTitle: row.formTitle,
      answers: row.submission.answers as SubmissionAnswerJson[],
      submittedAt: toIso(row.submission.submittedAt),
    };
  }

  async deleteSubmission(userId: string, submissionId: string, actorRole: UserRole = "user") {
    const [row] = await db
      .select({
        submission: submissionsTable,
        ownerId: formsTable.userId,
      })
      .from(submissionsTable)
      .innerJoin(formsTable, eq(formsTable.id, submissionsTable.formId))
      .where(eq(submissionsTable.id, submissionId))
      .limit(1);

    if (!row) throw new FormError("NOT_FOUND", "Submission not found");
    if (row.ownerId !== userId && actorRole !== "admin") {
      throw new FormError("FORBIDDEN", "Not allowed");
    }

    await db.transaction(async (tx) => {
      await tx.insert(submissionAuditEventsTable).values({
        eventType: "submission.deleted",
        formId: row.submission.formId,
        submissionId: row.submission.id,
        actorUserId: userId,
        snapshot: {
          submissionId: row.submission.id,
          formVersionId: row.submission.formVersionId ?? null,
          submittedAt: toIso(row.submission.submittedAt),
          answers: row.submission.answers as SubmissionAnswerJson[],
        },
      });
      await tx.delete(submissionsTable).where(eq(submissionsTable.id, submissionId));
    });
    return { success: true as const, formId: row.submission.formId };
  }
}

export default FormService;
