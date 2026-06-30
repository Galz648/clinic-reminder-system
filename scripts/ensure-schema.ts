import 'dotenv/config';

import { migrateDatabase } from '../src/db';

const target = await migrateDatabase();
console.log('Migrations applied to', target);
