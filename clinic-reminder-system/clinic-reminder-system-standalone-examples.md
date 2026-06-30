---
target: programming
type: planning
status: draft
created: 2026-06-29
project: "[[clinic-reminder-system]]"
---

# Clinic Reminder System - Standalone Examples

Project: [[clinic-reminder-system]]
Specification: [[clinic-reminder-system-specification]]
Architecture: [[clinic-reminder-system-architecture]]

Purpose: reduce V1 complexity by proving each unfamiliar or integration-heavy part in isolation before combining them.

Rule: each example should be throwaway, local, and small. If it takes more than 30-60 minutes, the example is too broad.

## Example stack

| Order | Example | Tool touched | Proves | Stop when |
|---|---|---|---|---|
| 1 | SQLite + Drizzle reminder table | Drizzle, SQLite | Schema, insert, query, unique constraint | Duplicate reminder is rejected locally. |
| 2 | Temporal timer workflow | Temporal | Workflow can wait until a due time and run an activity | A workflow sleeps briefly, then logs `sent`. |
| 3 | NestJS create-reminder endpoint | NestJS | API shape without Temporal or Drizzle complexity | `POST /reminders` accepts payload and returns normalized reminder. |
| 4 | Sender interface stub | TypeScript/NestJS DI | Delivery is swappable | `ConsoleSender.send()` logs the exact message object. |
| 5 | ClinicDataSource mock | TypeScript interface | Ingestion is swappable | Mock returns one hardcoded reminder candidate. |
| 6 | Dedup function only | TypeScript | Dedup key is understood before DB integration | Same phone + type + window returns same key. |
| 7 | Thin vertical slice | NestJS + Drizzle + Temporal | V1 path works end to end | Create reminder → store → workflow waits → sender logs. |

## 1. Drizzle + SQLite only

Goal: prove the local data model before adding NestJS or Temporal.

Tiny scope:

```text
[script.ts] → [Drizzle] → [SQLite file]
```

Minimum tables:

- `cases`
- `phone_numbers`
- `reminders`

Minimum behavior:

- insert one case
- insert one phone number
- insert one reminder
- query pending reminders
- reject duplicate reminder by metadata key

Useful because V1 depends on deduplication more than on UI or delivery.

## 2. Temporal timer only

Goal: prove the durable scheduling idea without clinic data or a database.

Tiny scope:

```text
[start-workflow script] → [Temporal workflow] → wait 10s → [log activity]
```

Minimum behavior:

- start workflow with `{ reminderId, dueAt, message }`
- workflow sleeps until `dueAt`
- workflow calls `sendReminderActivity`
- activity logs the message

Do not include Drizzle here. Do not include NestJS here.

## 3. NestJS endpoint only

Goal: prove the external API shape separately.

Tiny scope:

```text
curl POST /reminders → [NestJS controller] → [in-memory array]
```

Minimum behavior:

- accept reminder creation payload
- validate required fields
- return created reminder object
- list reminders

No Temporal. No Drizzle. No deployment.

## 4. Sender interface stub

Goal: prevent WhatsApp from leaking into V1.

Tiny scope:

```text
[ReminderService] → [Sender interface] → [ConsoleSender]
```

Minimum behavior:

- `Sender.send(message)` accepts a stable message object
- `ConsoleSender` logs it
- later WhatsApp sender can implement the same interface

This protects V1 from becoming a WhatsApp project too early.

## 5. ClinicDataSource mock

Goal: prevent the Chrome extension from leaking into V1.

Tiny scope:

```text
[MockClinicDataSource] → reminder candidates
```

Minimum behavior:

- returns one or more hardcoded reminder candidates
- backend code depends on the interface, not on the real clinic system
- real Chrome extension can later replace the mock

This protects V1 from becoming a reverse-engineering project too early.

## 6. Dedup function only

Goal: make the dedup rule explicit before relying on the database.

Tiny scope:

```text
(phone, reminderType, dueDate window) → dedupKey
```

Minimum behavior:

- same phone + same type + same window creates same key
- different animal/case assumption is documented
- free-text message is not part of the key

Possible key shape:

```text
normalizedPhone + reminderType + yyyy-mm-dd-window
```

## 7. Thin V1 vertical slice

Only after the smaller examples work.

Target flow:

```text
curl POST /reminders
  → NestJS validates input
  → Drizzle inserts reminder or rejects duplicate
  → Temporal workflow starts
  → workflow waits until due time
  → Sender interface logs message
```

This is the first real V1 implementation candidate.

## Complexity downgrade rules

If V1 feels too large, cut in this order:

1. Use one table first: `reminders` only.
2. Use short delays first: 10-30 seconds, not real future dates.
3. Use in-memory data before Drizzle if the API shape is unclear.
4. Use a plain script before NestJS if Temporal wiring is unclear.
5. Keep WhatsApp, Chrome extension, dashboard, and LLM completely out.

## What not to build during examples

- Real WhatsApp delivery.
- Real clinic-system scraping.
- Browser extension code.
- Dashboard.
- LLM classification.
- Production deployment.
- Full user/case/vaccination/visit schema unless the smaller reminder model is already working.
