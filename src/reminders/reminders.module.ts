import { Module } from '@nestjs/common';

import { CasesModule } from '../cases/cases.module';
import { OwnersModule } from '../owners/owners.module';
import { TemporalModule } from '../temporal/temporal.module';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

@Module({
  imports: [OwnersModule, CasesModule, TemporalModule],
  controllers: [RemindersController],
  providers: [RemindersService],
})
export class RemindersModule {}
