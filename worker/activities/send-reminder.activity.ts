import { createDatabase } from '../../src/db';
import { reminders } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

import type { ReminderWorkflowInput } from '../shared';

export async function sendReminderActivity(input: ReminderWorkflowInput): Promise<void> {
  const { message } = input;

  console.log(
    `[SendReminder] reminder=${message.reminderId} phone=${message.phone} due=${message.dueAt} message="${message.message}"`,
  );

  const db = createDatabase();
  await db
    .update(reminders)
    .set({
      status: 'sent',
      sentAt: new Date().toISOString(),
    })
    .where(eq(reminders.id, input.reminderId));
}
