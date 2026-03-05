import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProcurementController } from './controllers/procurement.controller';
import { ProcurementService } from './services/procurement.service';
import { Vendor, VendorSchema } from './schemas/vendor.schema';
import { PurchaseOrder, PurchaseOrderSchema } from './schemas/purchase-order.schema';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vendor.name, schema: VendorSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
  ],
  controllers: [ProcurementController],
  providers: [ProcurementService],
  exports: [ProcurementService],
})
export class ProcurementModule {}

