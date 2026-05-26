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
| `CRON_SECRET` | optional — expired-form purge via Vercel keep-warm |

Verify: `https://chaiform-production.up.railway.app/health` → `{ "healthy": true }`

> **Note:** Railway stays warm — no free-tier spin-down like Render.

### Legacy: Render (optional)

See `render.yaml` if you still deploy API to Render. Production demo uses **Railway** URLs above.

## 2b. Render (API / backend) — legacy

### Option A — Blueprint (recommended)

1. Push this repo to GitHub
2. https://dashboard.render.com → **New** → **Blueprint**
3. Connect repo → Render reads `render.yaml`
4. Fill in secret env vars when prompted (`DATABASE_URL`, JWT secrets, etc.)

### Option B — Manual Web Service

1. **New** → **Web Service** → connect GitHub repo
2. Settings:

| Setting | Value |
|---------|-------|
| **Root Directory** | *(leave empty — repo root)* |
| **Runtime** | Node |
| **Build Command** | `pnpm install --frozen-lockfile --prod=false && pnpm --filter @repo/api run build` |
| **Start Command** | `node apps/api/dist/index.js` |
| **Health Check Path** | `/health` |

3. Environment variables:

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Neon pooled URL |
| `NODE_ENV` | `production` |
| `BASE_URL` | `https://chaiform-api.onrender.com` |
| `CLIENT_URL` | `https://YOUR-APP.vercel.app` *(set after Vercel deploy)* |
| `JWT_SECRET` | long random string (32+ chars) |
| `JWT_REFRESH_SECRET` | another long random string |
| `RESEND_API_KEY` | from Resend *(optional)* |
| `EMAIL_FROM` | `ChaiForm <onboarding@resend.dev>` |
| `GOOGLE_OAUTH_CLIENT_ID` | Google Cloud Console |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google Cloud Console |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://YOUR-APP.vercel.app/api-auth/google/callback` |

4. Deploy → copy public URL (e.g. `https://chaiform-api.onrender.com`)
5. Verify: `https://YOUR-API.onrender.com/health`

> **Note:** Render free tier spins down after inactivity — first request may take ~30s.

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
| `SKIP_ENV_VALIDATION` | `true` |

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
- [ ] Sign in: `demo@chaiform.dev` / `DemoPass123!` (after seed)
- [ ] Create form → dashboard shows it
- [ ] Public form submit works
- [ ] 2FA enable → logout → login asks for OTP

---

## Demo credentials (judges)

After `pnpm db:seed` against production Neon:

| Field | Value |
|-------|-------|
| Email | `demo@chaiform.dev` |
| Password | `DemoPass123!` |

Add live URLs to README before submission.

---

## Troubleshooting

**Vercel build fails with React/useState error**  
Set `NODE_ENV=production` on Vercel. Do not use `NODE_ENV=development` in production env vars.

**Auth cookies not working**  
Ensure `CLIENT_URL` on Render matches your Vercel URL exactly (no trailing slash). Vercel must proxy via `API_INTERNAL_URL`.

**Google OAuth redirect mismatch**  
Redirect URI must be the **Vercel** URL (`/api-auth/google/callback`), not Render.

**Render API slow on first request**  
Free tier cold start — wait ~30s or upgrade plan.

**Emails not sending**  
Set `RESEND_API_KEY` + `EMAIL_FROM` on Render. Without Resend, OTP/links appear in Render logs only.
