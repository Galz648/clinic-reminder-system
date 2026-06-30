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

  @ApiProperty()
  createdAt!: string;
}
