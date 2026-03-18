import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type TaskDocument = Task & Document;

export type TaskStatus = 'pending' | 'in-progress' | 'completed';

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ trim: true })
  description?: string;

  // assignedTo as string like Survey module (engineer field)
  @Prop({ required: true })
  assignedTo!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  assignedToUserId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', required: true })
  tenantId!: Types.ObjectId;

  @Prop({ 
    type: String, 
    enum: ['pending', 'in-progress', 'completed'], 
    default: 'pending' 
  })
  status!: TaskStatus;

  @Prop({ type: Date })
  dueDate?: Date;

  @Prop({ type: Boolean, default: false })
  isDeleted?: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

// Index for faster queries
TaskSchema.index({ tenantId: 1, status: 1 });
TaskSchema.index({ assignedTo: 1, tenantId: 1 });
TaskSchema.index({ createdBy: 1, tenantId: 1 });
TaskSchema.index({ isDeleted: 1 });
