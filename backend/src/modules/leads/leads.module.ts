import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { LeadsService } from './services/leads.service';
import { LeadsController } from './controllers/leads.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Lead.name, schema: LeadSchema }]),
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}

