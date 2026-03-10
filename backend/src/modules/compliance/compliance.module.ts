import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ComplianceController } from './controllers/compliance.controller';
import { ComplianceService } from './services/compliance.service';
import { NetMetering, NetMeteringSchema } from './schemas/net-metering.schema';
import { Subsidy, SubsidySchema } from './schemas/subsidy.schema';
import { Inspection, InspectionSchema } from './schemas/inspection.schema';
import { ComplianceDocument, ComplianceDocumentSchema } from './schemas/compliance-document.schema';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NetMetering.name, schema: NetMeteringSchema },
      { name: Subsidy.name, schema: SubsidySchema },
      { name: Inspection.name, schema: InspectionSchema },
      { name: ComplianceDocument.name, schema: ComplianceDocumentSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
    SettingsModule,
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}

