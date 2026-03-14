// Schemas
export { AutomationRule, AutomationRuleSchema, AutomationRuleDocument } from './schemas/automation-rule.schema';
export { AutomationExecution, AutomationExecutionSchema, AutomationExecutionDocument } from './schemas/automation-execution.schema';

// Services
export { AutomationEngineService } from './services/automation-engine.service';
export { ConditionEngine } from './services/condition-engine.service';
export { ActionEngine, ActionContext, ActionResult } from './services/action-engine.service';
export { DAGEngine, DAG, DAGNode } from './services/dag-engine.service';
export { RuleMatcherService } from './services/rule-matcher.service';
export { AutomationEventBus, AutomationEvent } from './services/automation-event-bus.service';
export { AutomationQueueService, AutomationJobData } from './services/automation-queue.service';
export { AutomationTemplatesService, AutomationTemplate } from './services/automation-templates.service';
export { AutomationMigrationService } from './services/automation-migration.service';

// Workers
export { AutomationWorker } from './workers/automation.worker';

// Controllers
export { AutomationController } from './controllers/automation.controller';

// DTOs
export {
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  ToggleAutomationRuleDto,
  QueryExecutionsDto,
  RetryExecutionDto,
  AutomationEventDto,
  ConditionNodeDto,
  ActionNodeDto,
  TriggerConfigDto,
} from './dto/automation.dto';

// Constants
export {
  LEAD_EVENTS,
  SURVEY_EVENTS,
  DESIGN_EVENTS,
  QUOTATION_EVENTS,
  PROJECT_EVENTS,
  INVENTORY_EVENTS,
  PROCUREMENT_EVENTS,
  LOGISTICS_EVENTS,
  INSTALLATION_EVENTS,
  COMMISSIONING_EVENTS,
  FINANCE_EVENTS,
  SERVICE_EVENTS,
  HRM_EVENTS,
  COMPLIANCE_EVENTS,
  ALL_EVENTS,
  EVENT_MODULE_MAP,
  EVENT_DESCRIPTIONS,
} from './constants/automation-events';

// Module
export { AutomationModule } from './automation.module';
