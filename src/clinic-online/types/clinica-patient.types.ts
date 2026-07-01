export type ClinicaPatient = {
  userId: string;
  firstName: string;
  lastName: string;
  cellPhone: string;
  email: string;
  lastVisit: string;
  branchId: number;
  petsList: string;
  recordId: number;
};

type RegPersonal = {
  UserID: string;
  FirstName: string;
  LastName: string;
  CellPhone: string;
  Email: string;
  LastVisit: string;
  BranchID: number;
  PetsList: string;
  recordID: number;
};

function mapPatient(raw: RegPersonal): ClinicaPatient {
  return {
    userId: raw.UserID,
    firstName: raw.FirstName,
    lastName: raw.LastName,
    cellPhone: raw.CellPhone,
    email: raw.Email,
    lastVisit: raw.LastVisit,
    branchId: raw.BranchID,
    petsList: raw.PetsList,
    recordId: raw.recordID,
  };
}

export { mapPatient };
export type { RegPersonal };
