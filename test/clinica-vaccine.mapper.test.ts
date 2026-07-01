import { describe, expect, test } from 'bun:test';

import {
  composePetVaccinationMessage,
  groupVaccineRemindersByPet,
  toDeliveryAttempt,
} from '../src/clinic-online/mappers/clinica-vaccine.mapper';
import {
  ClinicaPetSpecies,
  ClinicaVaccineReminderConfirmed,
} from '../src/clinic-online/types/clinica-vaccine.constants';
import {
  buildGetVaccineRemindersBody,
  buildGetVaccineRemindersBodyForDate,
  mapVaccineReminder,
} from '../src/clinic-online/types/clinica-vaccine.types';
import { loadClinicaFixture } from './clinica-fixtures';

function loadFixtureVaccineReminders() {
  return loadClinicaFixture<Record<string, unknown>>('get-vaccine-reminders.json');
}

describe('GetVaccineReminders fixture', () => {
  test('parses 44 rows from sanitized fixture', () => {
    const raw = loadFixtureVaccineReminders();
    expect(raw.length).toBe(44);
    const mapped = raw.map((row) => mapVaccineReminder(row as never));
    expect(mapped.every((r) => r.confirmed === ClinicaVaccineReminderConfirmed.Open)).toBe(true);
    expect(mapped[0].petId).toBe(153629);
    expect(mapped[0].vaccineName).toBe('ברבקטו');
    expect(mapped[0].cellPhone).toMatch(/^050/);
    expect(mapped[0].email).toMatch(/@example\.com$/);
  });

  test('request body uses a single day for fromDate and toDate', () => {
    const body = buildGetVaccineRemindersBodyForDate(new Date(2026, 6, 1));
    expect(body.fromDate).toBe('07/01/2026');
    expect(body.toDate).toBe('07/01/2026');
    expect(body.fromDate).toBe(body.toDate);
  });

  test('rejects multi-day range', () => {
    expect(() =>
      buildGetVaccineRemindersBody({ fromDate: '07/01/2026', toDate: '07/02/2026' }),
    ).toThrow(/same day/);
  });

  test('maps pet species from Hebrew PetType', () => {
    const raw = loadFixtureVaccineReminders();
    const mapped = raw.map((row) => mapVaccineReminder(row as never));
    const dogs = mapped.filter((r) => r.petSpecies === ClinicaPetSpecies.Dog);
    const cats = mapped.filter((r) => r.petSpecies === ClinicaPetSpecies.Cat);
    expect(dogs.length).toBe(38);
    expect(cats.length).toBe(6);
  });
});

describe('vaccine reminder grouping', () => {
  test('groups multiple vaccines for the same pet', () => {
    const raw = loadFixtureVaccineReminders();
    const mapped = raw.map((row) => mapVaccineReminder(row as never));
    const bundles = groupVaccineRemindersByPet(mapped);

    expect(bundles.length).toBeLessThan(mapped.length);

    const multiVaccPet = bundles.find((b) => b.reminders.length >= 3);
    expect(multiVaccPet).toBeDefined();
    expect(multiVaccPet!.reminders.every((r) => r.petId === multiVaccPet!.petId)).toBe(true);
    expect(multiVaccPet!.message).toContain('תזכורות לחיסונים');
  });

  test('composePetVaccinationMessage lists each vaccine for multi-row pets', () => {
    const raw = loadFixtureVaccineReminders();
    const mapped = raw.map((row) => mapVaccineReminder(row as never));
    const byPet = groupVaccineRemindersByPet(mapped).find((b) => b.reminders.length >= 2);
    expect(byPet).toBeDefined();
    expect(composePetVaccinationMessage(byPet!.reminders)).toContain('•');
  });

  test('toDeliveryAttempt marks missing phone as skipped', () => {
    const bundle = groupVaccineRemindersByPet([
      mapVaccineReminder({
        ID: 1,
        PatientID: '00000000-0000-4000-8000-000000000099',
        PetID: 99,
        PetName: 'חיה 99',
        PetType: 'כלב',
        VacName: 'חיסון',
        UserName: 'בעלים 99',
        CellPhone: '',
        Phone: '',
        Email: '',
        Date: '',
        Date2: '',
        NextDate: '7/1/2026',
        FirstRemDate: '',
        SecondRemDate: '',
        Confirmed: 0,
        FieldID: 1,
        EventID: 0,
        TherapistID: '',
        Notes: '',
        City: '',
        AlertType: 0,
        AlertIL: 0,
        Applied: 0,
        CountSessions: 0,
        FollowupDate: '',
        IsPlan: 0,
        NextAppointment: '',
        Plan: '',
        SentEmail: 0,
      } as never),
    ])[0];

    const attempt = toDeliveryAttempt(bundle);
    expect(attempt.sent).toBe(false);
    expect(attempt.skippedReason).toBe('missing_cell_phone');
  });
});
