import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { spawn, type Subprocess } from 'bun';
import { randomUUID } from 'node:crypto';
import net from 'node:net';
import path from 'node:path';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import type { ReminderResponseDto } from '../src/reminders/dto/reminder-response.dto';

const repoRoot = path.join(import.meta.dir, '..');
const WORKER_READY_MESSAGE = 'Temporal worker listening on task queue';
type WorkerProcess = Subprocess<'ignore', 'pipe', 'pipe'>;

describe('Reminder Temporal flow (docker-backed e2e)', () => {
  let app: INestApplication<App>;
  let workerProcess: WorkerProcess;

  beforeAll(async () => {
    await assertPortOpen(54332, 'Postgres on localhost:54332'); // TODO: shouldn't be hardcoded, determined by environment variables
    await assertPortOpen(7233, 'Temporal on localhost:7233'); // TODO: shouldn't be hardcoded, determined by environment variables

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    workerProcess = spawn({
      cmd: ['bun', 'run', 'start:worker'],
      cwd: repoRoot,
      env: process.env,
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    await waitForWorkerReady(workerProcess);
  });

  afterAll(async () => {
    if (workerProcess && !workerProcess.killed) {
      workerProcess.kill('SIGTERM');
      await waitForExit(workerProcess, 5_000);
    }

    await app.close();
  });

  it('creates a reminder and marks it sent after the Temporal timer fires', async () => {
    const api = request(app.getHttpServer());
    const suffix = randomUUID();
    const phoneSuffix = Date.now().toString().slice(-7);
    const phoneNumber = `050-${phoneSuffix.slice(0, 3)}-${phoneSuffix.slice(3)}`;

    const owner = await api
      .post('/owners')
      .send({ name: `Jane Doe ${suffix}` })
      .expect(201);
    const ownerId = owner.body.id as string;

    const phone = await api
      .post(`/owners/${ownerId}/phone-numbers`)
      .send({ phone: phoneNumber })
      .expect(201);
    const phoneNumberId = phone.body.id as string;
    expect(phone.body.phone).toStartWith('+972');
    expect(phone.body.normalizedPhone).toStartWith('972');
    expect(phone.body.isMobile).toBe(true);

    const petCase = await api
      .post('/cases')
      .send({ petName: `Luna ${suffix}` })
      .expect(201);
    const caseId = petCase.body.id as string;

    await api.post(`/cases/${caseId}/owners`).send({ ownerId }).expect(201);

    const dueAt = new Date(Date.now() + 12_000).toISOString();
    const created = await api
      .post('/reminders')
      .send({
        caseId,
        ownerId,
        phoneNumberId,
        reminderType: 'vaccination',
        message: `Luna ${suffix} is due for vaccination.`,
        dueAt,
      })
      .expect(201);

    const reminder = created.body as ReminderResponseDto;
    expect(reminder.status).toBe('pending');
    expect(reminder.workflowId).toBe(`reminder-${reminder.id}`);

    const delivered = await waitForReminderStatus(api, reminder.id, 'sent', 35_000);
    expect(delivered.sentAt).toBeString();
  }, 45_000);
});

async function waitForReminderStatus(
  api: ReturnType<typeof request>,
  reminderId: string,
  expectedStatus: ReminderResponseDto['status'],
  timeoutMs: number,
): Promise<ReminderResponseDto> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await api.get(`/reminders/${reminderId}`).expect(200);
    const reminder = response.body as ReminderResponseDto;
    if (reminder.status === expectedStatus) {
      return reminder;
    }

    await sleep(2_000);
  }

  throw new Error(
    `Timed out waiting for reminder ${reminderId} to become ${expectedStatus}`,
  );
}

async function waitForWorkerReady(process: WorkerProcess): Promise<void> {
  let output = '';

  const readUntilReady = async (stream: ReadableStream<Uint8Array>) => {
    for await (const chunk of stream) {
      output += Buffer.from(chunk).toString();
      if (output.includes(WORKER_READY_MESSAGE)) {
        return;
      }
    }
  };

  await Promise.race([
    Promise.race([readUntilReady(process.stdout), readUntilReady(process.stderr)]),
    process.exited.then((exitCode) => {
      throw new Error(`Worker exited before becoming ready (code ${exitCode}):\n${output}`);
    }),
  ]);
}

async function assertPortOpen(port: number, label: string): Promise<void> {
  try {
    await waitForPort(port, 10_000); // TODO: this is hardcoded, this should be written somewhere or changed, as it's arbitrary
  } catch {
    throw new Error(
      `${label} is not reachable. Start the local stack with docker compose first.`,
    );
  }
}

async function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const isOpen = await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host: '127.0.0.1', port });

      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.once('error', () => {
        socket.destroy();
        resolve(false);
      });
    });

    if (isOpen) {
      return;
    }

    await sleep(500); // TODO: shouldn't be hardcoded, determined by environment variables
  }

  throw new Error(`Port ${port} did not open in time`);
}

async function waitForExit(process: WorkerProcess, timeoutMs: number): Promise<void> {
  await Promise.race([
    process.exited,
    sleep(timeoutMs).then(() => {
      if (!process.killed) {
        process.kill('SIGKILL');
      }
    }),
  ]);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
