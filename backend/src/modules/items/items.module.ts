import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Item, ItemSchema } from './schemas/item.schema';
import { InventoryReservation, InventoryReservationSchema } from '../inventory/schemas/inventory-reservation.schema';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';
import { ItemsController } from './controllers/items.controller';
import { ItemsService } from './services/items.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Item.name, schema: ItemSchema },
      { name: InventoryReservation.name, schema: InventoryReservationSchema },
      { name: Tenant.name, schema: TenantSchema }
    ]),
    SettingsModule,
  ],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
