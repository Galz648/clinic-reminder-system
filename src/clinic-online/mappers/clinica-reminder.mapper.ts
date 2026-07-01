import type { ReminderCandidate } from '../../clinic-data-source/reminder-candidate.interface';
import type { ReminderType } from '../../reminders/reminder.types';
import {
  type ClinicaReminderRecord,
  parseClinicaDateTime,
  splitPatientName,
} from '../types/clinica-reminder.types';

export type ClinicaReminderCandidate = {
  /** Clinica `EventID` — use for dedup until imported */
  externalEventId: string;
  externalOwnerId: string;
  externalCaseId: string;
  ownerName: string;
  petName: string;
  phoneRaw: string;
  message: string;
  dueAt: string | null;
  visitAt: string | null;
  followCategoryId: number;
  confirmed: boolean;
  /** Best-effort mapping; Clinica has no 1:1 type enum on this endpoint */
  suggestedReminderType: ReminderType;
};

/**
 * Maps Clinica `LoadClinicReminders` rows toward V0 reminder intent.
 * Internal UUIDs are absent until {@link resolveReminderContext} upserts entities.
 */
export function toClinicaReminderCandidate(
  record: ClinicaReminderRecord,
  options?: { defaultReminderType?: ReminderType },
): ClinicaReminderCandidate {
  const { ownerLabel, petLabel } = splitPatientName(record.patientName);
  const due = parseClinicaDateTime(record.dueDate);
  const visit = parseClinicaDateTime(record.visitDate);

  return {
    externalEventId: String(record.eventId),
    externalOwnerId: record.patientId,
    externalCaseId: String(record.petId),
    ownerName: ownerLabel,
    petName: petLabel || record.petName,
    phoneRaw: record.cellPhone || record.phone,
    message: record.reminderText,
    dueAt: due?.toISOString() ?? null,
    visitAt: visit?.toISOString() ?? null,
    followCategoryId: record.followCategoryId,
    confirmed: record.confirmed === 1,
    suggestedReminderType: options?.defaultReminderType ?? inferReminderType(record),
  };
}

function inferReminderType(record: ClinicaReminderRecord): ReminderType {
  const text = `${record.reminderText} ${record.visitDate}`.toLowerCase();
  if (text.includes('חיסון') || text.includes('vaccin')) return 'vaccination';
  if (text.includes('תור') || text.includes('visit') || text.includes('check')) return 'visit';
  if (record.followCategoryId === 13) return 'follow_up';
  return 'general';
}

/** Placeholder until interceptors materialize UUIDs — not a valid ReminderCandidate for POST /reminders yet. */
export function isReadyForInternalCreate(candidate: ClinicaReminderCandidate): boolean {
  return Boolean(candidate.phoneRaw && candidate.dueAt && candidate.message);
}

export function describeV0Gap(candidate: ClinicaReminderCandidate): string[] {
  const gaps: string[] = [];
  if (!candidate.phoneRaw) gaps.push('missing phone');
  if (!candidate.dueAt) gaps.push('unparseable due date');
  if (!candidate.message) gaps.push('empty reminder text');
  gaps.push('needs external_* upsert → internal caseId/ownerId/phoneNumberId');
  return gaps;
}

export type { ReminderCandidate };
