---
target: programming
type: specification
status: draft
created: 2026-06-29
project: "[[clinic-reminder-system]]"
---

# Clinic Reminder System - Specification

Project: [[clinic-reminder-system]]
Architecture: [[clinic-reminder-system-architecture]]
Tooling: [[clinic-reminder-system-tooling]]
Standalone examples: [[clinic-reminder-system-standalone-examples]]
Related: [[Vet Clinic Chrome Extension]], [[Vet Internship]]

## Problem

The clinic uses a third-party system for customers, animals, appointments, vaccinations, and visits. Customer communication is manual: an assistant reads reminder text from the clinic system and sends WhatsApp messages by hand.

This project automates reminders and later follow-up workflows without disrupting the existing clinic system.

## Users and needs

| User | Need |
|---|---|
| Clinic assistant | Stop manually tracking and sending routine reminders. |
| Veterinarian | See escalated follow-ups and unresolved case statuses. |
| Pet owner | Receive timely reminders and simple follow-up questions. |

## Domain model — owners, cases, and phones

- **Owners** are people; they can be linked to **many cases** (multiple pets, or co-owner on another household's pet).
- **Phone numbers** belong to an owner (their contact inventory).
- **Per case**, the clinic designates a **primary** and **secondary** mobile for reminders about that pet. Primary is the main WhatsApp contact; secondary is a backup (spouse, co-owner, alternate number).
- **V0 gap:** primary/secondary are not stored on the case yet — see [[clinic-reminder-system-user-flows]] for the full relationship diagram and the cross-case duplicate edge case.

## V1 scope — automated reminders

V1 proves the durable backend foundation.

In scope:

- Create and list reminders through a NestJS backend.
- Store users, cases, phone numbers, reminders, vaccinations, and visits with Drizzle.
- Use SQLite locally first, then Supabase Postgres for production.
- Start a Temporal workflow for each reminder.
- Wait until the due date and fire the reminder.
- Deduplicate by phone number + reminder type + time window.
- Reject reminder creation when the chosen phone is not an Israeli mobile (WhatsApp channel).
- Keep delivery behind a `Sender` interface.
- Keep ingestion behind a `ClinicDataSource` interface.
- Test end-to-end locally before deployment.

Out of scope for V1:

- Real WhatsApp delivery.
- Inbound replies.
- LLM severity classification.
- Chrome-extension ingestion.
- Vet dashboard.
- Multi-tenant or multi-branch support.
- Distributed queues, sharding, Kubernetes, or complex scaling.

## V1 deliverables

| Deliverable | Description |
|---|---|
| Data model | Drizzle schema for users, cases, phone numbers, reminders, vaccinations, visits. |
| Backend API | NestJS endpoints for creating and listing reminders. |
| Deduplication | DB-level uniqueness plus application-level check before workflow creation. |
| Temporal workflow | Durable fire-and-forget reminder workflow that sleeps until the due date. |
| Sender interface | Stub delivery implementation: log line, console output, or manual hand-off. |
| ClinicDataSource interface | Mock implementation standing in for future Chrome-extension ingestion. |
| Local E2E test | Create a reminder locally and watch Temporal execute it. |
| Deployment path | Swap SQLite to Supabase Postgres and deploy NestJS + Temporal separately on Render. |

## Later phases

### V2 — WhatsApp follow-ups

- Replace stub sender with WhatsApp Business API or provider such as Twilio.
- Add inbound reply webhook.
- Signal waiting Temporal workflows when customers reply.
- Classify reply severity with an LLM.
- Branch workflow: auto-answer, ask another question, escalate to vet, or surface on dashboard.

### V3 — real ingestion and dashboard

- Build Chrome extension after hands-on access to a clinic machine.
- Use the staff member's authenticated browser session.
- Capture appointment/customer data and send it to the backend.
- Add vet dashboard for case statuses and escalations.

## Hard constraints

- Single clinic.
- One timezone.
- Low volume: a few reminders per day.
- No production pressure yet.
- No official API access to the clinic system.
- One case per phone number as simplifying assumption.
- Core infrastructure needs to stand up quickly.

## Key design decisions

- Use Temporal now because V2 workflows will wait hours or days for replies and must survive crashes/redeploys.
- Keep V1 small: reminders only, fake data source, fake sender.
- Use explicit interfaces so real ingestion and delivery can replace the stubs later.
- Deduplicate at the case/phone/reminder-type level, not by free-text reminder content.
- Treat workflow versioning as a future risk once branching follow-ups exist.
