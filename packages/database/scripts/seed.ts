import "dotenv/config";

import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";

import { db, eq } from "@repo/database";
import {
  formFieldsTable,
  formVersionsTable,
  formsTable,
  submissionResponsesTable,
  submissionsTable,
  usersTable,
} from "@repo/database/schema";
import type {
  FormTheme,
  FormVersionFieldSnapshot,
  FormVisibility,
  SubmissionAnswerJson,
} from "@repo/database/schema";

type SeedField = {
  id: string;
  label: string;
  type: "text" | "email" | "number" | "select" | "rating" | "date" | "checkbox";
  required: boolean;
  sortOrder: number;
  config?: Record<string, unknown>;
};

type SeedForm = {
  title: string;
  description: string;
  slug: string;
  visibility: FormVisibility;
  theme: FormTheme;
  viewCount: number;
  fields: SeedField[];
  submissions: Array<Record<string, string> & { daysAgo: number }>;
};

const DEMO_FORMS: SeedForm[] = [
  {
    title: "Customer feedback",
    description: "Help us improve. Share your experience — ratings, category, and detailed feedback.",
    slug: "customer-feedback",
    visibility: "public",
    theme: "default",
    viewCount: 86,
    fields: [
      { id: randomUUID(), label: "Full name", type: "text", required: true, sortOrder: 0, config: { placeholder: "Your full name" } },
      { id: randomUUID(), label: "Email address", type: "email", required: true, sortOrder: 1, config: { placeholder: "you@company.com" } },
      {
        id: randomUUID(),
        label: "Feedback category",
        type: "select",
        required: true,
        sortOrder: 2,
        config: { options: ["Product quality", "Customer support", "Delivery", "Pricing", "Feature request", "Other"] },
      },
      { id: randomUUID(), label: "Overall experience rating", type: "rating", required: true, sortOrder: 3, config: { maxRating: 5 } },
      { id: randomUUID(), label: "Date of experience", type: "date", required: false, sortOrder: 4, config: {} },
      { id: randomUUID(), label: "Order / ticket ID", type: "number", required: false, sortOrder: 5, config: { placeholder: "Optional" } },
      { id: randomUUID(), label: "Detailed feedback", type: "text", required: true, sortOrder: 6, config: { placeholder: "What went well or what should we fix?" } },
      {
        id: randomUUID(),
        label: "Would recommend us",
        type: "checkbox",
        required: true,
        sortOrder: 7,
        config: { checkboxLabel: "I would recommend this product/service to others" },
      },
      {
        id: randomUUID(),
        label: "Contact permission",
        type: "checkbox",
        required: false,
        sortOrder: 8,
        config: { checkboxLabel: "You may contact me about this feedback" },
      },
    ],
    submissions: [
      {
        name: "Rahul Verma",
        email: "rahul@email.com",
        category: "Product quality",
        rating: "5",
        date: "2026-05-20",
        ticket: "10482",
        feedback: "Smooth checkout and fast delivery. Very happy!",
        recommend: "true",
        contact: "true",
        daysAgo: 1,
      },
      {
        name: "Neha Kapoor",
        email: "neha@startup.io",
        category: "Customer support",
        rating: "4",
        date: "2026-05-18",
        ticket: "",
        feedback: "Support team was helpful but response took a few hours.",
        recommend: "true",
        contact: "false",
        daysAgo: 3,
      },
      {
        name: "Arjun Mehta",
        email: "arjun@labs.dev",
        category: "Feature request",
        rating: "3",
        date: "2026-05-15",
        ticket: "9981",
        feedback: "Need dark mode in mobile app.",
        recommend: "false",
        contact: "true",
        daysAgo: 6,
      },
    ],
  },
  {
    title: "Campus recruitment application",
    description: "Apply with resume URL, course (B.Tech, BCA, MCA…) and role preference.",
    slug: "campus-recruitment",
    visibility: "public",
    theme: "startup",
    viewCount: 124,
    fields: [
      { id: randomUUID(), label: "Full name", type: "text", required: true, sortOrder: 0, config: { placeholder: "As on resume" } },
      { id: randomUUID(), label: "Email address", type: "email", required: true, sortOrder: 1, config: { placeholder: "you@college.edu" } },
      { id: randomUUID(), label: "Phone number", type: "number", required: true, sortOrder: 2, config: { placeholder: "10-digit mobile" } },
      {
        id: randomUUID(),
        label: "Course / Degree",
        type: "select",
        required: true,
        sortOrder: 3,
        config: {
          options: [
            "B.Tech (Computer Science)",
            "B.Tech (Information Technology)",
            "B.Tech (Electronics & Communication)",
            "BCA",
            "MCA",
            "B.Sc (Computer Science)",
            "M.Tech",
            "MBA",
            "BBA",
            "Other",
          ],
        },
      },
      { id: randomUUID(), label: "Graduation year", type: "number", required: true, sortOrder: 4, config: { placeholder: "2026" } },
      {
        id: randomUUID(),
        label: "Role applying for",
        type: "select",
        required: true,
        sortOrder: 5,
        config: {
          options: [
            "Software Engineer Intern",
            "Full Stack Developer",
            "Frontend Developer",
            "Backend Developer",
            "DevOps Engineer",
            "UI/UX Designer",
          ],
        },
      },
      {
        id: randomUUID(),
        label: "Resume URL",
        type: "text",
        required: true,
        sortOrder: 6,
        config: { placeholder: "https://drive.google.com/… or LinkedIn resume link" },
      },
      {
        id: randomUUID(),
        label: "LinkedIn profile URL",
        type: "text",
        required: false,
        sortOrder: 7,
        config: { placeholder: "https://linkedin.com/in/your-profile" },
      },
      {
        id: randomUUID(),
        label: "Portfolio / GitHub URL",
        type: "text",
        required: false,
        sortOrder: 8,
        config: { placeholder: "https://github.com/yourusername" },
      },
      { id: randomUUID(), label: "Technical confidence (1–10)", type: "rating", required: true, sortOrder: 9, config: { maxRating: 10 } },
      { id: randomUUID(), label: "Available to join from", type: "date", required: true, sortOrder: 10, config: {} },
      {
        id: randomUUID(),
        label: "Details confirmation",
        type: "checkbox",
        required: true,
        sortOrder: 11,
        config: { checkboxLabel: "I confirm all details and URLs shared are correct" },
      },
      {
        id: randomUUID(),
        label: "Open to relocation",
        type: "checkbox",
        required: false,
        sortOrder: 12,
        config: { checkboxLabel: "I am open to relocation" },
      },
    ],
    submissions: [
      {
        name: "Ishaan Satapathy",
        email: "ishaan@college.edu",
        phone: "9876543210",
        course: "B.Tech (Computer Science)",
        gradYear: "2026",
        role: "Full Stack Developer",
        resume: "https://drive.google.com/file/d/sample-resume",
        linkedin: "https://linkedin.com/in/ishaan",
        github: "https://github.com/ishaan",
        confidence: "8",
        joinDate: "2026-06-01",
        confirm: "true",
        relocate: "true",
        daysAgo: 1,
      },
      {
        name: "Ananya Singh",
        email: "ananya@university.ac.in",
        phone: "9123456780",
        course: "MCA",
        gradYear: "2025",
        role: "Backend Developer",
        resume: "https://linkedin.com/in/ananya/resume",
        linkedin: "https://linkedin.com/in/ananya",
        github: "https://github.com/ananya-dev",
        confidence: "7",
        joinDate: "2026-05-15",
        confirm: "true",
        relocate: "false",
        daysAgo: 4,
      },
      {
        name: "Vikram Joshi",
        email: "vikram@bca.edu",
        phone: "9988776655",
        course: "BCA",
        gradYear: "2026",
        role: "Software Engineer Intern",
        resume: "https://drive.google.com/file/d/vikram-cv",
        linkedin: "",
        github: "https://github.com/vikramj",
        confidence: "6",
        joinDate: "2026-07-01",
        confirm: "true",
        relocate: "true",
        daysAgo: 7,
      },
    ],
  },
  {
    title: "Product feedback",
    description: "Tell us what you think about ChaiForm.",
    slug: "product-feedback",
    visibility: "public",
    theme: "default",
    viewCount: 48,
    fields: [
      { id: randomUUID(), label: "Full name", type: "text", required: true, sortOrder: 0, config: {} },
      { id: randomUUID(), label: "Work email", type: "email", required: true, sortOrder: 1, config: {} },
      {
        id: randomUUID(),
        label: "Role",
        type: "select",
        required: true,
        sortOrder: 2,
        config: { options: ["Engineer", "Designer", "Product", "Other"] },
      },
      {
        id: randomUUID(),
        label: "How likely are you to recommend ChaiForm?",
        type: "rating",
        required: false,
        sortOrder: 3,
        config: { maxRating: 5 },
      },
    ],
    submissions: [
      { name: "Alex Chen", email: "alex@startup.io", role: "Engineer", rating: "5", daysAgo: 1 },
      { name: "Priya Sharma", email: "priya@design.co", role: "Designer", rating: "4", daysAgo: 2 },
      { name: "Jordan Lee", email: "jordan@product.dev", role: "Product", rating: "5", daysAgo: 3 },
      { name: "Sam Rivera", email: "sam@acme.com", role: "Other", rating: "3", daysAgo: 5 },
      { name: "Taylor Kim", email: "taylor@labs.ai", role: "Engineer", rating: "4", daysAgo: 8 },
      { name: "Morgan Patel", email: "morgan@studio.app", role: "Designer", rating: "5", daysAgo: 12 },
    ],
  },
  {
    title: "Omnitrix alien watchlist",
    description: "Which Ben 10 alien should get the next spotlight form theme?",
    slug: "ben10-alien-poll",
    visibility: "public",
    theme: "ben10",
    viewCount: 72,
    fields: [
      { id: randomUUID(), label: "Hero codename", type: "text", required: true, sortOrder: 0, config: {} },
      {
        id: randomUUID(),
        label: "Favorite alien",
        type: "select",
        required: true,
        sortOrder: 1,
        config: { options: ["Heatblast", "XLR8", "Four Arms", "Diamondhead", "Upgrade"] },
      },
      {
        id: randomUUID(),
        label: "Power level",
        type: "rating",
        required: true,
        sortOrder: 2,
        config: { maxRating: 10 },
      },
      {
        id: randomUUID(),
        label: "I accept the Plumber Code",
        type: "checkbox",
        required: true,
        sortOrder: 3,
        config: { checkboxLabel: "I accept the Plumber Code" },
      },
    ],
    submissions: [
      { codename: "Ben", alien: "XLR8", power: "9", plumber: "true", daysAgo: 1 },
      { codename: "Gwen", alien: "Diamondhead", power: "8", plumber: "true", daysAgo: 4 },
      { codename: "Kevin", alien: "Heatblast", power: "7", plumber: "true", daysAgo: 7 },
    ],
  },
  {
    title: "Anime season tracker",
    description: "Share your current watchlist and rating for the sakura-themed community form.",
    slug: "anime-season-tracker",
    visibility: "public",
    theme: "anime",
    viewCount: 55,
    fields: [
      { id: randomUUID(), label: "Username", type: "text", required: true, sortOrder: 0, config: {} },
      {
        id: randomUUID(),
        label: "Current season show",
        type: "select",
        required: true,
        sortOrder: 1,
        config: { options: ["Solo Leveling", "Frieren", "Dandadan", "Other"] },
      },
      {
        id: randomUUID(),
        label: "Episode rating",
        type: "rating",
        required: true,
        sortOrder: 2,
        config: { maxRating: 5 },
      },
    ],
    submissions: [
      { username: "SakuraFan", show: "Frieren", rating: "5", daysAgo: 2 },
      { username: "MechaOtaku", show: "Solo Leveling", rating: "4", daysAgo: 6 },
    ],
  },
  {
    title: "Startup idea validation",
    description: "Unlisted founder feedback form — direct link only.",
    slug: "startup-idea-check",
    visibility: "unlisted",
    theme: "startup",
    viewCount: 21,
    fields: [
      { id: randomUUID(), label: "Founder name", type: "text", required: true, sortOrder: 0, config: {} },
      { id: randomUUID(), label: "Pitch email", type: "email", required: true, sortOrder: 1, config: {} },
      {
        id: randomUUID(),
        label: "Would you invest?",
        type: "select",
        required: true,
        sortOrder: 2,
        config: { options: ["Yes", "Maybe", "No"] },
      },
    ],
    submissions: [{ founder: "Aisha", email: "aisha@venture.co", invest: "Maybe", daysAgo: 3 }],
  },
  {
    title: "Gaming session feedback",
    description: "Rate tonight's co-op session and tell us what map to run next.",
    slug: "gaming-session-feedback",
    visibility: "public",
    theme: "gaming",
    viewCount: 34,
    fields: [
      { id: randomUUID(), label: "Gamertag", type: "text", required: true, sortOrder: 0, config: {} },
      {
        id: randomUUID(),
        label: "Session fun score",
        type: "rating",
        required: true,
        sortOrder: 1,
        config: { maxRating: 5 },
      },
      {
        id: randomUUID(),
        label: "Next map preference",
        type: "select",
        required: false,
        sortOrder: 2,
        config: { options: ["Neon City", "Desert Ruins", "Sky Temple"] },
      },
    ],
    submissions: [
      { gamertag: "NovaStrike", fun: "5", map: "Neon City", daysAgo: 1 },
      { gamertag: "PixelRogue", fun: "4", map: "Sky Temple", daysAgo: 5 },
    ],
  },
];

