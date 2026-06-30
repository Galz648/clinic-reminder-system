# Example 01 — Drizzle + Postgres (Supabase-compatible)

Proves the local data model against the same Postgres driver used with hosted Supabase.

## Prerequisites

From the repo root:

```bash
cp .env.example .env
docker compose up -d supabase-db
```

## Run

```bash
cd examples/01-drizzle-postgres
bun install
bun --env-file=../../.env run start
```

Reads `DATABASE_URL` from the repo `.env` (no hardcoded connection strings in code).
