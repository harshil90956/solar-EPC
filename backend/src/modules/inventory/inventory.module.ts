import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryController } from './controllers/inventory.controller';
import { StockMovementController } from './controllers/stock-movement.controller';
import { InventoryService } from './services/inventory.service';
import { StockMovementService } from './services/stock-movement.service';
import { Inventory, InventorySchema } from './schemas/inventory.schema';
import { InventoryReservation, InventoryReservationSchema } from './schemas/inventory-reservation.schema';
import { StockMovement, StockMovementSchema } from './schemas/stock-movement.schema';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Inventory.name, schema: InventorySchema },
      { name: InventoryReservation.name, schema: InventoryReservationSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    SettingsModule,
  ],
  controllers: [InventoryController, StockMovementController],
  providers: [InventoryService, StockMovementService],
  exports: [InventoryService, StockMovementService],
})
export class InventoryModule {}

