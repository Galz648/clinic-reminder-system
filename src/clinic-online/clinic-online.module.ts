import { DynamicModule, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { ClinicaAuthService } from './auth/clinica-auth.service';
import { ClinicaStrategy } from './auth/clinica.strategy';
import { CLINICA_PASSPORT_STRATEGY } from './clinic-online.constants';
import { ClinicaOnlineConfig, isClinicaConfigured } from './config/clinica-online.config';
import { ClinicaHttpClient } from './http/clinica-http.client';
import { ClinicaSessionRefreshInterceptor } from './interceptors/clinica-session-refresh.interceptor';
import { ClinicaApiService } from './services/clinica-api.service';
import {
  ClinicaVaccineReminderService,
} from './services/clinica-vaccine-reminder.service';
import {
  MockVaccinationReminderSender,
  VACCINATION_REMINDER_SENDER,
} from './senders/vaccination-reminder.sender';
import { ClinicaCookieStoreService } from './storage/clinica-cookie-store.service';

const clinicaProviders = [
  ClinicaOnlineConfig,
  ClinicaCookieStoreService,
  ClinicaHttpClient,
  ClinicaStrategy,
  ClinicaAuthService,
  ClinicaSessionRefreshInterceptor,
  ClinicaApiService,
  ClinicaVaccineReminderService,
  MockVaccinationReminderSender,
  {
    provide: VACCINATION_REMINDER_SENDER,
    useExisting: MockVaccinationReminderSender,
  },
];

@Module({})
export class ClinicOnlineModule {
  static forRoot(): DynamicModule {
    if (!isClinicaConfigured()) {
      return {
        module: ClinicOnlineModule,
        imports: [],
        providers: [ClinicaOnlineConfig],
        exports: [ClinicaOnlineConfig],
      };
    }

    return {
      module: ClinicOnlineModule,
      imports: [PassportModule.register({ defaultStrategy: CLINICA_PASSPORT_STRATEGY })],
      providers: clinicaProviders,
      exports: [
        ClinicaOnlineConfig,
        ClinicaCookieStoreService,
        ClinicaAuthService,
        ClinicaSessionRefreshInterceptor,
        ClinicaApiService,
        ClinicaVaccineReminderService,
        VACCINATION_REMINDER_SENDER,
      ],
    };
  }
}
