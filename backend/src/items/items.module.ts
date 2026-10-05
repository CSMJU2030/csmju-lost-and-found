import { Module } from '@nestjs/common';
import { ImagesService } from './images.service';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

@Module({
  controllers: [ItemsController],
  providers: [ItemsService, ImagesService],
  exports: [ItemsService],
})
export class ItemsModule {}
