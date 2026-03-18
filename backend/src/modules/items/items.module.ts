import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Item, ItemSchema } from './schemas/item.schema';
import { Warehouse, WarehouseSchema } from './schemas/warehouse.schema';
import { Category, CategorySchema } from './schemas/category.schema';
import { Unit, UnitSchema } from './schemas/unit.schema';
import { Inventory, InventorySchema } from './schemas/inventory.schema';
import { InventoryReservation, InventoryReservationSchema } from '../inventory/schemas/inventory-reservation.schema';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';
import { ItemsController } from './controllers/items.controller';
import { LookupController } from './controllers/lookup.controller';
import { ItemsService } from './services/items.service';
import { InventoryService } from './services/inventory.service';
import { LookupService } from './services/lookup.service';
import { SettingsModule } from '../settings/settings.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Item.name, schema: ItemSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Unit.name, schema: UnitSchema },
      { name: Inventory.name, schema: InventorySchema },
      { name: InventoryReservation.name, schema: InventoryReservationSchema },
      { name: Tenant.name, schema: TenantSchema }
    ]),
    SettingsModule,
    forwardRef(() => InventoryModule),
  ],
  controllers: [ItemsController, LookupController],
  providers: [ItemsService, InventoryService, LookupService],
  exports: [ItemsService, InventoryService, LookupService],
})
export class ItemsModule {}
