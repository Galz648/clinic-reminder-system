# Clinica ASMX test fixtures

Sanitized list payloads extracted from local HAR captures. Used by `test/clinica-*.test.ts` instead of reading `.har` files (which are gitignored and may contain real PII).

| File | ASMX method | Rows |
|------|-------------|------|
| `load-clinic-reminders.json` | `LoadClinicReminders` | 15 |
| `get-vaccine-reminders.json` | `GetVaccineReminders` | 44 |

**Sanitization rules:** owner names → `בעלים N`, pet names → `חיה {PetID}`, phones → `050000000N`, emails → `ownerN@example.com`, GUIDs → `00000000-0000-4000-8000-…`, free-text notes/reminders → generic Hebrew placeholders. Structural IDs (`EventID`, `PetID`, `VacName`, dates) are preserved for mapper tests.
