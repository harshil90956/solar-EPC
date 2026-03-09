import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Item, ItemSchema } from './schemas/item.schema';
import { Warehouse, WarehouseSchema } from './schemas/warehouse.schema';
import { Category, CategorySchema } from './schemas/category.schema';
import { Unit, UnitSchema } from './schemas/unit.schema';
import { InventoryReservation, InventoryReservationSchema } from '../inventory/schemas/inventory-reservation.schema';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';
import { ItemsController } from './controllers/items.controller';
import { LookupController } from './controllers/lookup.controller';
import { ItemsService } from './services/items.service';
import { LookupService } from './services/lookup.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Item.name, schema: ItemSchema },
    { name: Warehouse.name, schema: WarehouseSchema },
    { name: Category.name, schema: CategorySchema },
    { name: Unit.name, schema: UnitSchema },
    { name: InventoryReservation.name, schema: InventoryReservationSchema },
    { name: Tenant.name, schema: TenantSchema }
  ])],
  controllers: [ItemsController, LookupController],
  providers: [ItemsService, LookupService],
  exports: [ItemsService, LookupService],
})
export class ItemsModule {}
