import { Injectable } from '@nestjs/common';

import { ClinicaHttpClient } from '../http/clinica-http.client';
import { ClinicaSessionRefreshInterceptor } from '../interceptors/clinica-session-refresh.interceptor';
import {
  enrichReminderWithOwnerSearch,
  type ClinicaReminderWithOwnerDetails,
} from '../mappers/clinica-reminder-enrichment.mapper';
import {
  toClinicaReminderCandidate,
  type ClinicaReminderCandidate,
} from '../mappers/clinica-reminder.mapper';
import type { ClinicaPatient } from '../types/clinica-patient.types';
import { mapPatient, type RegPersonal } from '../types/clinica-patient.types';
import { buildSearchByPhoneBody } from '../types/clinica-search.types';
import {
  buildLoadClinicRemindersBody,
  formatClinicaDate,
  mapClinicaReminder,
  type ClinicaReminderRecord,
  type LoadClinicRemindersRequest,
  type RegSessionRem,
} from '../types/clinica-reminder.types';
import {
  buildGetVaccineRemindersBodyForDate,
  isOpenVaccineReminder,
  mapVaccineReminder,
  type ClinicaVaccineReminderRecord,
  type RegVaccinePatient,
} from '../types/clinica-vaccine.types';

const PATIENT_LIST_PATH = '/vetclinic/therapists/patientlistvet.aspx';

@Injectable()
export class ClinicaApiService {
  constructor(
    private readonly http: ClinicaHttpClient,
    private readonly sessionInterceptor: ClinicaSessionRefreshInterceptor,
  ) {}

  getLastPatients(options?: { move?: number; fromDate?: string }): Promise<ClinicaPatient[]> {
    const move = options?.move ?? 0;
    const fromDate = options?.fromDate ?? '';

    return this.sessionInterceptor.executeWithSessionRetry(async () => {
      await this.http.get(PATIENT_LIST_PATH);

      const response = await this.http.postJson<{ d: RegPersonal[] }>(
        '/Restricted/dbCalander.asmx/GetLastPatients',
        { move, fromDate },
        PATIENT_LIST_PATH,
      );

      return response.d.map(mapPatient);
    });
  }

  /**
   * Clinic reminder list for a date range — HAR `04-load-clinic-reminders.har`.
   * Default category `13` matches Florentin capture; override via `selectedCat`.
   */
  loadClinicReminders(
    options?: Partial<LoadClinicRemindersRequest> & { date?: Date },
  ): Promise<ClinicaReminderRecord[]> {
    const date = options?.date ?? new Date();
    const formatted = formatClinicaDate(date);
    const request: LoadClinicRemindersRequest = {
      selectedCat: options?.selectedCat ?? process.env.CLINICA_REMINDER_CATEGORY_ID ?? '13',
      fromDate: options?.fromDate ?? formatted,
      toDate: options?.toDate ?? formatted,
      forExcel: options?.forExcel,
      allBranches: options?.allBranches,
      selectedEmp: options?.selectedEmp,
      getConfirmed: options?.getConfirmed,
      therapistId: options?.therapistId,
      sEventDate: options?.sEventDate,
      addOrSubstract: options?.addOrSubstract,
    };

    return this.sessionInterceptor.executeWithSessionRetry(async () => {
      await this.http.get(PATIENT_LIST_PATH);

      const response = await this.http.postJson<{ d: RegSessionRem[] }>(
        '/Restricted/dbCalander.asmx/LoadClinicReminders',
        buildLoadClinicRemindersBody(request),
        PATIENT_LIST_PATH,
      );

      return response.d.map(mapClinicaReminder);
    });
  }

  loadClinicReminderCandidates(
    options?: Partial<LoadClinicRemindersRequest> & { date?: Date },
  ): Promise<ClinicaReminderCandidate[]> {
    return this.loadClinicReminders(options).then((rows) =>
      rows.map((row) => toClinicaReminderCandidate(row)),
    );
  }

  /** Reminders not ticked done in Clinica (`Confirmed === 0`). */
  loadOpenClinicReminderCandidates(
    options?: Partial<LoadClinicRemindersRequest> & { date?: Date },
  ): Promise<ClinicaReminderCandidate[]> {
    return this.loadClinicReminderCandidates(options).then((rows) =>
      rows.filter((row) => !row.confirmed),
    );
  }

  /**
   * Daily vaccination reminder list — HAR `getVaccineReminders.har`.
   * Always query a single day (`fromDate` === `toDate`); wider ranges may be dropped by Clinica.
   */
  getVaccineReminders(date: Date): Promise<ClinicaVaccineReminderRecord[]> {
    return this.sessionInterceptor.executeWithSessionRetry(async () => {
      await this.http.get(PATIENT_LIST_PATH);

      const response = await this.http.postJson<{ d: RegVaccinePatient[] }>(
        '/Restricted/dbCalander.asmx/GetVaccineReminders',
        buildGetVaccineRemindersBodyForDate(date),
        PATIENT_LIST_PATH,
      );

      return response.d.map(mapVaccineReminder);
    });
  }

  /** Open rows only (`Confirmed === 0`). */
  getOpenVaccineReminders(options: { date: Date }): Promise<ClinicaVaccineReminderRecord[]> {
    return this.getVaccineReminders(options.date).then((rows) =>
      rows.filter(isOpenVaccineReminder),
    );
  }

  /**
   * Owner lookup by phone — same ASMX the patient-list UI uses.
   * Request: `{ PhoneNumber, UserID, LastName }` (empty strings when searching by phone only).
   */
  searchByPhone(options: {
    phoneNumber: string;
    userId?: string;
    lastName?: string;
  }): Promise<ClinicaPatient[]> {
    return this.sessionInterceptor.executeWithSessionRetry(async () => {
      await this.http.get(PATIENT_LIST_PATH);

      const response = await this.http.postJson<{ d: RegPersonal[] }>(
        '/Restricted/dbCalander.asmx/SearchByPhone',
        buildSearchByPhoneBody(options),
        PATIENT_LIST_PATH,
      );

      return response.d.map(mapPatient);
    });
  }

  /**
   * Open reminders for a date, enriched with owner/pet details via SearchByPhone.
   * Deduplicates phone lookups when multiple reminders share the same number.
   */
  async loadOpenRemindersWithOwnerDetails(
    options?: Partial<LoadClinicRemindersRequest> & { date?: Date },
  ): Promise<ClinicaReminderWithOwnerDetails[]> {
    const open = await this.loadOpenClinicReminderCandidates(options);
    const phoneCache = new Map<string, ClinicaPatient[]>();

    const enriched: ClinicaReminderWithOwnerDetails[] = [];

    for (const candidate of open) {
      const phone = candidate.phoneRaw.trim();
      if (!phone) {
        enriched.push(enrichReminderWithOwnerSearch(candidate, []));
        continue;
      }

      let searchResults = phoneCache.get(phone);
      if (!searchResults) {
        searchResults = await this.searchByPhone({ phoneNumber: phone });
        phoneCache.set(phone, searchResults);
      }

      enriched.push(enrichReminderWithOwnerSearch(candidate, searchResults));
    }

    return enriched;
  }
}
