---
target: programming
type: tooling
status: draft
created: 2026-06-29
project: "[[clinic-reminder-system]]"
---

# Clinic Reminder System - Tooling

Project: [[clinic-reminder-system]]
Specification: [[clinic-reminder-system-specification]]
Architecture: [[clinic-reminder-system-architecture]]
Standalone examples: [[clinic-reminder-system-standalone-examples]]

## Tooling stance

This project should use a small, opinionated TypeScript backend stack. The goal is not to evaluate many tools. The goal is to pick stable defaults, reduce decision churn, and get V0 running quickly.

## Chosen tools

| Tool | Role | Why it fits this project |
|---|---|---|
| NestJS | Backend application framework | Gives a structured service/controller/module layout for the reminder API and Temporal client wiring. |
| Temporal | Durable workflow engine | Owns long waits, workflow history, retries, and crash-safe reminder scheduling. Needed later for reply-driven follow-up workflows. |
| Bun | JavaScript runtime / package runner | Fast local install/run loop for TypeScript tooling and scripts. Keep compatibility with Temporal/NestJS under watch. |
| Drizzle | Database ORM / query builder | Typed schema and queries without Prisma's separate generation-heavy workflow. Good fit for Postgres now (Supabase) with the same code in production. |
| Supabase Postgres | Application database | Hosted Postgres locally and in production via the same `DATABASE_URL` connection string pattern. |
| Docker Compose | Local service orchestration | Runs Supabase-compatible Postgres, Temporal server, and Temporal UI locally. |
| OpenAPI | API documentation/spec | NestJS can expose the reminder API contract through OpenAPI/Swagger. Useful for testing and later extension/dashboard clients. |
| Husky | Git hooks | Runs local quality checks before commits: formatting, linting, tests, or type checks. |

## Environment configuration

**Do not hardcode hosts, ports, or URLs in application code** (no `localhost:7233` fallbacks in TypeScript).

All runtime endpoints and connection strings live in `.env`, documented in `.env.example`:

| Variable | Purpose |
|---|---|
| `PORT` | NestJS listen port |
| `API_PUBLIC_URL` | Public API base URL (logs, CORS, curl examples) |
| `DATABASE_URL` | Supabase / Postgres connection string |
| `TEMPORAL_ADDRESS` | Temporal frontend host:port |
| `TEMPORAL_NAMESPACE` | Temporal namespace |
| `TEMPORAL_TASK_QUEUE` | Worker task queue name |
| `TEMPORAL_UI_URL` | Temporal UI URL (documentation / dev links only) |

Rules:

- Copy `.env.example` → `.env` before running the API, worker, migrations, or examples.
- Code reads values through `src/config/env.ts` and fails fast with a clear error if a variable is missing.
- Docker Compose may map container ports, but app processes read connection targets from `.env`, not from inline defaults in code.
- Production uses the same variable names; only the values change (e.g. hosted Supabase URI, hosted Temporal endpoint).

## V0 local runtime shape

V0 should run locally with the smallest useful service graph:

```text
[Bun / NestJS API process]
        │ starts workflows (TEMPORAL_ADDRESS from .env)
        ▼
[Temporal Server in Docker Compose]
        │ dispatches workflow tasks
        ▼
[Bun / Temporal Worker process]

[Supabase-compatible Postgres in Docker Compose]
  DATABASE_URL in .env
  used by NestJS API and worker activity code
```

Temporal and the app database run in Docker Compose. The NestJS API and Temporal Worker run as local development processes using Bun, connecting via env vars.

## Docker Compose responsibility

Docker Compose is for local infrastructure, not for making the project distributed.

V0 Compose should own:

- Supabase-compatible Postgres (`supabase-db`).
- Temporal server and its persistence database.
- Temporal UI.
- Port mappings documented in `.env.example`.

V0 Compose does not need:

- Kubernetes.
- Docker Swarm.
- Horizontal scaling.
- Multiple app replicas.
- Production-grade failover.

## NestJS responsibilities

NestJS owns application boundaries:

- `RemindersController` exposes HTTP endpoints.
- `RemindersService` owns reminder creation flow.
- Feature services use Drizzle for database access (via `DbModule`).
- Temporal client starts reminder workflows.
- OpenAPI describes the public API surface.

## Temporal responsibilities

Temporal owns durable execution:

- Store workflow history and timers.
- Sleep until the reminder due time.
- Run the reminder send activity when due.
- Retry activities according to explicit policy.
- Later: wait for WhatsApp replies and branch follow-up workflows.

Temporal should not own ordinary application data like cases, phone numbers, or reminder records. That belongs in the App DB.

## Drizzle + Supabase Postgres responsibilities

Drizzle owns typed access to the Postgres app database.

V0 tables can start smaller than the full future model if needed:

- `cases`
- `phone_numbers`
- `reminders`

Only add `users`, `vaccinations`, and `visits` once the reminder path needs them.

Schema source of truth: `src/db/schema.ts`. Migrations: `drizzle/*.sql`.

## OpenAPI responsibilities

OpenAPI should document the V0 API clearly enough that the reminder flow can be tested without reading the code.

Minimum endpoints:

- `POST /reminders` — create reminder and start workflow.
- `GET /reminders` — list reminders.
- `GET /reminders/:id` — inspect one reminder.

Nice later:

- `POST /dev/mock-reminders` — create reminders from `MockClinicDataSource`.

## Husky responsibilities

Husky should stay boring.

Good V0 hooks:

- unit tests (Bun test runner)

Avoid slow hooks early. If the hook makes committing painful, it will get bypassed.

## Compatibility note

Bun is the preferred runtime/package runner for this project, but Temporal TypeScript and NestJS compatibility should be verified in the standalone examples before committing the whole V0 to Bun-only execution.

If Temporal worker execution has Bun-specific problems, acceptable fallback:

- use Bun for package management and NestJS scripts
- run the Temporal worker with Node.js until Bun compatibility is proven

This is a compatibility fallback, not a change in project direction.
