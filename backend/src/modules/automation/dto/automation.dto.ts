import { IsString, IsObject, IsOptional, IsBoolean, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTOs for Automation Engine
 */

// Condition Node DTO
export class ConditionNodeDto {
  @IsString()
  type!: 'condition' | 'group';

  @IsOptional()
  @IsString()
  field?: string;

  @IsOptional()
  @IsString()
  operator?: string;

  @IsOptional()
  value?: any;

  @IsOptional()
  @IsString()
  logic?: 'AND' | 'OR';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionNodeDto)
  children?: ConditionNodeDto[];
}

// Action Node DTO
export class ActionNodeDto {
  @IsString()
  nodeId!: string;

  @IsString()
  type!: string;

  @IsObject()
  config!: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nextNodes?: string[];

  @IsOptional()
  @IsNumber()
  delayMs?: number;

  @IsOptional()
  @IsNumber()
  retryCount?: number;

  @IsOptional()
  @IsNumber()
  maxRetries?: number;

  @IsOptional()
  @IsBoolean()
  stopOnFailure?: boolean;
}

// Trigger Config DTO
export class TriggerConfigDto {
  @IsString()
  event!: string;

  @IsString()
  module!: string;

  @IsString()
  entityType!: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;

  @IsOptional()
  @IsString()
  cronExpression?: string;
}

// Create Automation Rule DTO
export class CreateAutomationRuleDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ValidateNested()
  @Type(() => TriggerConfigDto)
  trigger!: TriggerConfigDto;

  @ValidateNested()
  @Type(() => ConditionNodeDto)
  conditionTree!: ConditionNodeDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionNodeDto)
  actionNodes!: ActionNodeDto[];

  @IsOptional()
  @IsString()
  startNodeId?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// Update Automation Rule DTO
export class UpdateAutomationRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => TriggerConfigDto)
  trigger?: TriggerConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConditionNodeDto)
  conditionTree?: ConditionNodeDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionNodeDto)
  actionNodes?: ActionNodeDto[];

  @IsOptional()
  @IsString()
  startNodeId?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// Toggle Automation Rule DTO
export class ToggleAutomationRuleDto {
  @IsBoolean()
  enabled!: boolean;
}

// Automation Event DTO - For triggering from modules
export class AutomationEventDto {
  @IsString()
  event!: string;

  @IsString()
  module!: string;

  @IsString()
  entityType!: string;

  @IsString()
  entityId!: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsObject()
  payload!: Record<string, any>;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// Query Executions DTO
export class QueryExecutionsDto {
  @IsOptional()
  @IsString()
  ruleId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}

// Retry Execution DTO
export class RetryExecutionDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificNodeIds?: string[];

  @IsOptional()
  @IsBoolean()
  resetAll?: boolean;
}

// Bulk Operation DTOs
export class BulkEnableRulesDto {
  @IsArray()
  @IsString({ each: true })
  ruleIds!: string[];
}

export class BulkDisableRulesDto {
  @IsArray()
  @IsString({ each: true })
  ruleIds!: string[];
}

export class BulkDeleteRulesDto {
  @IsArray()
  @IsString({ each: true })
  ruleIds!: string[];
}
