# Standalone examples

Small throwaway proofs from [[clinic-reminder-system-standalone-examples]]. Run these before wiring the full V0 vertical slice.

| Example | Folder | Proves |
|---|---|---|
| 1 | `01-drizzle-postgres` | Schema, insert, query against Postgres (Supabase-compatible) |
| 2 | `02-temporal-timer` | Workflow sleeps until due time, activity logs `sent` |
| 3 | `03-clinica-online-auth` | ClinicaOnline WebForms login probe, CORS, session model ([FINDINGS](./03-clinica-online-auth/FINDINGS.md)) |

Each example has its own `package.json` so you can install and run it in isolation.

Recommended order: **01 → 02 → 03 (when wiring external clinic) → main app**.
