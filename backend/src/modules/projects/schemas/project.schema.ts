import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export interface Milestone {
  name: string;
  status: 'Pending' | 'In Progress' | 'Done';
  date: string | null;
}

export interface Material {
  itemId: string;
  itemName: string;
  quantity: number;
  issuedDate?: string;
  remarks?: string;
}

@Schema(BaseSchemaOptions)
export class Project extends Document {
  @Prop({ required: true, unique: true })
  projectId!: string;

  @Prop({ type: Types.ObjectId, ref: 'Quotation', required: false })
  quotationId?: Types.ObjectId;

  @Prop({ required: true })
  customerName!: string;

  @Prop({ required: false })
  email?: string;

  @Prop({ required: false })
  mobileNumber?: string;

  @Prop({ required: true })
  site!: string;

  @Prop({ required: true, min: 0 })
  systemSize!: number;

  @Prop({
    required: true,
    enum: ['Survey', 'Design', 'Quotation', 'Procurement', 'Installation', 'Commissioned', 'On Hold', 'Cancelled'],
  })
  status!: string;

  @Prop({ required: true })
  pm!: string;

  @Prop({ required: true })
  startDate!: string;

  @Prop({ required: false })
  estEndDate?: string;

  @Prop({ required: true, min: 0, max: 100 })
  progress!: number;

  @Prop({ required: true, min: 0 })
  value!: number;

  @Prop({
    type: [{
      name: { type: String, required: true },
      status: { type: String, enum: ['Pending', 'In Progress', 'Done'], required: true },
      date: { type: String, required: false },
    }],
    default: [],
  })
  milestones!: Milestone[];

  @Prop({
    type: [{
      itemId: { type: String, required: true },
      itemName: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      issuedDate: { type: String, required: false },
      remarks: { type: String, required: false },
    }],
    default: [],
  })
  materials?: Material[];

  @Prop(BaseSchemaDefinition.tenantId)
  tenantId!: Types.ObjectId;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;

  @Prop({ required: false })
  cancelledAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true, required: false })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  cancelledBy?: Types.ObjectId;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// Index for efficient querying
ProjectSchema.index({ tenantId: 1, status: 1 });
ProjectSchema.index({ tenantId: 1, projectId: 1 });
ProjectSchema.index({ tenantId: 1, customerName: 'text', site: 'text' });
ProjectSchema.index({ assignedTo: 1 });
