import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type AdjustmentCategoryDocument = AdjustmentCategory & Document;

export type AdjustmentCategoryType = 'credit' | 'debit';

@Schema({ ...BaseSchemaOptions, collection: 'financeAdjustmentCategories' })
export class AdjustmentCategory {
  @Prop(BaseSchemaDefinition.tenantId)
  tenantId!: Types.ObjectId;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;

  @Prop({ required: true })
  categoryName!: string;

  @Prop({ required: true, enum: ['credit', 'debit'], index: true })
  type!: AdjustmentCategoryType;

  @Prop({ required: false })
  createdBy?: Types.ObjectId;
}

export const AdjustmentCategorySchema = SchemaFactory.createForClass(AdjustmentCategory);

AdjustmentCategorySchema.index({ tenantId: 1, type: 1 });
AdjustmentCategorySchema.index({ tenantId: 1, categoryName: 1 });
