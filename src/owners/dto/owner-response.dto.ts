import { ApiProperty } from '@nestjs/swagger';

export class OwnerResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  createdAt!: string;
}
