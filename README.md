# ChaiForm

Production-style form builder SaaS built on **Turborepo + tRPC + Zod + Drizzle ORM + Scalar**.

Create dynamic forms, publish shareable links, and collect responses without respondent login.

## Monorepo structure

```
chaiform/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express + tRPC + OpenAPI + Scalar docs
├── packages/
│   ├── trpc/         # Shared tRPC routers & client
│   ├── database/     # Drizzle ORM schema & migrations
│   ├── services/     # Business logic (auth, etc.)
│   └── logger/       # Winston logger
├── docker-compose.yml
└── .env.example
```

## Stack

- **Turborepo** — monorepo
- **tRPC** — type-safe APIs
- **Zod** — validation
- **Drizzle ORM** — Postgres
- **Scalar** — API docs at `/docs`
- **Next.js** — frontend

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment

```bash
cp .env.example .env
bash setup.sh   # links .env into apps/packages (Git Bash / WSL)
```

On Windows PowerShell, copy `.env` manually into `apps/web`, `apps/api`, and `packages/database` if needed.

### 3. Start Postgres

```bash
docker compose up -d
```

### 4. Run migrations

```bash
pnpm db:migrate
```

### 5. Start dev servers

```bash
pnpm dev
```

- Frontend: http://localhost:3000
- API: http://localhost:8000
- API docs: http://localhost:8000/docs

## Assets

Intro videos live in `apps/web/public/videos/`:

| File | Role | URL |
|------|------|-----|
| `loading.mp4` | Fast intro when the site opens (3–5s) | `/videos/loading.mp4` |
| `landing.mp4` | Looping landing background + Three.js/GSAP overlay | `/videos/landing.mp4` |

Flow: **loading video** (sped up) → fade out → **landing video** (loop) with particle/omnitrix Three.js scene and GSAP text animations.

## Demo credentials

> To be added after auth + seed script are implemented.

## License

Private — hackathon project.
