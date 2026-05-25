import { jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { formsTable } from "./form";
import { usersTable } from "./user";

export type SubmissionAnswerJson = {
  fieldId: string;
  label: string;
  type: string;
  value: string;
};

export const submissionsTable = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id")
    .notNull()
    .references(() => formsTable.id, { onDelete: "cascade" }),
  submitterUserId: uuid("submitter_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  respondentKey: varchar("respondent_key", { length: 64 }),
  answers: jsonb("answers").$type<SubmissionAnswerJson[]>().notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export type SelectSubmission = typeof submissionsTable.$inferSelect;
export type InsertSubmission = typeof submissionsTable.$inferInsert;
