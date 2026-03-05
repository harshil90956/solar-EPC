import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type SubsidyStatus = 'Applied' | 'Sanctioned' | 'Disbursed' | 'Rejected';

@Schema(BaseSchemaOptions)
export class Subsidy extends Document {
  @Prop({ required: true, unique: true })
  subsidyId!: string;

  @Prop({ required: true })
  projectId!: string;

  @Prop({ required: true })
  customer!: string;

  @Prop({ required: true })
  systemSize!: string;

  @Prop({ required: true })
  scheme!: string;

  @Prop()
  appliedDate?: string;

  @Prop()
  sanctionDate?: string;

  @Prop()
  disbursedDate?: string;

  @Prop({ required: true, min: 0 })
  claimAmount!: number;

  @Prop()
  sanctionedAmount?: number;

  @Prop()
  disbursedAmount?: number;

  @Prop({
    required: true,
    enum: ['Applied', 'Sanctioned', 'Disbursed', 'Rejected'],
    default: 'Applied',
  })
  status!: string;

  @Prop()
  applicationRef?: string;

  @Prop()
  bankAccount?: string;

  @Prop()
  ifscCode?: string;

  @Prop()
  remarks?: string;

  @Prop(BaseSchemaDefinition.tenantId)
  tenantId!: Types.ObjectId;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const SubsidySchema = SchemaFactory.createForClass(Subsidy);

// Indexes
SubsidySchema.index({ tenantId: 1, status: 1 });
SubsidySchema.index({ tenantId: 1, projectId: 1 });
SubsidySchema.index({ tenantId: 1, subsidyId: 1 });
