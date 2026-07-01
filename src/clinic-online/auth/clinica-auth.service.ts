import { Injectable, Logger } from '@nestjs/common';

import { ClinicaStrategy } from './clinica.strategy';
import { ClinicaCookieStoreService } from '../storage/clinica-cookie-store.service';
import type { ClinicaUser } from '../types/clinica-user.interface';

@Injectable()
export class ClinicaAuthService {
  private readonly logger = new Logger(ClinicaAuthService.name);
  private loginInFlight: Promise<ClinicaUser> | null = null;

  constructor(
    private readonly strategy: ClinicaStrategy,
    private readonly cookieStore: ClinicaCookieStoreService,
  ) {}

  /** Full WebForms login via Passport strategy; replaces stored cookies. */
  async authenticate(): Promise<ClinicaUser> {
    if (this.loginInFlight) {
      return this.loginInFlight;
    }

    this.loginInFlight = this.strategy.performFormsLogin();
    try {
      return await this.loginInFlight;
    } finally {
      this.loginInFlight = null;
    }
  }

  /** Returns active session; re-authenticates when missing or past refresh/expiry deadlines. */
  async ensureSession(): Promise<ClinicaUser> {
    const current = this.cookieStore.activeSession;
    const now = Date.now();

    if (current && now < current.refreshAt.getTime()) {
      return current;
    }

    if (current) {
      this.logger.log(
        `Clinica session refresh (age=${now - current.establishedAt.getTime()}ms, reason=${
          now >= current.expiresAt.getTime() ? 'expired' : 'refreshAt'
        })`,
      );
    }

    return this.authenticate();
  }

  invalidate(): void {
    this.cookieStore.clear();
  }

  getSession(): ClinicaUser | null {
    return this.cookieStore.activeSession;
  }
}
