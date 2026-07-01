import { Injectable, Logger } from '@nestjs/common';

export const VACCINATION_REMINDER_SENDER = Symbol('VACCINATION_REMINDER_SENDER');

export type VaccinationReminderSendPayload = {
  petId: number;
  patientId: string;
  cellPhone: string;
  message: string;
  vaccineReminderIds: readonly number[];
};

export interface VaccinationReminderSender {
  send(payload: VaccinationReminderSendPayload): Promise<void>;
}

/** V0 — log only; replace with WhatsApp `Sender` in a later phase. */
@Injectable()
export class MockVaccinationReminderSender implements VaccinationReminderSender {
  private readonly logger = new Logger(MockVaccinationReminderSender.name);

  async send(payload: VaccinationReminderSendPayload): Promise<void> {
    this.logger.log(
      `[mock send] pet=${payload.petId} patient=${payload.patientId} phone=${payload.cellPhone} vaccines=${payload.vaccineReminderIds.join(',')}`,
    );
    this.logger.debug(`[mock send body] ${payload.message}`);
  }
}
