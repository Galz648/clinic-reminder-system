import { Global, Module } from '@nestjs/common';

import { createDatabase } from './index';
import { DATABASE } from './db.constants';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: () => createDatabase(),
    },
  ],
  exports: [DATABASE],
})
export class DbModule {}
