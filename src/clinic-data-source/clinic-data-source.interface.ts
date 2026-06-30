import type { ReminderCandidate } from './reminder-candidate.interface';

export const CLINIC_DATA_SOURCE = Symbol('CLINIC_DATA_SOURCE');

export interface ClinicDataSource {
  listReminderCandidates(): Promise<ReminderCandidate[]>;
}
