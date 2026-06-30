import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePhoneNumberDto {
  @ApiProperty({ example: '+972-50-123-4567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}
