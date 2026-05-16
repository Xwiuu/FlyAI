# Fly.AI — Internal Infrastructure

Operational intelligence for modern companies. Internal monorepo.

- **Brand bible:** [`FLY.md`](./FLY.md)
- **Project bible:** [`CLAUDE.md`](./CLAUDE.md)
- **Dashboard:** [`dashboard/`](./dashboard) — Next.js 14 App Router
- **Agents:** [`agents/`](./agents) — autonomous marketing team (Phase 2)
- **Database:** [`supabase/`](./supabase) — schema + RLS policies

## Quickstart

```bash
cd dashboard
npm install
cp ../.env.example .env.local   # fill in keys
npm run dev
```

Apply the database schema in Supabase SQL editor:

```
supabase/migrations/001_initial_schema.sql
supabase/seed.sql      # after creating the two founder users
```
