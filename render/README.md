# Render Blueprints

Each file is a **separate Blueprint** (one YAML per Blueprint; Render does not merge multiple files).

| File | Resources | Apply order |
|---|---|---|
| [`temporal.yaml`](./temporal.yaml) | `temporal-db`, `temporal` (private service) | **1** — first |
| [`clinic-app.yaml`](./clinic-app.yaml) | `clinic-api`, `clinic-worker` | **2** — after Temporal exists |

App database (owners, cases, reminders) stays on **Supabase** — not defined here.

## Dashboard

1. **New → Blueprint** → connect this repo.
2. Set **Blueprint path** to `render/temporal.yaml` → sync (name the Blueprint e.g. `clinic-temporal`).
3. Repeat with path `render/clinic-app.yaml` (name e.g. `clinic-app`).
4. On first `clinic-app` sync, set `DATABASE_URL` / `DATABASE_URL_PRODUCTION` when prompted.

## CLI (validate only)

```bash
render blueprints validate ./render/temporal.yaml -o json --confirm
render blueprints validate ./render/clinic-app.yaml -o json --confirm
```

Applying Blueprints is Dashboard-only (CLI v2.21). Services already created via CLI can be adopted by syncing the matching Blueprint path.

**Production Temporal UI:** `bun run temporal:prod:tunnel` → http://localhost:8080 (SSH key required; see deployment doc).

Full runbook: [`clinic-reminder-system/clinic-reminder-system-render-deployment.md`](../clinic-reminder-system/clinic-reminder-system-render-deployment.md)
