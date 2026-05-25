import pg from "pg";

/** Idempotent schema patches — fixes forms.list when 0010–0012 were never applied on Neon. */
const ENSURE_SCHEMA_SQL = `
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "allow_multiple_submissions" boolean DEFAULT true NOT NULL;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "respondent_key" varchar(64);
CREATE INDEX IF NOT EXISTS "submissions_form_respondent_idx" ON "submissions" ("form_id", "respondent_key");
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "require_authentication" boolean DEFAULT false NOT NULL;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "submitter_user_id" uuid;
DO $$ BEGIN
  ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submitter_user_id_users_id_fk"
    FOREIGN KEY ("submitter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
CREATE INDEX IF NOT EXISTS "submissions_form_submitter_idx" ON "submissions" ("form_id", "submitter_user_id");
`;

export async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(ENSURE_SCHEMA_SQL);
  } finally {
    await client.end();
  }
}
