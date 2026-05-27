# Deploy ChaiForm (Vercel + Railway + Neon)

| Service | Host | Role |
|---------|------|------|
| **Web** | [Vercel](https://vercel.com) | Next.js frontend |
| **API** | [Railway](https://railway.app) | Express + tRPC (always-on — no Render-style cold start) |
| **DB** | [Neon](https://neon.tech) | PostgreSQL |

---

## 1. Neon (database)

1. Create a project at https://console.neon.tech
2. Copy the **pooled** connection string (`postgresql://...?sslmode=require`)
3. Run migrations + seed locally once:

```bash
DATABASE_URL="postgresql://..." pnpm db:migrate
DATABASE_URL="postgresql://..." pnpm db:seed
```

---

## 2. Railway (API / backend)

1. Connect GitHub repo on [Railway](https://railway.app)
2. Set **Root Directory** to repo root (or configure build/start for `@repo/api`)
3. **Build:** `pnpm install --frozen-lockfile && pnpm --filter @repo/api run build`
4. **Start:** `node apps/api/dist/index.js`
5. **Health check:** `/health`
6. Migrations run automatically on API startup (`apps/api/src/migrate.ts`)

Environment variables:

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Neon pooled URL |
| `NODE_ENV` | `production` |
| `BASE_URL` | `https://chaiform-production.up.railway.app` |
| `CLIENT_URL` | `https://chai-form-web.vercel.app` |
| `JWT_SECRET` | long random string (32+ chars) |
| `JWT_REFRESH_SECRET` | another long random string |
| `RESEND_API_KEY` | from Resend *(optional)* |
| `EMAIL_FROM` | `ChaiForm <onboarding@resend.dev>` |
| `GOOGLE_OAUTH_CLIENT_ID` | Google Cloud Console |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google Cloud Console |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://chai-form-web.vercel.app/api-auth/google/callback` |
| `PUBLIC_OPENAPI_DOCS` | `true` for public judge/demo docs; set `false` with `OPENAPI_DOCS_SECRET` to protect docs |
| `CRON_SECRET` | optional — expired-form purge via Vercel keep-warm |

Verify: `https://chaiform-production.up.railway.app/health` → `{ "healthy": true }`

> **Note:** Railway stays warm — no free-tier spin-down.

> **Legacy:** `render.yaml` remains for optional Render deploys. Production demo uses **Railway** only.

---

## 3. Vercel (frontend)

1. https://vercel.com → **Add New Project** → import GitHub repo
2. **Root Directory:** `apps/web`
3. Framework: Next.js (`vercel.json` handles monorepo install/build)
4. If build fails with `turbo not found`, override commands:

| Setting | Value |
|---------|--------|
| Install Command | `cd ../.. && pnpm install --frozen-lockfile --prod=false` |
| Build Command | `cd ../.. && pnpm --filter web run build` |

5. Environment variables:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_API_URL` | `/trpc` |
| `API_INTERNAL_URL` | `https://chaiform-production.up.railway.app` |
| `JWT_SECRET` | **same value as Railway** (required for auth middleware) |
| `JWT_REFRESH_SECRET` | **same value as Railway** (recommended) |
| `TURNSTILE_SECRET_KEY` | same as Railway *(if using CAPTCHA)* |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare site key *(if using CAPTCHA)* |
| `DEMO_LOGIN_ENABLED` | `false` in production; `true` only for judge/demo environments |
| `DEMO_USER_EMAIL` | Seeded creator email (from `SEED_USER_EMAIL`) |
| `DEMO_USER_PASSWORD` | Seeded password (from `SEED_DEMO_PASSWORD`) |
| `REQUIRE_TURNSTILE_IN_PROD` | `true` to reject public submits when `TURNSTILE_SECRET_KEY` is unset |

5. Deploy → copy URL (e.g. `https://chaiform.vercel.app`)

Vercel proxies `/trpc` and `/api-auth` to Railway — auth cookies stay same-origin on your Vercel domain.

---

## 4. Wire URLs together

Update **Railway** env vars after Vercel deploy:

- `CLIENT_URL` = your Vercel URL (no trailing slash)
- `GOOGLE_OAUTH_REDIRECT_URI` = `{VERCEL_URL}/api-auth/google/callback`

Update **Google Cloud Console** → OAuth client → **Authorized redirect URIs**:

- `https://chai-form-web.vercel.app/api-auth/google/callback`

Redeploy Railway if you changed env vars.

---

## 5. Smoke test

- [ ] `https://chaiform-production.up.railway.app/health` → `{ "healthy": true }`
- [ ] `https://YOUR-APP.vercel.app` loads landing page
- [ ] Sign in with seeded credentials (after `pnpm db:seed` on Neon)
- [ ] Create form → dashboard shows it
- [ ] Public form submit works
- [ ] 2FA enable → logout → login asks for OTP

---

## Judge demo (optional)

1. Run `pnpm db:seed` against production Neon with `SEED_USER_EMAIL` / `SEED_DEMO_PASSWORD`.
2. On Vercel, set `DEMO_LOGIN_ENABLED=true` and matching `DEMO_USER_*` vars for one-click login.
3. Keep demo credentials out of git — share privately with judges if needed.

---

## Troubleshooting

**Vercel build fails with React/useState error**  
Set `NODE_ENV=production` on Vercel. Do not use `NODE_ENV=development` in production env vars.

**Auth cookies not working**  
Ensure `CLIENT_URL` on Railway matches your Vercel URL exactly (no trailing slash). Set **`JWT_SECRET` (and `JWT_REFRESH_SECRET`) on Vercel** to the same values as Railway — middleware needs them to keep you signed in across tabs.

**Google OAuth redirect mismatch**  
Redirect URI must be the **Vercel** URL (`/api-auth/google/callback`), matching `GOOGLE_OAUTH_REDIRECT_URI` on Railway.

**API slow on first request after deploy**  
Railway may need a few seconds to route traffic — retry `/health` (checks database connectivity).

**Emails not sending**  
Set `RESEND_API_KEY` + `EMAIL_FROM` on Railway. Without Resend, OTP/links appear in Railway logs only.
