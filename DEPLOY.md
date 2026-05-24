# Deploy ChaiForm (Vercel + Render + Neon)

| Service | Host | Role |
|---------|------|------|
| **Web** | [Vercel](https://vercel.com) | Next.js frontend |
| **API** | [Render](https://render.com) | Express + tRPC |
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

## 2. Render (API / backend)

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
| **Build Command** | `pnpm install --frozen-lockfile && pnpm exec turbo build --filter=@repo/api` |
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
4. Environment variables:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_API_URL` | `/trpc` |
| `API_INTERNAL_URL` | `https://YOUR-API.onrender.com` |
| `SKIP_ENV_VALIDATION` | `true` |

5. Deploy → copy URL (e.g. `https://chaiform.vercel.app`)

Vercel proxies `/trpc` and `/api-auth` to Render — auth cookies stay same-origin on your Vercel domain.

---

## 4. Wire URLs together

Update **Render** env vars after Vercel deploy:

- `CLIENT_URL` = your Vercel URL (no trailing slash)
- `GOOGLE_OAUTH_REDIRECT_URI` = `{VERCEL_URL}/api-auth/google/callback`

Update **Google Cloud Console** → OAuth client → **Authorized redirect URIs**:

- `https://YOUR-APP.vercel.app/api-auth/google/callback`

Redeploy Render (or use **Manual Deploy**) if you changed env vars.

---

## 5. Smoke test

- [ ] `https://YOUR-API.onrender.com/health` → `{ "healthy": true }`
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
