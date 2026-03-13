import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuotationController } from './controllers/quotation.controller';
import { QuotationService } from './services/quotation.service';
import { PdfService } from './services/pdf.service';
import { Quotation, QuotationSchema } from './schemas/quotation.schema';
import { QuotationHistory, QuotationHistorySchema } from './schemas/quotation-history.schema';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quotation.name, schema: QuotationSchema },
      { name: QuotationHistory.name, schema: QuotationHistorySchema },
    ]),
    EmailModule,
  ],
  controllers: [QuotationController],
  providers: [QuotationService, PdfService],
  exports: [QuotationService, PdfService],
})
export class QuotationModule {}
