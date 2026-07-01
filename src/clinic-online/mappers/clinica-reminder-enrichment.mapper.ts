import type { ClinicaPatient } from '../types/clinica-patient.types';
import type { ClinicaReminderCandidate } from './clinica-reminder.mapper';

export type ClinicaReminderWithOwnerDetails = ClinicaReminderCandidate & {
  /** Best match from SearchByPhone for this reminder's phone */
  ownerDetails: ClinicaPatient | null;
  /** Raw hit count from SearchByPhone (before PatientID tie-break) */
  ownerSearchHits: number;
};

/**
 * Picks the owner row that matches the reminder's Clinica PatientID when possible.
 */
export function matchOwnerFromPhoneSearch(
  candidate: ClinicaReminderCandidate,
  searchResults: ClinicaPatient[],
): ClinicaPatient | null {
  if (searchResults.length === 0) {
    return null;
  }

  const byPatientId = searchResults.find((row) => row.userId === candidate.externalOwnerId);
  if (byPatientId) {
    return byPatientId;
  }

  if (searchResults.length === 1) {
    return searchResults[0];
  }

  return null;
}

export function enrichReminderWithOwnerSearch(
  candidate: ClinicaReminderCandidate,
  searchResults: ClinicaPatient[],
): ClinicaReminderWithOwnerDetails {
  return {
    ...candidate,
    ownerDetails: matchOwnerFromPhoneSearch(candidate, searchResults),
    ownerSearchHits: searchResults.length,
  };
}
