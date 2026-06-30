import { describe, expect, it } from 'bun:test';

import {
  isIsraeliMobilePhone,
  normalizeIsraeliPhone,
  toNormalizedIsraeliPhone,
} from './israeli-phone.util';

describe('israeli-phone.util', () => {
  it('normalizes local mobile numbers to E.164 +972', () => {
    expect(normalizeIsraeliPhone('052-987-6543')).toBe('+972529876543');
    expect(toNormalizedIsraeliPhone('052-987-6543')).toBe('972529876543');
  });

  it('normalizes local landlines to E.164 +972', () => {
    expect(normalizeIsraeliPhone('02-1234567')).toBe('+97221234567');
    expect(toNormalizedIsraeliPhone('03 765 4321')).toBe('97237654321');
  });

  it('accepts already-international Israeli numbers', () => {
    expect(normalizeIsraeliPhone('+972529876543')).toBe('+972529876543');
    expect(normalizeIsraeliPhone('00972-77-1234567')).toBe('+972771234567');
  });

  it('classifies mobile vs non-mobile for WhatsApp eligibility', () => {
    expect(isIsraeliMobilePhone('052-987-6543')).toBe(true);
    expect(isIsraeliMobilePhone('+972529876543')).toBe(true);
    expect(isIsraeliMobilePhone('02-1234567')).toBe(false);
    expect(isIsraeliMobilePhone('00972-77-1234567')).toBe(false);
  });

  it('rejects invalid Israeli numbers', () => {
    expect(() => normalizeIsraeliPhone('050123456')).toThrow();
    expect(() => normalizeIsraeliPhone('0571234567')).toThrow();
    expect(() => normalizeIsraeliPhone('+12025550123')).toThrow();
  });
});
