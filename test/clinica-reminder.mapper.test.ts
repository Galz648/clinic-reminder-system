import { describe, expect, test } from 'bun:test';

import { toClinicaReminderCandidate } from '../src/clinic-online/mappers/clinica-reminder.mapper';
import {
  formatClinicaDate,
  mapClinicaReminder,
  parseClinicaDateTime,
  splitPatientName,
} from '../src/clinic-online/types/clinica-reminder.types';
import { loadClinicaFixture } from './clinica-fixtures';

function loadFixtureReminders() {
  return loadClinicaFixture<Record<string, unknown>>('load-clinic-reminders.json');
}

describe('LoadClinicReminders fixture', () => {
  test('parses 15 reminders from sanitized fixture', () => {
    const raw = loadFixtureReminders();
    expect(raw.length).toBe(15);
    const mapped = raw.map((row) => mapClinicaReminder(row as never));
    expect(mapped[0].eventId).toBe(2488388);
    expect(mapped[0].patientId).toBe('00000000-0000-4000-8000-000000000001');
  });

  test('maps toward V0 reminder candidate shape', () => {
    const raw = loadFixtureReminders();
    const candidate = toClinicaReminderCandidate(mapClinicaReminder(raw[0] as never));
    expect(candidate.externalOwnerId).toBe('00000000-0000-4000-8000-000000000001');
    expect(candidate.externalCaseId).toBe('83517');
    expect(candidate.externalEventId).toBe('2488388');
    expect(candidate.ownerName).toBe('בעלים 1');
    expect(candidate.petName).toBe('חיה 83517');
    expect(candidate.phoneRaw).toBe('0500000001');
    expect(candidate.suggestedReminderType).toBe('follow_up');
    expect(candidate.dueAt).not.toBeNull();
  });
});

describe('clinica reminder utils', () => {
  test('formatClinicaDate uses MM/DD/YYYY', () => {
    expect(formatClinicaDate(new Date(2026, 6, 1))).toBe('07/01/2026');
  });

  test('parseClinicaDateTime handles Clinica Date field', () => {
    const parsed = parseClinicaDateTime('7/1/2026 12:00:00 AM');
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(6);
    expect(parsed?.getDate()).toBe(1);
  });

  test('splitPatientName on owner + pet pattern', () => {
    expect(splitPatientName('בעלים 1 + חיה 83517')).toEqual({
      ownerLabel: 'בעלים 1',
      petLabel: 'חיה 83517',
    });
  });
});
