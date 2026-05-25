import { randomUUID } from "node:crypto";

import { and, asc, db, desc, eq, gt, isNotNull, isNull, lt, or, sql } from "@repo/database";
import {
  formFieldsTable,
  formsTable,
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
  SubmitFormInput,
  UpdateFormInput,
} from "./model";
import { createUniqueSlug } from "./slug";
import { notifyCreatorOfFormDeletion, notifyCreatorOfSubmission } from "./notifications";
import { expiresAtFromRetention, expiresAtFromRetentionChange, isFormExpired } from "./retention";
import { validateSubmissionAnswers } from "./validation";

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
        },
      };
    case "rating":
      return {
        ...base,
        type: "rating",
        config: { maxRating: config?.maxRating ?? 5 },
      };
    case "checkbox": {
      const options = config?.options?.map((option) => option.trim()).filter(Boolean);
      if (options?.length) {
        return {
          ...base,
          type: "checkbox",
          config: { options },
        };
      }
      if (config?.checkboxLabel) {
        return {
          ...base,
          type: "checkbox",
          config: { checkboxLabel: config.checkboxLabel },
        };
      }
      return { ...base, type: "checkbox" };
    }
    case "text":
    case "email":
    case "number":
    case "date":
      return {
        ...base,
        type: row.type,
        config: config?.placeholder ? { placeholder: config.placeholder } : undefined,
      };
    default:
      return { ...base, type: "text" };
  }
}

function defaultConfig(type: FormFieldInput["type"]): FieldConfigJson | undefined {
  if (type === "select") return { options: ["Option 1", "Option 2"] };
  if (type === "rating") return { maxRating: 5 };
  if (type === "checkbox") return { options: ["Option 1"] };
  return undefined;
}

class FormService {
  private normalizeInputFields(fields: FormFieldInput[], preserveIds = false): FormField[] {
    return fields.map((field) => ({
      ...field,
      id: preserveIds && isUuid(field.id) ? field.id : randomUUID(),
      config: field.config ?? defaultConfig(field.type),
    })) as FormField[];
  }

  private async loadFields(formId: string) {
    const rows = await db
      .select()
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, formId))
      .orderBy(asc(formFieldsTable.sortOrder));

    return rows.map(mapFieldRow);
  }

  private async insertFields(formId: string, fields: FormField[]) {
    if (fields.length === 0) return;

    await db.insert(formFieldsTable).values(
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
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  private assertFormAvailable(row: typeof formsTable.$inferSelect) {
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
      .where(and(isNotNull(formsTable.expiresAt), lt(formsTable.expiresAt, now)))
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
      .where(and(isNotNull(formsTable.expiresAt), lt(formsTable.expiresAt, now)));

    return expiredRows.length;
  }

  /** Run from cron/keep-warm — never during form list reads. */
  async purgeExpiredFormsJob() {
    return this.purgeExpiredForms();
  }

  async createForm(userId: string, input: CreateFormInput) {
    const fields = this.normalizeInputFields(input.fields);
    const slug = await createUniqueSlug(input.title);

    const [created] = await db
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

    if (!created) throw new FormError("BAD_REQUEST", "Unable to create form");

    await this.insertFields(created.id, fields);

    return this.mapForm(created, 0);
  }

  async updateForm(userId: string, input: UpdateFormInput) {
    const existing = await this.getOwnedForm(userId, input.formId);
    const fields = input.fields ? this.normalizeInputFields(input.fields, true) : undefined;

    let slug = existing.slug;
    if (input.slug !== undefined) {
      slug = await createUniqueSlug(input.slug.trim(), input.formId);
    }

    let expiresAt = existing.expiresAt;
    if (input.retention !== undefined) {
      expiresAt = expiresAtFromRetentionChange(input.retention);
    }

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

      return [row];
    });

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(submissionsTable)
      .where(eq(submissionsTable.formId, input.formId));

    return this.mapForm(updated, countRow?.count ?? 0);
  }

  async deleteForm(userId: string, formId: string) {
    const row = await this.getOwnedForm(userId, formId);

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

    await db.delete(formsTable).where(eq(formsTable.id, formId));
    return { success: true as const };
  }

  async getFormById(userId: string, formId: string) {
    const row = await this.getOwnedForm(userId, formId);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(submissionsTable)
      .where(eq(submissionsTable.formId, formId));

    return this.mapForm(row, countRow?.count ?? 0);
  }

  async listForms(userId: string, pagination: PaginationInput = { limit: 20 }) {
    const limit = pagination.limit ?? 20;

    const conditions = [eq(formsTable.userId, userId)];
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

  async recordView(formId: string) {
    const [row] = await db.select().from(formsTable).where(eq(formsTable.id, formId)).limit(1);
    if (!row) throw new FormError("NOT_FOUND", "Form not found");
    this.assertFormAvailable(row);

    await db
      .update(formsTable)
      .set({ viewCount: (row.viewCount ?? 0) + 1 })
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
    const [formRow] = await db.select().from(formsTable).where(eq(formsTable.id, formId)).limit(1);
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
    const [row] = await db.select().from(formsTable).where(eq(formsTable.id, formId)).limit(1);
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
      .where(sql`lower(${formsTable.slug}) = ${normalizedSlug}`)
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

  private async getOwnedForm(userId: string, formId: string) {
    const [row] = await db.select().from(formsTable).where(eq(formsTable.id, formId)).limit(1);
    if (!row) throw new FormError("NOT_FOUND", "Form not found");
    if (row.userId !== userId) throw new FormError("FORBIDDEN", "Not allowed");
    return row;
  }

  async submitForm(input: SubmitFormInput, submitterUserId?: string | null) {
    if (input.website.length > 0) {
      throw new FormError("BAD_REQUEST", "Submission rejected");
    }

    const [formRow] = await db.select().from(formsTable).where(eq(formsTable.id, input.formId)).limit(1);
    if (!formRow) throw new FormError("NOT_FOUND", "Form not found");
    this.assertFormAvailable(formRow);

    if (formRow.requireAuthentication && !submitterUserId) {
      throw new FormError("FORBIDDEN", "Sign in to ChaiForm to submit this form.");
    }

    const form = await this.getPublicForm(input.formId);
    let validated: Record<string, string>;

    try {
      validated = validateSubmissionAnswers(form.fields, input.answers);
    } catch (error) {
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

    const [created] = await db.transaction(async (tx) => {
      const [submission] = await tx
        .insert(submissionsTable)
        .values({
          formId: form.id,
          submitterUserId: submitterUserId ?? null,
          respondentKey: input.respondentKey ?? null,
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
      formTitle: form.title,
      answers: created.answers as SubmissionAnswerJson[],
      submittedAt: toIso(created.submittedAt),
    };
  }

  async listSubmissions(userId: string, formId: string, pagination: PaginationInput = { limit: 20 }) {
    await this.getOwnedForm(userId, formId);
    const limit = pagination.limit ?? 20;

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
      formTitle: row.formTitle,
      answers: row.submission.answers as SubmissionAnswerJson[],
      submittedAt: toIso(row.submission.submittedAt),
    }));

    return {
      items,
      nextCursor: hasMore ? (pageRows[pageRows.length - 1]?.submission.id ?? null) : null,
    };
  }

  async getSubmission(userId: string, submissionId: string) {
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
    if (row.ownerId !== userId) throw new FormError("FORBIDDEN", "Not allowed");

    return {
      id: row.submission.id,
      formId: row.submission.formId,
      formTitle: row.formTitle,
      answers: row.submission.answers as SubmissionAnswerJson[],
      submittedAt: toIso(row.submission.submittedAt),
    };
  }
}

export default FormService;
