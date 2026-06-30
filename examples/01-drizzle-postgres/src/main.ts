import 'dotenv/config';

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';

import { env } from '../../src/config/env';

const cases = pgTable('example_cases', {
  id: text('id').primaryKey(),
  petName: text('pet_name').notNull(),
  ownerName: text('owner_name').notNull(),
});

const phoneNumbers = pgTable(
  'example_phone_numbers',
  {
    id: text('id').primaryKey(),
    caseId: text('case_id').notNull(),
    phone: text('phone').notNull(),
    normalizedPhone: text('normalized_phone').notNull(),
  },
  (table) => [uniqueIndex('example_phone_numbers_normalized_phone_idx').on(table.normalizedPhone)],
);

const reminders = pgTable(
  'example_reminders',
  {
    id: text('id').primaryKey(),
    caseId: text('case_id').notNull(),
    phoneNumberId: text('phone_number_id').notNull(),
    reminderType: text('reminder_type').notNull(),
    message: text('message').notNull(),
    dueAt: text('due_at').notNull(),
    status: text('status').notNull().default('pending'),
  },
  (table) => [index('example_reminders_status_idx').on(table.status)],
);

const pool = new Pool({ connectionString: env.databaseUrl });
const db = drizzle(pool);

await pool.query(`
  DROP TABLE IF EXISTS example_reminders;
  DROP TABLE IF EXISTS example_phone_numbers;
  DROP TABLE IF EXISTS example_cases;
`);

await pool.query(`
  CREATE TABLE example_cases (
    id TEXT PRIMARY KEY,
    pet_name TEXT NOT NULL,
    owner_name TEXT NOT NULL
  );
  CREATE TABLE example_phone_numbers (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    normalized_phone TEXT NOT NULL
  );
  CREATE UNIQUE INDEX example_phone_numbers_normalized_phone_idx
    ON example_phone_numbers (normalized_phone);
  CREATE TABLE example_reminders (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    phone_number_id TEXT NOT NULL,
    reminder_type TEXT NOT NULL,
    message TEXT NOT NULL,
    due_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
  );
  CREATE INDEX example_reminders_status_idx ON example_reminders (status);
`);

const caseId = randomUUID();
const phoneNumberId = randomUUID();
const dueAt = '2026-07-01T09:00:00.000Z';

await db.insert(cases).values({
  id: caseId,
  petName: 'Luna',
  ownerName: 'Jane Doe',
});

await db.insert(phoneNumbers).values({
  id: phoneNumberId,
  caseId,
  phone: '+972-50-123-4567',
  normalizedPhone: '972501234567',
});

await db.insert(reminders).values({
  id: randomUUID(),
  caseId,
  phoneNumberId,
  reminderType: 'vaccination',
  message: 'Luna is due for vaccination.',
  dueAt,
  status: 'pending',
});

const pending = await db
  .select()
  .from(reminders)
  .where(eq(reminders.status, 'pending'));

console.log('Pending reminders:', pending.length);
console.log('Drizzle + Postgres example passed');

await pool.end();
