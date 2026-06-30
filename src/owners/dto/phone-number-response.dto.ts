import { ApiProperty } from '@nestjs/swagger';

export class PhoneNumberResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ownerId!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  normalizedPhone!: string;

  @ApiProperty({
    description:
      'Whether this number can receive WhatsApp reminders. Only Israeli mobile lines are eligible.',
  })
  isMobile!: boolean;

  @ApiProperty()
  createdAt!: string;
}
