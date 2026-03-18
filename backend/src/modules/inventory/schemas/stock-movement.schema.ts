import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type StockMovementType = 
  | 'PURCHASE' 
  | 'RESERVE' 
  | 'RELEASE' 
  | 'TRANSFER' 
  | 'DISPATCH' 
  | 'CONSUME' 
  | 'ADJUSTMENT';

export const StockMovementTypes: StockMovementType[] = [
  'PURCHASE',
  'RESERVE',
  'RELEASE',
  'TRANSFER',
  'DISPATCH',
  'CONSUME',
  'ADJUSTMENT',
];

@Schema(BaseSchemaOptions)
export class StockMovement extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Item', required: true })
  itemId!: Types.ObjectId;

  @Prop({ required: true })
  itemDescription!: string;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: false })
  warehouseId?: Types.ObjectId;

  @Prop({ required: false })
  warehouseName?: string;

  @Prop({ 
    required: true, 
    enum: StockMovementTypes,
    type: String,
  })
  type!: StockMovementType;

  @Prop({ required: true })
  quantity!: number;

  @Prop({ required: false })
  stockBefore?: number;

  @Prop({ required: false })
  stockAfter?: number;

  @Prop({ required: false })
  reservedBefore?: number;

  @Prop({ required: false })
  reservedAfter?: number;

  @Prop({ required: false })
  reference?: string;

  @Prop({ required: false })
  referenceType?: string;

  @Prop({ required: false })
  note?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;

  @Prop({ required: false })
  createdByName?: string;

  @Prop({ required: true, type: String })
  tenantId!: string;

  @Prop({ type: String, required: false })
  customerName?: string;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);

// Indexes for efficient querying
StockMovementSchema.index({ tenantId: 1, createdAt: -1 });
StockMovementSchema.index({ tenantId: 1, itemId: 1, createdAt: -1 });
StockMovementSchema.index({ tenantId: 1, warehouseId: 1, createdAt: -1 });
StockMovementSchema.index({ tenantId: 1, type: 1, createdAt: -1 });
StockMovementSchema.index({ tenantId: 1, reference: 1 });
