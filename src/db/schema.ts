import { relations, sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const owners = pgTable('owners', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

/** A case is a pet under care at the clinic. */
export const cases = pgTable('cases', {
  id: text('id').primaryKey(),
  petName: text('pet_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

/** Many owners (e.g. household members) can be linked to many pets. */
export const caseOwners = pgTable(
  'case_owners',
  {
    caseId: text('case_id')
      .notNull()
      .references(() => cases.id),
    ownerId: text('owner_id')
      .notNull()
      .references(() => owners.id),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [primaryKey({ columns: [table.caseId, table.ownerId] })],
);

export const phoneNumbers = pgTable(
  'phone_numbers',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => owners.id),
    phone: text('phone').notNull(),
    normalizedPhone: text('normalized_phone').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [uniqueIndex('phone_numbers_normalized_phone_idx').on(table.normalizedPhone)],
);

export const reminders = pgTable(
  'reminders',
  {
    id: text('id').primaryKey(),
    caseId: text('case_id')
      .notNull()
      .references(() => cases.id),
    ownerId: text('owner_id')
      .notNull()
      .references(() => owners.id),
    phoneNumberId: text('phone_number_id')
      .notNull()
      .references(() => phoneNumbers.id),
    reminderType: text('reminder_type').notNull(),
    message: text('message').notNull(),
    dueAt: text('due_at').notNull(),
    status: text('status', { enum: ['pending', 'sent', 'failed'] })
      .notNull()
      .default('pending'),
    sentAt: text('sent_at'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [index('reminders_status_idx').on(table.status)],
);

export const ownersRelations = relations(owners, ({ many }) => ({
  caseOwners: many(caseOwners),
  phoneNumbers: many(phoneNumbers),
  reminders: many(reminders),
}));

export const casesRelations = relations(cases, ({ many }) => ({
  caseOwners: many(caseOwners),
  reminders: many(reminders),
}));

export const caseOwnersRelations = relations(caseOwners, ({ one }) => ({
  case: one(cases, {
    fields: [caseOwners.caseId],
    references: [cases.id],
  }),
  owner: one(owners, {
    fields: [caseOwners.ownerId],
    references: [owners.id],
  }),
}));

export const phoneNumbersRelations = relations(phoneNumbers, ({ one, many }) => ({
  owner: one(owners, {
    fields: [phoneNumbers.ownerId],
    references: [owners.id],
  }),
  reminders: many(reminders),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  case: one(cases, {
    fields: [reminders.caseId],
    references: [cases.id],
  }),
  owner: one(owners, {
    fields: [reminders.ownerId],
    references: [owners.id],
  }),
  phoneNumber: one(phoneNumbers, {
    fields: [reminders.phoneNumberId],
    references: [phoneNumbers.id],
  }),
}));

export type Owner = typeof owners.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type CaseOwner = typeof caseOwners.$inferSelect;
export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
