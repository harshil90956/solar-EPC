import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type StockStatus = 'In Stock' | 'Partially Reserved' | 'Low Stock' | 'Out of Stock';

@Schema(BaseSchemaOptions)
export class Inventory extends Document {
  @Prop({ required: true, unique: true })
  itemId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({
    required: true,
    enum: ['Panel', 'Inverter', 'BOS', 'Structure', 'Cable', 'Other'],
  })
  category!: string;

  @Prop({
    required: true,
    enum: ['Nos', 'Mtr', 'Kg', 'Set', 'Pairs', 'Box'],
  })
  unit!: string;

  @Prop({ required: true, min: 0, default: 0 })
  stock!: number;

  @Prop({ required: true, min: 0, default: 0 })
  reserved!: number;

  @Prop({ required: true, min: 0, default: 0 })
  available!: number;

  @Prop({ required: true, min: 0, default: 0 })
  minStock!: number;

  @Prop({ required: true, min: 0, default: 0 })
  rate!: number;

  @Prop({ required: true })
  warehouse!: string;

  @Prop({ required: false })
  lastUpdated?: string;

  @Prop({
    required: true,
    enum: ['In Stock', 'Partially Reserved', 'Low Stock', 'Out of Stock'],
  })
  status!: string;

  @Prop(BaseSchemaDefinition.tenantId)
  tenantId!: Types.ObjectId;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;
}

export const InventorySchema = SchemaFactory.createForClass(Inventory);

// Index for efficient querying
InventorySchema.index({ tenantId: 1, category: 1 });
InventorySchema.index({ tenantId: 1, itemId: 1 });
InventorySchema.index({ tenantId: 1, name: 'text', category: 'text' });
