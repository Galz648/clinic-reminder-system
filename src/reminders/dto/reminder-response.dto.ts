import { ApiProperty } from '@nestjs/swagger';

import type { ReminderStatus, ReminderType } from '../reminder.types';

export class ReminderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  caseId!: string;

  @ApiProperty()
  ownerId!: string;

  @ApiProperty()
  phoneNumberId!: string;

  @ApiProperty()
  reminderType!: ReminderType;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  dueAt!: string;

  @ApiProperty({ enum: ['pending', 'sent', 'failed'] })
  status!: ReminderStatus;

  @ApiProperty({ nullable: true })
  sentAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ required: false })
  workflowId?: string;
}
