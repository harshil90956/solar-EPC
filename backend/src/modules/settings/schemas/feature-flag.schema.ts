import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type FeatureFlagDocument = FeatureFlag & Document;

@Schema({ timestamps: true })
export class FeatureFlag {
  @Prop({ required: true, unique: true })
  moduleId!: string;

  @Prop({ required: true, default: true })
  enabled!: boolean;

  @Prop({ type: Map, of: Boolean, default: {} })
  features!: Map<string, boolean>;

  @Prop({ type: Map, of: Boolean, default: {} })
  actions!: Map<string, boolean>;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;
}

export const FeatureFlagSchema = SchemaFactory.createForClass(FeatureFlag);
FeatureFlagSchema.index({ moduleId: 1, tenantId: 1 }, { unique: true, sparse: true });
