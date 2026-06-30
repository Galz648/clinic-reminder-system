import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LinkCaseOwnerDto {
  @ApiProperty({ example: 'owner-uuid' })
  @IsString()
  @IsNotEmpty()
  ownerId!: string;
}
