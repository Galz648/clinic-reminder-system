# Clinic Reminder System

V0 scaffolding for a veterinary clinic reminder backend. See `clinic-reminder-system/` for the full specification, architecture diagrams, and tooling notes.

## Stack

- **NestJS** — API boundary (`RemindersController`, `RemindersService`)
- **Drizzle + Supabase Postgres** — same `DATABASE_URL` locally and in production
- **Temporal** — durable reminder scheduling (Docker Compose locally)
- **OpenAPI** — Swagger at `/docs`
- **Bun** — package runner and test runner

## Bun + NestJS

NestJS relies on `reflect-metadata` for decorators and dependency injection. When you run the app or worker through Bun (`bun run start:worker`, `bun run db:migrate`, etc.), that polyfill must load **before** any Nest module is imported.

`bunfig.toml` wires this up via preload:

- `bun-preload.ts` — used for general `bun run` entrypoints; may help as Bun/NestJS integration grows (scripts, worker, future `bun run` dev flows).
- `test/load-env.ts` — used by `bun test`; loads `.env` plus `reflect-metadata` for `@nestjs/testing`.

If you hit odd DI or decorator errors under Bun, check that the relevant preload file is enabled in `bunfig.toml`.

## Troubleshooting

### `bun test` hangs on a spec file

If `bun test` stalls on something like `src/app.controller.spec.ts` and never prints pass/fail, the cause is often a bad `node_modules` install — not the test code itself. A clean reinstall usually fixes it:

```bash
rm -rf node_modules dist tsconfig.build.tsbuildinfo tsconfig.tsbuildinfo
bun install
bun test
```

Also confirm `bunfig.toml` still preloads `test/load-env.ts` (for `reflect-metadata` and `.env`).

### `nest build` hangs

This project compiles with `tsc` (`bun run build`) because `nest build` can hang in some local setups. Use `bun run typecheck` for a fast no-emit check.

### `docker compose up` fails on port 54322

Port `54322` is the default for Supabase CLI (`supabase start`). This project's app DB uses host port **54332** instead. Stop the other stack or keep `DATABASE_URL` pointed at `localhost:54332` per `.env.example`.

### Temporal container exits immediately

The `temporal` service needs `./dynamicconfig/development-sql.yaml` mounted into the container (see `docker-compose.yml`). If that file is missing, Temporal fails on startup with a dynamic config error.

## V0 data flow

```text
POST /reminders → RemindersService validates mobile phone (WhatsApp channel)
                 → Drizzle insert + Temporal ReminderWorkflow
                 → worker sleeps until dueAt → SendReminderActivity logs + marks sent
```

Landlines and VoIP may be stored on an owner, but `POST /reminders` rejects non-mobile numbers with 400. See `clinic-reminder-system/clinic-reminder-system-user-flows.md` for the full V0 user-flow diagram.

## Quick start

```bash
cp .env.example .env   # all hosts, ports, and URLs live here — not in code
bun install
docker compose up -d
bun run db:migrate
```

Terminal 1 — API:

```bash
bun run start:dev
```

Terminal 2 — Temporal worker:

```bash
bun run start:worker
```

Temporal UI:

Open `http://localhost:8080` in your browser, or use `TEMPORAL_UI_URL` from `.env`.

Create a reminder (due ~35s from now):

```bash
source .env  # or: set -a && source .env && set +a
API="$API_PUBLIC_URL"

OWNER_ID=$(curl -sf -X POST "$API/owners" -H 'content-type: application/json' \
  -d '{"name":"Jane Doe"}' | jq -r .id)
PHONE_ID=$(curl -sf -X POST "$API/owners/$OWNER_ID/phone-numbers" -H 'content-type: application/json' \
  -d '{"phone":"050-234-5678"}' | jq -r .id)
CASE_ID=$(curl -sf -X POST "$API/cases" -H 'content-type: application/json' \
  -d '{"petName":"Luna"}' | jq -r .id)
curl -sf -X POST "$API/cases/$CASE_ID/owners" -H 'content-type: application/json' \
  -d "{\"ownerId\":\"$OWNER_ID\"}" > /dev/null

curl -s -X POST "$API/reminders" \
  -H 'content-type: application/json' \
  -d '{
    "caseId": "'"$CASE_ID"'",
    "ownerId": "'"$OWNER_ID"'",
    "phoneNumberId": "'"$PHONE_ID"'",
    "reminderType": "vaccination",
    "message": "Luna is due for vaccination.",
    "dueAt": "'"$(date -u -v+35S +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null || date -u -d '+35 seconds' +%Y-%m-%dT%H:%M:%S.000Z)"'"
  }' | jq .
```

- API: `API_PUBLIC_URL` from `.env`
- OpenAPI: `${API_PUBLIC_URL}/docs`
- Temporal UI: `TEMPORAL_UI_URL` from `.env`

## Database (Drizzle + Supabase)

| Environment | Variable | Used by |
|---|---|---|
| **Local** | `DATABASE_URL` | API, worker, `bun run db:migrate` |
| **Production** | `DATABASE_URL_PRODUCTION` | `bun run db:migrate:prod`, `db:studio:prod` |

Production uses the Supabase **transaction-mode pooler** (port `6543`, IPv4). Copy the URI from Supabase → **Connect** → ORM into `DATABASE_URL_PRODUCTION` in `.env` (see `.env.example`).

| What | Where |
|---|---|
| Table definitions | `src/db/schema.ts` |
| Drizzle Kit config | `drizzle.config.ts` |
| Generated SQL | `drizzle/*.sql` (after `bun run db:generate`) |
| Apply migrations (local) | `bun run db:migrate` |
| Apply migrations (production) | `bun run db:migrate:prod` |
| Browse visually (local) | `bun run db:studio` |
| Browse visually (production) | `bun run db:studio:prod` |

Workflow when you change tables:

1. Edit `src/db/schema.ts`
2. `bun run db:generate` — creates a new file under `drizzle/`
3. `bun run db:migrate` — apply locally
4. `bun run db:migrate:prod` — apply to hosted Supabase when ready

`src/db/index.ts` opens a Postgres pool (`prepare: false` on the Supabase pooler) and runs migrations — no duplicated DDL.

## Docker Compose

| Service | Purpose | Host port |
|---|---|---|
| `supabase-db` | App database (Postgres, Supabase-compatible) | see `.env` (`DATABASE_URL`) |
| `temporal` + `temporal-postgresql` | Durable workflow engine | see `.env` (`TEMPORAL_ADDRESS`) |
| `temporal-ui` | Workflow debugger | `8080` |

## Standalone examples

```bash
docker compose up -d supabase-db
cd examples/01-drizzle-postgres && bun install && bun run start
cd examples/02-temporal-timer && bun install && bun run worker   # terminal 1
cd examples/02-temporal-timer && bun run client                  # terminal 2
```

## Scripts

| Script | Purpose |
|---|---|
| `bun run start:dev` | NestJS API with watch |
| `bun run start:worker` | Temporal worker |
| `docker compose up -d` | Start Supabase DB + Temporal |
| `bun run db:generate` | Generate SQL migration from `schema.ts` |
| `bun run db:migrate` | Apply migrations to Postgres |
| `bun test` | Bun test runner (unit + e2e) |
| `bun run test:e2e` | E2E tests only (`test/`) |
| `bun run test:e2e:temporal` | Docker-backed reminder workflow e2e (`e2e/`) |
