import { Module } from '@nestjs/common';
import { ClaimsModule } from '../claims/claims.module';
import { ItemsModule } from '../items/items.module';
import { StatsController } from './stats.controller';

@Module({
  imports: [ItemsModule, ClaimsModule],
  controllers: [StatsController],
})
export class StatsModule {}
