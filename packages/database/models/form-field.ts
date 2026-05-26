import { boolean, integer, jsonb, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

import { formsTable } from "./form";

export type FieldConfigJson = {
  options?: string[];
  maxRating?: number;
  lowLabel?: string;
  highLabel?: string;
  placeholder?: string;
  checkboxLabel?: string;
  style?: "heading" | "body";
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    minValue?: number;
    maxValue?: number;
  };
  showWhen?: {
    fieldId: string;
    operator: "eq" | "neq";
    value: string;
  };
};

export const formFieldsTable = pgTable("form_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id")
    .notNull()
    .references(() => formsTable.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  required: boolean("required").default(false).notNull(),
  sortOrder: integer("sort_order").notNull(),
  config: jsonb("config").$type<FieldConfigJson>().default({}).notNull(),
});

export type SelectFormField = typeof formFieldsTable.$inferSelect;
export type InsertFormField = typeof formFieldsTable.$inferInsert;
