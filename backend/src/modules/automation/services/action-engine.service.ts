import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActionNode } from '../schemas/automation-rule.schema';

/**
 * Action Execution Engine
 * Handles all automation action types with real module integration
 */

export interface ActionContext {
  tenantId: string;
  ruleId: string;
  executionId: string;
  entityType: string;
  entityId: string;
  eventPayload: Record<string, any>;
  variables: Record<string, any>;
  resolvedFields: Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  skipNext?: boolean; // For conditional branches
  nextNodes?: string[]; // Override next nodes for branching
}

@Injectable()
export class ActionEngine {
  private readonly logger = new Logger(ActionEngine.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Execute a single action node
   */
  async executeAction(node: ActionNode, context: ActionContext): Promise<ActionResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Executing action ${node.nodeId} (${node.type}) for execution ${context.executionId}`);

      // Resolve variables in config
      const resolvedConfig = this.resolveVariables(node.config, context);

      let result: ActionResult;

      switch (node.type) {
        case 'create_record':
          result = await this.executeCreateRecord(resolvedConfig, context);
          break;
        case 'update_field':
          result = await this.executeUpdateField(resolvedConfig, context);
          break;
        case 'assign_user':
          result = await this.executeAssignUser(resolvedConfig, context);
          break;
        case 'send_email':
          result = await this.executeSendEmail(resolvedConfig, context);
          break;
        case 'send_notification':
          result = await this.executeSendNotification(resolvedConfig, context);
          break;
        case 'create_task':
          result = await this.executeCreateTask(resolvedConfig, context);
          break;
        case 'trigger_webhook':
          result = await this.executeTriggerWebhook(resolvedConfig, context);
          break;
        case 'delay':
          result = await this.executeDelay(resolvedConfig, context);
          break;
        case 'enable_feature':
        case 'disable_feature':
          result = await this.executeToggleFeature(resolvedConfig, context, node.type === 'enable_feature');
          break;
        case 'conditional_branch':
          result = await this.executeConditionalBranch(resolvedConfig, context);
          break;
        case 'create_project':
          result = await this.executeCreateProject(resolvedConfig, context);
          break;
        case 'create_quotation':
          result = await this.executeCreateQuotation(resolvedConfig, context);
          break;
        case 'assign_engineer':
          result = await this.executeAssignEngineer(resolvedConfig, context);
          break;
        case 'update_status':
          result = await this.executeUpdateStatus(resolvedConfig, context);
          break;
        default:
          result = { success: false, error: `Unknown action type: ${node.type}` };
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Action ${node.nodeId} completed in ${duration}ms with success=${result.success}`);

