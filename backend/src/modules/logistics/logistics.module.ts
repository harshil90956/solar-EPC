import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogisticsController } from './controllers/logistics.controller';
import { LogisticsService } from './services/logistics.service';
import { Dispatch, DispatchSchema } from './schemas/dispatch.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Dispatch.name, schema: DispatchSchema }]),
  ],
  controllers: [LogisticsController],
  providers: [LogisticsService],
  exports: [LogisticsService],
})
export class LogisticsModule {}

