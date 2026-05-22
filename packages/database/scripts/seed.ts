import "dotenv/config";

import { randomUUID } from "node:crypto";

import { db, eq } from "@repo/database";
import {
  formFieldsTable,
  formsTable,
  submissionResponsesTable,
  submissionsTable,
  usersTable,
} from "@repo/database/schema";
import type { SubmissionAnswerJson } from "@repo/database/schema";

const DEMO_SUBMISSIONS = [
  {
    name: "Alex Chen",
    email: "alex@startup.io",
    role: "Engineer",
    rating: "5",
    daysAgo: 1,
  },
  {
    name: "Priya Sharma",
    email: "priya@design.co",
    role: "Designer",
    rating: "4",
    daysAgo: 2,
  },
  {
    name: "Jordan Lee",
    email: "jordan@product.dev",
    role: "Product",
    rating: "5",
    daysAgo: 3,
  },
  {
    name: "Sam Rivera",
    email: "sam@acme.com",
    role: "Other",
    rating: "3",
    daysAgo: 5,
  },
  {
    name: "Taylor Kim",
    email: "taylor@labs.ai",
    role: "Engineer",
    rating: "4",
    daysAgo: 8,
  },
  {
    name: "Morgan Patel",
    email: "morgan@studio.app",
    role: "Designer",
    rating: "5",
    daysAgo: 12,
  },
];

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
    console.log("Demo data already exists — skipping seed.");
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
      viewCount: 48,
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

  for (const demo of DEMO_SUBMISSIONS) {
    const submittedAt = new Date();
    submittedAt.setDate(submittedAt.getDate() - demo.daysAgo);

    const answers: SubmissionAnswerJson[] = [
      { fieldId: fieldNameId, label: "Full name", type: "text", value: demo.name },
      { fieldId: fieldEmailId, label: "Work email", type: "email", value: demo.email },
      { fieldId: fieldRoleId, label: "Role", type: "select", value: demo.role },
      { fieldId: fieldRatingId, label: "How likely are you to recommend ChaiForm?", type: "rating", value: demo.rating },
    ];

    const [submission] = await db
      .insert(submissionsTable)
      .values({
        formId: form.id,
        answers,
        submittedAt,
      })
      .returning();

    if (!submission) continue;

    await db.insert(submissionResponsesTable).values(
      answers.map((answer) => ({
        submissionId: submission.id,
        fieldId: answer.fieldId,
        value: answer.value,
      })),
    );
  }

  console.log("Demo seed complete.");
  console.log(`Form: Product feedback (${DEMO_SUBMISSIONS.length} submissions, 48 views)`);
  console.log(`Public URL: http://localhost:3000/f/s/product-feedback`);
  console.log(`Analytics: http://localhost:3000/analytics?form=${form.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
