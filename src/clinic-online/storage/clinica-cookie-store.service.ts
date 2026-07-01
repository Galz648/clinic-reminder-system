import { Injectable } from '@nestjs/common';

import type { ClinicaUser } from '../types/clinica-user.interface';

/** Process-wide cookie jar + session metadata for Clinica Online. */
@Injectable()
export class ClinicaCookieStoreService {
  private readonly cookies = new Map<string, string>();
  private session: ClinicaUser | null = null;

  get cookieNames(): string[] {
    return [...this.cookies.keys()];
  }

  get activeSession(): ClinicaUser | null {
    return this.session;
  }

  setSession(session: ClinicaUser): void {
    this.session = session;
  }

  clear(): void {
    this.cookies.clear();
    this.session = null;
  }

  cookieHeader(): string {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  absorbSetCookie(response: Response): void {
    const raw = response.headers.getSetCookie?.() ?? [];
    for (const line of raw) {
      const pair = line.split(';')[0];
      const eq = pair.indexOf('=');
      if (eq === -1) continue;
      this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  /** For sharing across worker activities later. */
  exportCookies(): Readonly<Record<string, string>> {
    return Object.fromEntries(this.cookies);
  }

  importCookies(cookies: Record<string, string>): void {
    this.cookies.clear();
    for (const [name, value] of Object.entries(cookies)) {
      this.cookies.set(name, value);
    }
  }
}
