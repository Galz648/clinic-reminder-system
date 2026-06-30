import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsString } from 'class-validator';

import { REMINDER_TYPES, type ReminderType } from '../reminder.types';

export class CreateReminderDto {
  @ApiProperty({ example: 'case-uuid' })
  @IsString()
  @IsNotEmpty()
  caseId!: string;

  @ApiProperty({ example: 'owner-uuid' })
  @IsString()
  @IsNotEmpty()
  ownerId!: string;

  @ApiProperty({ example: 'phone-number-uuid' })
  @IsString()
  @IsNotEmpty()
  phoneNumberId!: string;

  @ApiProperty({ enum: REMINDER_TYPES, example: 'vaccination' })
  @IsIn(REMINDER_TYPES)
  reminderType!: ReminderType;

  @ApiProperty({ example: 'Luna is due for her annual vaccination.' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({ example: '2026-07-01T09:00:00.000Z' })
  @IsDateString()
  dueAt!: string;
}
