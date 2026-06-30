import { describe, expect, it, mock } from 'bun:test';
import { BadRequestException } from '@nestjs/common';

import { RemindersService } from './reminders.service';
import type { CreateReminderDto } from './dto/create-reminder.dto';

describe('RemindersService', () => {
  it('rejects reminder creation when the phone number is not mobile', async () => {
    const dto: CreateReminderDto = {
      caseId: 'case-1',
      ownerId: 'owner-1',
      phoneNumberId: 'phone-landline',
      reminderType: 'vaccination',
      message: 'Luna is due for vaccination.',
      dueAt: '2026-07-01T09:00:00.000Z',
    };

    const service = new RemindersService(
      {} as never,
      {
        findById: mock(async () => ({ id: 'case-1', petName: 'Luna', createdAt: '' })),
        isOwnerLinked: mock(async () => true),
      } as never,
      {
        findById: mock(async () => ({ id: 'owner-1', name: 'Jane', createdAt: '' })),
        findPhoneNumberById: mock(async () => ({
          id: 'phone-landline',
          ownerId: 'owner-1',
          phone: '+97221234567',
          normalizedPhone: '97221234567',
          isMobile: false,
          createdAt: '',
        })),
      } as never,
      {} as never,
    );

    await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create(dto)).rejects.toThrow(
      'is not a mobile number; WhatsApp reminders require an Israeli mobile line',
    );
  });
});
