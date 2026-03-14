import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AutomationRule } from '../schemas/automation-rule.schema';

/**
 * Migration Service
 * Handles backward compatibility and data migration from old workflow system
 */

interface OldWorkflowRule {
  wfId?: string;
  ruleId?: string;
  id?: string;
  label?: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  condition?: {
    field?: string;
    operator?: string;
    value?: any;
  };
  conditions?: any[];
  action?: {
    type?: string;
    target?: string;
    config?: Record<string, any>;
  };
  actions?: any[];
  trigger?: {
    type?: string;
    entity?: string;
    event?: string;
    module?: string;
  };
  tenantId?: any;
  createdBy?: string;
  createdAt?: Date;
}

@Injectable()
export class AutomationMigrationService {
  private readonly logger = new Logger(AutomationMigrationService.name);

  constructor(
    @InjectModel(AutomationRule.name) private automationRuleModel: Model<AutomationRule>,
  ) {}

  /**
   * Migrate old workflow rules to new automation format
   * Run this once during deployment
   */
  async migrateOldRules(tenantId?: string): Promise<{
    migrated: number;
    skipped: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      migrated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      // Fetch old workflow rules from the old collection (WorkflowRule)
      const oldRules = await this.automationRuleModel.db.collection('workflowrules').find(
        tenantId ? { tenantId } : {}
      ).toArray();

      this.logger.log(`Found ${oldRules.length} old workflow rules to migrate`);

      for (const oldRule of oldRules) {
        try {
          const success = await this.migrateSingleRule(oldRule as OldWorkflowRule);
          if (success) {
            result.migrated++;
          } else {
            result.skipped++;
          }
        } catch (error: any) {
          result.failed++;
          result.errors.push(`Rule ${oldRule.wfId || oldRule.id}: ${error.message}`);
          this.logger.error(`Failed to migrate rule ${oldRule.wfId}: ${error.message}`);
        }
      }

      this.logger.log(`Migration complete: ${result.migrated} migrated, ${result.skipped} skipped, ${result.failed} failed`);

      return result;
    } catch (error: any) {
      this.logger.error(`Migration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Migrate a single old rule to new format
   */
  private async migrateSingleRule(oldRule: OldWorkflowRule): Promise<boolean> {
    // Check if already migrated
    const existing = await this.automationRuleModel.findOne({ 
      ruleId: `migrated_${oldRule.wfId || oldRule.id}` 
    });
    
    if (existing) {
      this.logger.log(`Rule ${oldRule.wfId} already migrated, skipping`);
      return false;
    }

    // Map old format to new format
    const newRule = this.transformRule(oldRule);

    // Save new rule
    await this.automationRuleModel.create(newRule);

    this.logger.log(`Migrated rule: ${oldRule.wfId} -> ${newRule.ruleId}`);
    
    return true;
  }

  /**
   * Transform old rule format to new format
   */
  private transformRule(oldRule: OldWorkflowRule): Partial<AutomationRule> {
    const ruleId = `migrated_${oldRule.wfId || oldRule.id || Date.now()}`;

    // Determine trigger from old data
    let trigger: any = oldRule.trigger || {};
    if (!trigger.type && !trigger.event) {
      // Infer from action/condition
      const actionType = oldRule.action?.type || oldRule.actions?.[0]?.type;
      const entityType = this.inferEntityType(oldRule);
      
      trigger = {
        event: this.inferEvent(actionType, entityType),
        module: this.inferModule(entityType),
        entityType: entityType,
      };
    }

    // Transform condition to tree
    const conditionTree = this.transformCondition(oldRule);

    // Transform action to DAG nodes
    const actionNodes = this.transformActions(oldRule);

    return {
      ruleId,
      tenantId: oldRule.tenantId,
      name: oldRule.label || oldRule.name || `Migrated Rule ${ruleId}`,
      description: oldRule.description || `Automatically migrated from old workflow system`,
      enabled: oldRule.enabled !== false,
      trigger: {
        event: trigger.event || trigger.type || 'lead.created',
        module: trigger.module || trigger.entity || 'leads',
        entityType: (trigger as any).entityType || trigger.entity || 'lead',
        filters: {},
        isScheduled: false,
      },
      conditionTree,
      actionNodes,
      startNodeId: actionNodes[0]?.nodeId,
      variables: {},
      version: 1,
      isTemplate: false,
      category: 'migrated',
      executionCount: 0,
      successCount: 0,
      createdBy: 'migration_system',
      tags: ['migrated', 'legacy'],
      metadata: {
        migratedFrom: oldRule.wfId || oldRule.id,
        migratedAt: new Date(),
        originalData: oldRule,
      },
    } as any;
  }

  /**
   * Transform old condition format to new tree format
   */
  private transformCondition(oldRule: OldWorkflowRule): any {
    // If new format conditions exist
    if (oldRule.conditions && oldRule.conditions.length > 0) {
      return this.buildConditionTree(oldRule.conditions);
    }

    // Transform old single condition
    const oldCondition = oldRule.condition || {};
    
    return {
      type: 'condition',
      field: oldCondition.field || 'status',
      operator: this.mapOperator(oldCondition.operator),
      value: oldCondition.value,
    };
  }

  /**
   * Build condition tree from array of conditions
   */
  private buildConditionTree(conditions: any[]): any {
    if (conditions.length === 1) {
      const c = conditions[0];
      return {
        type: 'condition',
        field: c.field,
        operator: this.mapOperator(c.operator),
        value: c.value,
      };
    }

    // Build AND group for multiple conditions
    return {
      type: 'group',
      logic: 'AND',
      children: conditions.map(c => ({
        type: 'condition',
        field: c.field,
        operator: this.mapOperator(c.operator),
        value: c.value,
      })),
    };
  }

  /**
   * Transform actions to DAG nodes
   */
  private transformActions(oldRule: OldWorkflowRule): any[] {
    const actions = oldRule.actions || (oldRule.action ? [oldRule.action] : []);
    
    if (actions.length === 0) {
      // Create a default action
      return [{
        nodeId: 'action_1',
        type: 'send_notification',
        config: { message: 'Workflow executed', recipients: ['admin'] },
        dependencies: [],
        nextNodes: [],
        delayMs: 0,
        retryCount: 0,
        maxRetries: 3,
        stopOnFailure: false,
      }];
    }

    return actions.map((action, index) => ({
      nodeId: `action_${index + 1}`,
      type: this.mapActionType(action.type),
      config: action.config || { target: action.target },
      dependencies: index === 0 ? [] : [`action_${index}`],
      nextNodes: index < actions.length - 1 ? [`action_${index + 2}`] : [],
      delayMs: action.delay || 0,
      retryCount: 0,
      maxRetries: 3,
      stopOnFailure: false,
    }));
  }

  /**
   * Map old operator to new operator
   */
  private mapOperator(oldOp?: string): string {
    const operatorMap: Record<string, string> = {
      '=': 'eq',
      '!=': 'ne',
      '>': 'gt',
      '>=': 'gte',
      '<': 'lt',
      '<=': 'lte',
      'contains': 'contains',
      'starts_with': 'starts_with',
      'ends_with': 'ends_with',
      'exists': 'exists',
      'empty': 'empty',
    };

    return operatorMap[oldOp || ''] || 'eq';
  }

  /**
   * Map old action type to new action type
   */
  private mapActionType(oldType?: string): string {
    const actionMap: Record<string, string> = {
      'enable_feature': 'enable_feature',
      'disable_feature': 'disable_feature',
      'create_record': 'create_record',
      'send_notification': 'send_notification',
      'assign_user': 'assign_user',
      'trigger_webhook': 'trigger_webhook',
      'send_email': 'send_email',
      'update_field': 'update_field',
      'create_task': 'create_task',
    };

    return actionMap[oldType || ''] || 'send_notification';
  }

  /**
   * Infer entity type from rule data
   */
  private inferEntityType(oldRule: OldWorkflowRule): string {
    const field = oldRule.condition?.field || '';
    
    if (field.includes('lead') || field.includes('stage')) return 'lead';
    if (field.includes('project')) return 'project';
    if (field.includes('survey')) return 'survey';
    if (field.includes('quotation')) return 'quotation';
    if (field.includes('invoice')) return 'invoice';
    if (field.includes('inventory') || field.includes('stock')) return 'inventory';
    
    return 'lead';
  }

  /**
   * Infer event from action type and entity type
   */
  private inferEvent(actionType?: string, entityType?: string): string {
    if (entityType === 'lead') return 'lead.status_changed';
    if (entityType === 'project') return 'project.status_changed';
    if (entityType === 'survey') return 'survey.completed';
    if (entityType === 'quotation') return 'quotation.accepted';
    if (entityType === 'inventory') return 'inventory.low_stock';
    
    return 'lead.created';
  }

  /**
   * Infer module from entity type
   */
  private inferModule(entityType?: string): string {
    const moduleMap: Record<string, string> = {
      lead: 'leads',
      project: 'projects',
      survey: 'survey',
      quotation: 'quotation',
      invoice: 'finance',
      inventory: 'inventory',
    };

    return moduleMap[entityType || ''] || 'leads';
  }

  /**
   * Rollback migration (delete migrated rules)
   */
  async rollbackMigration(tenantId?: string): Promise<{ deleted: number }> {
    const filter: any = { category: 'migrated', tags: 'migrated' };
    if (tenantId) filter.tenantId = tenantId;

    const result = await this.automationRuleModel.deleteMany(filter);
    
    this.logger.log(`Rollback complete: ${result.deletedCount} migrated rules deleted`);
    
    return { deleted: result.deletedCount || 0 };
  }
}
