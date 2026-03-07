import { IsString, IsNumber, IsEnum, IsOptional, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { EstimateStatus, ProjectType, InstallationType } from '../schemas/estimate.schema';

export class EstimateItemDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  unitPrice!: number;

  @IsNumber()
  total!: number;
}

export class CreateEstimateDto {
  @IsString()
  customerName!: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  customerAddress?: string;

  @IsString()
  @IsOptional()
  projectLocation?: string;

  @IsString()
  projectName!: string;

  @IsNumber()
  systemCapacity!: number;

  @IsEnum(ProjectType)
  @IsOptional()
  projectType?: ProjectType;

  @IsEnum(InstallationType)
  @IsOptional()
  installationType?: InstallationType;

  @IsString()
  @IsOptional()
  projectDescription?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EstimateItemDto)
  @IsOptional()
  items?: EstimateItemDto[];

  @IsNumber()
  @IsOptional()
  equipmentCost?: number;

  @IsNumber()
  @IsOptional()
  installationCost?: number;

  @IsNumber()
  @IsOptional()
  engineeringCost?: number;

  @IsNumber()
  @IsOptional()
  transportationCost?: number;

  @IsNumber()
  @IsOptional()
  miscellaneousCost?: number;

  @IsNumber()
  @IsOptional()
  subtotal?: number;

  @IsNumber()
  @IsOptional()
  gstRate?: number;

  @IsNumber()
  @IsOptional()
  gstAmount?: number;

  @IsNumber()
  @IsOptional()
  total?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  terms?: string;
}

export class UpdateEstimateDto {
  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  customerAddress?: string;

  @IsString()
  @IsOptional()
  projectLocation?: string;

  @IsString()
  @IsOptional()
  projectName?: string;

  @IsNumber()
  @IsOptional()
  systemCapacity?: number;

  @IsEnum(ProjectType)
  @IsOptional()
  projectType?: ProjectType;

  @IsEnum(InstallationType)
  @IsOptional()
  installationType?: InstallationType;

  @IsString()
  @IsOptional()
  projectDescription?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EstimateItemDto)
  @IsOptional()
  items?: EstimateItemDto[];

  @IsNumber()
  @IsOptional()
  equipmentCost?: number;

  @IsNumber()
  @IsOptional()
  installationCost?: number;

  @IsNumber()
  @IsOptional()
  engineeringCost?: number;

  @IsNumber()
  @IsOptional()
  transportationCost?: number;

  @IsNumber()
  @IsOptional()
  miscellaneousCost?: number;

  @IsNumber()
  @IsOptional()
  subtotal?: number;

  @IsNumber()
  @IsOptional()
  gstRate?: number;

  @IsNumber()
  @IsOptional()
  gstAmount?: number;

  @IsNumber()
  @IsOptional()
  total?: number;

  @IsEnum(EstimateStatus)
  @IsOptional()
  status?: EstimateStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  terms?: string;
}

export class QueryEstimateDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(EstimateStatus)
  @IsOptional()
  status?: EstimateStatus;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  projectName?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
