import { proxyActivities, sleep } from '@temporalio/workflow';

import type * as activities from '../activities/send-reminder.activity';
import type { ReminderWorkflowInput } from '../shared';

const { sendReminderActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

export async function reminderWorkflow(input: ReminderWorkflowInput): Promise<void> {
  const dueAtMs = Date.parse(input.dueAt);
  const delayMs = dueAtMs - Date.now();

  if (delayMs > 0) {
    await sleep(delayMs);
  }

  await sendReminderActivity(input);
}
