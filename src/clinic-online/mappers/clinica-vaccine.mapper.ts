import type { ClinicaVaccineReminderRecord } from '../types/clinica-vaccine.types';

export type ClinicaPetVaccinationBundle = {
  petId: number;
  patientId: string;
  petName: string;
  petSpecies: ClinicaVaccineReminderRecord['petSpecies'];
  petTypeLabel: string;
  ownerName: string;
  cellPhone: string;
  email: string;
  reminders: ClinicaVaccineReminderRecord[];
  /** Outbound text — one message per pet, all due vaccines for the day. */
  message: string;
};

export type VaccinationDeliveryAttempt = {
  petId: number;
  patientId: string;
  cellPhone: string;
  message: string;
  vaccineReminderIds: number[];
  vaccineNames: string[];
  sent: boolean;
  skippedReason?: string;
};

/** Group open vaccine rows by pet (`PetID`). */
export function groupVaccineRemindersByPet(
  rows: ClinicaVaccineReminderRecord[],
): ClinicaPetVaccinationBundle[] {
  const byPet = new Map<number, ClinicaVaccineReminderRecord[]>();

  for (const row of rows) {
    const list = byPet.get(row.petId) ?? [];
    list.push(row);
    byPet.set(row.petId, list);
  }

  const bundles: ClinicaPetVaccinationBundle[] = [];

  for (const reminders of byPet.values()) {
    const sorted = [...reminders].sort((a, b) => a.vaccineName.localeCompare(b.vaccineName, 'he'));
    const first = sorted[0];
    bundles.push({
      petId: first.petId,
      patientId: first.patientId,
      petName: first.petName,
      petSpecies: first.petSpecies,
      petTypeLabel: first.petTypeLabel,
      ownerName: first.ownerName,
      cellPhone: first.cellPhone.trim(),
      email: first.email,
      reminders: sorted,
      message: composePetVaccinationMessage(sorted),
    });
  }

  return bundles.sort((a, b) => a.petName.localeCompare(b.petName, 'he'));
}

export function composePetVaccinationMessage(
  reminders: ClinicaVaccineReminderRecord[],
): string {
  if (reminders.length === 0) {
    return '';
  }

  const first = reminders[0];
  const vaccineLines = reminders.map((r) => `• ${r.vaccineName}`).join('\n');

  if (reminders.length === 1) {
    return `שלום ${first.ownerName}, תזכורת לחיסון עבור ${first.petName}: ${first.vaccineName}.`;
  }

  return `שלום ${first.ownerName}, תזכורות לחיסונים עבור ${first.petName}:\n${vaccineLines}`;
}

export function toDeliveryAttempt(
  bundle: ClinicaPetVaccinationBundle,
): VaccinationDeliveryAttempt {
  if (!bundle.cellPhone) {
    return {
      petId: bundle.petId,
      patientId: bundle.patientId,
      cellPhone: '',
      message: bundle.message,
      vaccineReminderIds: bundle.reminders.map((r) => r.id),
      vaccineNames: bundle.reminders.map((r) => r.vaccineName),
      sent: false,
      skippedReason: 'missing_cell_phone',
    };
  }

  return {
    petId: bundle.petId,
    patientId: bundle.patientId,
    cellPhone: bundle.cellPhone,
    message: bundle.message,
    vaccineReminderIds: bundle.reminders.map((r) => r.id),
    vaccineNames: bundle.reminders.map((r) => r.vaccineName),
    sent: true,
  };
}
