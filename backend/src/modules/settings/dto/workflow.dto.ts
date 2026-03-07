import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateWorkflowDto {
  @IsString()
  label!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  trigger?: {
    type: string;
    entity: string;
    config?: Record<string, any>;
  };

  @IsOptional()
  @IsArray()
  conditions?: Array<{
    field: string;
    operator: string;
    value: any;
    logic?: 'AND' | 'OR';
  }>;

  @IsOptional()
  @IsArray()
  actions?: Array<{
    type: string;
    config: Record<string, any>;
    delay?: number;
  }>;
}

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  trigger?: {
    type: string;
    entity: string;
    config?: Record<string, any>;
  };

  @IsOptional()
  @IsArray()
  conditions?: Array<{
    field: string;
    operator: string;
    value: any;
    logic?: 'AND' | 'OR';
  }>;

  @IsOptional()
  @IsArray()
  actions?: Array<{
    type: string;
    config: Record<string, any>;
    delay?: number;
  }>;
}

export class ToggleWorkflowDto {
  @IsBoolean()
  enabled!: boolean;
}

export class TriggerWorkflowDto {
  @IsString()
  triggerType!: string;

  @IsString()
  entityType!: string;

  @IsString()
  entityId!: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}
