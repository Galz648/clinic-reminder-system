import 'dotenv/config';

import path from 'node:path';

import { NativeConnection, Worker } from '@temporalio/worker';

import { env } from '../src/config/env';

import * as activities from './activities/send-reminder.activity';
import { getTaskQueue } from './shared';

async function run() {
  const taskQueue = getTaskQueue();
  const connection = await NativeConnection.connect({ address: env.temporalAddress });

  const worker = await Worker.create({
    connection,
    namespace: env.temporalNamespace,
    taskQueue,
    workflowsPath: path.join(__dirname, 'workflows'),
    activities,
  });

  console.log(`Temporal worker listening on task queue "${taskQueue}"`);
  await worker.run();
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
