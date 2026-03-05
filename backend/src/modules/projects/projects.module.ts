import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsController } from './controllers/projects.controller';
import { ProjectsService } from './services/projects.service';
import { Project, ProjectSchema } from './schemas/project.schema';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';
import { Item, ItemSchema } from '../items/schemas/item.schema';
import { Inventory, InventorySchema } from '../inventory/schemas/inventory.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Item.name, schema: ItemSchema },
      { name: Inventory.name, schema: InventorySchema },
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}

