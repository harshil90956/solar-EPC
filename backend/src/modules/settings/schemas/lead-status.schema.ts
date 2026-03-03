import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type LeadStatusDocument = LeadStatus & Document;

export enum StatusType {
  START = 'start',
  NORMAL = 'normal',
  SUCCESS = 'success',
  FAILURE = 'failure',
}

@Schema({ timestamps: true, collection: 'lead_statuses' })
export class LeadStatus {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true, required: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, default: 'crm' })
  module!: string;

  @Prop({ type: String, required: true, default: 'lead' })
  entity!: string;

  @Prop({ type: String, required: true })
  key!: string;

  @Prop({ type: String, required: true })
  label!: string;

  @Prop({ type: String, required: true, default: '#64748b' })
  color!: string;

  @Prop({ type: Number, required: true, default: 0 })
  order!: number;

  @Prop({ type: String, enum: StatusType, required: true, default: StatusType.NORMAL })
  type!: StatusType;

  @Prop({ type: Boolean, required: true, default: true })
  isActive!: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  isSystem!: boolean;
}

export const LeadStatusSchema = SchemaFactory.createForClass(LeadStatus);

// Compound index for tenant-scoped unique keys
LeadStatusSchema.index({ tenantId: 1, entity: 1, key: 1 }, { unique: true, sparse: true });
// Index for ordering queries
LeadStatusSchema.index({ tenantId: 1, entity: 1, isActive: 1, order: 1 });
