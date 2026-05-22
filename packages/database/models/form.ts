import { integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { usersTable } from "./user";

export const formVisibilityEnum = ["public", "unlisted", "draft"] as const;
export type FormVisibility = (typeof formVisibilityEnum)[number];

export type FormFieldJson = {
  id: string;
  label: string;
  type: "text" | "email" | "number" | "select" | "rating" | "date";
  required: boolean;
};

export const formsTable = pgTable("forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  visibility: varchar("visibility", { length: 20 }).$type<FormVisibility>().default("public").notNull(),
  slug: varchar("slug", { length: 80 }),
  viewCount: integer("view_count").default(0).notNull(),
  fields: jsonb("fields").$type<FormFieldJson[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export type SelectForm = typeof formsTable.$inferSelect;
export type InsertForm = typeof formsTable.$inferInsert;
