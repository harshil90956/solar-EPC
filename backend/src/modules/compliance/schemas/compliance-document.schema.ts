import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type DocumentStatus = 'Uploaded' | 'Pending' | 'Rejected';

@Schema(BaseSchemaOptions)
export class ComplianceDocument extends Document {
  @Prop({ required: true, unique: true })
  documentId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  category!: string;

  @Prop({ required: true })
  projectId!: string;

  @Prop()
  projectName?: string;

  @Prop({
    required: true,
    enum: ['Uploaded', 'Pending', 'Rejected'],
    default: 'Pending',
  })
  status!: string;

  @Prop({ default: false })
  required!: boolean;

  @Prop()
  fileUrl?: string;

  @Prop()
  fileName?: string;

  @Prop()
  fileSize?: number;

  @Prop()
  mimeType?: string;

  @Prop()
  uploadedAt?: string;

  @Prop()
  uploadedBy?: string;

  @Prop()
  expiryDate?: string;

  @Prop()
  issuingAuthority?: string;

  @Prop()
  documentDate?: string;

  @Prop()
  version!: number;

  @Prop()
  previousVersionId?: string;

  @Prop()
  rejectionReason?: string;

  @Prop()
  remarks?: string;

  @Prop(BaseSchemaDefinition.tenantId)
  tenantId!: Types.ObjectId;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ComplianceDocumentSchema = SchemaFactory.createForClass(ComplianceDocument);

// Indexes
ComplianceDocumentSchema.index({ tenantId: 1, status: 1 });
ComplianceDocumentSchema.index({ tenantId: 1, projectId: 1 });
ComplianceDocumentSchema.index({ tenantId: 1, documentId: 1 });
ComplianceDocumentSchema.index({ tenantId: 1, category: 1 });
