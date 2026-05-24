import { relations } from "drizzle-orm";

import { formFieldsTable } from "./models/form-field";
import { formsTable } from "./models/form";
import { submissionsTable } from "./models/submission";
import { submissionResponsesTable } from "./models/submission-response";
import { usersTable } from "./models/user";

export const usersRelations = relations(usersTable, ({ many }) => ({
  forms: many(formsTable),
}));

export const formsRelations = relations(formsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [formsTable.userId],
    references: [usersTable.id],
  }),
  fields: many(formFieldsTable),
  submissions: many(submissionsTable),
}));

export const formFieldsRelations = relations(formFieldsTable, ({ one, many }) => ({
  form: one(formsTable, {
    fields: [formFieldsTable.formId],
    references: [formsTable.id],
  }),
  responses: many(submissionResponsesTable),
}));

export const submissionsRelations = relations(submissionsTable, ({ one, many }) => ({
  form: one(formsTable, {
    fields: [submissionsTable.formId],
    references: [formsTable.id],
  }),
  responses: many(submissionResponsesTable),
}));

export const submissionResponsesRelations = relations(submissionResponsesTable, ({ one }) => ({
  submission: one(submissionsTable, {
    fields: [submissionResponsesTable.submissionId],
    references: [submissionsTable.id],
  }),
  field: one(formFieldsTable, {
    fields: [submissionResponsesTable.fieldId],
    references: [formFieldsTable.id],
  }),
}));
