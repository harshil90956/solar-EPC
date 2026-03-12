import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProcurementController } from './controllers/procurement.controller';
import { ProcurementService } from './services/procurement.service';
import { Vendor, VendorSchema } from './schemas/vendor.schema';
import { PurchaseOrder, PurchaseOrderSchema } from './schemas/purchase-order.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';
import { SettingsModule } from '../settings/settings.module';
import { RequestLoggingMiddleware } from '../../common/middleware/request-logging.middleware';
import { LoggingGuard } from '../../common/guards/logging.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ProcurementVendor', schema: VendorSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    SettingsModule,
  ],
  controllers: [ProcurementController],
  providers: [ProcurementService, LoggingGuard],
  exports: [ProcurementService],
})
export class ProcurementModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggingMiddleware)
      .forRoutes(ProcurementController);
  }
}
