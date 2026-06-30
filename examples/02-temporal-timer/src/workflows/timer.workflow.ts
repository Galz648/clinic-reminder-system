import { proxyActivities, sleep } from '@temporalio/workflow';

import type * as activities from '../activities';

const { logSentReminder } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 seconds',
});

export interface TimerWorkflowInput {
  reminderId: string;
  dueAt: string;
  message: string;
}

export async function timerWorkflow(input: TimerWorkflowInput): Promise<void> {
  const delayMs = Date.parse(input.dueAt) - Date.now();
  if (delayMs > 0) {
    await sleep(delayMs);
  }

  await logSentReminder(input);
}
