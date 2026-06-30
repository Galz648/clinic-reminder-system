import {
  parsePhoneNumberFromString,
  type PhoneNumber,
} from 'libphonenumber-js/max';

const ISRAEL = 'IL';

function parseIsraeliPhone(value: string): PhoneNumber {
  const trimmed = value.trim();
  const phoneNumber = parsePhoneNumberFromString(trimmed, ISRAEL);

  if (!phoneNumber?.isValid() || phoneNumber.country !== ISRAEL) {
    throw new Error(
      'Phone number must be a valid Israeli mobile, landline, or VoIP number, for example 0521234567, 021234567, or +972521234567',
    );
  }

  return phoneNumber;
}

/** True when the number is an Israeli mobile (WhatsApp-capable) line. */
export function isIsraeliMobilePhone(value: string): boolean {
  try {
    return parseIsraeliPhone(value).getType() === 'MOBILE';
  } catch {
    return false;
  }
}

/** Canonical E.164 form, e.g. +972521234567 */
export function normalizeIsraeliPhone(value: string): string {
  return parseIsraeliPhone(value).format('E.164');
}

/** Digits-only international form, e.g. 972521234567 */
export function toNormalizedIsraeliPhone(value: string): string {
  return normalizeIsraeliPhone(value).replace(/\D/g, '');
}
