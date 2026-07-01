import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { ClinicaAuthService } from '../auth/clinica-auth.service';
import { ClinicaOnlineConfig } from '../config/clinica-online.config';
import { ClinicaHttpError } from '../errors/clinica-http.error';

/**
 * Intercepts Clinica outbound failures (401/403), re-authenticates via Passport,
 * and retries the original operation once.
 *
 * Use {@link executeWithSessionRetry} for programmatic calls (ASMX, activities).
 * Implements NestInterceptor for controller methods returning Observables.
 */
@Injectable()
export class ClinicaSessionRefreshInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ClinicaSessionRefreshInterceptor.name);

  constructor(
    private readonly authService: ClinicaAuthService,
    private readonly config: ClinicaOnlineConfig,
  ) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return from(this.authService.ensureSession()).pipe(
      switchMap(() => next.handle()),
      catchError((error: unknown) => {
        if (!this.isAuthError(error)) {
          return throwError(() => error);
        }

        this.logger.warn('Clinica session expired (401/403) — re-authenticating via Passport');
        this.authService.invalidate();

        return from(this.authService.authenticate()).pipe(switchMap(() => next.handle()));
      }),
    );
  }

  /** Primary entry for Clinica API service and future Temporal activities. */
  async executeWithSessionRetry<T>(operation: () => Promise<T>): Promise<T> {
    this.config.assertEnabled();
    await this.authService.ensureSession();

    try {
      return await operation();
    } catch (error) {
      if (!this.isAuthError(error)) {
        throw error;
      }
      return this.reauthenticateAndRetry(operation);
    }
  }

  private async reauthenticateAndRetry<T>(operation: () => Promise<T>): Promise<T> {
    this.logger.warn('Clinica session expired (401/403) — re-authenticating via Passport');
    this.authService.invalidate();
    await this.authService.authenticate();

    try {
      return await operation();
    } catch (retryError) {
      if (this.isAuthError(retryError)) {
        this.logger.error('Clinica request failed again after re-authentication');
      }
      throw retryError;
    }
  }

  private isAuthError(error: unknown): boolean {
    return error instanceof ClinicaHttpError && error.isAuthFailure();
  }
}
