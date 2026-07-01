/** Clinica ASMX payloads use 0/1 (or small ints) where the UI uses toggles. */

export enum ClinicaBoolFlag {
  No = 0,
  Yes = 1,
}

/** `GetVaccineReminders` / row `Confirmed` — staff marked done in Clinica. */
export enum ClinicaVaccineReminderConfirmed {
  Open = 0,
  Done = 1,
}

/** `ForReport` on `GetVaccineReminders`. */
export enum ClinicaForReportMode {
  List = 0,
  Report = 1,
}

/** `allBranches` on vaccine list requests (HAR: 0 = current branch). */
export enum ClinicaAllBranchesFlag {
  CurrentBranch = 0,
  AllBranches = 1,
}

/** `addOrSubstract` date pager — HAR single-day fetch uses `1`. */
export enum ClinicaDatePagerDirection {
  Back = -1,
  None = 0,
  Forward = 1,
}

/**
 * `CheckConfirmed` on `GetVaccineReminders`.
 * HAR `getVaccineReminders.har`: `1` returned rows with `Confirmed: 0` only.
 */
export enum ClinicaCheckConfirmedFilter {
  Off = 0,
  On = 1,
}

/** Sort toggles on vaccine list (`SortVaccine`, `SortPatient`, …) — 0 = default order. */
export enum ClinicaSortMode {
  Default = 0,
  Enabled = 1,
}

/** `PetType` Hebrew label → normalized species (HAR `RegVaccinePatient`). */
export enum ClinicaPetSpecies {
  Dog = 'dog',
  Cat = 'cat',
  Unknown = 'unknown',
}

export const CLINICA_PET_TYPE_TO_SPECIES: Readonly<Record<string, ClinicaPetSpecies>> = {
  כלב: ClinicaPetSpecies.Dog,
  חתול: ClinicaPetSpecies.Cat,
};

export function mapClinicaPetSpecies(petType: string): ClinicaPetSpecies {
  return CLINICA_PET_TYPE_TO_SPECIES[petType.trim()] ?? ClinicaPetSpecies.Unknown;
}
