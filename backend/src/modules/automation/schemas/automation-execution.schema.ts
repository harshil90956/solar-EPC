import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type AutomationExecutionDocument = AutomationExecution & Document;

/**
 * Automation Execution Schema - Production Grade
 * Tracks complete execution lifecycle with detailed action results
 */

// Individual action execution result
@Schema({ _id: false })
export class ActionExecutionResult {
  @Prop({ type: String, required: true })
  nodeId!: string;

  @Prop({ type: String, required: true })
  actionType!: string;

  @Prop({ 
    type: String, 
    enum: ['pending', 'running', 'completed', 'failed', 'skipped', 'retrying'],
    default: 'pending'
  })
  status!: string;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Number })
  durationMs?: number;

  @Prop({ type: Object })
  input?: Record<string, any>;

  @Prop({ type: Object })
  output?: Record<string, any>;

  @Prop({ type: String })
  errorMessage?: string;

  @Prop({ type: String })
  errorStack?: string;

  @Prop({ type: Number, default: 0 })
  retryAttempt!: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

// Execution context stored for debugging
@Schema({ _id: false })
export class ExecutionContext {
  @Prop({ type: Object, required: true })
  eventPayload!: Record<string, any>;

  @Prop({ type: Object, required: true })
  entityData!: Record<string, any>;

  @Prop({ type: Object, default: {} })
  variables!: Record<string, any>;

  @Prop({ type: Object, default: {} })
  resolvedFields!: Record<string, any>; // Fields resolved from dot-notation

  @Prop({ type: [String], default: [] })
  executionPath!: string[]; // Node IDs in execution order
}

@Schema({ timestamps: true })
export class AutomationExecution {
  @Prop({ required: true, unique: true, index: true })
  executionId!: string;

  @Prop({ required: true, index: true })
  ruleId!: string;

  @Prop({ required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  triggerEvent!: string;

  @Prop({ type: String, required: true })
  module!: string;

  @Prop({ type: String, required: true, index: true })
  entityType!: string;

  @Prop({ type: String, required: true, index: true })
  entityId!: string;

  @Prop({ type: ExecutionContext, required: true })
  context!: ExecutionContext;

  @Prop({ 
    type: String, 
    enum: ['pending', 'queued', 'running', 'completed', 'failed', 'cancelled', 'paused'],
    default: 'pending',
    index: true 
  })
  status!: string;

  @Prop({ type: Date })
  queuedAt?: Date;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Number })
  durationMs?: number;

  @Prop({ type: Boolean, default: false })
  conditionsMatched!: boolean;

  @Prop({ type: [ActionExecutionResult], default: [] })
  actionResults!: ActionExecutionResult[];

  @Prop({ type: [String], default: [] })
  completedNodeIds!: string[];

  @Prop({ type: [String], default: [] })
  failedNodeIds!: string[];

  @Prop({ type: [String], default: [] })
  skippedNodeIds!: string[];

  @Prop({ type: Object })
  dagState?: {
    visited: string[];
    inProgress: string[];
    remaining: string[];
  };

  @Prop({ type: String })
  errorMessage?: string;

  @Prop({ type: String })
  errorNodeId?: string;

  @Prop({ type: Object })
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    triggeredBy?: string;
    queueName?: string;
    jobId?: string;
    workerId?: string;
    priority?: number;
  };

  @Prop({ type: Number, default: 0 })
  version!: number;
}

export const AutomationExecutionSchema = SchemaFactory.createForClass(AutomationExecution);

// Indexes for performance and querying
AutomationExecutionSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
AutomationExecutionSchema.index({ tenantId: 1, ruleId: 1, createdAt: -1 });
AutomationExecutionSchema.index({ tenantId: 1, triggerEvent: 1 });
AutomationExecutionSchema.index({ tenantId: 1, entityType: 1, entityId: 1 });
AutomationExecutionSchema.index({ executionId: 1 }, { unique: true });
AutomationExecutionSchema.index({ createdAt: -1 }); // For cleanup jobs
