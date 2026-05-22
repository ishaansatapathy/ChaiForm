import { pgTable, text, uuid } from "drizzle-orm/pg-core";

import { formFieldsTable } from "./form-field";
import { submissionsTable } from "./submission";

export const submissionResponsesTable = pgTable("submission_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissionsTable.id, { onDelete: "cascade" }),
  fieldId: uuid("field_id")
    .notNull()
    .references(() => formFieldsTable.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
});

export type SelectSubmissionResponse = typeof submissionResponsesTable.$inferSelect;
