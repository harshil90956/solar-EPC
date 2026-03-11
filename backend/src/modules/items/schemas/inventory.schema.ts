import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

@Schema(BaseSchemaOptions)
export class Inventory extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Item', required: true })
  itemId!: Types.ObjectId;

  @Prop({ required: true })
  itemCode!: string;

  @Prop({ required: true })
  itemName!: string;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: true })
  warehouseId!: Types.ObjectId;

  @Prop({ required: true })
  warehouseName!: string;

  @Prop({ required: false, default: 0 })
  stock!: number;

  @Prop({ required: false, default: 0 })
  reserved!: number;

  @Prop({ required: false, default: 0 })
  minStock!: number;

  @Prop({ required: false })
  category?: string;

  @Prop({ required: false })
  unit?: string;

  @Prop({ required: false })
  rate?: number;

  @Prop({ required: true, type: String })
  tenantId!: string;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;
}

export const InventorySchema = SchemaFactory.createForClass(Inventory);

// Compound unique index for itemId + warehouseId combination
InventorySchema.index({ tenantId: 1, itemId: 1, warehouseId: 1 }, { unique: true });
InventorySchema.index({ tenantId: 1, warehouseId: 1 });
InventorySchema.index({ tenantId: 1, itemCode: 1 });
InventorySchema.index({ tenantId: 1, isDeleted: 1 });
