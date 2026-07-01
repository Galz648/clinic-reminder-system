import { describe, expect, test } from 'bun:test';

import { ClinicaVaccineReminderService } from '../src/clinic-online/services/clinica-vaccine-reminder.service';
import type { ClinicaApiService } from '../src/clinic-online/services/clinica-api.service';
import {
  ClinicaPetSpecies,
  ClinicaVaccineReminderConfirmed,
} from '../src/clinic-online/types/clinica-vaccine.constants';
import type { ClinicaVaccineReminderRecord } from '../src/clinic-online/types/clinica-vaccine.types';
import type { VaccinationReminderSender } from '../src/clinic-online/senders/vaccination-reminder.sender';

function sampleRow(overrides: Partial<ClinicaVaccineReminderRecord> = {}): ClinicaVaccineReminderRecord {
  return {
    id: 1,
    patientId: 'owner-1',
    petId: 100,
    petName: 'Luna',
    petSpecies: ClinicaPetSpecies.Dog,
    petTypeLabel: 'כלב',
    vaccineName: 'כלבת',
    fieldId: 2345,
    ownerName: 'Test Owner',
    cellPhone: '0521234567',
    phone: '',
    email: 'test@example.com',
    dueAt: '2026-07-01T06:00:00.000Z',
    firstReminderDate: null,
    confirmed: ClinicaVaccineReminderConfirmed.Open,
    ...overrides,
  };
}

describe('ClinicaVaccineReminderService', () => {
  test('deliverVaccinationRemindersForDay sends one mock message per pet bundle', async () => {
    const sent: Array<{ petId: number; message: string }> = [];
    const sender: VaccinationReminderSender = {
      send: async (payload) => {
        sent.push({ petId: payload.petId, message: payload.message });
      },
    };

    const api = {
      getOpenVaccineReminders: async () => [
        sampleRow({ id: 10, vaccineName: 'כלבת' }),
        sampleRow({ id: 11, vaccineName: 'תילוע' }),
        sampleRow({ id: 20, petId: 200, petName: 'Max', cellPhone: '0529999999' }),
      ],
    } as unknown as ClinicaApiService;

    const service = new ClinicaVaccineReminderService(api, sender);
    const result = await service.deliverVaccinationRemindersForDay(new Date(2026, 6, 1));

    expect(result.totalReminders).toBe(3);
    expect(result.petBundles).toBe(2);
    expect(sent.length).toBe(2);
    expect(sent[0].message).toContain('תזכורות לחיסונים');
    expect(result.attempts.filter((a) => a.sent).length).toBe(2);
  });
});
