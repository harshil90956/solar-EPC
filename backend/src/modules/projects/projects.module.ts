import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsController } from './controllers/projects.controller';
import { ProjectsService } from './services/projects.service';
import { Project, ProjectSchema } from './schemas/project.schema';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';
import { Item, ItemSchema } from '../items/schemas/item.schema';
import { Inventory, InventorySchema } from '../inventory/schemas/inventory.schema';
import { InventoryReservation, InventoryReservationSchema } from '../inventory/schemas/inventory-reservation.schema';
import { DocumentEntity, DocumentEntitySchema } from '../document/schemas/document.schema';
import { SettingsModule } from '../settings/settings.module';
import { StockMovementService } from '../inventory/services/stock-movement.service';
import { StockMovement, StockMovementSchema } from '../inventory/schemas/stock-movement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Item.name, schema: ItemSchema },
      { name: Inventory.name, schema: InventorySchema },
      { name: InventoryReservation.name, schema: InventoryReservationSchema },
      { name: DocumentEntity.name, schema: DocumentEntitySchema },
      { name: StockMovement.name, schema: StockMovementSchema },
    ]),
    SettingsModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, StockMovementService],
  exports: [ProjectsService, MongooseModule],
})
export class ProjectsModule {}

