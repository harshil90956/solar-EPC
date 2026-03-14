import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { AutomationEngineService } from '../services/automation-engine.service';
import { AutomationTemplatesService } from '../services/automation-templates.service';
import { RuleMatcherService } from '../services/rule-matcher.service';
import { AutomationQueueService } from '../services/automation-queue.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AutomationRule } from '../schemas/automation-rule.schema';
import { AutomationExecution } from '../schemas/automation-execution.schema';
import {
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  ToggleAutomationRuleDto,
  QueryExecutionsDto,
  RetryExecutionDto,
  AutomationEventDto,
} from '../dto/automation.dto';

/**
 * Automation Controller
 * REST API endpoints for the automation engine
 */

@Controller('api/automation')
export class AutomationController {
  constructor(
    private readonly automationEngine: AutomationEngineService,
    private readonly templatesService: AutomationTemplatesService,
    private readonly ruleMatcher: RuleMatcherService,
    private readonly queueService: AutomationQueueService,
    @InjectModel(AutomationRule.name) private ruleModel: Model<AutomationRule>,
    @InjectModel(AutomationExecution.name) private executionModel: Model<AutomationExecution>,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Rule Management
  // ─────────────────────────────────────────────────────────────────────────

  @Get('rules')
  async getRules(@Request() req: any) {
    const tenantId = req.tenant?.id;
    const rules = await this.ruleMatcher.findRulesByTenant(tenantId);
    return rules;
  }

  @Get('rules/:ruleId')
  async getRule(@Param('ruleId') ruleId: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const rule = await this.ruleMatcher.findRuleById(ruleId);
    
    if (!rule || rule.tenantId.toString() !== tenantId) {
      return { error: 'Rule not found' };
    }
    
    return rule;
  }

  @Post('rules')
  async createRule(@Body() dto: CreateAutomationRuleDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id || req.user?.name;

    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const rule = new this.ruleModel({
      ...dto,
      ruleId,
      tenantId,
      startNodeId: dto.actionNodes?.[0]?.nodeId,
      createdBy: userId || 'System',
    });

    const saved = await rule.save();
    
    // Refresh index
    await this.ruleMatcher.onRuleChanged();

    return saved;
  }

  @Put('rules/:ruleId')
  async updateRule(
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateAutomationRuleDto,
    @Request() req: any
  ) {
    const tenantId = req.tenant?.id;

    const update: any = { ...dto };
    if (dto.actionNodes) {
      update.startNodeId = dto.actionNodes[0]?.nodeId;
    }

    const rule = await this.ruleModel.findOneAndUpdate(
      { ruleId, tenantId },
      { $set: update },
      { new: true }
    );

    if (!rule) {
      return { error: 'Rule not found' };
    }

    // Refresh index
    await this.ruleMatcher.onRuleChanged(ruleId);

    return rule;
  }

  @Patch('rules/:ruleId/toggle')
  async toggleRule(
    @Param('ruleId') ruleId: string,
    @Body() dto: ToggleAutomationRuleDto,
    @Request() req: any
  ) {
    const tenantId = req.tenant?.id;

    const rule = await this.ruleModel.findOneAndUpdate(
      { ruleId, tenantId },
      { $set: { enabled: dto.enabled } },
      { new: true }
    );

    if (!rule) {
      return { error: 'Rule not found' };
    }

    await this.ruleMatcher.onRuleChanged(ruleId);

    return rule;
  }

  @Delete('rules/:ruleId')
  async deleteRule(@Param('ruleId') ruleId: string, @Request() req: any) {
    const tenantId = req.tenant?.id;

    const rule = await this.ruleModel.findOneAndDelete({ ruleId, tenantId });

    if (!rule) {
      return { error: 'Rule not found' };
    }

    await this.ruleMatcher.onRuleChanged(ruleId);

    return { message: 'Rule deleted successfully' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Templates
  // ─────────────────────────────────────────────────────────────────────────

  @Get('templates')
  async getTemplates(@Query('category') category?: string) {
    let templates;
    if (category) {
      templates = this.templatesService.getTemplatesByCategory(category);
    } else {
      templates = this.templatesService.getAllTemplates();
    }
    return templates;
  }

  @Get('templates/categories')
  async getTemplateCategories() {
    return this.templatesService.getCategories();
  }

  @Get('templates/recommended')
  async getRecommendedTemplates(@Request() req: any) {
    const tenantId = req.tenant?.id;
    const templates = await this.templatesService.getRecommendedTemplates(tenantId);
    return templates;
  }

  @Post('templates/:templateId/apply')
  async applyTemplate(
    @Param('templateId') templateId: string,
    @Request() req: any
  ) {
    const tenantId = req.tenant?.id;
    
    const rule = await this.templatesService.instantiateTemplate(templateId, tenantId);
    
    if (!rule) {
      return { error: 'Template not found or could not be instantiated' };
    }

    await this.ruleMatcher.onRuleChanged();

    return rule;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Executions
  // ─────────────────────────────────────────────────────────────────────────

  @Get('executions')
  async getExecutions(@Query() query: QueryExecutionsDto, @Request() req: any) {
    const tenantId = req.tenant?.id;

    const filter: any = { tenantId };
    if (query.ruleId) filter.ruleId = query.ruleId;
    if (query.status) filter.status = query.status;
    if (query.entityType) filter.entityType = query.entityType;

    const [data, total] = await Promise.all([
      this.executionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.offset || 0)
        .limit(query.limit || 50)
        .lean(),
      this.executionModel.countDocuments(filter),
    ]);

    return { data, total, offset: query.offset || 0, limit: query.limit || 50 };
  }

  @Get('executions/:executionId')
  async getExecution(@Param('executionId') executionId: string, @Request() req: any) {
    const tenantId = req.tenant?.id;

    const execution = await this.executionModel.findOne({ executionId, tenantId }).lean();

    if (!execution) {
      return { error: 'Execution not found' };
    }

    return execution;
  }

  @Post('executions/:executionId/retry')
  async retryExecution(
    @Param('executionId') executionId: string,
    @Body() dto: RetryExecutionDto,
    @Request() req: any
  ) {
    const tenantId = req.tenant?.id;

    const execution = await this.executionModel.findOne({ executionId, tenantId });

    if (!execution) {
      return { error: 'Execution not found' };
    }

    // Reset execution for retry
    execution.status = 'pending';
    execution.errorMessage = undefined;
    execution.errorNodeId = undefined;
    execution.actionResults = [];
    execution.completedNodeIds = [];
    execution.failedNodeIds = [];
    execution.skippedNodeIds = [];
    execution.startedAt = undefined;
    execution.completedAt = undefined;
    execution.context.executionPath = [];

    await execution.save();

    // Re-queue
    const rule = await this.ruleModel.findOne({ ruleId: execution.ruleId });
    if (rule) {
      await this.queueService.addJob({
        executionId: execution.executionId,
        ruleId: execution.ruleId,
        tenantId: execution.tenantId.toString(),
        event: execution.triggerEvent,
        module: execution.module,
        entityType: execution.entityType,
        entityId: execution.entityId,
        payload: execution.context.eventPayload,
        priority: 7, // Higher priority for retries
      });
    }

    return { message: 'Execution queued for retry' };
  }

  @Post('executions/:executionId/cancel')
  async cancelExecution(@Param('executionId') executionId: string, @Request() req: any) {
    const tenantId = req.tenant?.id;

    const execution = await this.executionModel.findOneAndUpdate(
      { executionId, tenantId, status: { $in: ['pending', 'queued', 'running'] } },
      { $set: { status: 'cancelled', completedAt: new Date() } },
      { new: true }
    );

    if (!execution) {
      return { error: 'Execution not found or already completed' };
    }

    return { message: 'Execution cancelled' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Manual Trigger & Testing
  // ─────────────────────────────────────────────────────────────────────────

  @Post('trigger')
  async triggerEvent(@Body() dto: AutomationEventDto, @Request() req: any) {
    const tenantId = req.tenant?.id || dto.tenantId;
    const userId = req.user?.id || req.user?.name;

    const event = {
      ...dto,
      tenantId,
      metadata: {
        ...dto.metadata,
        userId,
        timestamp: Date.now(),
      },
    };

    await this.automationEngine.triggerEvent(event as any);

    return { message: 'Event triggered successfully' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Health & Stats
  // ─────────────────────────────────────────────────────────────────────────

  @Get('health')
  async getHealth() {
    const engineHealth = this.automationEngine.getHealth();
    const queueStats = await this.queueService.getQueueStats();

    return {
      engine: engineHealth,
      queue: queueStats,
      status: engineHealth.initialized ? 'healthy' : 'initializing',
    };
  }

  @Get('stats')
  async getStats(@Request() req: any) {
    const tenantId = req.tenant?.id;

    const [
      totalRules,
      activeRules,
      totalExecutions,
      recentExecutions,
    ] = await Promise.all([
      this.ruleModel.countDocuments({ tenantId }),
      this.ruleModel.countDocuments({ tenantId, enabled: true }),
      this.executionModel.countDocuments({ tenantId }),
      this.executionModel.countDocuments({ 
        tenantId, 
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
      }),
    ]);

    const statusBreakdown = await this.executionModel.aggregate([
      { $match: { tenantId: new (require('mongoose').Types.ObjectId)(tenantId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return {
      rules: { total: totalRules, active: activeRules },
      executions: {
        total: totalExecutions,
        last24h: recentExecutions,
        byStatus: statusBreakdown.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Events Registry
  // ─────────────────────────────────────────────────────────────────────────

  @Get('events')
  async getAvailableEvents() {
    const { ALL_EVENTS, EVENT_DESCRIPTIONS } = await import('../constants/automation-events');
    
    const events = Object.entries(ALL_EVENTS).map(([key, value]) => ({
      id: value,
      key,
      description: EVENT_DESCRIPTIONS[value] || `${key} event`,
    }));

    return events;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Queue Management (Admin only)
  // ─────────────────────────────────────────────────────────────────────────

  @Get('queue/stats')
  async getQueueStats() {
    return await this.queueService.getQueueStats();
  }

  @Post('queue/pause')
  async pauseQueue() {
    await this.queueService.pauseQueue();
    return { message: 'Queue paused' };
  }

  @Post('queue/resume')
  async resumeQueue() {
    await this.queueService.resumeQueue();
    return { message: 'Queue resumed' };
  }
}
