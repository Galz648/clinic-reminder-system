import { describe, expect, test } from 'bun:test';

import { ClinicaHttpError } from '../src/clinic-online/errors/clinica-http.error';
import { loginFailed, parseWebForms } from '../src/clinic-online/utils/webforms.util';

describe('ClinicaHttpError', () => {
  test('isAuthFailure for 401 and 403', () => {
    expect(new ClinicaHttpError('unauthorized', 401).isAuthFailure()).toBe(true);
    expect(new ClinicaHttpError('forbidden', 403).isAuthFailure()).toBe(true);
    expect(new ClinicaHttpError('server', 500).isAuthFailure()).toBe(false);
  });
});

describe('webforms.util', () => {
  test('loginFailed detects Hebrew error text', () => {
    expect(loginFailed('נסיון הכניסה למערכת נכשל')).toBe(true);
    expect(loginFailed('ok')).toBe(false);
  });

  test('parseWebForms extracts hidden fields', () => {
    const html = `
      <input name="__VIEWSTATE" id="__VIEWSTATE" value="abc" />
      <input name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="GEN" />
      <input name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="ev" />
    `;
    expect(parseWebForms(html)).toEqual({
      viewState: 'abc',
      viewStateGenerator: 'GEN',
      eventValidation: 'ev',
    });
  });
});
