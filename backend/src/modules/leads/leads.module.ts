import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { LeadStatus, LeadStatusSchema } from '../settings/schemas/lead-status.schema';
import { LeadsService } from './services/leads.service';
import { LeadsController } from './controllers/leads.controller';
import { SettingsModule } from '../settings/settings.module';
import { TenantModule } from '../../core/tenant/tenant.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: LeadStatus.name, schema: LeadStatusSchema },
    ]),
    SettingsModule,
    TenantModule,
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [MongooseModule, LeadsService]
})
export class LeadsModule {}
