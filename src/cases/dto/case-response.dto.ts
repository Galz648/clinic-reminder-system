import { ApiProperty } from '@nestjs/swagger';

export class CaseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  petName!: string;

  @ApiProperty()
  createdAt!: string;
}
