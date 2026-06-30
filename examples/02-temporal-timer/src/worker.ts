import 'dotenv/config';

import path from 'node:path';

import { NativeConnection, Worker } from '@temporalio/worker';

import { env } from '../../../src/config/env';

import * as activities from './activities';

const TASK_QUEUE = 'example-timer-queue';

async function run() {
  const connection = await NativeConnection.connect({ address: env.temporalAddress });

  const worker = await Worker.create({
    connection,
    namespace: env.temporalNamespace,
    taskQueue: TASK_QUEUE,
    workflowsPath: path.join(import.meta.dir, 'workflows'),
    activities,
  });

  console.log(`Example worker listening on "${TASK_QUEUE}"`);
  await worker.run();
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
