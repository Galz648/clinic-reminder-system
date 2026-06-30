import type { ReminderMessage } from '../src/reminders/reminder.types';

export interface ReminderWorkflowInput {
  reminderId: string;
  dueAt: string;
  message: ReminderMessage;
}

export function getTaskQueue(): string {
  const value = process.env.TEMPORAL_TASK_QUEUE?.trim();
  if (!value) {
    throw new Error(
      'Missing TEMPORAL_TASK_QUEUE. Copy .env.example to .env and set it.',
    );
  }

  return value;
}
