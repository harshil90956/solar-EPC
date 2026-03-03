import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type RBACConfigDocument = RBACConfig & Document;

@Schema({ timestamps: true })
export class RBACConfig {
  @Prop({ required: true })
  roleId!: string;

  @Prop({ required: true })
  moduleId!: string;

  @Prop({ type: Map, of: Boolean, default: {} })
  permissions!: Map<string, boolean>;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;
}

export const RBACConfigSchema = SchemaFactory.createForClass(RBACConfig);
RBACConfigSchema.index({ roleId: 1, moduleId: 1, tenantId: 1 }, { unique: true, sparse: true });