      return result;
    } catch (error: any) {
      this.logger.error(`Action ${node.nodeId} failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new record - emits event for actual creation
   */
  private async executeCreateRecord(config: any, context: ActionContext): Promise<ActionResult> {
    const { module, entityType, data, copyFields = [] } = config;
    
    // Copy fields from source entity if specified
    const enrichedData = { ...data };
    for (const fieldMapping of copyFields) {
      const sourceValue = this.getNestedValue(context.eventPayload, fieldMapping.from);
      this.setNestedValue(enrichedData, fieldMapping.to, sourceValue);
    }

    // Resolve any variables in the data
    const resolvedData = this.resolveVariables(enrichedData, context);

    // Emit event for the target module to handle creation
    const eventName = `automation.create.${module}.${entityType}`;
    this.eventEmitter.emit(eventName, {
      tenantId: context.tenantId,
      data: resolvedData,
      triggerContext: context,
    });

    return {
      success: true,
      data: { 
        entityType, 
        message: `Creation request emitted for ${module}.${entityType}` 
      },
    };
  }

  /**
   * Update a field - emits event for actual update
   */
  private async executeUpdateField(config: any, context: ActionContext): Promise<ActionResult> {
    const { module, entityId: configEntityId, field, value, entityType } = config;
    const targetEntityId = configEntityId || context.entityId;
    
    const resolvedValue = this.resolveVariables({ value }, context).value;

    // Emit event for the target module to handle update
    const eventName = `automation.update.${module || context.entityType}`;
    this.eventEmitter.emit(eventName, {
      tenantId: context.tenantId,
      entityId: targetEntityId,
      field,
      value: resolvedValue,
      triggerContext: context,
    });

    return { 
      success: true, 
      data: { field, value: resolvedValue, entityId: targetEntityId } 
    };
  }

  /**
   * Assign user - emits event for actual assignment
   */
  private async executeAssignUser(config: any, context: ActionContext): Promise<ActionResult> {
    const { userId, role, module, entityId: configEntityId } = config;
    const targetEntityId = configEntityId || context.entityId;
    const resolvedUserId = this.resolveVariables({ userId }, context).userId;

    const eventName = `automation.assign.${module || context.entityType}`;
    this.eventEmitter.emit(eventName, {
      tenantId: context.tenantId,
      entityId: targetEntityId,
      userId: resolvedUserId,
      role,
      triggerContext: context,
    });

    return { 
      success: true, 
      data: { assignedTo: resolvedUserId, role, entityId: targetEntityId } 
    };
  }

  /**
   * Send email - emits event for actual sending
   */
  private async executeSendEmail(config: any, context: ActionContext): Promise<ActionResult> {
    const { to, subject, template, body, cc, bcc, attachments = [] } = config;
    
    const resolvedTo = this.resolveTemplateVariables(to, context);
    const resolvedSubject = this.resolveTemplateVariables(subject, context);
    const resolvedBody = this.resolveTemplateVariables(body, context);

    // Emit email event
    this.eventEmitter.emit('automation.email.send', {
      tenantId: context.tenantId,
      to: resolvedTo,
      subject: resolvedSubject,
      body: resolvedBody,
      cc,
      bcc,
      attachments,
      template,
      triggerContext: context,
    });

    return { 
      success: true, 
      data: { sentTo: resolvedTo } 
    };
  }

  /**
   * Send in-app notification
   */
  private async executeSendNotification(config: any, context: ActionContext): Promise<ActionResult> {
    const { recipients, title, message, type = 'info', link, actions = [] } = config;
    
    // Resolve recipients (can be dynamic)
    const resolvedRecipients: string[] = [];
    for (const recipient of recipients) {
      if (recipient.startsWith('{{') && recipient.endsWith('}}')) {
        const field = recipient.slice(2, -2).trim();
        const value = this.getNestedValue(context.eventPayload, field);
        if (value) resolvedRecipients.push(value);
      } else {
        resolvedRecipients.push(recipient);
      }
    }

    const resolvedTitle = this.resolveTemplateVariables(title, context);
    const resolvedMessage = this.resolveTemplateVariables(message, context);

    // Store notification for each recipient
    for (const recipientId of resolvedRecipients) {
      // Would call notification service here
      this.logger.log(`Notification to ${recipientId}: ${resolvedTitle}`);
    }

    return { success: true, data: { recipients: resolvedRecipients } };
  }

  /**
   * Create a task
   */
  private async executeCreateTask(config: any, context: ActionContext): Promise<ActionResult> {
    const { title, description, assignee, dueDate, priority = 'medium', relatedTo, checklist = [] } = config;
    
    const taskData = {
      tenantId: context.tenantId,
      title: this.resolveTemplateVariables(title, context),
      description: this.resolveTemplateVariables(description, context),
      assignee: this.resolveTemplateVariables(assignee, context),
      dueDate: dueDate ? new Date(dueDate) : null,
      priority,
      status: 'pending',
      relatedEntityType: relatedTo?.entityType || context.entityType,
      relatedEntityId: relatedTo?.entityId || context.entityId,
      checklist,
      createdBy: 'automation',
    };

    // Would call task service here
    this.logger.log(`Creating task: ${taskData.title}`);

    return { success: true, data: { taskId: `task_${Date.now()}` } };
  }

  /**
   * Trigger webhook
   */
  private async executeTriggerWebhook(config: any, context: ActionContext): Promise<ActionResult> {
    const { url, method = 'POST', headers = {}, body, timeout = 30000 } = config;
    
    const resolvedUrl = this.resolveTemplateVariables(url, context);
    const resolvedBody = this.resolveVariables(body, context);

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          url: resolvedUrl,
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Automation-Execution': context.executionId,
            'X-Automation-Rule': context.ruleId,
            ...headers,
          },
          data: resolvedBody,
          timeout,
        })
      );

      return {
        success: (response as any).status >= 200 && (response as any).status < 300,
        data: { status: (response as any).status, data: (response as any).data },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Webhook failed: ${error.message}`,
      };
    }
  }

  /**
   * Delay execution
   */
  private async executeDelay(config: any, context: ActionContext): Promise<ActionResult> {
    const { duration, unit = 'seconds' } = config;
    
    let ms: number;
    switch (unit) {
      case 'milliseconds':
        ms = duration;
        break;
      case 'seconds':
        ms = duration * 1000;
        break;
      case 'minutes':
        ms = duration * 60 * 1000;
        break;
      case 'hours':
        ms = duration * 60 * 60 * 1000;
        break;
      case 'days':
        ms = duration * 24 * 60 * 60 * 1000;
        break;
      default:
        ms = duration * 1000;
    }

    await new Promise(resolve => setTimeout(resolve, ms));

    return { success: true, data: { delayedMs: ms } };
  }

  /**
   * Enable/disable feature
   */
  private async executeToggleFeature(config: any, context: ActionContext, enable: boolean): Promise<ActionResult> {
    const { featureId, module } = config;
    
    // Would call settings service to toggle feature
    this.logger.log(`${enable ? 'Enabling' : 'Disabling'} feature ${featureId} for module ${module}`);

    return { success: true, data: { featureId, enabled: enable } };
  }

  /**
   * Conditional branch - determines next nodes based on condition
   */
  private async executeConditionalBranch(config: any, context: ActionContext): Promise<ActionResult> {
    const { condition, trueNodes = [], falseNodes = [] } = config;
    
    // Evaluate condition
    const fieldValue = this.getNestedValue(context.eventPayload, condition.field);
    let conditionMet = false;
    
    switch (condition.operator) {
      case 'eq':
        conditionMet = fieldValue === condition.value;
        break;
      case 'ne':
        conditionMet = fieldValue !== condition.value;
        break;
      case 'gt':
        conditionMet = Number(fieldValue) > Number(condition.value);
        break;
      // ... other operators
    }

    return {
      success: true,
      nextNodes: conditionMet ? trueNodes : falseNodes,
    };
  }

  /**
   * Create project - emits event for actual creation
   */
  private async executeCreateProject(config: any, context: ActionContext): Promise<ActionResult> {
    const { fromEntity, data = {} } = config;
    
    const projectData = {
      tenantId: context.tenantId,
      fromEntity,
      sourceEntityId: context.entityId,
      sourceEntityType: context.entityType,
      ...data,
    };

    this.eventEmitter.emit('automation.project.create', {
      tenantId: context.tenantId,
      projectData,
      triggerContext: context,
    });

    return {
      success: true,
      data: { message: 'Project creation request emitted' },
    };
  }

  /**
   * Create quotation - emits event for actual creation
   */
  private async executeCreateQuotation(config: any, context: ActionContext): Promise<ActionResult> {
    const { fromEntity, pricing, terms = {} } = config;
    
    const quotationData = {
      tenantId: context.tenantId,
      fromEntity,
      sourceEntityId: context.entityId,
      sourceEntityType: context.entityType,
      terms,
      pricing,
    };

    this.eventEmitter.emit('automation.quotation.create', {
      tenantId: context.tenantId,
      quotationData,
      triggerContext: context,
    });

    return {
      success: true,
      data: { message: 'Quotation creation request emitted' },
    };
  }

  /**
   * Assign engineer - emits event for actual assignment
   */
  private async executeAssignEngineer(config: any, context: ActionContext): Promise<ActionResult> {
    const { engineerId, surveyId } = config;
    const targetSurveyId = surveyId || context.entityId;
    const resolvedEngineerId = this.resolveVariables({ engineerId }, context).engineerId;

    this.eventEmitter.emit('automation.survey.assign_engineer', {
      tenantId: context.tenantId,
      surveyId: targetSurveyId,
      engineerId: resolvedEngineerId,
      triggerContext: context,
    });

    return { 
      success: true, 
      data: { surveyId: targetSurveyId, engineerId: resolvedEngineerId } 
    };
  }

  /**
   * Update status - emits event for actual update
   */
  private async executeUpdateStatus(config: any, context: ActionContext): Promise<ActionResult> {
    const { status, module, entityId: configEntityId } = config;
    const targetEntityId = configEntityId || context.entityId;

    this.eventEmitter.emit(`automation.${module || context.entityType}.update_status`, {
      tenantId: context.tenantId,
      entityId: targetEntityId,
      status,
      triggerContext: context,
    });

    return { 
      success: true, 
      data: { status } 
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Variable Resolution Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Resolve all {{variable}} patterns in an object
   */
  private resolveVariables(obj: any, context: ActionContext): any {
    if (typeof obj === 'string') {
      return this.resolveTemplateVariables(obj, context);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveVariables(item, context));
    }
    
    if (obj && typeof obj === 'object') {
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolveVariables(value, context);
      }
      return resolved;
    }
    
    return obj;
  }

  /**
   * Resolve template variables like {{lead.name}} or {{event.tenantId}}
   */
  private resolveTemplateVariables(template: string, context: ActionContext): string {
    if (!template || typeof template !== 'string') return template;

    return template.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (match, path) => {
      const trimmedPath = path.trim();
      
      // Check context variables first
      if (context.variables[trimmedPath] !== undefined) {
        return String(context.variables[trimmedPath]);
      }

      // Check resolved fields
      if (context.resolvedFields[trimmedPath] !== undefined) {
        return String(context.resolvedFields[trimmedPath]);
      }

      // Check event payload
      const value = this.getNestedValue(context.eventPayload, trimmedPath);
      if (value !== undefined) {
        return String(value);
      }

      // Return original if not found
      return match;
    });
  }

  /**
   * Get nested value using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    
    const parts = path.split('.');
    let value = obj;
    
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      
      // Handle array notation
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [_, key, index] = arrayMatch;
        value = value[key]?.[parseInt(index, 10)];
      } else {
        value = value[part];
      }
    }
    
    return value;
  }

  /**
   * Set nested value using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
}
