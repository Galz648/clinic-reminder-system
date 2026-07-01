import { Injectable } from '@nestjs/common';

import {
  CLINICA_HTTP_TIMEOUT_MS,
  CLINICA_RETRY_BASE_DELAY_MS,
  CLINICA_RETRY_MAX_ATTEMPTS,
  CLINICA_SESSION_MAX_AGE_MS,
  CLINICA_SESSION_REFRESH_MS,
  CLINICA_SESSION_REFRESH_SAFETY_MS,
} from '../clinic-online.constants';

@Injectable()
export class ClinicaOnlineConfig {
  readonly baseUrl: string;
  readonly username: string;
  readonly password: string;
  readonly branchId: string;
  readonly sessionRefreshMs: number;
  readonly sessionMaxAgeMs: number;
  readonly sessionRefreshSafetyMs: number;
  readonly httpTimeoutMs: number;
  readonly retryMaxAttempts: number;
  readonly retryBaseDelayMs: number;

  constructor() {
    this.baseUrl = (process.env.CLINICA_BASE_URL ?? '').replace(/\/$/, '');
    this.username = process.env.CLINICA_USERNAME?.trim() ?? '';
    this.password = process.env.CLINICA_PASSWORD ?? '';
    this.branchId = process.env.CLINICA_BRANCH_ID?.trim() ?? '';
    this.sessionRefreshMs = numberEnv('CLINICA_SESSION_REFRESH_MS', CLINICA_SESSION_REFRESH_MS);
    this.sessionMaxAgeMs = numberEnv('CLINICA_SESSION_MAX_AGE_MS', CLINICA_SESSION_MAX_AGE_MS);
    this.sessionRefreshSafetyMs = numberEnv(
      'CLINICA_SESSION_REFRESH_SAFETY_MS',
      CLINICA_SESSION_REFRESH_SAFETY_MS,
    );
    this.httpTimeoutMs = numberEnv('CLINICA_HTTP_TIMEOUT_MS', CLINICA_HTTP_TIMEOUT_MS);
    this.retryMaxAttempts = numberEnv('CLINICA_RETRY_MAX_ATTEMPTS', CLINICA_RETRY_MAX_ATTEMPTS);
    this.retryBaseDelayMs = numberEnv('CLINICA_RETRY_BASE_DELAY_MS', CLINICA_RETRY_BASE_DELAY_MS);
  }

  get isEnabled(): boolean {
    return Boolean(this.baseUrl && this.username && this.password && this.branchId);
  }

  assertEnabled(): void {
    if (!this.isEnabled) {
      throw new Error(
        'Clinica Online is not configured. Set CLINICA_BASE_URL, CLINICA_USERNAME, CLINICA_PASSWORD, and CLINICA_BRANCH_ID.',
      );
    }
  }
}

function numberEnv(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function isClinicaConfigured(): boolean {
  return new ClinicaOnlineConfig().isEnabled;
}
