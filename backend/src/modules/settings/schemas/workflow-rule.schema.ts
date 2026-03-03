import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type WorkflowRuleDocument = WorkflowRule & Document;

@Schema({ timestamps: true })
export class WorkflowRule {
  @Prop({ required: true, unique: true })
  wfId!: string;

  @Prop({ required: true, default: true })
  enabled!: boolean;

  @Prop({ required: true })
  label!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: Object, required: true })
  condition!: { field: string; operator: string; value: string };

  @Prop({ type: Object, required: true })
  action!: { type: string; target: string };

  @Prop({ default: 'System' })
  createdBy!: string;

  @Prop({ default: '' })
  createdAt!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;
}

export const WorkflowRuleSchema = SchemaFactory.createForClass(WorkflowRule);
WorkflowRuleSchema.index({ wfId: 1, tenantId: 1 }, { unique: true, sparse: true });
