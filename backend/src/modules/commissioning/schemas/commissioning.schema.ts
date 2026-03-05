import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

@Schema(BaseSchemaOptions)
export class Commissioning extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true })
  projectIdString!: string;

  @Prop({ required: true })
  date!: string;

  @Prop({ required: true, min: 0, max: 100 })
  percentage!: number;

  @Prop({ required: true })
  inverterSerialNo!: string;

  @Prop({ required: true })
  panelBatchNo!: string;

  @Prop({
    required: true,
    enum: ['Pending', 'Completed', 'Cancelled'],
    default: 'Pending',
  })
  status!: string;

  @Prop(BaseSchemaDefinition.tenantId)
  tenantId!: Types.ObjectId;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  completedBy?: Types.ObjectId;

  @Prop({ required: false })
  completedAt?: Date;

  @Prop({ required: false })
  notes?: string;

  @Prop({ required: false })
  panelWarranty?: string;

  @Prop({ required: false })
  inverterWarranty?: string;

  @Prop({ required: false })
  installWarranty?: string;
}

export const CommissioningSchema = SchemaFactory.createForClass(Commissioning);

// Indexes for efficient querying
CommissioningSchema.index({ tenantId: 1, projectId: 1 });
CommissioningSchema.index({ tenantId: 1, status: 1 });
CommissioningSchema.index({ tenantId: 1, date: -1 });
CommissioningSchema.index({ tenantId: 1, projectIdString: 1 });