function applyDemoConditionals() {
  const customerFeedback = DEMO_FORMS.find((form) => form.slug === "customer-feedback");
  const recommendField = customerFeedback?.fields.find((field) => field.label === "Would recommend us");
  const contactField = customerFeedback?.fields.find((field) => field.label === "Contact permission");
  const ratingField = customerFeedback?.fields.find((field) => field.label === "Overall experience rating");
  const ticketField = customerFeedback?.fields.find((field) => field.label === "Order / ticket ID");

  if (ratingField) {
    ratingField.config = {
      ...ratingField.config,
      lowLabel: "Poor",
      highLabel: "Excellent",
    };
  }

  if (ticketField) {
    ticketField.config = {
      ...ticketField.config,
      validation: {
        minValue: 1000,
        maxValue: 99999,
      },
    };
  }

  if (recommendField && contactField) {
    contactField.config = {
      ...contactField.config,
      showWhen: {
        fieldId: recommendField.id,
        operator: "eq",
        value: "false",
      },
    };
  }
}

applyDemoConditionals();

async function ensureDemoUser(email: string) {
  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? "DemoPass123!";
  const demoRole = process.env.SEED_DEMO_ADMIN === "true" ? "admin" : "user";
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existingUser) {
    const [updated] = await db
      .update(usersTable)
      .set({
        fullName: "Demo Creator",
        displayName: "DemoHero",
        passwordHash,
        authProvider: "local",
        emailVerified: true,
        role: demoRole,
      })
      .where(eq(usersTable.id, existingUser.id))
      .returning();

    return updated ?? existingUser;
  }

  const [created] = await db
    .insert(usersTable)
    .values({
      fullName: "Demo Creator",
      displayName: "DemoHero",
      email,
      passwordHash,
      authProvider: "local",
      emailVerified: true,
      role: demoRole,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create demo user");
  }

  console.log(`Created verified demo user: ${email}`);
  console.log(`Demo password: ${demoPassword}`);
  return created;
}

