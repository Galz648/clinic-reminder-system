export interface ClinicaUser {
  branchId: string;
  tenantId: string;
  calendarPath: string;
  establishedAt: Date;
  refreshAt: Date;
  expiresAt: Date;
  cookieNames: string[];
}
