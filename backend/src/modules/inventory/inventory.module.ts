import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryController } from './controllers/inventory.controller';
import { InventoryService } from './services/inventory.service';
import { Inventory, InventorySchema } from './schemas/inventory.schema';
import { InventoryReservation, InventoryReservationSchema } from './schemas/inventory-reservation.schema';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Inventory.name, schema: InventorySchema },
      { name: InventoryReservation.name, schema: InventoryReservationSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    SettingsModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

