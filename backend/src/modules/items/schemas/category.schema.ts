import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

@Schema(BaseSchemaOptions)
export class Category extends Document {
  @Prop({ required: true })
  code!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  color?: string;

  @Prop({ required: true, type: String })
  tenantId!: string;

  @Prop({ required: false, default: true })
  isActive?: boolean;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ tenantId: 1, code: 1 }, { unique: true });
CategorySchema.index({ tenantId: 1, isDeleted: 1 });
