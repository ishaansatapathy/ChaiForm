import "dotenv/config";

import { randomUUID } from "node:crypto";

import { db, eq } from "@repo/database";
import { formFieldsTable, formsTable, usersTable } from "@repo/database/schema";

async function main() {
  const email = process.env.SEED_USER_EMAIL ?? "demo@chaiform.dev";

  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  if (!existingUser) {
    console.log(`No user found for ${email}. Sign up first, then re-run: pnpm db:seed`);
    process.exit(0);
  }

  const [existingForm] = await db
    .select()
    .from(formsTable)
    .where(eq(formsTable.userId, existingUser.id))
    .limit(1);

  if (existingForm) {
    console.log("Demo form already exists for user — skipping seed.");
    process.exit(0);
  }

  const fieldNameId = randomUUID();
  const fieldEmailId = randomUUID();
  const fieldRoleId = randomUUID();
  const fieldRatingId = randomUUID();

  const fields = [
    { id: fieldNameId, label: "Full name", type: "text" as const, required: true, sortOrder: 0, config: {} },
    { id: fieldEmailId, label: "Work email", type: "email" as const, required: true, sortOrder: 1, config: {} },
    {
      id: fieldRoleId,
      label: "Role",
      type: "select" as const,
      required: true,
      sortOrder: 2,
      config: { options: ["Engineer", "Designer", "Product", "Other"] },
    },
    {
      id: fieldRatingId,
      label: "How likely are you to recommend ChaiForm?",
      type: "rating" as const,
      required: false,
      sortOrder: 3,
      config: { maxRating: 5 },
    },
  ];

  const [form] = await db
    .insert(formsTable)
    .values({
      userId: existingUser.id,
      title: "Product feedback",
      description: "Tell us what you think about ChaiForm.",
      visibility: "public",
      slug: "product-feedback",
      fields: fields.map(({ id, label, type, required }) => ({ id, label, type, required })),
    })
    .returning();

  if (!form) {
    throw new Error("Failed to create seed form");
  }

  await db.insert(formFieldsTable).values(
    fields.map((field) => ({
      id: field.id,
      formId: form.id,
      label: field.label,
      type: field.type,
      required: field.required,
      sortOrder: field.sortOrder,
      config: field.config,
    })),
  );

  console.log("Seed complete.");
  console.log(`Form ID: ${form.id}`);
  console.log(`Public URL: http://localhost:3000/f/s/product-feedback`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
