import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCaseDto {
  @ApiProperty({ example: 'Luna' })
  @IsString()
  @IsNotEmpty()
  petName!: string;
}
