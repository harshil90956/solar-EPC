import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

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

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt!: Date;

  // Tenant isolation fields
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true, required: false })
  tenantId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true, required: false })
  assignedTo?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;
}

export const SurveySchema = SchemaFactory.createForClass(Survey);

// Indexes for tenant isolation and visibility queries
SurveySchema.index({ tenantId: 1, status: 1 });
SurveySchema.index({ tenantId: 1, assignedTo: 1 });
SurveySchema.index({ tenantId: 1, createdAt: -1 });
SurveySchema.index({ tenantId: 1, surveyId: 1 });
