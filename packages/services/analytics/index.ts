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

function completionRate(submissions: number, views: number) {
  if (views <= 0) return submissions > 0 ? 100 : 0;
  return Number(((submissions / views) * 100).toFixed(1));
}

const SUMMARY_CACHE_TTL_MS = 30_000;
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
const summaryCache = new Map<string, { expiresAt: number; value: SummaryResult }>();

class AnalyticsService {
  private async assertFormOwnership(userId: string, formId: string) {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(and(eq(formsTable.id, formId), isNull(formsTable.deletedAt)))
      .limit(1);
    if (!form) throw new FormError("NOT_FOUND", "Form not found");
    if (form.userId !== userId) throw new FormError("FORBIDDEN", "Not allowed");
    return form;
  }

  async getSummary(userId: string, formId?: string) {
    const cacheKey = `${userId}:${formId ?? "all"}`;
    const cached = summaryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
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
      const form = await this.assertFormOwnership(userId, formId);

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

    summaryCache.set(cacheKey, { expiresAt: Date.now() + SUMMARY_CACHE_TTL_MS, value: result });
    return result;
  }

  async getSubmissionsOverTime(userId: string, formId: string, days: number) {
    await this.assertFormOwnership(userId, formId);

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

  async getFieldBreakdown(userId: string, formId: string, fieldId: string) {
    await this.assertFormOwnership(userId, formId);

    const [field] = await db
      .select()
      .from(formFieldsTable)
      .where(and(eq(formFieldsTable.formId, formId), eq(formFieldsTable.id, fieldId)))
      .limit(1);

    if (!field) throw new FormError("NOT_FOUND", "Field not found");

    const values = await this.loadFieldValues(formId, fieldId);
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
      averageRating,
      optionCounts: Array.from(optionCountsMap.entries())
        .map(([option, count]) => ({ option, count }))
        .sort((a, b) => b.count - a.count),
      recentValues: values.slice(0, 8),
    };
  }

  async getAllFieldStats(userId: string, formId: string) {
    await this.assertFormOwnership(userId, formId);

    const fields = await db
      .select()
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, formId))
      .orderBy(formFieldsTable.sortOrder);

    const stats = await Promise.all(
      fields.map((field) => this.getFieldBreakdown(userId, formId, field.id)),
    );

    return { fields: stats };
  }
}

export default AnalyticsService;
