import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Sanitized ASMX list payloads — no real PII (see `test/fixtures/clinica/`). */
export function loadClinicaFixture<T>(filename: string): T[] {
  const path = join(process.cwd(), 'test/fixtures/clinica', filename);
  return JSON.parse(readFileSync(path, 'utf8')) as T[];
}
