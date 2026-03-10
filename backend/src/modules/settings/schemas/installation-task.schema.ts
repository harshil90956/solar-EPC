import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InstallationTaskConfigDocument = InstallationTaskConfig & Document;

export interface InstallationTaskDefinition {
  name: string;
  photoRequired: boolean;
}

@Schema({ timestamps: true })
export class InstallationTaskConfig {
  // We only ever store one config per tenant. tenantId may be undefined for global defaults.
  @Prop({ type: Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;

  @Prop({
    type: [{
      name: { type: String, required: true },
      photoRequired: { type: Boolean, default: false },
    }],
    default: [],
  })
  tasks!: InstallationTaskDefinition[];
}

export const InstallationTaskConfigSchema = SchemaFactory.createForClass(InstallationTaskConfig);
InstallationTaskConfigSchema.index({ tenantId: 1 }, { unique: true, sparse: true });
