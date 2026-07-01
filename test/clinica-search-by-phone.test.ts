import { describe, expect, test } from 'bun:test';

import {
  enrichReminderWithOwnerSearch,
  matchOwnerFromPhoneSearch,
} from '../src/clinic-online/mappers/clinica-reminder-enrichment.mapper';
import type { ClinicaReminderCandidate } from '../src/clinic-online/mappers/clinica-reminder.mapper';
import type { ClinicaPatient } from '../src/clinic-online/types/clinica-patient.types';
import { buildSearchByPhoneBody } from '../src/clinic-online/types/clinica-search.types';

const sampleCandidate: ClinicaReminderCandidate = {
  externalEventId: '2488388',
  externalOwnerId: '00000000-0000-4000-8000-000000000001',
  externalCaseId: '83517',
  ownerName: 'בעלים 1',
  petName: 'חיה 83517',
  phoneRaw: '0500000001',
  message: 'תזכורת לדוגמה',
  dueAt: '2026-07-01T00:00:00.000Z',
  visitAt: '2026-06-28T17:10:00.000Z',
  followCategoryId: 13,
  confirmed: false,
  suggestedReminderType: 'follow_up',
};

const samplePatient: ClinicaPatient = {
  userId: '00000000-0000-4000-8000-000000000001',
  firstName: 'בעלים',
  lastName: '1',
  cellPhone: '0500000001',
  email: 'owner1@example.com',
  lastVisit: '6/28/2026',
  branchId: 41016,
  petsList: 'חיה 83517',
  recordId: 123,
};

describe('SearchByPhone request', () => {
  test('buildSearchByPhoneBody matches browser capture shape', () => {
    expect(
      buildSearchByPhoneBody({ phoneNumber: '0500000002', userId: '', lastName: '' }),
    ).toEqual({
      PhoneNumber: '0500000002',
      UserID: '',
      LastName: '',
    });
  });
});

describe('reminder owner enrichment', () => {
  test('matchOwnerFromPhoneSearch prefers PatientID match', () => {
    const other: ClinicaPatient = { ...samplePatient, userId: '00000000-0000-4000-8000-000000000099' };
    expect(matchOwnerFromPhoneSearch(sampleCandidate, [other, samplePatient])).toEqual(
      samplePatient,
    );
  });

  test('matchOwnerFromPhoneSearch uses sole hit when PatientID differs', () => {
    const only: ClinicaPatient = {
      ...samplePatient,
      userId: '00000000-0000-4000-8000-000000000098',
    };
    expect(matchOwnerFromPhoneSearch(sampleCandidate, [only])).toEqual(only);
  });

  test('matchOwnerFromPhoneSearch returns null for ambiguous hits', () => {
    const a: ClinicaPatient = { ...samplePatient, userId: '00000000-0000-4000-8000-000000000010' };
    const b: ClinicaPatient = { ...samplePatient, userId: '00000000-0000-4000-8000-000000000011' };
    expect(matchOwnerFromPhoneSearch(sampleCandidate, [a, b])).toBeNull();
  });

  test('enrichReminderWithOwnerSearch attaches ownerDetails', () => {
    const enriched = enrichReminderWithOwnerSearch(sampleCandidate, [samplePatient]);
    expect(enriched.ownerSearchHits).toBe(1);
    expect(enriched.ownerDetails?.email).toBe('owner1@example.com');
    expect(enriched.ownerDetails?.petsList).toBe('חיה 83517');
  });
});