function buildAnswersFromSeed(form: SeedForm, submission: Record<string, string>): SubmissionAnswerJson[] {
  const fieldKeys: Record<string, string[]> = {
    "customer-feedback": ["name", "email", "category", "rating", "date", "ticket", "feedback", "recommend", "contact"],
    "campus-recruitment": [
      "name",
      "email",
      "phone",
      "course",
      "gradYear",
      "role",
      "resume",
      "linkedin",
      "github",
      "confidence",
      "joinDate",
      "confirm",
      "relocate",
    ],
    "product-feedback": ["name", "email", "role", "rating"],
    "ben10-alien-poll": ["codename", "alien", "power", "plumber"],
    "anime-season-tracker": ["username", "show", "rating"],
    "startup-idea-check": ["founder", "email", "invest"],
    "gaming-session-feedback": ["gamertag", "fun", "map"],
  };

  const keys = fieldKeys[form.slug] ?? [];
  return form.fields.map((field, index) => ({
    fieldId: field.id,
    label: field.label,
    type: field.type,
    value: String(submission[keys[index] ?? ""] ?? ""),
  }));
}

function toVersionSnapshot(fields: SeedField[]): FormVersionFieldSnapshot[] {
  return fields.map((field) => ({
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required,
    config: field.config ?? undefined,
  }));
}

