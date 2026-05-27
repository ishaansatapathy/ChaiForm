import { and, db, desc, eq, gte, isNull, sql } from "@repo/database";
import {
  formFieldsTable,
  formsTable,
  submissionResponsesTable,
  submissionsTable,
  type FormVisibility,
  type SubmissionAnswerJson,
} from "@repo/database/schema";

import { FormError } from "../form";
import type { FormField } from "../form/model";
import { getVisibleFields } from "../form/visibility";
import type { UserRole } from "../auth/roles";
import { cacheDelete, cacheGet, cacheSet } from "../cache/kv-store";

function completionRate(submissions: number, views: number) {
  if (views <= 0) return submissions > 0 ? 100 : 0;
  return Number(((submissions / views) * 100).toFixed(1));
}

function percentage(part: number, total: number) {
  if (total <= 0) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

function mapFieldForVisibility(row: typeof formFieldsTable.$inferSelect): FormField {
  const config = row.config as FormField["config"];
  const base = {
    id: row.id,
    label: row.label,
    required: row.required,
  };

  if (
    row.type === "text" ||
    row.type === "textarea" ||
    row.type === "email" ||
    row.type === "number" ||
    row.type === "date" ||
    row.type === "select" ||
    row.type === "rating" ||
    row.type === "checkbox"
  ) {
    return { ...base, type: row.type, config } as FormField;
  }

  return { ...base, type: "text", config } as FormField;
}

const SUMMARY_CACHE_TTL_MS = 30_000;

export async function invalidateAnalyticsSummaryCache(userId: string, formId?: string) {
  await cacheDelete(`analytics:summary:${userId}:all`);
  if (formId) {
    await cacheDelete(`analytics:summary:${userId}:${formId}`);
  }
}
type SummaryResult = {
  totalForms: number;
  totalSubmissions: number;
  submissionsLast7Days: number;
  averageCompletionRate: number;
  selectedForm: {
    id: string;
    title: string;
    submissionCount: number;
    viewCount: number;
    completionRate: number;
    fieldCount: number;
    visibility: FormVisibility;
  } | null;
};

class AnalyticsService {
  private async assertFormOwnership(userId: string, formId: string, actorRole: UserRole = "user") {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(and(eq(formsTable.id, formId), isNull(formsTable.deletedAt)))
      .limit(1);
    if (!form) throw new FormError("NOT_FOUND", "Form not found");
    if (form.userId !== userId && actorRole !== "admin") {
      throw new FormError("FORBIDDEN", "Not allowed");
    }
    return form;
  }

  async getSummary(userId: string, formId?: string, actorRole: UserRole = "user") {
    const cacheKey = `analytics:summary:${userId}:${formId ?? "all"}`;
    const cachedRaw = await cacheGet(cacheKey);
    if (cachedRaw) {
      try {
        return JSON.parse(cachedRaw) as SummaryResult;
      } catch {
        // Ignore corrupt cache entries.
      }
    }

    const notDeleted = isNull(formsTable.deletedAt);

    const [formsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formsTable)
      .where(and(eq(formsTable.userId, userId), notDeleted));

    const [submissionsCount] = await db
      .select({ count: sql<number>`count(${submissionsTable.id})::int` })
      .from(submissionsTable)
      .innerJoin(formsTable, eq(formsTable.id, submissionsTable.formId))
      .where(and(eq(formsTable.userId, userId), notDeleted));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentCount] = await db
      .select({ count: sql<number>`count(${submissionsTable.id})::int` })
      .from(submissionsTable)
      .innerJoin(formsTable, eq(formsTable.id, submissionsTable.formId))
      .where(and(eq(formsTable.userId, userId), notDeleted, gte(submissionsTable.submittedAt, sevenDaysAgo)));

    const userForms = await db
      .select({ viewCount: formsTable.viewCount })
      .from(formsTable)
      .where(and(eq(formsTable.userId, userId), notDeleted));

    const totalViews = userForms.reduce((sum, form) => sum + (form.viewCount ?? 0), 0);
    const totalSubs = submissionsCount?.count ?? 0;

    let selectedForm = null;

    if (formId) {
      const form = await this.assertFormOwnership(userId, formId, actorRole);

      const [submissionCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(submissionsTable)
        .where(eq(submissionsTable.formId, formId));

      const [fieldCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(formFieldsTable)
        .where(eq(formFieldsTable.formId, formId));

      const subs = submissionCount?.count ?? 0;
      const views = form.viewCount ?? 0;

      selectedForm = {
        id: form.id,
        title: form.title,
        submissionCount: subs,
        viewCount: views,
        completionRate: completionRate(subs, views),
        fieldCount: fieldCount?.count ?? 0,
        visibility: form.visibility,
      };
    }

    const result = {
      totalForms: formsCount?.count ?? 0,
      totalSubmissions: submissionsCount?.count ?? 0,
      submissionsLast7Days: recentCount?.count ?? 0,
      averageCompletionRate: completionRate(totalSubs, totalViews),
      selectedForm,
    };

    await cacheSet(cacheKey, JSON.stringify(result), SUMMARY_CACHE_TTL_MS);
    return result;
  }

  async getFormFunnel(userId: string, formId: string, actorRole: UserRole = "user") {
    const form = await this.assertFormOwnership(userId, formId, actorRole);

    const [submissionCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(submissionsTable)
      .where(eq(submissionsTable.formId, formId));

    const views = form.viewCount ?? 0;
    const submissions = submissionCount?.count ?? 0;
    const rate = completionRate(submissions, views);
    const dropOffRate = views > 0 ? Number((100 - rate).toFixed(1)) : 0;

    return {
      formId: form.id,
      title: form.title,
      views,
      submissions,
      completionRate: rate,
      dropOffRate,
      stages: [
        { label: "Form views", count: views },
        { label: "Completed submissions", count: submissions },
      ],
    };
  }

  async getSubmissionsOverTime(
    userId: string,
    formId: string,
    days: number,
    actorRole: UserRole = "user",
  ) {
    await this.assertFormOwnership(userId, formId, actorRole);

    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setHours(0, 0, 0, 0);

    const rows = await db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${submissionsTable.submittedAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(submissionsTable)
      .where(and(eq(submissionsTable.formId, formId), gte(submissionsTable.submittedAt, since)))
      .groupBy(sql`date_trunc('day', ${submissionsTable.submittedAt})`)
      .orderBy(sql`date_trunc('day', ${submissionsTable.submittedAt})`);

    const countByDate = new Map(rows.map((row) => [row.date, row.count]));
    const points: { date: string; count: number }[] = [];

    for (let i = 0; i < days; i += 1) {
      const date = new Date(since);
      date.setDate(since.getDate() + i);
      const key = date.toISOString().slice(0, 10);
      points.push({ date: key, count: countByDate.get(key) ?? 0 });
    }

    return { points };
  }

  private async loadFieldValues(formId: string, fieldId: string) {
    const normalized = await db
      .select({ value: submissionResponsesTable.value })
      .from(submissionResponsesTable)
      .innerJoin(submissionsTable, eq(submissionsTable.id, submissionResponsesTable.submissionId))
      .where(and(eq(submissionsTable.formId, formId), eq(submissionResponsesTable.fieldId, fieldId)))
      .orderBy(desc(submissionsTable.submittedAt))
      .limit(1000);

    if (normalized.length > 0) {
      return normalized.map((row) => row.value).filter(Boolean);
    }

    const legacyRows = await db
      .select({ answers: submissionsTable.answers })
      .from(submissionsTable)
      .where(eq(submissionsTable.formId, formId))
      .orderBy(desc(submissionsTable.submittedAt))
      .limit(1000);

    const values: string[] = [];
    for (const row of legacyRows) {
      const answers = row.answers as SubmissionAnswerJson[];
      const match = answers.find((answer) => answer.fieldId === fieldId);
      if (match?.value) values.push(match.value);
    }

    return values;
  }

  async getFieldBreakdown(
    userId: string,
    formId: string,
    fieldId: string,
    actorRole: UserRole = "user",
  ) {
    await this.assertFormOwnership(userId, formId, actorRole);

    const [field] = await db
      .select()
      .from(formFieldsTable)
      .where(and(eq(formFieldsTable.formId, formId), eq(formFieldsTable.id, fieldId)))
      .limit(1);

    if (!field) throw new FormError("NOT_FOUND", "Field not found");

    const values = await this.loadFieldValues(formId, fieldId);
    const fieldRows = await db
      .select()
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, formId))
      .orderBy(formFieldsTable.sortOrder);
    const formFields = fieldRows.map(mapFieldForVisibility);
    const submissions = await db
      .select({ answers: submissionsTable.answers })
      .from(submissionsTable)
      .where(eq(submissionsTable.formId, formId))
      .limit(5000);

    let eligibleResponses = 0;
    for (const submission of submissions) {
      const answers = submission.answers as SubmissionAnswerJson[];
      const answerMap = Object.fromEntries(
        answers.map((answer) => [answer.fieldId, answer.value ?? ""]),
      ) as Record<string, string>;
      const visibleIds = new Set(getVisibleFields(formFields, answerMap).map((item) => item.id));
      if (visibleIds.has(fieldId)) eligibleResponses += 1;
    }

    const optionCountsMap = new Map<string, number>();

    for (const value of values) {
      optionCountsMap.set(value, (optionCountsMap.get(value) ?? 0) + 1);
    }

    let averageRating: number | null = null;
    if (field.type === "rating" && values.length > 0) {
      const total = values.reduce((sum, value) => sum + Number(value), 0);
      averageRating = Number((total / values.length).toFixed(2));
    }

    return {
      fieldId: field.id,
      label: field.label,
      type: field.type,
      totalResponses: values.length,
      eligibleResponses,
      skippedResponses: Math.max(eligibleResponses - values.length, 0),
      answerRate: percentage(values.length, eligibleResponses),
      dropOffRate: percentage(Math.max(eligibleResponses - values.length, 0), eligibleResponses),
      averageRating,
      optionCounts: Array.from(optionCountsMap.entries())
        .map(([option, count]) => ({ option, count }))
        .sort((a, b) => b.count - a.count),
      recentValues: values.slice(0, 8),
    };
  }

  async getAllFieldStats(userId: string, formId: string, actorRole: UserRole = "user") {
    await this.assertFormOwnership(userId, formId, actorRole);

    const fields = await db
      .select()
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, formId))
      .orderBy(formFieldsTable.sortOrder);

    const stats = await Promise.all(
      fields.map((field) => this.getFieldBreakdown(userId, formId, field.id, actorRole)),
    );

    return { fields: stats };
  }

  async getTopForms(
    userId: string,
    options: { limit: number; visibility?: "public" | "unlisted" | "draft" },
  ) {
    const filters = [eq(formsTable.userId, userId), isNull(formsTable.deletedAt)];
    if (options.visibility) {
      filters.push(eq(formsTable.visibility, options.visibility));
    }

    const rows = await db
      .select({
        id: formsTable.id,
        title: formsTable.title,
        visibility: formsTable.visibility,
        viewCount: formsTable.viewCount,
        submissionCount: sql<number>`count(${submissionsTable.id})::int`,
      })
      .from(formsTable)
      .leftJoin(submissionsTable, eq(submissionsTable.formId, formsTable.id))
      .where(and(...filters))
      .groupBy(formsTable.id)
      .orderBy(
        sql`count(${submissionsTable.id}) desc`,
        sql`coalesce(${formsTable.viewCount}, 0) desc`,
        sql`${formsTable.createdAt} desc`,
      )
      .limit(options.limit);

    return {
      items: rows.map((row) => {
        const submissions = row.submissionCount ?? 0;
        const views = row.viewCount ?? 0;
        return {
          id: row.id,
          title: row.title,
          visibility: row.visibility,
          submissionCount: submissions,
          viewCount: views,
          completionRate: completionRate(submissions, views),
        };
      }),
    };
  }
}

export default AnalyticsService;
