import {
  ClinicaAllBranchesFlag,
  ClinicaBoolFlag,
  ClinicaCheckConfirmedFilter,
  ClinicaDatePagerDirection,
  ClinicaForReportMode,
  ClinicaPetSpecies,
  ClinicaSortMode,
  ClinicaVaccineReminderConfirmed,
  mapClinicaPetSpecies,
} from './clinica-vaccine.constants';
import { formatClinicaDate, parseClinicaDateTime } from './clinica-reminder.types';

/** Raw ASMX row — `getVaccineReminders.har`. */
export type RegVaccinePatient = {
  ID: number;
  PatientID: string;
  PetID: number;
  PetName: string;
  PetType: string;
  VacName: string;
  UserName: string;
  CellPhone: string;
  Phone: string;
  Email: string;
  Date: string;
  Date2: string;
  NextDate: string;
  FirstRemDate: string;
  SecondRemDate: string;
  Confirmed: number;
  FieldID: number;
  EventID: number;
  TherapistID: string;
  Notes: string;
  City: string;
  AlertType: number;
  AlertIL: number;
  Applied: number;
  CountSessions: number;
  FollowupDate: string;
  IsPlan: number;
  NextAppointment: string;
  Plan: string;
  SentEmail: number;
};

export type ClinicaVaccineReminderRecord = {
  id: number;
  patientId: string;
  petId: number;
  petName: string;
  petSpecies: ClinicaPetSpecies;
  petTypeLabel: string;
  vaccineName: string;
  fieldId: number;
  ownerName: string;
  cellPhone: string;
  phone: string;
  email: string;
  dueAt: string | null;
  firstReminderDate: string | null;
  confirmed: ClinicaVaccineReminderConfirmed;
};

export type GetVaccineRemindersRequest = {
  /** Single calendar day — must equal `toDate` (Clinica drops wide ranges). */
  fromDate: string;
  toDate: string;
  forReport?: ClinicaForReportMode;
  sortVaccine?: ClinicaSortMode;
  sortFollowup?: ClinicaSortMode;
  sortCity?: ClinicaSortMode;
  allBranches?: ClinicaAllBranchesFlag;
  sortPatient?: ClinicaSortMode;
  patientName?: string;
  currentVacc?: ClinicaBoolFlag;
  merge?: ClinicaBoolFlag;
  checkConfirmed?: ClinicaCheckConfirmedFilter;
  startDate?: string;
  startId?: number;
  addOrSubstract?: ClinicaDatePagerDirection;
};

export function buildGetVaccineRemindersBody(
  options: GetVaccineRemindersRequest,
): Record<string, string | number> {
  if (options.fromDate !== options.toDate) {
    throw new Error(
      'GetVaccineReminders requires fromDate and toDate to be the same day (MM/DD/YYYY)',
    );
  }

  return {
    ForReport: options.forReport ?? ClinicaForReportMode.List,
    SortVaccine: options.sortVaccine ?? ClinicaSortMode.Default,
    SortFollowup: options.sortFollowup ?? ClinicaSortMode.Default,
    SortCity: options.sortCity ?? ClinicaSortMode.Default,
    allBranches: options.allBranches ?? ClinicaAllBranchesFlag.CurrentBranch,
    SortPatient: options.sortPatient ?? ClinicaSortMode.Default,
    PatientName: options.patientName ?? '',
    CurrentVacc: options.currentVacc ?? ClinicaBoolFlag.No,
    Merge: options.merge ?? ClinicaBoolFlag.No,
    CheckConfirmed: options.checkConfirmed ?? ClinicaCheckConfirmedFilter.On,
    StartDate: options.startDate ?? '',
    StartID: options.startId ?? 0,
    fromDate: options.fromDate,
    toDate: options.toDate,
    addOrSubstract: options.addOrSubstract ?? ClinicaDatePagerDirection.Forward,
  };
}

export function buildGetVaccineRemindersBodyForDate(date: Date): Record<string, string | number> {
  const day = formatClinicaDate(date);
  return buildGetVaccineRemindersBody({ fromDate: day, toDate: day });
}

export function mapVaccineReminder(raw: RegVaccinePatient): ClinicaVaccineReminderRecord {
  const confirmed =
    raw.Confirmed === ClinicaVaccineReminderConfirmed.Done
      ? ClinicaVaccineReminderConfirmed.Done
      : ClinicaVaccineReminderConfirmed.Open;

  return {
    id: raw.ID,
    patientId: raw.PatientID,
    petId: raw.PetID,
    petName: raw.PetName,
    petSpecies: mapClinicaPetSpecies(raw.PetType),
    petTypeLabel: raw.PetType,
    vaccineName: raw.VacName,
    fieldId: raw.FieldID,
    ownerName: raw.UserName,
    cellPhone: raw.CellPhone,
    phone: raw.Phone,
    email: raw.Email,
    dueAt: parseClinicaDateTime(raw.NextDate)?.toISOString() ?? null,
    firstReminderDate: parseClinicaDateTime(raw.FirstRemDate)?.toISOString() ?? null,
    confirmed,
  };
}

export function isOpenVaccineReminder(row: ClinicaVaccineReminderRecord): boolean {
  return row.confirmed === ClinicaVaccineReminderConfirmed.Open;
}
