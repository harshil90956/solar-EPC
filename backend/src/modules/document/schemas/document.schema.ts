import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type DocumentEntityDocument = DocumentEntity & Document;

export enum DocumentType {
  ESTIMATE = 'estimate',
  PROPOSAL = 'proposal',
  QUOTATION = 'quotation',
  CONTRACT = 'contract',
  INVOICE = 'invoice',
}

export enum DocumentStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class DocumentItem {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: Number, required: true })
  quantity!: number;

  @Prop({ type: Number, required: true })
  unitPrice!: number;

  @Prop({ type: Number, required: true })
  total!: number;
}

const DocumentItemSchema = SchemaFactory.createForClass(DocumentItem);

@Schema({ timestamps: true })
export class DocumentEntity {
  @Prop({ required: true, unique: true })
  documentId!: string;

  @Prop({ required: true, enum: DocumentType })
  type!: DocumentType;

  @Prop({ required: true })
  title!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lead', index: true })
  leadId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', index: true })
  projectId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Customer', index: true })
  customerId?: Types.ObjectId;

  @Prop({ required: true })
  customerName!: string;

  @Prop({ default: '' })
  customerEmail!: string;

  @Prop({ default: '' })
  customerPhone!: string;

  @Prop({ default: '' })
  customerAddress!: string;

  @Prop({ type: [DocumentItemSchema], default: [] })
  items!: DocumentItem[];

  @Prop({ type: Number, default: 0 })
  subtotal!: number;

  @Prop({ type: Number, default: 0 })
  taxRate!: number;

  @Prop({ type: Number, default: 0 })
  taxAmount!: number;

  @Prop({ type: Number, default: 0 })
  discount!: number;

  @Prop({ type: Number, default: 0 })
  total!: number;

  @Prop({ enum: DocumentStatus, default: DocumentStatus.DRAFT })
  status!: DocumentStatus;

  @Prop({ type: Date, default: null })
  validUntil?: Date | null;

  @Prop({ type: Date, default: null })
  sentAt?: Date | null;

  @Prop({ type: Date, default: null })
  acceptedAt?: Date | null;

  @Prop({ default: '' })
  notes!: string;

  @Prop({ default: '' })
  terms!: string;

  @Prop({ default: '' })
  createdBy!: string;

  @Prop({ default: '' })
  assignedTo!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;
}

export const DocumentEntitySchema = SchemaFactory.createForClass(DocumentEntity);

DocumentEntitySchema.index({ documentId: 1, tenantId: 1 }, { unique: true, sparse: true });
DocumentEntitySchema.index({ type: 1 });
DocumentEntitySchema.index({ status: 1 });
DocumentEntitySchema.index({ leadId: 1 });
DocumentEntitySchema.index({ projectId: 1 });
DocumentEntitySchema.index({ customerId: 1 });
