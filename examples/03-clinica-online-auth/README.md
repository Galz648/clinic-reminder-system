# Example 03 — ClinicaOnline auth probe

Programmatic exploration of [ClinicaOnline](https://clinicaonline.co.il) login for the **Toran** clinic tenant (`toran.clinicaonline.co.il`). Goal: understand whether our reminder API can authenticate server-side and reuse session cookies to read clinic data.

**Credentials are not in the repo.** Add them locally only:

```bash
# repo root .env (or copy examples/03-clinica-online-auth/.env.example)
CLINICA_BASE_URL=https://toran.clinicaonline.co.il
CLINICA_USERNAME=your_user
CLINICA_PASSWORD=your_pass
CLINICA_BRANCH_ID=41016_41002_0   # Florentin (see FINDINGS.md for others)
```

## Run

```bash
cd examples/03-clinica-online-auth
bun install
bun --env-file=../../.env run start
```

Without credentials, the script runs a safe invalid-login probe and CORS check. With credentials, it replays both HAR captures (local files — **not committed**; see below):

| Step | Request | HAR (local) |
|------|---------|-------------|
| 1 | `GET /login.aspx` | `01-login.har` |
| 2 | `POST /login.aspx` → `302 /SetBranch.aspx?c=41002` | `01-login.har` #34 |
| 3 | `GET /SetBranch.aspx?c=41002` | `01-login.har` #35 |
| 4 | `POST /SetBranch.aspx?c=41002` → `302 newcalander.aspx` | `02-select-clinic-florentin.har` #0 |
| 5 | `GET /vetclinic/managersa/newcalander.aspx?clinicserver=4` | `02-select-clinic-florentin.har` #1 |
| 6 | `POST …/GetLastPatients` | `03-get-last-patients.har` #3 |
| 7 | `POST …/LoadClinicReminders` | `04-load-clinic-reminders.har` #0 |
| 8 | `POST …/SearchByPhone` | browser capture (owner lookup by phone) |

## HAR captures (local only)

`*.har` is in [`.gitignore`](../../.gitignore) — captures may contain session cookies and real patient PII. Keep them on your machine for manual exploration; **tests and docs use sanitized JSON** under [`test/fixtures/clinica/`](../../test/fixtures/clinica/).

| File | Records |
|------|---------|
| `01-login.har` | Login → branch picker |
| `02-select-clinic-florentin.har` | Select Florentin branch → calendar + ASMX data |
| `03-get-last-patients.har` | `GetLastPatients` — last 20 changed patients |
| `04-load-clinic-reminders.har` | `LoadClinicReminders` — daily follow-up list (15 rows) |
| `updatedLatestFlow.har` | Patient list → chart → pets / vaccines |
| `getVaccineReminders.har` | `GetVaccineReminders` — daily vaccination queue |
| `searchByCustomerNumber.har` | `SearchByCustNumber` (no match) |
| `searchByCustomerNumberRealData.har` | `SearchByCustNumber` (example hit, e.g. cust `90001`) |

**[API-MAP.md](./API-MAP.md)** — concise ASMX map (pet + message + follow-up vs vaccination flows)  
Full analysis: **[FINDINGS.md](./FINDINGS.md)** — V0 spec: **[v0-clinica-load-reminders.md](../../clinic-reminder-system/v0/v0-clinica-load-reminders.md)**

## Auth flow type

**Server-side session cookie authentication** on ASP.NET WebForms — not OAuth, not API keys.

1. **Forms Auth** — username/password POST sets an HttpOnly auth ticket cookie (typically `.ASPXAUTH`).
2. **ASP.NET session** — `ASP.NET_SessionId` bound to ViewState on each WebForms page.
3. **Branch context** — second WebForms POST commits clinic selection (`SetBranch.aspx`).
4. **Legacy AJAX API** — authenticated JSON POSTs to `/Restricted/dbCalander.asmx/{Method}` reuse the same cookies.

Must run entirely **server-side** (cookie jar); browser cross-origin fetch is blocked (no CORS).

## Clinic URL

Login page: https://toran.clinicaonline.co.il/login.aspx
