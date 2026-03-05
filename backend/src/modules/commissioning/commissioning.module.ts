import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommissioningController } from './controllers/commissioning.controller';
import { CommissioningService } from './services/commissioning.service';
import { Commissioning, CommissioningSchema } from './schemas/commissioning.schema';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Commissioning.name, schema: CommissioningSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
  ],
  controllers: [CommissioningController],
  providers: [CommissioningService],
  exports: [CommissioningService],
})
export class CommissioningModule {}

