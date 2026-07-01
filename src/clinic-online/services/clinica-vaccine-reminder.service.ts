import { Inject, Injectable } from '@nestjs/common';

import {
  groupVaccineRemindersByPet,
  toDeliveryAttempt,
  type ClinicaPetVaccinationBundle,
  type VaccinationDeliveryAttempt,
} from '../mappers/clinica-vaccine.mapper';
import {
  VACCINATION_REMINDER_SENDER,
  type VaccinationReminderSender,
} from '../senders/vaccination-reminder.sender';
import { ClinicaApiService } from './clinica-api.service';
import type { ClinicaVaccineReminderRecord } from '../types/clinica-vaccine.types';

export type VaccinationDayDeliveryResult = {
  date: string;
  totalReminders: number;
  petBundles: number;
  attempts: VaccinationDeliveryAttempt[];
};

@Injectable()
export class ClinicaVaccineReminderService {
  constructor(
    private readonly api: ClinicaApiService,
    @Inject(VACCINATION_REMINDER_SENDER)
    private readonly sender: VaccinationReminderSender,
  ) {}

  /** Open vaccine rows for one calendar day, grouped by pet. */
  async loadPetVaccinationBundles(date: Date): Promise<ClinicaPetVaccinationBundle[]> {
    const rows = await this.api.getOpenVaccineReminders({ date });
    return groupVaccineRemindersByPet(rows);
  }

  /** Fetch → group by pet → mock-send one message per pet. */
  async deliverVaccinationRemindersForDay(date: Date): Promise<VaccinationDayDeliveryResult> {
    const bundles = await this.loadPetVaccinationBundles(date);
    const attempts: VaccinationDeliveryAttempt[] = [];

    for (const bundle of bundles) {
      const attempt = toDeliveryAttempt(bundle);
      attempts.push(attempt);

      if (!attempt.sent) {
        continue;
      }

      await this.sender.send({
        petId: bundle.petId,
        patientId: bundle.patientId,
        cellPhone: bundle.cellPhone,
        message: bundle.message,
        vaccineReminderIds: attempt.vaccineReminderIds,
      });
    }

    const totalReminders = bundles.reduce((sum, b) => sum + b.reminders.length, 0);

    return {
      date: date.toISOString(),
      totalReminders,
      petBundles: bundles.length,
      attempts,
    };
  }

  /** Filter bundles to a single pet (same grouping as daily batch). */
  async loadPetVaccinationBundleForPet(
    date: Date,
    petId: number,
  ): Promise<ClinicaPetVaccinationBundle | null> {
    const bundles = await this.loadPetVaccinationBundles(date);
    return bundles.find((b) => b.petId === petId) ?? null;
  }

  /** Exposed for tests — map raw rows without HTTP. */
  groupReminders(rows: ClinicaVaccineReminderRecord[]): ClinicaPetVaccinationBundle[] {
    return groupVaccineRemindersByPet(rows);
  }
}
