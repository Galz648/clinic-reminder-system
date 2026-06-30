import 'dotenv/config';

import { Client, Connection } from '@temporalio/client';

import { env } from '../../../src/config/env';

const TASK_QUEUE = 'example-timer-queue';

async function run() {
  const connection = await Connection.connect({ address: env.temporalAddress });
  const client = new Client({ connection, namespace: env.temporalNamespace });

  const dueAt = new Date(Date.now() + 10_000).toISOString();
  const reminderId = `example-${Date.now()}`;

  console.log(`Starting timer workflow; due in ~10s at ${dueAt}`);

  const handle = await client.workflow.start('timerWorkflow', {
    taskQueue: TASK_QUEUE,
    workflowId: reminderId,
    args: [
      {
        reminderId,
        dueAt,
        message: 'Example reminder from isolated Temporal demo',
      },
    ],
  });

  await handle.result();
  console.log('Temporal timer example passed');
  await connection.close();
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
