import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogisticsController } from './controllers/logistics.controller';
import { LogisticsService } from './services/logistics.service';
import { Dispatch, DispatchSchema } from './schemas/dispatch.schema';
import { Vendor, VendorSchema } from './schemas/vendor.schema';
import { PurchaseOrder, PurchaseOrderSchema } from '../procurement/schemas/purchase-order.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { InventoryModule } from '../inventory/inventory.module';
import { SettingsModule } from '../settings/settings.module';
import { InstallationModule } from '../installation/installation.module';
import { ProcurementModule } from '../procurement/procurement.module';
import { RequestLoggingMiddleware } from '../../common/middleware/request-logging.middleware';
import { LoggingGuard } from '../../common/guards/logging.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Dispatch.name, schema: DispatchSchema },
      { name: 'LogisticsVendor', schema: VendorSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Project.name, schema: ProjectSchema }
    ]),
    InventoryModule,
    SettingsModule,
    InstallationModule,
    ProcurementModule,
  ],
  controllers: [LogisticsController],
  providers: [LogisticsService, LoggingGuard],
  exports: [LogisticsService],
})
export class LogisticsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggingMiddleware)
      .forRoutes(LogisticsController);
  }
}
