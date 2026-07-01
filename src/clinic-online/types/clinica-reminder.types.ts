export type ClinicaReminderRecord = {
  eventId: number;
  patientId: string;
  patientName: string;
  petId: number;
  petName: string;
  cellPhone: string;
  phone: string;
  reminderText: string;
  dueDate: string;
  visitDate: string;
  followCategoryId: number;
  confirmed: number;
  therapistName: string;
  branchId: number;
  branchName: string;
};

export type LoadClinicRemindersRequest = {
  selectedCat: string;
  fromDate: string;
  toDate: string;
  forExcel?: number;
  allBranches?: number;
  selectedEmp?: string;
  getConfirmed?: number;
  therapistId?: string;
  sEventDate?: string;
  addOrSubstract?: number;
};

export type RegSessionRem = {
  EventID: number;
  PatientID: string;
  PatientName: string;
  PetID: number;
  PetName: string;
  CellPhone: string;
  Phone: string;
  Reminder: string;
  Date: string;
  DateEvent: string;
  FollowCatID: number;
  Confirmed: number;
  TherapistName: string;
  BranchID: number;
  BranchName: string;
};

export function mapClinicaReminder(raw: RegSessionRem): ClinicaReminderRecord {
  return {
    eventId: raw.EventID,
    patientId: raw.PatientID,
    patientName: raw.PatientName,
    petId: raw.PetID,
    petName: raw.PetName,
    cellPhone: raw.CellPhone,
    phone: raw.Phone,
    reminderText: raw.Reminder,
    dueDate: raw.Date,
    visitDate: raw.DateEvent,
    followCategoryId: raw.FollowCatID,
    confirmed: raw.Confirmed,
    therapistName: raw.TherapistName,
    branchId: raw.BranchID,
    branchName: raw.BranchName,
  };
}

export function buildLoadClinicRemindersBody(
  options: LoadClinicRemindersRequest,
): Record<string, string | number> {
  return {
    SelectedCat: options.selectedCat,
    forExcel: options.forExcel ?? 0,
    AllBranches: options.allBranches ?? 1,
    SelectedEmp: options.selectedEmp ?? '',
    GetConfirmed: options.getConfirmed ?? 1,
    TherapistID: options.therapistId ?? '',
    sEventDate: options.sEventDate ?? '',
    fromDate: options.fromDate,
    toDate: options.toDate,
    addOrSubstract: options.addOrSubstract ?? 1,
  };
}

/** US-style M/D/YYYY as used in HAR request bodies. */
export function formatClinicaDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

export function parseClinicaDateTime(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?)?/i);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    let hours = Number(slashMatch[4] ?? 0);
    const minutes = Number(slashMatch[5] ?? 0);
    const seconds = Number(slashMatch[6] ?? 0);
    const meridiem = slashMatch[7]?.toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return new Date(year, month - 1, day, hours, minutes, seconds);
  }

  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

export function splitPatientName(patientName: string): { ownerLabel: string; petLabel: string } {
  const parts = patientName.split('+').map((p) => p.trim());
  if (parts.length >= 2) {
    return { ownerLabel: parts[0], petLabel: parts.slice(1).join(' + ') };
  }
  return { ownerLabel: patientName.trim(), petLabel: '' };
}
