import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type InspectionStatus = 'Pending' | 'Scheduled' | 'Passed' | 'Failed';

@Schema(BaseSchemaOptions)
export class Inspection extends Document {
  @Prop({ required: true, unique: true })
  inspectionId!: string;

  @Prop({ required: true })
  projectId!: string;

  @Prop({ required: true })
  customer!: string;

  @Prop({ required: true })
  type!: string;

  @Prop()
  scheduledDate?: string;

  @Prop()
  completedDate?: string;

  @Prop({
    required: true,
    enum: ['Pending', 'Scheduled', 'Passed', 'Failed'],
    default: 'Pending',
  })
  status!: string;

  @Prop()
  inspector!: string;

  @Prop()
  outcome?: string;

  @Prop()
  remarks?: string;

  @Prop()
  nextInspectionDate?: string;

  @Prop({ type: [String], default: [] })
  checklistItems!: string[];

  @Prop({ type: [String], default: [] })
  documentsRequired!: string[];

  @Prop()
  inspectionReportUrl?: string;

  @Prop(BaseSchemaDefinition.tenantId)
  tenantId!: Types.ObjectId;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const InspectionSchema = SchemaFactory.createForClass(Inspection);

// Indexes
InspectionSchema.index({ tenantId: 1, status: 1 });
InspectionSchema.index({ tenantId: 1, projectId: 1 });
InspectionSchema.index({ tenantId: 1, inspectionId: 1 });
InspectionSchema.index({ tenantId: 1, scheduledDate: 1 });
