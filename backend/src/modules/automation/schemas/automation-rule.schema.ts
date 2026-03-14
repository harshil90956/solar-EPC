import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type AutomationRuleDocument = AutomationRule & Document;

/**
 * Automation Rule Schema - Production Grade
 * Supports: Multi-trigger, complex conditions (AND/OR tree), DAG-based actions
 */

// Condition node for expression tree
@Schema({ _id: false })
export class ConditionNode {
  @Prop({ type: String, enum: ['condition', 'group'], required: true })
  type!: 'condition' | 'group';

  // For leaf condition nodes
  @Prop({ type: String, required: false })
  field?: string;

  @Prop({ 
    type: String, 
    enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'starts_with', 'ends_with', 'exists', 'empty', 'in', 'not_in', 'regex'],
    required: false 
  })
  operator?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  value?: any;

  // For group nodes (AND/OR)
  @Prop({ type: String, enum: ['AND', 'OR'], required: false })
  logic?: 'AND' | 'OR';

  @Prop({ type: [Object], required: false })
  children?: ConditionNode[];
}

// Action node for DAG
@Schema({ _id: false })
export class ActionNode {
  @Prop({ type: String, required: true })
  nodeId!: string;

  @Prop({ 
    type: String, 
    enum: ['create_record', 'update_field', 'assign_user', 'send_email', 'send_notification', 'create_task', 'trigger_webhook', 'delay', 'enable_feature', 'disable_feature', 'conditional_branch', 'send_sms', 'create_project', 'create_quotation', 'assign_engineer', 'update_status'],
    required: true 
  })
  type!: string;

  @Prop({ type: Object, required: true })
  config!: Record<string, any>;

  @Prop({ type: [String], default: [] })
  dependencies!: string[]; // Node IDs this action depends on

  @Prop({ type: [String], default: [] })
  nextNodes!: string[]; // Nodes to execute after this one

  @Prop({ type: Number, default: 0 })
  delayMs!: number; // Delay before executing this action

  @Prop({ type: Number, default: 0 })
  retryCount!: number;

  @Prop({ type: Number, default: 3 })
  maxRetries!: number;

  @Prop({ type: Boolean, default: false })
  stopOnFailure!: boolean;
}

// Trigger configuration
@Schema({ _id: false })
export class TriggerConfig {
  @Prop({ type: String, required: true })
  event!: string; // e.g., 'lead.created', 'project.status_changed'

  @Prop({ type: String, required: true })
  module!: string; // e.g., 'leads', 'projects'

  @Prop({ type: String, required: true })
  entityType!: string; // e.g., 'lead', 'project'

  @Prop({ type: Object, default: {} })
  filters!: Record<string, any>; // Additional trigger filters

  @Prop({ type: Boolean, default: false })
  isScheduled!: boolean; // For time-based triggers

  @Prop({ type: String, required: false })
  cronExpression?: string; // Cron for scheduled triggers
}

@Schema({ timestamps: true })
export class AutomationRule {
  @Prop({ required: true, unique: true, index: true })
  ruleId!: string;

  @Prop({ required: true })
  tenantId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true, default: true })
  enabled!: boolean;

  @Prop({ type: TriggerConfig, required: true })
  trigger!: TriggerConfig;

  @Prop({ type: ConditionNode, required: true })
  conditionTree!: ConditionNode;

  @Prop({ type: [ActionNode], required: true })
  actionNodes!: ActionNode[];

  @Prop({ type: String })
  startNodeId!: string; // Entry point to the DAG

  @Prop({ type: Object, default: {} })
  variables!: Record<string, any>; // Default variables for this rule

  @Prop({ type: Number, default: 0 })
  version!: number; // For migration tracking

  @Prop({ type: Boolean, default: false })
  isTemplate!: boolean;

  @Prop({ type: String, default: 'custom' })
  category!: string; // 'template', 'custom', 'system'

  @Prop({ type: Number, default: 0 })
  executionCount!: number;

  @Prop({ type: Number, default: 0 })
  successCount!: number;

  @Prop({ type: Date })
  lastExecutedAt?: Date;

  @Prop({ type: String, default: 'System' })
  createdBy!: string;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, any>;
}

export const AutomationRuleSchema = SchemaFactory.createForClass(AutomationRule);

// Indexes for performance
AutomationRuleSchema.index({ tenantId: 1, enabled: 1, 'trigger.event': 1 });
AutomationRuleSchema.index({ tenantId: 1, 'trigger.module': 1 });
AutomationRuleSchema.index({ tenantId: 1, ruleId: 1 }, { unique: true });
AutomationRuleSchema.index({ isTemplate: 1, category: 1 });
AutomationRuleSchema.index({ tenantId: 1, tags: 1 });
