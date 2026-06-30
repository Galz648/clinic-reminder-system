---
target: programming
type: project
status: active
created: 2026-06-29
---

# Clinic Reminder System

Project hub for the veterinary clinic reminder and follow-up system.

Parent index: [[Projects]]

## Core links

- [[clinic-reminder-system-specification]] — summarized scope, phases, deliverables, constraints
- [[clinic-reminder-system-architecture]] — Mermaid architecture diagrams
- [[clinic-reminder-system-user-flows]] — V0 assistant user flows (incl. non-mobile edge case)
- [[clinic-reminder-system-tooling]] — opinionated tools and local runtime shape
- [[clinic-reminder-system-render-deployment]] — Render setup (Temporal + NestJS API + worker)
- [[clinic-reminder-system-standalone-examples]] — small throwaway examples to reduce V1 complexity
- [[Vet Clinic Chrome Extension]] — related future ingestion work
- [[Vet Internship]] — clinic context

## Summary

Build a small service that automates reminders and later follow-up conversations for a single veterinary clinic, alongside the existing third-party clinic system.

V1 proves the backend foundation: create reminders, deduplicate them, persist them, and run a durable Temporal workflow that fires at the due date through a stubbed delivery interface.

Later versions replace the stubs with WhatsApp delivery, inbound replies, branching follow-up workflows, Chrome-extension ingestion, and a vet dashboard.

## Current phase

V1 — automated reminders only.

Do not build WhatsApp, real Chrome-extension ingestion, or the dashboard yet. Those are later phases.

## Notes

The main design rule is to keep V1 small while preserving clean boundaries:

- `ClinicDataSource` hides where clinic data comes from.
- `Sender` hides how messages are delivered.
- Temporal owns durable scheduling and future long-running workflows.
- The backend owns application logic, deduplication, and API boundaries.

## Production (Render + Supabase)

| | |
|---|---|
| **API** | https://clinic-api-wei1.onrender.com |
| **App DB** | Supabase Postgres (`ap-southeast-2` pooler) |
| **Temporal** | Render private service `temporal-gr9y:7233` |
| **Worker** | `clinic-worker` on Render (same region) |
| **Temporal UI** | Not deployed yet — see [[clinic-reminder-system-render-deployment#Temporal UI (next step)]] |
| **IaC** | `render/temporal.yaml`, `render/clinic-app.yaml` — Blueprints not linked in Dashboard yet |

Full runbook: [[clinic-reminder-system-render-deployment]].
