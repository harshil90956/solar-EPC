import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export interface Tax {
  name: string;
  rate: number;
}

@Schema(BaseSchemaOptions)
export class Item extends Document {
  @Prop({ required: false })
  itemId?: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: false })
  longDescription?: string;

  @Prop({ required: true, min: 0 })
  rate!: number;

  @Prop({ required: false, default: 0 })
  tax1!: number;

  @Prop({ required: false, default: 0 })
  tax2!: number;

  @Prop({ required: false })
  unit?: string;

  @Prop({ required: false })
  category?: string;

  @Prop({ required: false })
  warehouse?: string;

  @Prop({ required: false, default: 0 })
  stock?: number;

  @Prop({ required: false, default: 0 })
  minStock?: number;

  @Prop({ required: false, default: 0 })
  reserved?: number;

  @Prop({ required: false })
  poReference?: string;

  @Prop({ required: false, default: 'In Stock' })
  status?: string;

  @Prop({ type: Types.ObjectId, ref: 'ItemGroup', required: false })
  itemGroupId?: Types.ObjectId;

  @Prop({ required: false })
  itemGroupName?: string;

  @Prop({ required: true, type: String })
  tenantId!: string;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;
}

export const ItemSchema = SchemaFactory.createForClass(Item);

// Index for efficient querying
ItemSchema.index({ tenantId: 1, description: 'text' });
ItemSchema.index({ tenantId: 1, itemGroupId: 1 });
