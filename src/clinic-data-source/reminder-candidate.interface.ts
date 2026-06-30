import type { ReminderType } from '../reminders/reminder.types';

export interface ReminderCandidate {
  caseId: string;
  ownerId: string;
  phoneNumberId: string;
  reminderType: ReminderType;
  message: string;
  dueAt: string;
}
