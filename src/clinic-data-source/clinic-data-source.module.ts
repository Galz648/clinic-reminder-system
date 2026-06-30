import { Module } from '@nestjs/common';

import { CLINIC_DATA_SOURCE } from './clinic-data-source.interface';
import { MockClinicDataSource } from './mock/mock-clinic-data-source';

@Module({
  providers: [
    MockClinicDataSource,
    {
      provide: CLINIC_DATA_SOURCE,
      useExisting: MockClinicDataSource,
    },
  ],
  exports: [CLINIC_DATA_SOURCE, MockClinicDataSource],
})
export class ClinicDataSourceModule {}
