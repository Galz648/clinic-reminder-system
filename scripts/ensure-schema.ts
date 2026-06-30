import 'dotenv/config';

import { migrateDatabase } from '../src/db';
import { resolveDrizzleDatabaseUrl } from '../src/db/database-url';

const connectionString = resolveDrizzleDatabaseUrl();
const target = await migrateDatabase(connectionString);
console.log('Migrations applied to', target);
