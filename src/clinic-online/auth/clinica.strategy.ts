import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';

import { CLINICA_PASSPORT_STRATEGY } from '../clinic-online.constants';
import { ClinicaOnlineConfig } from '../config/clinica-online.config';
import { ClinicaAuthError } from '../errors/clinica-auth.error';
import { ClinicaHttpClient } from '../http/clinica-http.client';
import { ClinicaCookieStoreService } from '../storage/clinica-cookie-store.service';
import type { ClinicaUser } from '../types/clinica-user.interface';
import {
  loginFailed,
  parseBranchOptions,
  parseTenantIdFromBranchPath,
  parseWebForms,
  webFormsPayload,
} from '../utils/webforms.util';

/** Passport custom strategy — performs ASP.NET WebForms login + branch selection. */
@Injectable()
export class ClinicaStrategy extends PassportStrategy(Strategy, CLINICA_PASSPORT_STRATEGY) {
  private readonly logger = new Logger(ClinicaStrategy.name);

  constructor(
    private readonly config: ClinicaOnlineConfig,
    private readonly http: ClinicaHttpClient,
    private readonly cookieStore: ClinicaCookieStoreService,
  ) {
    super();
  }

  /** Called by Passport when a guard runs; also used programmatically via ClinicaAuthService. */
  async validate(): Promise<ClinicaUser> {
    return this.performFormsLogin();
  }

  async performFormsLogin(): Promise<ClinicaUser> {
    this.config.assertEnabled();
    this.cookieStore.clear();

    this.logger.log('Starting Clinica WebForms login');

    const loginPage = await this.http.get('/login.aspx');
    const loginHidden = parseWebForms(loginPage.body);

    const loginPost = await this.http.postForm(
      '/login.aspx',
      webFormsPayload(loginHidden, {
        'ctl00$MainContent$Login1$UserName': this.config.username,
        'ctl00$MainContent$Login1$Password': this.config.password,
        'ctl00$MainContent$Login1$LoginButton': 'כניסה',
        'ctl00$IsMobile': 'false',
      }),
      '/login.aspx',
    );

    if (loginPost.status === 200 && loginFailed(loginPost.body)) {
      throw new ClinicaAuthError('Clinica Online login failed — invalid username or password');
    }
    if (!loginPost.location) {
      throw new ClinicaAuthError(`Clinica login did not redirect (status ${loginPost.status})`);
    }

    const branchPath = loginPost.location;
    const tenantId = parseTenantIdFromBranchPath(branchPath);
    if (!tenantId) {
      throw new ClinicaAuthError(`Could not parse tenant id from ${branchPath}`);
    }

    const branchPage = await this.http.get(branchPath, '/login.aspx');
    const branches = parseBranchOptions(branchPage.body);
    const branchId = this.resolveBranchId(branches);

    const branchHidden = parseWebForms(branchPage.body);
    const branchPost = await this.http.postForm(
      branchPath,
      webFormsPayload(branchHidden, {
        'ctl00$MainContent$ClinicsList': branchId,
        'ctl00$MainContent$Button1': 'שלח',
        'ctl00$IsMobile': 'false',
      }),
      branchPath,
    );

    if (!branchPost.location) {
      throw new ClinicaAuthError(
        `Clinica branch selection did not redirect (status ${branchPost.status})`,
      );
    }

    const calendarPath = branchPost.location;
    await this.http.get(calendarPath, branchPath);

    const establishedAt = new Date();
    const expiresAt = new Date(establishedAt.getTime() + this.config.sessionMaxAgeMs);
    const refreshAt = new Date(
      Math.min(
        establishedAt.getTime() + this.config.sessionRefreshMs,
        expiresAt.getTime() - this.config.sessionRefreshSafetyMs,
      ),
    );

    const user: ClinicaUser = {
      branchId,
      tenantId,
      calendarPath,
      establishedAt,
      refreshAt,
      expiresAt,
      cookieNames: this.cookieStore.cookieNames,
    };

    this.cookieStore.setSession(user);
    this.logger.log(
      `Clinica session established branch=${branchId} refreshAt=${refreshAt.toISOString()}`,
    );

    return user;
  }

  private resolveBranchId(branches: Array<{ id: string; label: string }>): string {
    const configured = this.config.branchId;
    if (configured) {
      const hit = branches.find((b) => b.id === configured);
      if (branches.length > 0 && !hit) {
        throw new ClinicaAuthError(
          `CLINICA_BRANCH_ID=${configured} not in branch list: ${branches.map((b) => b.id).join(', ')}`,
        );
      }
      return configured;
    }
    if (branches.length === 1) {
      return branches[0].id;
    }
    throw new ClinicaAuthError('CLINICA_BRANCH_ID is required for multi-branch accounts');
  }
}
