import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommissioningController } from './controllers/commissioning.controller';
import { CommissioningService } from './services/commissioning.service';
import { CommissioningIntegrationService } from './services/commissioning-integration.service';
import { Commissioning, CommissioningSchema } from './schemas/commissioning.schema';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Commissioning.name, schema: CommissioningSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    SettingsModule,
  ],
  controllers: [CommissioningController],
  providers: [CommissioningService, CommissioningIntegrationService],
  exports: [CommissioningService],
})
export class CommissioningModule {}

