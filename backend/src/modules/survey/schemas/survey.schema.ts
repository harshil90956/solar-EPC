import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseSchemaDefinition } from '../../../shared/database/base.schema';

export type SurveyDocument = Survey & Document;

@Schema({ timestamps: true })
export class Survey {
  @Prop({ required: true, unique: true })
  surveyId!: string;

  @Prop({ required: true })
  customerName!: string;

  @Prop({ default: '' })
  site!: string;

  @Prop({ required: true })
  engineer!: string;

  @Prop({ required: true })
  scheduledDate!: string;

  @Prop({ type: Number, default: 0 })
  estimatedKw!: number;

  @Prop({ default: 'Scheduled' })
  status!: string;

  @Prop({ type: Number, default: 0 })
  shadowPct!: number;

  @Prop({ type: Number, default: 0 })
  roofArea!: number;

  @Prop({ default: '' })
  sourceLeadId!: string;

  @Prop({ default: '' })
  notes!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true, required: false })
  tenantId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true, required: false })
  createdBy?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true, required: false })
  assignedTo?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true, required: false })
  assignedBy?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt!: Date;
}

export const SurveySchema = SchemaFactory.createForClass(Survey);

// Indexes for tenant isolation and visibility queries
SurveySchema.index({ tenantId: 1, status: 1 });
SurveySchema.index({ tenantId: 1, createdBy: 1 }); // For creator-based visibility
SurveySchema.index({ tenantId: 1, assignedTo: 1 }); // For assignment-based visibility
SurveySchema.index({ tenantId: 1, assignedBy: 1 }); // For tracking assignments
SurveySchema.index({ tenantId: 1, createdBy: 1, assignedTo: 1 }); // Compound for visibility
SurveySchema.index({ tenantId: 1, createdAt: -1 });
SurveySchema.index({ tenantId: 1, surveyId: 1 });
