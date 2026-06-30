import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateBy } from 'class-validator';

import { normalizeIsraeliPhone } from './israeli-phone.util';

function IsIsraeliPhoneNumber() {
  return ValidateBy(
    {
      name: 'isIsraeliPhoneNumber',
      validator: {
        validate: (value: unknown) => {
          if (typeof value !== 'string') {
            return false;
          }

          try {
            normalizeIsraeliPhone(value);
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage: () =>
          'phone must be a valid Israeli phone number such as 0521234567, 021234567, or +972521234567',
      },
    },
    {},
  );
}

export class CreatePhoneNumberDto {
  @ApiProperty({
    example: '050-234-5678',
    description:
      'Israeli phone number (mobile, landline, or VoIP). Parsed with libphonenumber-js and normalized to E.164 (+972…). Landlines and VoIP are stored for contact records but cannot receive WhatsApp reminders.',
  })
  @IsString()
  @IsNotEmpty()
  @IsIsraeliPhoneNumber()
  @Transform(({ value }) => normalizeIsraeliPhone(String(value).trim()))
  phone!: string;
}
