# Render deployment — clinic reminder system

Project: [[clinic-reminder-system]]
Specification: [[clinic-reminder-system-specification]]
Tooling: [[clinic-reminder-system-tooling]]

## What runs where

| Component | Host | Render service type | Production status |
|---|---|---|---|
| App database (owners, cases, reminders) | **Supabase Postgres** (`ap-southeast-2`) | *not on Render* | **Live** — schema migrated via API pre-deploy |
| Temporal server | **Render** Singapore | `private_service` (`temporal`) | **Live** — `temporal-gr9y:7233` (private network) |
| Temporal persistence DB | **Render** Singapore | Render Postgres (`temporal-db`) | **Live** — `basic_256mb`, internal hostname only (IP allow list cleared) |
| NestJS API | **Render** Singapore | `web` (`clinic-api`) | **Live** — https://clinic-api-wei1.onrender.com |
| Temporal worker | **Render** Singapore | `worker` (`clinic-worker`) | **Live** — polls `reminder-queue` |
| Temporal UI | — | not deployed | **Missing** — see [Temporal UI (next step)](#temporal-ui-next-step) |
| Render Blueprints (IaC) | this repo `render/` | Dashboard sync | **Missing** — services created via CLI; Blueprints not linked yet |
| GitHub → Render (private repo) | GitHub | OAuth | **N/A** — repo is **public**; CLI deploy works without linking |

**Workspace:** `tea-cvhh357noe9s739i59og` (My Workspace) · **Region:** `singapore`

### Render resource IDs (2026-06-30)

| Name | ID | Dashboard |
|---|---|---|
| `temporal-db` | `dpg-d91pgebtqb8s739ftd4g-a` | [Postgres](https://dashboard.render.com/d/dpg-d91pgebtqb8s739ftd4g-a) |
| `temporal` | `srv-d91pim8js32c739rb0d0` | [Private service](https://dashboard.render.com/pserv/srv-d91pim8js32c739rb0d0) |
| `clinic-api` | `srv-d91prolaeets73fvmh10` | [Web](https://dashboard.render.com/web/srv-d91prolaeets73fvmh10) |
| `clinic-worker` | `srv-d91prqok1i2s739m8fa0` | [Worker](https://dashboard.render.com/worker/srv-d91prqok1i2s739m8fa0) |

### Still to do (operations)

| Item | Why | How |
|---|---|---|
| **Link Blueprints** | IaC drift — CLI config not managed by YAML sync | Dashboard → New → Blueprint → `render/temporal.yaml`, then `render/clinic-app.yaml` (adopts existing resources by name) |
| **Temporal UI** | Cannot inspect workflows in prod today | See [Temporal UI (next step)](#temporal-ui-next-step) |
| **Commit blueprint + docs** | Repo was ahead of `main` | This commit |
| **Optional: make repo private again** | Source is public for Render CLI deploy | GitHub visibility + connect Render GitHub app |
| **Optional: `.bun-version`** | Pin Bun on Render (currently 1.3.4 default) | Add file with `1.3.11` to match local |
| **Monitor worker restarts** | Worker stopped once after API redeploys | `render logs -r clinic-worker`; `render restart clinic-worker` if queue stalls |

### Monthly cost (always-on Starter stack)

| Resource | Plan | ~$/mo |
|---|---|---|
| `temporal-db` | `basic_256mb` | ~$7 |
| `temporal` | `starter` | $7 |
| `clinic-api` | `starter` | $7 |
| `clinic-worker` | `starter` | $7 |
| **Render subtotal** | | **~$28** |
| Supabase | separate billing | — |

Local Docker Compose maps 1:1 to this split: Supabase replaces `supabase-db`, Render replaces `temporal*` services, Bun processes become Render web/worker services.

## Critical constraint: gRPC + private network

Temporal speaks **gRPC**. Render does **not** expose gRPC on public URLs.

From [Render’s Temporal guide](https://render.com/docs/deploy-temporal):

- Deploy **Temporal as a private service** (`type: pserv`).
- Run the **NestJS API** and **your Temporal worker on Render** in the same workspace/region so they reach Temporal over Render’s **private network**.
- App DB stays on **Supabase** (public Postgres URI over the internet — fine for Postgres).
- To trigger workflows from outside Render (serverless, laptop), use **Tailscale** or Render’s optional **REST→gRPC proxy** — not needed if API and worker are on Render.

## Recommended rollout (two Blueprints in this repo)

Blueprint files live under [`render/`](../render/). **One YAML file = one Blueprint** in the Dashboard (set **Blueprint path** per sync). See [`render/README.md`](../render/README.md).

### Phase 1 — Temporal (`render/temporal.yaml`)

Creates `temporal-db` + `temporal` (private service, `temporalio/auto-setup`).

1. Render Dashboard → **New** → **Blueprint** → connect `Galz648/clinic-reminder-system`.
2. **Blueprint path:** `render/temporal.yaml` (name the Blueprint e.g. `clinic-temporal`).
3. Sync. Pick **Singapore** (`singapore`) to stay close to Supabase `ap-southeast-2`.
4. After first deploy, create Temporal databases if needed:
   ```bash
   render psql temporal-db -c "CREATE DATABASE temporal;" --confirm
   render psql temporal-db -c "CREATE DATABASE temporal_visibility;" --confirm
   ```

> Alternative: [temporalio/temporal-render-simple](https://github.com/temporalio/temporal-render-simple) (external template with UI). Production scale later: [render-examples/temporal](https://github.com/render-examples/temporal).

### Phase 2 — App (`render/clinic-app.yaml`)

Creates `clinic-api` + `clinic-worker`. Requires private service **`temporal`** from Phase 1.

1. **New** → **Blueprint** → same repo, **Blueprint path:** `render/clinic-app.yaml`.
2. On first sync, set `DATABASE_URL` / `DATABASE_URL_PRODUCTION` when prompted (`sync: false`).
3. `TEMPORAL_ADDRESS` wires automatically via `fromService` → `temporal` `hostport`.

## Render CLI (official)

> **Note:** `render config init` is from an **old third-party CLI**. Use `render login` ([CLI docs](https://render.com/docs/cli)).

```bash
brew install render
render login
render workspace set <workspace-id>   # e.g. tea-...
render whoami
```

### What the CLI can and cannot do

| Action | CLI | Dashboard |
|---|---|---|
| Validate Blueprint YAML | `render blueprints validate ./render/temporal.yaml` (or `./render/clinic-app.yaml`) | — |
| **Apply** Blueprint (create/sync) | **No** — not in CLI v2.21 | **New → Blueprint** (set custom path) |
| Create Postgres | `render postgres create --confirm ...` | Yes |
| Create web / worker / private services | `render services create --confirm ...` | Yes |
| Deploy / logs / SSH | `render deploys create`, `render logs -r <id>`, `render ssh <name>` | Yes |

CLI service `--type` values differ from `render.yaml`: use `web_service`, `private_service`, `background_worker` (not `web`, `pserv`, `worker`).

### CLI session — what we ran (2026-06-30)

**1. Workspace + validate**

```bash
render workspace set tea-cvhh357noe9s739i59og --confirm
render blueprints validate ./render/temporal.yaml -o json --confirm
render blueprints validate ./render/clinic-app.yaml -o json --confirm
```

**2. Temporal Postgres** (free tier allows **one** DB per workspace)

```bash
render postgres create --confirm -o json \
  --name temporal-db \
  --database-name temporal \
  --database-user temporal \
  --region singapore \
  --plan free
```

Get internal connection details (includes password — do not log):

```bash
render postgres get temporal-db --include-sensitive-connection-info -o json --confirm
```

**3. Create `temporal` private service** (`temporalio/auto-setup`, single Postgres — same idea as local Docker Compose)

```bash
render services create --confirm -o json \
  --name temporal \
  --type private_service \
  --region singapore \
  --plan starter \
  --image docker.io/temporalio/auto-setup:1.25.2 \
  --env-var DB=postgres12 \
  --env-var DB_PORT=5432 \
  --env-var POSTGRES_USER=temporal \
  --env-var POSTGRES_PWD=<from-connectionInfo> \
  --env-var POSTGRES_SEEDS=<internal-host-from-connectionInfo> \
  --env-var BIND_ON_IP=0.0.0.0
```

First deploy failed: `database "temporal" does not exist`. Fix:

```bash
render psql temporal-db -c "CREATE DATABASE temporal;" --confirm
render psql temporal-db -c "CREATE DATABASE temporal_visibility;" --confirm
render deploys create srv-d91pim8js32c739rb0d0 --confirm --wait
# → Deploy succeeded; frontend listening on :7233 (private network)
```

**4. App services (`clinic-api`, `clinic-worker`) — deployed (public repo)**

Repo made public; services created via CLI (no GitHub OAuth needed):

```bash
# clinic-api → https://clinic-api-wei1.onrender.com
# clinic-worker → background worker on reminder-queue
# startCommand (API): bun src/main.ts  (dist/ not available at Render runtime)
```

Env vars set via Render API (`DATABASE_URL`, `DATABASE_URL_PRODUCTION`, `TEMPORAL_ADDRESS=temporal-gr9y:7233`, `API_PUBLIC_URL`). **Do not** use partial env-var PUT — it replaces the full set.

**5. Split Blueprints** (this commit)

- `render/temporal.yaml` — `temporal-db` + `temporal`
- `render/clinic-app.yaml` — `clinic-api` + `clinic-worker`
- Root `render.yaml` removed (use custom Blueprint paths)

### Useful commands

| Command | Purpose |
|---|---|
| `render services -o json --confirm` | List services + Postgres |
| `render postgres get <name> --include-sensitive-connection-info` | Connection strings |
| `render deploys create <SERVICE_ID> --wait` | Redeploy |
| `render logs -r <SERVICE_ID> --limit 50 -o text --confirm` | Recent logs |
| `render blueprints validate ./render/<file>.yaml` | Lint a Blueprint file |

CI: set `RENDER_API_KEY` and use `--confirm -o json`.

## Environment variables (production)

Set in Render Dashboard or Blueprint YAML. **Do not commit secrets.**

| Variable | Service(s) | Value |
|---|---|---|
| `DATABASE_URL` | API, worker | Supabase transaction pooler URI (`DATABASE_URL_PRODUCTION` from local `.env`) |
| `TEMPORAL_ADDRESS` | API, worker | `host:7233` on private network — `fromService` → `temporal` in `render/clinic-app.yaml` |
| `TEMPORAL_NAMESPACE` | API, worker | `default` |
| `TEMPORAL_TASK_QUEUE` | API, worker | `reminder-queue` |
| `API_PUBLIC_URL` | API | `https://clinic-api-wei1.onrender.com` (or `RENDER_EXTERNAL_URL` via Blueprint `fromService`) |
| `DATABASE_URL_PRODUCTION` | API (pre-deploy) | Same Supabase pooler URI as `DATABASE_URL` |
| `PORT` | API | `10000` (Render default; app reads `PORT`) |
| `NODE_ENV` | API, worker | `production` |

API **pre-deploy**: `bun run db:migrate:prod` runs Drizzle migrations against Supabase before each deploy.

Worker **does not** expose HTTP; it connects outbound to Temporal + Supabase.

## Private networking (no IP whitelisting between services)

Render services in the **same workspace + region** talk over a **private network** using **stable internal hostnames**, not public IPs. [Inbound IP rules](https://render.com/docs/inbound-ip-rules) apply only to **public internet** traffic — they do **not** restrict inter-service traffic.

| Link | How it connects | Host / URL |
|---|---|---|
| API / worker → Temporal | gRPC on private network | `temporal-gr9y:7233` (`TEMPORAL_ADDRESS`) |
| Temporal → `temporal-db` | Postgres internal URL | `POSTGRES_SEEDS=dpg-d91pgebtqb8s739ftd4g-a` (not an IP) |
| API / worker → app DB | Supabase pooler over internet | `DATABASE_URL` (Supabase credentials; separate from Render) |

`temporal-db` **IP allow list** controls **external** laptop/CI access only. Render services use the **internal** hostname regardless of that list. Prefer `render psql temporal-db` for admin instead of whitelisting your home IP (`--clear-ip-allow-list` blocks all external DB access).

### Verified (2026-06-30)

1. **API → Temporal (gRPC)** — one-off job on `clinic-api` connected via `@temporalio/client` to `temporal-gr9y:7233` (`TEMPORAL_GRPC_OK`).
2. **API → Temporal (workflow)** — `POST /reminders` returned `workflowId: reminder-cafe139e-...`.
3. **Worker → Temporal → Supabase** — same reminder transitioned `pending` → `sent` at `dueAt` (full timer workflow).
4. **Worker** — polls `reminder-queue` on private network (`Temporal worker listening` in logs).

Re-run the gRPC check:

```bash
render jobs create clinic-api --start-command \
  'bun -e "import { Connection } from \"@temporalio/client\"; const c = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS }); console.log(\"TEMPORAL_GRPC_OK\"); await c.close();"' \
  --confirm -o json
render jobs list clinic-api --confirm -o json
```

## Bun on Render

This repo uses Bun locally. On Render ([Bun docs](https://bun.com/docs/guides/deployment/render)):

- Keep `bun.lock` in the repo (already present).
- Runtime: **Node** (Render still installs Bun when `bun.lock` exists).
- `buildCommand`: `bun install && bun run build`
- `startCommand` (API): `bun src/main.ts` (`dist/` is not present at Render runtime; compiled `node dist/main.js` fails)
- `startCommand` (worker): `bun run start:worker`

Optional: add `.bun-version` with `1.3.11` to match local.

## Temporal UI (next step)

**Not deployed in production.** The `temporalio/auto-setup` image includes UI on port **8080** inside the container, but our Blueprint only exposes the gRPC frontend on the private network — there is no public URL.

Options (pick one in a follow-up):

| Option | Exposure | Pros | Cons |
|---|---|---|---|
| **A. SSH port-forward** | Local only | No new services; works with current `temporal` pserv | Manual; requires SSH key in Render |
| **B. Add `temporal-ui` pserv** | Private + SSH tunnel | Matches Render Temporal docs; stays off public internet | Extra Starter service (~$7/mo) or share `temporal` container ports |
| **C. Add `temporal-ui` web + auth** | Public URL | Easy browser access | Must add password/OAuth; clinic data visible in UI |
| **D. Temporal Cloud UI** | Temporal Cloud | Managed; no self-hosted UI | Migrates Temporal off Render |
| **E. Local UI → prod** | Dev machine | `tctl` / Temporal CLI against forwarded gRPC | Not a shared team UI |

### Option A — SSH port-forward (quickest, no deploy)

```bash
# Forward Temporal UI (8080) and/or gRPC (7233) from the private service
render ssh temporal -- -L 8080:localhost:8080 -L 7233:localhost:7233
# Browser: http://localhost:8080
```

Requires [SSH keys on Render](https://render.com/docs/ssh-keys). UI talks to Temporal on `localhost:7233` inside the container.

### Option B — dedicated UI private service (recommended for prod ops)

Add to `render/temporal.yaml` (or a third Blueprint `render/temporal-ui.yaml`):

```yaml
  - type: pserv
    name: temporal-ui
    runtime: image
    region: singapore
    plan: starter
    image:
      url: docker.io/temporalio/ui:2.31.2
    envVars:
      - key: TEMPORAL_ADDRESS
        fromService:
          name: temporal
          type: pserv
          property: hostport
      - key: TEMPORAL_CORS_ORIGINS
        value: http://localhost:8080
```

Access via `render ssh temporal-ui -- -L 8080:8080` (or tunnel from your machine).

### Option C — public web (only with access control)

Deploy `temporalio/ui` as `type: web`, set `TEMPORAL_ADDRESS` via private hostname (Render web services can reach pserv on the private network). **Add** HTTP basic auth or Render IP rules on the web service — do not leave workflow history public.

---

Legacy note: the [temporal-render-simple](https://github.com/temporalio/temporal-render-simple) template ships a public `temporal-ui` web service. We intentionally skipped that for a private clinic system.

## Verification checklist

1. `render blueprints validate ./render/temporal.yaml` and `./render/clinic-app.yaml` pass.
2. Temporal healthy: `render logs -r temporal` — no DB connection errors; or SSH → `tctl cluster health` → `SERVING`.
3. `bun run db:migrate:prod` runs on API pre-deploy against Supabase.
4. `GET https://clinic-api-wei1.onrender.com/` → `Hello World!`; Swagger at `/docs` if enabled.
5. Worker logs: `Temporal worker listening on task queue "reminder-queue"`.
6. `POST /reminders` → `workflowId` returned; reminder becomes `sent` at `dueAt` (verified 2026-06-30).
7. **Pending:** workflow visible in Temporal UI (after UI option chosen above).
8. **Pending:** Blueprints linked in Dashboard (`render/temporal.yaml`, `render/clinic-app.yaml`).
## Alternatives

| Approach | When |
|---|---|
| [Temporal Cloud](https://temporal.io/cloud) | Skip self-hosting Temporal on Render entirely; set `TEMPORAL_ADDRESS` to cloud endpoint + mTLS certs. |
| Worker only on Render | Temporal hosted elsewhere; workers connect over Tailscale or VPN. |
| [Render Workflows](https://render.com/docs/workflows) | Managed orchestration (beta) — different product from Temporal; not a drop-in replacement today. |
