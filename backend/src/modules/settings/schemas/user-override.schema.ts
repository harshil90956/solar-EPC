import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type UserOverrideDocument = UserOverride & Document;

@Schema({ timestamps: true })
export class UserOverride {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, default: null, index: true })
  customRoleId!: string | null;

  @Prop({ type: Map, of: Object, default: {} })
  overrides!: Map<string, Map<string, boolean | null>>;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const UserOverrideSchema = SchemaFactory.createForClass(UserOverride);
UserOverrideSchema.index({ userId: 1, tenantId: 1 }, { unique: true, sparse: true });
UserOverrideSchema.index({ tenantId: 1, customRoleId: 1 });
