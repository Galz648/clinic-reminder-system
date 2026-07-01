# Clinica Online — API map (HAR-derived)

Tenant: **Toran** (`https://toran.clinicaonline.co.il`)  
Endpoint family: **`POST /Restricted/dbCalander.asmx/{Method}`** → `{ "d": … }`  
Auth: WebForms login + branch ([FINDINGS.md](./FINDINGS.md)). Same session cookies on all calls.

Method catalog (575 names + param keys): `GET /Restricted/dbCalander.asmx/js` after login.

---

## IDs

| ID | Role |
|----|------|
| **UserID** / **PatientID** | Owner GUID (same value, different param names) |
| **PetID** | Pet/case — **which animal a reminder is about** |
| **EventID** | Reminder row dedup key (`LoadClinicReminders`) |
| **CustNumber** | Clinic customer number (not the owner GUID) |
| **FollowCatID** / **SelectedCat** | Follow-up category filter (see below) |

---

## Two reminder flows (not one)

### A — Staff follow-ups (captured)

**Source:** `LoadClinicReminders` on `patientlistvet.aspx`  
**HAR:** `04-load-clinic-reminders.har`, implemented in `ClinicaApiService`

```
POST LoadClinicReminders
{ SelectedCat, fromDate, toDate, GetConfirmed, AllBranches, … }
```

Default `SelectedCat: "13"` (`CLINICA_REMINDER_CATEGORY_ID`) — Florentin follow-up queue.  
Response: **`RegSessionRem[]`**.

| Field | Use |
|-------|-----|
| **`PetID`** | **Canonical case id** (`external_case_id`) — always set in HAR |
| **`PatientID`** | Owner (`external_owner_id`) |
| **`EventID`** | Dedup |
| **`Reminder`** | **Staff message** — classify type from this text |
| **`PatientName`** | `"owner + pet"` display hint; **`PetName` often empty** |
| **`CellPhone`** | Outreach + `SearchByPhone` |
| **`FollowCatID`** | Row category (HAR `04`: all `13` — same as list filter) |
| **`Confirmed`** | `0` = open |

**Classification (this flow):** parse **`Reminder`** (Hebrew free text). Examples from HAR `04`: book cleaning (`visit`), fasting/check-in (`general`), post-op check (`follow_up`). Do **not** expect vaccination rows here — none appeared in capture.

### B — Vaccination reminders (separate — not captured as daily list)

Vaccination is **not** the same as `LoadClinicReminders` cat `13`. UI hints (`SaveParams`: `SortVaccine`, `CurrentVac`) and proxy methods point to a **different pipeline**:

| Method (proxy only unless noted) | Likely role |
|-----------------------------------|-------------|
| **`GetVaccineReminders`** | Clinic vaccination reminder list — **needs HAR** |
| **`GetVaccineRemindersForPet`** | Per-pet vaccine reminders |
| **`SendManualVaccineReminder`** | Manual send |
| **`ConfirmVaccReminder`** | Mark done |
| **`GetPetVaccines2`** / **`GetPetVaccinesForSearch`** | Pet chart: due/history vaccines (`updatedLatestFlow.har`) — **not** the outbound queue |

**Open:** record HAR for the patient-list **vaccination tab** (or whatever triggers `GetVaccineReminders`) before implementing `reminderType: vaccination` from Clinica.

---

## Correct animal on a reminder

Trust order:

1. **`PetID`** on the reminder row (follow-up or vaccine list once captured)
2. Parse **`PatientName`** after `+` for display only
3. Optional **`LoadPetDetails({ PetID })`** — canonical name/breed
4. Optional **`GetPetsNames({ PatientID })`** — verify pet belongs to owner

**Do not** pick the animal via `SearchByPhone` — that resolves **owner** only. Multi-pet owners (e.g. same owner with PetID `117784` / `127242`) require **`PetID`**, not phone.

---

## Owner / lookup (enrichment)

| Method | Request | Response | HAR |
|--------|---------|----------|-----|
| **SearchByPhone** | `{ PhoneNumber, UserID, LastName }` | `RegPersonal[]` | FINDINGS, Nest ✅ |
| **SearchByCustNumber** | `{ rpd, CustNumber }` | `RegPersonal[]` | `searchByCustomerNumber*.har` |
| **GetLastPatients** | `{ move, fromDate }` | `RegPersonal[]` | `03`, `updatedLatestFlow` |
| **GetPetsNames** | `{ PatientID }` | `RegPet[]` | `updatedLatestFlow`, `searchByCustomerNumberRealData` |
| **LoadPetDetails** | `{ PetID }` | `RegPet` | same |

Tie-break phone hits: `UserID === PatientID` from the reminder row.

---

## Minimal chains

**Follow-up batch (V0 today):**

```
LoadClinicReminders(date)
  → PetID, PatientID, Reminder, CellPhone, EventID
  → SearchByPhone(phone) for owner details [optional]
  → LoadPetDetails(PetID) for canonical pet name [optional]
  → classify from Reminder text
```

**Vaccination batch (future):**

```
GetVaccineReminders(?)   ← HAR needed
  → expect PetID + due vaccine + message fields
  → same PetID / owner resolution as above
```

---

## HAR index

| File | Content |
|------|---------|
| `01-login.har` / `02-select-clinic-florentin.har` | Session |
| `03-get-last-patients.har` | `GetLastPatients` |
| `04-load-clinic-reminders.har` | **`LoadClinicReminders`** (follow-ups) |
| `updatedLatestFlow.har` | List → chart → **`GetPetsNames`**, **`LoadPetDetails`**, **`GetPetVaccines2`** |
| `searchByCustomerNumber.har` | `SearchByCustNumber` miss |
| `searchByCustomerNumberRealData.har` *(local, gitignored)* | `SearchByCustNumber` hit (`90001` → owner `00000000-0000-4000-8000-…`) |

---

## Nest implementation status

| Method | In `ClinicaApiService` |
|--------|-------------------------|
| `GetLastPatients`, `LoadClinicReminders`, `SearchByPhone` | ✅ |
| `SearchByCustNumber`, `GetPetsNames`, `LoadPetDetails`, `GetVaccineReminders*` | ❌ |

Spec: [v0-clinica-load-reminders.md](../../clinic-reminder-system/v0/v0-clinica-load-reminders.md)
