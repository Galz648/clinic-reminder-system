export class ClinicaHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = 'ClinicaHttpError';
  }

  isAuthFailure(): boolean {
    return this.status === 401 || this.status === 403;
  }
}
