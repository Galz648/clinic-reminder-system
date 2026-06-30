import 'dotenv/config';

import { defineConfig } from 'drizzle-kit';

import { resolveDrizzleDatabaseUrl } from './src/db/database-url';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: resolveDrizzleDatabaseUrl(),
  },
});
