export class ClinicaAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClinicaAuthError';
  }
}
