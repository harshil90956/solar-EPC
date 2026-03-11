import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type CustomRoleDocument = CustomRole & Document;

@Schema({ timestamps: true })
export class CustomRole {
  @Prop({ required: true, unique: true })
  roleId!: string;

  @Prop({ required: true })
  label!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ type: String, default: null })
  baseRole!: string | null;

  @Prop({ default: '#8b5cf6' })
  color!: string;

  @Prop({ default: 'rgba(139,92,246,0.12)' })
  bg!: string;

  @Prop({ required: true, default: true })
  isCustom!: boolean;

  @Prop({ type: Map, of: Object, default: {} })
  permissions!: Map<string, Map<string, boolean>>;

  @Prop({ type: String, default: 'ALL', enum: ['ALL', 'ASSIGNED'] })
  dataScope!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;
}

export const CustomRoleSchema = SchemaFactory.createForClass(CustomRole);
CustomRoleSchema.index({ roleId: 1, tenantId: 1 }, { unique: true, sparse: true });