async function seedForm(userId: string, form: SeedForm) {
  const [existing] = await db.select().from(formsTable).where(eq(formsTable.slug, form.slug)).limit(1);
  if (existing) {
    console.log(`Skipping existing form: ${form.slug}`);
    return existing;
  }

  const [createdForm] = await db
    .insert(formsTable)
    .values({
      userId,
      title: form.title,
      description: form.description,
      visibility: form.visibility,
      theme: form.theme,
      slug: form.slug,
      viewCount: form.viewCount,
    })
    .returning();

  if (!createdForm) throw new Error(`Failed to create form ${form.slug}`);

  await db.insert(formFieldsTable).values(
    form.fields.map((field) => ({
      id: field.id,
      formId: createdForm.id,
      label: field.label,
      type: field.type,
      required: field.required,
      sortOrder: field.sortOrder,
      config: field.config ?? {},
    })),
  );

  const [version] = await db
    .insert(formVersionsTable)
    .values({
      formId: createdForm.id,
      versionNumber: 1,
      schemaSnapshot: toVersionSnapshot(form.fields),
    })
    .returning();

  if (version) {
    await db
      .update(formsTable)
      .set({ currentVersionId: version.id })
      .where(eq(formsTable.id, createdForm.id));
  }

  for (const demo of form.submissions) {
    const submittedAt = new Date();
    submittedAt.setDate(submittedAt.getDate() - demo.daysAgo);

    const answers = buildAnswersFromSeed(form, demo);

    const [submission] = await db
      .insert(submissionsTable)
      .values({
        formId: createdForm.id,
        formVersionId: version?.id,
        answers,
        submittedAt,
      })
      .returning();

    if (!submission) continue;

    await db.insert(submissionResponsesTable).values(
      answers
        .filter((answer) => answer.value.length > 0)
        .map((answer) => ({
          submissionId: submission.id,
          fieldId: answer.fieldId,
          value: answer.value,
        })),
    );
  }

  console.log(`Seeded form: ${form.title} (${form.submissions.length} submissions)`);
  return createdForm;
}

async function main() {
  const email = (process.env.SEED_USER_EMAIL ?? "demo@chaiform.dev").toLowerCase();
  const user = await ensureDemoUser(email);

  for (const form of DEMO_FORMS) {
    await seedForm(user.id, form);
  }

  console.log("Demo seed complete.");
  console.log(`Sign in: ${email} / ${process.env.SEED_DEMO_PASSWORD ?? "DemoPass123!"}`);
  console.log(`Explore: http://localhost:3000/explore`);
  console.log(`Feedback form: http://localhost:3000/f/s/customer-feedback`);
  console.log(`Recruitment form: http://localhost:3000/f/s/campus-recruitment`);
  console.log(`Public form: http://localhost:3000/f/s/product-feedback`);
  console.log(`Unlisted form: http://localhost:3000/f/s/startup-idea-check`);
  console.log(`Analytics: http://localhost:3000/analytics`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
