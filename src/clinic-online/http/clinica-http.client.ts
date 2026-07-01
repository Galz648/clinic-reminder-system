import { Injectable, Logger } from '@nestjs/common';

import { ClinicaOnlineConfig } from '../config/clinica-online.config';
import { ClinicaHttpError } from '../errors/clinica-http.error';
import { ClinicaCookieStoreService } from '../storage/clinica-cookie-store.service';

export type ClinicaHttpResult = {
  status: number;
  body: string;
  location: string | null;
};

@Injectable()
export class ClinicaHttpClient {
  private readonly logger = new Logger(ClinicaHttpClient.name);

  constructor(
    private readonly config: ClinicaOnlineConfig,
    private readonly cookieStore: ClinicaCookieStoreService,
  ) {}

  resolveUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith('http')) return pathOrUrl;
    return `${this.config.baseUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
  }

  async get(pathOrUrl: string, referer?: string): Promise<ClinicaHttpResult> {
    return this.request('GET', pathOrUrl, { referer });
  }

  async postForm(
    pathOrUrl: string,
    fields: Record<string, string>,
    referer?: string,
  ): Promise<ClinicaHttpResult> {
    return this.request('POST', pathOrUrl, {
      referer,
      contentType: 'application/x-www-form-urlencoded',
      body: new URLSearchParams(fields).toString(),
    });
  }

  async postJson<T>(pathOrUrl: string, payload: unknown, referer: string): Promise<T> {
    const result = await this.request('POST', pathOrUrl, {
      referer,
      contentType: 'application/json; charset=UTF-8',
      body: JSON.stringify(payload),
      xhr: true,
    });

    if (result.status === 401 || result.status === 403) {
      throw new ClinicaHttpError(
        `Clinica request unauthorized (${result.status})`,
        result.status,
        result.body,
      );
    }

    if (result.status < 200 || result.status >= 300) {
      throw new ClinicaHttpError(
        `Clinica request failed (${result.status})`,
        result.status,
        result.body,
      );
    }

    try {
      return JSON.parse(result.body) as T;
    } catch {
      throw new ClinicaHttpError(
        `Clinica response was not JSON: ${result.body.slice(0, 200)}`,
        result.status,
        result.body,
      );
    }
  }

  private async request(
    method: 'GET' | 'POST',
    pathOrUrl: string,
    options: {
      referer?: string;
      contentType?: string;
      body?: string;
      xhr?: boolean;
    },
  ): Promise<ClinicaHttpResult> {
    const headers: Record<string, string> = {
      Cookie: this.cookieStore.cookieHeader(),
    };

    if (options.referer) {
      headers.Referer = this.resolveUrl(options.referer);
    }
    if (options.contentType) {
      headers['Content-Type'] = options.contentType;
    }
    if (method === 'POST') {
      headers.Origin = this.config.baseUrl;
    }
    if (options.xhr) {
      headers.Accept = '*/*';
      headers['X-Requested-With'] = 'XMLHttpRequest';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.httpTimeoutMs);

    try {
      const response = await fetch(this.resolveUrl(pathOrUrl), {
        method,
        headers,
        body: options.body,
        redirect: 'manual',
        signal: controller.signal,
      });

      this.cookieStore.absorbSetCookie(response);
      const body = await response.text();

      return {
        status: response.status,
        body,
        location: response.headers.get('location'),
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ClinicaHttpError('Clinica request timed out', 408);
      }
      this.logger.warn(`Clinica HTTP ${method} ${pathOrUrl} failed: ${String(error)}`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
