import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CasesModule } from './cases/cases.module';
import { ClinicDataSourceModule } from './clinic-data-source/clinic-data-source.module';
import { DbModule } from './db/db.module';
import { OwnersModule } from './owners/owners.module';
import { RemindersModule } from './reminders/reminders.module';
import { TemporalModule } from './temporal/temporal.module';

@Module({
  imports: [
    DbModule,
    OwnersModule,
    CasesModule,
    RemindersModule,
    TemporalModule,
    ClinicDataSourceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
