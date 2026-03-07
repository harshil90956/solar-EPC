import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EstimateController } from './controllers/estimate.controller';
import { EstimateService } from './services/estimate.service';
import { PDFService } from './services/pdf.service';
import { Estimate, EstimateSchema } from './schemas/estimate.schema';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Estimate.name, schema: EstimateSchema },
      { name: Tenant.name, schema: TenantSchema },
    ]),
  ],
  controllers: [EstimateController],
  providers: [EstimateService, PDFService],
  exports: [EstimateService, PDFService],
})
export class EstimatesModule {}
