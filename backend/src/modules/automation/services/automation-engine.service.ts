import { Injectable, Logger, OnModuleInit, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { AutomationRule, AutomationRuleDocument } from '../schemas/automation-rule.schema';
import { AutomationExecution, AutomationExecutionDocument, ExecutionContext } from '../schemas/automation-execution.schema';
import { AutomationEventBus, AutomationEvent } from './automation-event-bus.service';
import { RuleMatcherService } from './rule-matcher.service';
import { ConditionEngine } from './condition-engine.service';
import { ActionEngine, ActionContext } from './action-engine.service';
import { DAGEngine, DAG } from './dag-engine.service';
import { AutomationQueueService, AutomationJobData } from './automation-queue.service';
import { ALL_EVENTS, EVENT_MODULE_MAP } from '../constants/automation-events';

/**
 * Main Automation Engine Service
 * Orchestrates the entire automation workflow
 * 
 * Architecture:
 * Event → RuleMatcher(O(1)) → ConditionEngine(DFS) → DAG Engine → Queue → ActionEngine
 */

@Injectable()
export class AutomationEngineService implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger(AutomationEngineService.name);
  private isInitialized = false;

  constructor(
    @InjectModel(AutomationRule.name)
    private ruleModel: Model<AutomationRuleDocument>,
    @InjectModel(AutomationExecution.name)
    private executionModel: Model<AutomationExecutionDocument>,
    private readonly eventBus: AutomationEventBus,
    private readonly ruleMatcher: RuleMatcherService,
    private readonly conditionEngine: ConditionEngine,
    private readonly actionEngine: ActionEngine,
    private readonly dagEngine: DAGEngine,
    private readonly queueService: AutomationQueueService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing automation engine...');
  }

  async onApplicationBootstrap(): Promise<void> {
    // Build rule index on startup
    await this.ruleMatcher.buildIndex();
    
    // Subscribe to all automation events
    this.subscribeToEvents();
    
    this.isInitialized = true;
    this.logger.log('Automation engine initialized and ready');
  }

  /**
   * Subscribe to all automation events
   */
  private subscribeToEvents(): void {
    // Subscribe to all events from the event bus
    for (const eventKey of Object.values(ALL_EVENTS)) {
      this.eventEmitter.on(eventKey, (event: AutomationEvent) => {
        this.handleEvent(event).catch(err => {
          this.logger.error(`Error handling event ${eventKey}: ${err.message}`);
        });
      });
    }

    this.logger.log(`Subscribed to ${Object.keys(ALL_EVENTS).length} automation events`);
  }

  /**
   * Handle an incoming automation event
   * Main entry point for the automation pipeline
   */
  private async handleEvent(event: AutomationEvent): Promise<void> {
    this.logger.debug(`Processing event: ${event.event} for ${event.entityType}:${event.entityId}`);

    // Find matching rules (O(1) with HashMap index)
    const matchingRules = await this.ruleMatcher.findMatchingRules(
      event.event,
      event.tenantId,
      { module: event.module, entityType: event.entityType }
    );

    if (matchingRules.length === 0) {
      return; // No rules to execute
    }

    this.logger.log(`Found ${matchingRules.length} matching rules for ${event.event}`);

    // Create executions for each matching rule
    const executions = await Promise.all(
      matchingRules.map(rule => this.createExecution(rule, event))
    );

    // Queue executions
    for (const execution of executions) {
      if (execution) {
        await this.queueExecution(execution, event);
      }
    }
  }

  /**
   * Create a new automation execution record
   */
  private async createExecution(
    rule: AutomationRule,
    event: AutomationEvent
  ): Promise<AutomationExecution | null> {
    try {
      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const execution = await this.executionModel.create({
        executionId,
        ruleId: rule.ruleId,
        tenantId: new Types.ObjectId(event.tenantId),
        triggerEvent: event.event,
        module: event.module,
        entityType: event.entityType,
        entityId: event.entityId,
        context: {
          eventPayload: event.payload,
          entityData: event.payload, // Same as payload for now
          variables: rule.variables || {},
          resolvedFields: {},
          executionPath: [],
        } as ExecutionContext,
        status: 'pending',
        actionResults: [],
        completedNodeIds: [],
        failedNodeIds: [],
        skippedNodeIds: [],
        metadata: {
          ipAddress: event.metadata?.ipAddress,
          userAgent: event.metadata?.userAgent,
          triggeredBy: event.metadata?.userId,
        },
      });

      return execution;
    } catch (error: any) {
      this.logger.error(`Failed to create execution: ${error.message}`);
      return null;
    }
  }

  /**
   * Queue an execution for processing
   */
  private async queueExecution(
    execution: AutomationExecution,
    event: AutomationEvent
  ): Promise<void> {
    const jobData: AutomationJobData = {
      executionId: execution.executionId,
      ruleId: execution.ruleId,
      tenantId: execution.tenantId.toString(),
      event: event.event,
      module: event.module,
      entityType: event.entityType,
      entityId: event.entityId,
      payload: event.payload,
      userId: event.metadata?.userId,
      metadata: event.metadata,
      priority: 5,
    };

    await this.queueService.addJob(jobData);
  }

  /**
   * Execute an automation job (called by worker)
   * This is the core execution logic
   */
  async executeFromQueue(data: AutomationJobData): Promise<void> {
    const { executionId, ruleId, tenantId, payload } = data;

    this.logger.log(`Executing job for execution ${executionId}`);

    // Fetch execution and rule
    const [execution, rule] = await Promise.all([
      this.executionModel.findOne({ executionId }).exec(),
      this.ruleModel.findOne({ ruleId }).exec(),
    ]);

    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (!rule || !rule.enabled) {
      await this.updateExecutionStatus(executionId, 'cancelled', 'Rule not found or disabled');
      return;
    }

    // Mark as running
    await this.updateExecutionStatus(executionId, 'running');

    try {
      // Pre-resolve all condition fields
      const resolvedFields = this.conditionEngine.preResolveFields(
        rule.conditionTree,
        payload
      );
      
      execution.context.resolvedFields = resolvedFields;
      await execution.save();

      // Evaluate conditions
      const conditionsMet = this.conditionEngine.evaluateConditionTree(
        rule.conditionTree,
        payload
      );

      execution.conditionsMatched = conditionsMet;

      if (!conditionsMet) {
        execution.status = 'completed';
        execution.completedAt = new Date();
        execution.actionResults.push({
          nodeId: 'condition_check',
          actionType: 'condition_evaluation',
          status: 'skipped',
          executedAt: new Date(),
          output: { reason: 'Conditions not met' },
        } as any);
        await execution.save();

        this.logger.log(`Execution ${executionId} skipped - conditions not met`);
        return;
      }

      // Build and validate DAG
      const dag = this.dagEngine.buildDAG(rule.actionNodes);
      const validation = this.dagEngine.validateDAG(dag);

      if (!validation.valid) {
        throw new Error(`Invalid DAG: ${validation.errors.join(', ')}`);
      }

      // Execute DAG
      await this.executeDAG(dag, rule, execution, data);

      // Mark completed
      execution.status = 'completed';
      execution.completedAt = new Date();
      await execution.save();

      // Update rule stats
      await this.updateRuleStats(ruleId, true);

      this.logger.log(`Execution ${executionId} completed successfully`);

    } catch (error: any) {
      this.logger.error(`Execution ${executionId} failed: ${error.message}`);
      
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.errorMessage = error.message;
      await execution.save();

      await this.updateRuleStats(ruleId, false);
      throw error;
    }
  }

  /**
   * Execute the DAG of actions
   */
  private async executeDAG(
    dag: DAG,
    rule: AutomationRule,
    execution: AutomationExecution,
    jobData: AutomationJobData
  ): Promise<void> {
    const completedIds = new Set<string>();
    const actionContext: ActionContext = {
      tenantId: jobData.tenantId,
      ruleId: rule.ruleId,
      executionId: execution.executionId,
      entityType: jobData.entityType,
      entityId: jobData.entityId,
      eventPayload: jobData.payload,
      variables: rule.variables || {},
      resolvedFields: execution.context.resolvedFields,
    };

    // Execute in batches (parallel within batch, sequential across batches)
    const batches = this.dagEngine.getExecutionBatches(dag);

    for (const batch of batches) {
      // Execute batch in parallel
      const batchResults = await Promise.all(
        batch.map(nodeId => this.executeActionNode(
          dag.nodes.get(nodeId)!.data,
          actionContext,
          execution,
          completedIds
        ))
      );

      // Check for failures
      for (const result of batchResults) {
        if (!result.success && result.stopOnFailure) {
          throw new Error(`Action ${result.nodeId} failed: ${result.error}`);
        }
      }

      // Update progress
      batch.forEach(id => completedIds.add(id));
      
      // Update execution path
      execution.context.executionPath.push(...batch);
      await (execution as any).save();
    }
  }

  /**
   * Execute a single action node
   */
  private async executeActionNode(
    node: any,
    context: ActionContext,
    execution: AutomationExecution,
    completedIds: Set<string>
  ): Promise<{ success: boolean; nodeId: string; stopOnFailure?: boolean; error?: string }> {
    const startTime = Date.now();

    // Check if we should skip due to conditional branch
    const parentResults = execution.actionResults.filter(
      r => node.dependencies?.includes(r.nodeId) && r.status === 'completed'
    );

    for (const parent of parentResults) {
      if (parent.output?.skipNext || parent.output?.nextNodes) {
        // Check if this node is in the allowed next nodes
        const allowedNodes = parent.output.nextNodes;
        if (allowedNodes && !allowedNodes.includes(node.nodeId)) {
          // Skip this node
          execution.skippedNodeIds.push(node.nodeId);
          execution.actionResults.push({
            nodeId: node.nodeId,
            actionType: node.type,
            status: 'skipped',
            executedAt: new Date(),
            output: { reason: 'Skipped by conditional branch' },
          } as any);
          await (execution as any).save();
          return { success: true, nodeId: node.nodeId };
        }
      }
    }

    // Execute the action
    try {
      const result = await this.actionEngine.executeAction(node, context);

      const duration = Date.now() - startTime;

      execution.actionResults.push({
        nodeId: node.nodeId,
        actionType: node.type,
        status: result.success ? 'completed' : 'failed',
        startedAt: new Date(startTime),
        executedAt: new Date(),
        durationMs: duration,
        input: node.config,
        output: result.data,
        errorMessage: result.error,
      } as any);

      if (result.success) {
        execution.completedNodeIds.push(node.nodeId);
      } else {
        execution.failedNodeIds.push(node.nodeId);
      }

      await (execution as any).save();

      return {
        success: result.success,
        nodeId: node.nodeId,
        stopOnFailure: node.stopOnFailure,
        error: result.error,
      };

    } catch (error: any) {
      execution.actionResults.push({
        nodeId: node.nodeId,
        actionType: node.type,
        status: 'failed',
        startedAt: new Date(startTime),
        executedAt: new Date(),
        durationMs: Date.now() - startTime,
        errorMessage: error.message,
        errorStack: error.stack,
      } as any);

      execution.failedNodeIds.push(node.nodeId);
      await (execution as any).save();

      return {
        success: false,
        nodeId: node.nodeId,
        stopOnFailure: node.stopOnFailure,
        error: error.message,
      };
    }
  }

  /**
   * Update execution status
   */
  private async updateExecutionStatus(
    executionId: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    const update: any = { status };
    
    if (status === 'running') {
      update.startedAt = new Date();
    } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      update.completedAt = new Date();
    }

    if (errorMessage) {
      update.errorMessage = errorMessage;
    }

    await this.executionModel.updateOne({ executionId }, { $set: update });
  }

  /**
   * Update rule execution statistics
   */
  private async updateRuleStats(ruleId: string, success: boolean): Promise<void> {
    const update: any = {
      $inc: { executionCount: 1 },
      $set: { lastExecutedAt: new Date() },
    };

    if (success) {
      update.$inc.successCount = 1;
    }

    await this.ruleModel.updateOne({ ruleId }, update);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Manually trigger an event (for testing or API calls)
   */
  async triggerEvent(event: AutomationEvent): Promise<string[]> {
    await this.handleEvent(event);
    return []; // Return execution IDs if needed
  }

  /**
   * Get engine health status
   */
  getHealth(): {
    initialized: boolean;
    indexStats: any;
    queueStats: any;
  } {
    return {
      initialized: this.isInitialized,
      indexStats: this.ruleMatcher.getIndexStats(),
      queueStats: null, // Would need async call
    };
  }

  /**
   * Refresh rule index
   */
  async refreshIndex(): Promise<void> {
    await this.ruleMatcher.buildIndex();
  }

  /**
   * Process a job manually (for testing)
   */
  async processJobManually(jobData: AutomationJobData): Promise<void> {
    await this.executeFromQueue(jobData);
  }
}
