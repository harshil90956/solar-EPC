import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type ManualAdjustmentDocument = ManualAdjustment & Document;

export type ManualAdjustmentType = 'credit' | 'debit';

@Schema({ ...BaseSchemaOptions, collection: 'financeManualAdjustments' })
export class ManualAdjustment {
  @Prop(BaseSchemaDefinition.tenantId)
  tenantId!: Types.ObjectId;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;

  @Prop({ required: true, enum: ['credit', 'debit'], index: true })
  type!: ManualAdjustmentType;

  @Prop({ required: false, index: true })
  category?: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: false })
  reason?: string;

  @Prop({ required: false })
  reference?: string;

  @Prop({ required: true, index: true })
  date!: Date;

  @Prop({ required: false })
  createdBy?: Types.ObjectId;
}

export const ManualAdjustmentSchema = SchemaFactory.createForClass(ManualAdjustment);

ManualAdjustmentSchema.index({ tenantId: 1, date: -1 });
ManualAdjustmentSchema.index({ tenantId: 1, type: 1 });
