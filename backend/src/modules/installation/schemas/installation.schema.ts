import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export interface TaskItem {
  name: string;
  done: boolean;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
}

export interface PhotoItem {
  url: string;
  key: string;
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;
  caption?: string;
  category?: 'before' | 'during' | 'after';
}

export interface CustomerSignOff {
  signed: boolean;
  signedAt?: Date;
  signatureUrl?: string;
}

@Schema(BaseSchemaOptions)
export class Installation extends Document {
  @Prop({ required: true, unique: true })
  installationId!: string;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: String, ref: 'Dispatch', required: false, index: true })
  dispatchId?: string;

  @Prop({ required: true })
  customerName!: string;

  @Prop({ required: true })
  site!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  technicianId!: Types.ObjectId;

  @Prop({ required: true })
  technicianName!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  supervisorId?: Types.ObjectId;

  @Prop({ required: false })
  supervisorName?: string;

  @Prop({ required: true })
  scheduledDate!: Date;

  @Prop({ required: false })
  startTime?: Date;

  @Prop({ required: false })
  endTime?: Date;

  @Prop({
    required: true,
    enum: ['Pending', 'In Progress', 'Delayed', 'Completed'],
    default: 'Pending',
    index: true,
  })
  status!: string;

  @Prop({ required: true, min: 0, max: 100, default: 0 })
  progress!: number;

  @Prop({
    type: [{
      name: { type: String, required: true },
      done: { type: Boolean, default: false },
      completedAt: { type: Date, required: false },
      completedBy: { type: Types.ObjectId, ref: 'User', required: false },
    }],
    default: [],
  })
  tasks!: TaskItem[];

  @Prop({
    type: [{
      url: { type: String, required: true },
      key: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
      uploadedBy: { type: Types.ObjectId, ref: 'User', required: true },
      caption: { type: String, required: false },
      category: { type: String, enum: ['before', 'during', 'after'], required: false },
    }],
    default: [],
  })
  photos!: PhotoItem[];

  @Prop({ default: '' })
  notes!: string;

  @Prop({ default: '' })
  siteObservations!: string;

  @Prop({ type: [{
    itemId: { type: String, required: true },
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    serialNumbers: [{ type: String }],
  }], default: [] })
  materialsUsed!: {
    itemId: string;
    itemName: string;
    quantity: number;
    serialNumbers?: string[];
  }[];

  @Prop({ default: false })
  qualityCheckPassed!: boolean;

  @Prop({ default: '' })
  qualityCheckNotes!: string;

  @Prop({
    type: {
      signed: { type: Boolean, default: false },
      signedAt: { type: Date, required: false },
      signatureUrl: { type: String, required: false },
    },
    default: { signed: false },
  })
  customerSignOff!: CustomerSignOff;

  @Prop({ type: Date })
  delayedAt?: Date;

  @Prop({ default: '' })
  delayReason!: string;

  @Prop({ default: false })
  commissioningTriggered!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Commissioning', required: false })
  commissioningId?: Types.ObjectId;

  @Prop(BaseSchemaDefinition.tenantId)
  tenantId!: Types.ObjectId;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, index: true })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;
}

export const InstallationSchema = SchemaFactory.createForClass(Installation);

// Compound indexes for efficient querying
InstallationSchema.index({ tenantId: 1, status: 1 });
InstallationSchema.index({ tenantId: 1, projectId: 1 });
InstallationSchema.index({ tenantId: 1, technicianId: 1 });
InstallationSchema.index({ tenantId: 1, assignedTo: 1 });
InstallationSchema.index({ tenantId: 1, scheduledDate: -1 });
InstallationSchema.index({ tenantId: 1, createdAt: -1 });
InstallationSchema.index({ tenantId: 1, customerName: 'text', site: 'text' });
