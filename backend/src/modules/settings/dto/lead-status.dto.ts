import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsNotEmpty } from 'class-validator';
import { LeadStatusModuleConnection, StatusType } from '../schemas/lead-status.schema';

export class CreateLeadStatusDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsOptional()
  color?: string = '#64748b';

  @IsNumber()
  @IsOptional()
  order?: number = 0;

  @IsEnum(StatusType)
  @IsOptional()
  type?: StatusType = StatusType.NORMAL;

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean = false;

  @IsEnum(LeadStatusModuleConnection)
  @IsOptional()
  moduleConnection?: LeadStatusModuleConnection | null;
}

export class UpdateLeadStatusDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsEnum(StatusType)
  @IsOptional()
  type?: StatusType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsEnum(LeadStatusModuleConnection)
  @IsOptional()
  moduleConnection?: LeadStatusModuleConnection | null;
}

export class ReorderLeadStatusesDto {
  @IsString({ each: true })
  statusIds!: string[];
}

export class LeadStatusResponseDto {
  id!: string;
  tenantId!: string;
  module!: string;
  entity!: string;
  key!: string;
  label!: string;
  color!: string;
  order!: number;
  type!: StatusType;
  isActive!: boolean;
  isSystem!: boolean;
  moduleConnection!: LeadStatusModuleConnection | null;
  createdAt!: Date;
  updatedAt!: Date;
}
