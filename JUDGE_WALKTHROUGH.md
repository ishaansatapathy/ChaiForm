# ChaiForm — Judge walkthrough (~60 seconds)

Live URLs:

| Service | URL |
|---------|-----|
| Web app | https://chai-form-web.vercel.app |
| API + Scalar docs | https://chaiform-production.up.railway.app/docs |
| Sample public form | https://chai-form-web.vercel.app/f/s/product-feedback |

Demo login: `demo@chaiform.dev` / `DemoPass123!`

---

## 1. Sign in (10s)

1. Open https://chai-form-web.vercel.app/sign-in
2. Sign in with demo credentials
3. Land on **Dashboard** — seeded forms and submission counts

## 2. Create & publish a form (15s)

1. Click **New form**
2. Add a title and 2–3 questions (try **select** + conditional “Show when” on a follow-up)
3. Pick a **theme**, save
4. Set visibility to **Public** or copy the **share link**

## 3. Public submit (10s)

1. Open the public link in a new tab (incognito optional)
2. Answer one question at a time (Typeform-style flow)
3. Complete **Turnstile** on the last step → **Submit**
4. See the thank-you page

## 4. Analytics (10s)

1. Back in the dashboard, open **Analytics**
2. Select your form — view trend chart (7d / 30d / 90d)
3. Click a field for breakdown stats
4. Export **CSV**

## 5. API docs (10s)

1. Open https://chaiform-production.up.railway.app/docs
2. Scalar UI shows **OpenAPI** endpoints (forms, auth, analytics)
3. Try **GET /health** — confirms API is live

---

## Rubric highlights

- **Monorepo:** Turborepo + pnpm workspaces (`apps/api`, `apps/web`, `packages/*`)
- **Auth:** Email/password, Google OAuth, 2FA, JWT cookies
- **Builder:** 8 field types, themes, drag reorder, conditional visibility
- **Validation:** Zod strict schemas server + client
- **tRPC:** Typed routers; save/submit via `forms.create` / `forms.submit`
- **Drizzle:** Migrations + form versioning + soft delete
- **Public submit:** Rate limits, honeypot, idempotency, Turnstile CAPTCHA
- **Analytics:** Charts, field stats, CSV export
