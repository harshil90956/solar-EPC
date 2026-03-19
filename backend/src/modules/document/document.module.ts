import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentController } from './controllers/document.controller';
import { DocumentService } from './services/document.service';
import { DocumentEntity, DocumentEntitySchema } from './schemas/document.schema';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';
import { Lead, LeadSchema } from '../leads/schemas/lead.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentEntity.name, schema: DocumentEntitySchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    EmailModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
