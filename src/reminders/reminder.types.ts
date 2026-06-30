export const REMINDER_TYPES = [
  'vaccination',
  'visit',
  'follow_up',
  'general',
] as const;

export type ReminderType = (typeof REMINDER_TYPES)[number];

export type ReminderStatus = 'pending' | 'sent' | 'failed';

export interface ReminderMessage {
  reminderId: string;
  caseId: string;
  ownerId: string;
  phoneNumberId: string;
  phone: string;
  petName: string;
  ownerName: string;
  reminderType: ReminderType;
  message: string;
  dueAt: string;
}
