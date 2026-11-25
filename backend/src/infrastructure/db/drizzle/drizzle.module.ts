import { Module } from '@nestjs/common';
import { DATABASE, DrizzleService } from './drizzle.service';

@Module({
  providers: [
    DrizzleService,
    { provide: DATABASE, useExisting: DrizzleService },
  ],
  exports: [DATABASE],
})
export class DrizzleModule {}
