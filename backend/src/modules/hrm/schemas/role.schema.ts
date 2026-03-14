import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Role extends Document {
  @Prop({ required: true, unique: true })
  name!: string; // e.g., 'HR Manager', 'Employee', 'Admin'

  @Prop({ default: '' })
  description!: string;

  @Prop({ default: false })
  isSystem!: boolean; // System roles cannot be deleted

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Permission' }], default: [] })
  permissions!: Types.ObjectId[];
}

export const RoleSchema = SchemaFactory.createForClass(Role);
