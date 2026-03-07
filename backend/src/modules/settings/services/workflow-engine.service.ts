import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkflowRule, WorkflowRuleDocument } from '../schemas/workflow-rule.schema';
import { WorkflowExecution, WorkflowExecutionDocument } from '../schemas/workflow-execution.schema';

// Condition operators
const CONDITION_OPERATORS: Record<string, (actual: any, expected: any) => boolean> = {
  eq: (a, b) => a === b,
  ne: (a, b) => a !== b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  contains: (a, b) => String(a).includes(String(b)),
  in: (a, b) => Array.isArray(b) && b.includes(a),
  not_in: (a, b) => Array.isArray(b) && !b.includes(a),
  starts_with: (a, b) => String(a).startsWith(String(b)),
  ends_with: (a, b) => String(a).endsWith(String(b)),
  exists: (a) => a !== undefined && a !== null,
  empty: (a) => a === undefined || a === null || a === '',
};

// Workflow job data
interface WorkflowJob {
  executionId: string;
  wfId: string;
  tenantId?: string;
  entityType: string;
  entityId: string;
  triggerContext: Record<string, any>;
}

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);
  private readonly jobQueue: WorkflowJob[] = [];
  private readonly maxExecutionDepth = 5;
  private isProcessing = false;

  constructor(
    @InjectModel(WorkflowRule.name) private workflowRuleModel: Model<WorkflowRuleDocument>,
    @InjectModel(WorkflowExecution.name) private workflowExecutionModel: Model<WorkflowExecutionDocument>,
  ) {}

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    // Check if id is a valid 24-character hex string (MongoDB ObjectId format)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId) return undefined;
    try { return new Types.ObjectId(id); } catch { return undefined; }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Workflow Rule Management
  // ─────────────────────────────────────────────────────────────────────────

  async getWorkflowRules(tenantId: string | undefined): Promise<WorkflowRule[]> {
    const tid = this.toObjectId(tenantId);
    return this.workflowRuleModel.find(tid ? { tenantId: tid } : {}).exec();
  }

  async getWorkflowRule(tenantId: string | undefined, wfId: string): Promise<WorkflowRule | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, wfId } : { wfId };
    return this.workflowRuleModel.findOne(filter).exec();
  }

  async createWorkflowRule(
    tenantId: string | undefined,
    data: Partial<WorkflowRule>,
    userId?: string,
  ): Promise<WorkflowRule> {
    const tid = this.toObjectId(tenantId);
    const wfId = `wf_${Date.now()}`;
    
    const newRule = new this.workflowRuleModel({
      ...data,
      wfId,
      tenantId: tid,
      enabled: data.enabled ?? true,
      createdBy: userId || 'System',
    });

    const saved = await newRule.save();
    this.logger.log(`Workflow rule created: ${wfId}`);
    return saved;
  }

  async updateWorkflowRule(
    tenantId: string | undefined,
    wfId: string,
    updates: Partial<WorkflowRule>,
    userId?: string,
  ): Promise<WorkflowRule | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, wfId } : { wfId };

    const doc = await this.workflowRuleModel.findOneAndUpdate(
      filter,
      { $set: updates },
      { new: true },
    ).exec();

    if (doc) {
      this.logger.log(`Workflow rule updated: ${wfId} by ${userId}`);
    }
    return doc;
  }

  async deleteWorkflowRule(
    tenantId: string | undefined,
    wfId: string,
    userId?: string,
  ): Promise<WorkflowRule | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, wfId } : { wfId };

    const doc = await this.workflowRuleModel.findOneAndDelete(filter).exec();
    if (doc) {
      this.logger.log(`Workflow rule deleted: ${wfId} by ${userId}`);
    }
    return doc;
  }

  async toggleWorkflowRule(
    tenantId: string | undefined,
    wfId: string,
    enabled: boolean,
    userId?: string,
  ): Promise<WorkflowRule | null> {
    return this.updateWorkflowRule(tenantId, wfId, { enabled }, userId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Workflow Trigger & Execution
  // ─────────────────────────────────────────────────────────────────────────

  async triggerWorkflows(
    tenantId: string | undefined,
    triggerType: string,
    entityType: string,
    entityId: string,
    context: Record<string, any>,
    userId?: string,
  ): Promise<string[]> {
    const tid = this.toObjectId(tenantId);
    
    // Find matching workflows
    const workflows = await this.workflowRuleModel.find({
      ...(tid && { tenantId: tid }),
      enabled: true,
      'trigger.type': triggerType,
      'trigger.entity': entityType,
    }).exec();

    const executionIds: string[] = [];

    for (const workflow of workflows) {
      // Create execution record
      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await this.workflowExecutionModel.create({
        executionId,
        wfId: workflow.wfId,
        tenantId: tid,
        entityType,
        entityId,
        triggerContext: context,
        status: 'pending',
        actionResults: [],
        metadata: {
          triggeredBy: userId,
          ipAddress: context._ipAddress,
          userAgent: context._userAgent,
        },
      });

      // Queue the job
      this.jobQueue.push({
        executionId,
        wfId: workflow.wfId,
        tenantId,
        entityType,
        entityId,
        triggerContext: context,
      });

      executionIds.push(executionId);
    }

    // Start processing queue
    this.processQueue();

    return executionIds;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.jobQueue.length > 0) {
      const job = this.jobQueue.shift();
      if (job) {
        await this.executeWorkflow(job);
      }
    }

    this.isProcessing = false;
  }

  private async executeWorkflow(job: WorkflowJob): Promise<void> {
    const execution = await this.workflowExecutionModel.findOne({
      executionId: job.executionId,
    }).exec();

    if (!execution || execution.status !== 'pending') return;

    // Mark as running
    execution.status = 'running';
    execution.startedAt = new Date();
    await execution.save();

    try {
      // Get workflow rule
      const workflow = await this.getWorkflowRule(job.tenantId, job.wfId);
      if (!workflow || !workflow.enabled) {
        throw new Error('Workflow not found or disabled');
      }

      // Evaluate conditions
      const conditions = (workflow as any).conditions || [(workflow as any).condition];
      const conditionsMet = this.evaluateConditions(
        conditions,
        job.triggerContext,
      );

      if (!conditionsMet) {
        execution.status = 'completed';
        execution.completedAt = new Date();
        execution.actionResults.push({
          actionIndex: -1,
          actionType: 'condition_check',
          status: 'skipped',
          result: { reason: 'Conditions not met' },
          executedAt: new Date(),
        });
        await execution.save();
        return;
      }

      // Execute actions
      const actions = (workflow as any).actions as any[] || [(workflow as any).action];
      let actionIndex = 0;

      for (const action of actions) {
        const result = await this.executeAction(action, job, actionIndex);
        execution.actionResults.push(result);
        
        // Continue even if one action fails
        actionIndex++;
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      await (execution as any).save();

      this.logger.log(`Workflow execution completed: ${job.executionId}`);
    } catch (error: any) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.errorMessage = error.message;
      await (execution as any).save();

      this.logger.error(`Workflow execution failed: ${job.executionId} - ${error.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Condition Evaluation
  // ─────────────────────────────────────────────────────────────────────────

  private evaluateConditions(
    conditions: any[],
    context: Record<string, any>,
  ): boolean {
    if (!conditions || conditions.length === 0) return true;

    let result = true;
    let logicOperator = 'AND';

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const actualValue = this.getValueFromContext(context, condition.field);
      const operator = CONDITION_OPERATORS[condition.operator];

      if (!operator) {
        this.logger.warn(`Unknown operator: ${condition.operator}`);
        continue;
      }

      const conditionResult = operator(actualValue, condition.value);

      if (i === 0) {
        result = conditionResult;
      } else {
        if (logicOperator === 'AND') {
          result = result && conditionResult;
        } else if (logicOperator === 'OR') {
          result = result || conditionResult;
        }
      }

      // Set logic for next condition
      logicOperator = condition.logic || 'AND';
    }

    return result;
  }

  private getValueFromContext(context: Record<string, any>, field: string): any {
    const parts = field.split('.');
    let value = context;
    
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }
    
    return value;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Action Execution
  // ─────────────────────────────────────────────────────────────────────────

  private async executeAction(
    action: any,
    job: WorkflowJob,
    index: number,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      switch (action.type) {
        case 'notify':
          return await this.executeNotify(action.config, job, index);
        case 'update_field':
          return await this.executeUpdateField(action.config, job, index);
        case 'create_task':
          return await this.executeCreateTask(action.config, job, index);
        case 'webhook':
          return await this.executeWebhook(action.config, job, index);
        case 'delay':
          return await this.executeDelay(action.config, job, index);
        case 'email':
          return await this.executeEmail(action.config, job, index);
        default:
          return {
            actionIndex: index,
            actionType: action.type,
            status: 'failed' as const,
            error: `Unknown action type: ${action.type}`,
            executedAt: new Date(),
          };
      }
    } catch (error: any) {
      return {
        actionIndex: index,
        actionType: action.type,
        status: 'failed' as const,
        error: error.message,
        executedAt: new Date(),
      };
    }
  }

  private async executeNotify(config: any, job: WorkflowJob, index: number): Promise<any> {
    // Simulate notification - integrate with actual notification service
    this.logger.log(`Notification: ${config.message} to ${config.recipients}`);
    
    return {
      actionIndex: index,
      actionType: 'notify',
      status: 'success' as const,
      result: { notified: config.recipients },
      executedAt: new Date(),
    };
  }

  private async executeUpdateField(config: any, job: WorkflowJob, index: number): Promise<any> {
    // Simulate field update - integrate with entity service
    this.logger.log(`Update ${config.entity}.${config.field} = ${config.value}`);
    
    return {
      actionIndex: index,
      actionType: 'update_field',
      status: 'success' as const,
      result: { updated: true, field: config.field, value: config.value },
      executedAt: new Date(),
    };
  }

  private async executeCreateTask(config: any, job: WorkflowJob, index: number): Promise<any> {
    // Simulate task creation
    this.logger.log(`Create task: ${config.title} assigned to ${config.assignee}`);
    
    return {
      actionIndex: index,
      actionType: 'create_task',
      status: 'success' as const,
      result: { taskId: `task_${Date.now()}`, title: config.title },
      executedAt: new Date(),
    };
  }

  private async executeWebhook(config: any, job: WorkflowJob, index: number): Promise<any> {
    // Simulate webhook call - integrate with HTTP service
    this.logger.log(`Webhook: ${config.method} ${config.url}`);
    
    return {
      actionIndex: index,
      actionType: 'webhook',
      status: 'success' as const,
      result: { called: true, url: config.url },
      executedAt: new Date(),
    };
  }

  private async executeDelay(config: any, job: WorkflowJob, index: number): Promise<any> {
    const delayMs = (config.duration || 0) * 1000;
    
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    return {
      actionIndex: index,
      actionType: 'delay',
      status: 'success' as const,
      result: { delayed: delayMs },
      executedAt: new Date(),
    };
  }

  private async executeEmail(config: any, job: WorkflowJob, index: number): Promise<any> {
    // Simulate email sending
    this.logger.log(`Email: ${config.subject} to ${config.to}`);
    
    return {
      actionIndex: index,
      actionType: 'email',
      status: 'success' as const,
      result: { sent: true, to: config.to },
      executedAt: new Date(),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Execution Queries
  // ─────────────────────────────────────────────────────────────────────────

  async getExecutions(
    tenantId: string | undefined,
    options: {
      wfId?: string;
      status?: string;
      entityType?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ data: WorkflowExecution[]; total: number }> {
    const tid = this.toObjectId(tenantId);
    
    const filter: any = tid ? { tenantId: tid } : {};
    if (options.wfId) filter.wfId = options.wfId;
    if (options.status) filter.status = options.status;
    if (options.entityType) filter.entityType = options.entityType;

    const [data, total] = await Promise.all([
      this.workflowExecutionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(options.offset || 0)
        .limit(options.limit || 50)
        .exec(),
      this.workflowExecutionModel.countDocuments(filter).exec(),
    ]);

    return { data, total };
  }

  async getExecution(tenantId: string | undefined, executionId: string): Promise<WorkflowExecution | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, executionId } : { executionId };
    return this.workflowExecutionModel.findOne(filter).exec();
  }

  async retryExecution(tenantId: string | undefined, executionId: string): Promise<boolean> {
    const execution = await this.getExecution(tenantId, executionId);
    if (!execution || execution.status !== 'failed') return false;

    // Reset execution
    execution.status = 'pending';
    execution.errorMessage = undefined;
    execution.actionResults = [];
    execution.startedAt = undefined;
    execution.completedAt = undefined;
    await (execution as any).save();

    // Re-queue
    this.jobQueue.push({
      executionId: execution.executionId,
      wfId: execution.wfId,
      tenantId: execution.tenantId?.toString(),
      entityType: execution.entityType,
      entityId: execution.entityId,
      triggerContext: execution.triggerContext,
    });

    this.processQueue();
    return true;
  }
}
