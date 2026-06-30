# Example 02 — Temporal timer only

Proves durable scheduling without NestJS or Drizzle: workflow sleeps ~10 seconds, then an activity logs `sent`.

## Prerequisites

From the repo root, start Temporal:

```bash
bun run temporal:up
```

## Run

Terminal 1:

```bash
cd examples/02-temporal-timer
bun install
bun --env-file=../../.env run worker
```

Terminal 2:

```bash
bun --env-file=../../.env run client
```

If Bun has trouble with the worker bundler, try Node from this folder:

```bash
npx tsx --env-file=../../.env src/worker.ts
npx tsx --env-file=../../.env src/client.ts
```

Expected: client prints `Temporal timer example passed` after ~10 seconds.

Temporal UI: value of `TEMPORAL_UI_URL` in repo `.env`.
