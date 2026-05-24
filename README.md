# ChaiForm

Production-style **Typeform-like form builder SaaS** on Turborepo — creators build forms, publish public/unlisted links, collect validated responses, and view analytics in a dashboard.

## Project structure

```
chaiform/
├── apps/
│   ├── api/                    # Express + tRPC + OpenAPI + Scalar
│   │   └── src/
│   │       ├── index.ts
│   │       ├── server.ts
│   │       ├── middleware/
│   │       └── routes/
│   └── web/                    # Next.js 16 frontend
│       ├── app/                # App Router pages
│       │   ├── (app)/          # Authenticated dashboard routes
│       │   ├── f/              # Public form submission
│       │   └── sign-in|sign-up
│       ├── components/
│       │   ├── app/            # Dashboard shell, form cards
│       │   ├── auth/           # Sign-in/up UI
│       │   ├── forms/          # Builder + field renderers
│       │   ├── analytics/      # Charts & flow views
│       │   ├── home/           # Landing hero
│       │   └── ui/             # shadcn/ui primitives
│       ├── lib/                # Fonts, hooks, utils
│       └── trpc/               # Client setup
├── packages/
│   ├── database/               # Drizzle schema, migrations, seed
│   ├── services/               # Business logic (auth, form, analytics)
│   ├── trpc/                   # Shared tRPC routers + client types
│   ├── logger/                 # Winston logger
│   ├── eslint-config/          # Shared ESLint presets
│   └── typescript-config/      # Shared tsconfig presets
├── scripts/
│   ├── setup.sh                # Unix env symlink helper
│   └── setup.ps1               # Windows env symlink helper
├── .env.example
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

**Root rule:** only config and workspace files live at repo root — no backup `.tsx` files, no reference clones.

## Rubric coverage

| Area | Implementation |
|------|----------------|
| Monorepo & structure | Turborepo, shared packages, clean root |
| Auth | Google OAuth + email/password, JWT cookies |
| Form builder | Create/edit/delete, 7 field types, **themes picker**, **live preview**, one-question public flow |
| Public explore | `/explore` lists public forms only |
| Email notifications | Creator notified on new submission (Resend) |
| Spam protection | Rate limits + **required honeypot** on public submit |
| Zod validation | Field schemas + dynamic submission validator + duplicate/bounds checks |
| tRPC | Type-safe `forms`, `analytics`, `auth` routers + structured Zod errors |
| Drizzle | `forms`, `form_fields`, `submissions`, `submission_responses` + indexes |
| Public submission | `/f/[formId]`, `/f/s/[slug]`, rate-limited submit, Typeform-style UX |
| Analytics | Summary, trend chart, field breakdown, **full CSV export**, flow chart, pagination |
| Scalar | https://chaiform.onrender.com/docs |

## Demo credentials (for judges)

After `pnpm db:seed`:

| Field | Value |
|-------|-------|
| Email | `demo@chaiform.dev` |
| Password | `DemoPass123!` |

Quick links after seed:

- Explore gallery: http://localhost:3000/explore
- Sample public form: http://localhost:3000/f/s/product-feedback
- Unlisted form (link only): http://localhost:3000/f/s/startup-idea-check
- Analytics: http://localhost:3000/analytics

## Stack

- **Turborepo**, **Next.js**, **Express**
- **tRPC** + **Zod** + **Drizzle ORM** + **PostgreSQL**
- **Scalar** API reference · **Recharts** analytics

## Getting started

### 1. Install

```bash
pnpm install
```

### 2. Environment

```bash
cp .env.example .env
```

**Windows (PowerShell):**

```powershell
.\scripts\setup.ps1
```

**macOS / Linux:**

```bash
bash scripts/setup.sh
```

Required env vars: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, Google OAuth vars, `NEXT_PUBLIC_API_URL=/trpc`.

### 3. Database

```bash
pnpm db:migrate
pnpm db:seed   # optional — after sign-up; seeds demo form + 6 submissions + views
```

Set `SEED_USER_EMAIL` in `.env` to the email you signed up with (defaults to `demo@chaiform.dev`).

### 4. Dev

```bash
pnpm dev
```

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:8000/health |
| Scalar docs | http://localhost:8000/docs |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start web + API |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint across workspace |
| `pnpm check-types` | TypeScript check |
| `pnpm format` | Prettier write |
| `pnpm db:migrate` | Apply Drizzle migrations |
| `pnpm db:seed` | Seed demo form with sample submissions and analytics data |

## Code quality

- **Prettier** — root `prettier.config.js`
- **ESLint** — shared `@repo/eslint-config` per package
- **EditorConfig** — consistent indentation
- **TypeScript** — strict configs via `@repo/typescript-config`

## License

Private — hackathon project.

## Deploy (production)

See **[DEPLOY.md](./DEPLOY.md)** for **Neon + Render (API) + Vercel (web)** setup.

### Live demo (production)

| Service | URL |
|---------|-----|
| **Web app** | https://chai-form-web.vercel.app |
| **API health** | https://chaiform.onrender.com/health |
| **Scalar API docs** | https://chaiform.onrender.com/docs |
| **OpenAPI JSON** | https://chaiform.onrender.com/openapi.json |

**Demo login:** `demo@chaiform.dev` / `DemoPass123!` (after seed)

**Sample public form:** https://chai-form-web.vercel.app/f/s/product-feedback
