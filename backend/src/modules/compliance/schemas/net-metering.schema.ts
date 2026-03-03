import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type NetMeteringStatus = 'Draft' | 'Applied' | 'Approved' | 'Rejected' | 'Connected';

@Schema(BaseSchemaOptions)
export class NetMetering extends Document {
  @Prop({ required: true, unique: true })
  applicationId!: string;

  @Prop({ required: true })
  projectId!: string;

  @Prop({ required: true })
  customer!: string;

  @Prop({ required: true })
  site!: string;

  @Prop({ required: true })
  systemSize!: string;

  @Prop({ required: true })
  discom!: string;

  @Prop()
  applicationNo?: string;

  @Prop()
  appliedDate?: string;

  @Prop()
  approvalDate?: string;

  @Prop({
    required: true,
    enum: ['Draft', 'Applied', 'Approved', 'Rejected', 'Connected'],
    default: 'Draft',
  })
  status!: string;

  @Prop()
  compensationRate?: string;

  @Prop({ default: false })
  bidirectionalMeter!: boolean;

  @Prop()
  discomOfficer?: string;

  @Prop()
  discomPhone?: string;

  @Prop()
  meterInstallationDate?: string;

  @Prop()
  connectionDate?: string;

  @Prop(BaseSchemaDefinition.tenantId)
  tenantId!: Types.ObjectId;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const NetMeteringSchema = SchemaFactory.createForClass(NetMetering);

// Indexes
NetMeteringSchema.index({ tenantId: 1, status: 1 });
NetMeteringSchema.index({ tenantId: 1, projectId: 1 });
NetMeteringSchema.index({ tenantId: 1, applicationId: 1 });
