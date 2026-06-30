import type { TimerWorkflowInput } from './workflows/timer.workflow';

export async function logSentReminder(input: TimerWorkflowInput): Promise<void> {
  console.log(`sent reminder=${input.reminderId} message="${input.message}"`);
}
