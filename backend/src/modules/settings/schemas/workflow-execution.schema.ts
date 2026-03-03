import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type WorkflowExecutionDocument = WorkflowExecution & Document;

@Schema({ timestamps: true })
export class WorkflowExecution {
  @Prop({ required: true, unique: true })
  executionId!: string;

  @Prop({ required: true, index: true })
  wfId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  entityType!: string; // 'project', 'lead', 'task', etc.

  @Prop({ type: String, required: true })
  entityId!: string;

  @Prop({ type: Object })
  triggerContext!: Record<string, any>;

  @Prop({ 
    type: String, 
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true,
  })
  status!: string;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: [Object] })
  actionResults!: Array<{
    actionIndex: number;
    actionType: string;
    status: 'success' | 'failed' | 'skipped';
    result?: any;
    error?: string;
    executedAt: Date;
  }>;

  @Prop({ type: String })
  errorMessage?: string;

  @Prop({ type: Object })
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    triggeredBy?: string;
  };
}

export const WorkflowExecutionSchema = SchemaFactory.createForClass(WorkflowExecution);
WorkflowExecutionSchema.index({ wfId: 1, tenantId: 1 });
WorkflowExecutionSchema.index({ tenantId: 1, status: 1 });
WorkflowExecutionSchema.index({ entityType: 1, entityId: 1 });
WorkflowExecutionSchema.index({ createdAt: -1 });
