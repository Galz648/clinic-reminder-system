import { Injectable } from '@nestjs/common';

import type { ReminderCandidate } from '../reminder-candidate.interface';
import type { ClinicDataSource } from '../clinic-data-source.interface';

/**
 * Returns reminder candidates as IDs once real clinic ingestion exists.
 * V0: create owners, cases, and phone numbers via API first, then POST /reminders.
 */
@Injectable()
export class MockClinicDataSource implements ClinicDataSource {
  async listReminderCandidates(): Promise<ReminderCandidate[]> {
    return [];
  }
}
