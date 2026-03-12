import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsNumber, IsOptional, IsEnum, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MilestoneDto {
  @IsString()
  name!: string;

  @IsEnum(['Pending', 'In Progress', 'Done'])
  status!: 'Pending' | 'In Progress' | 'Done';

  @IsOptional()
  @IsString()
  date?: string | null;
}

export class MaterialDto {
  @IsString()
  itemId!: string;

  @IsString()
  itemName!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  issuedDate?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class QuotationItemDto {
  @IsString()
  itemId!: string;

  @IsString()
  category!: string;

  @IsString()
  itemName!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsNumber()
  @Min(0)
  totalPrice!: number;
}

export class CreateProjectDto {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  quotationId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsString()
  customerName!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @IsString()
  site!: string;

  @IsNumber()
  @Min(0)
  systemSize!: number;

  @IsEnum(['Survey', 'Design', 'Quotation', 'Procurement', 'Installation', 'Commissioned', 'On Hold', 'Cancelled'])
  status!: string;

  @IsString()
  pm!: string;

  @IsString()
  startDate!: string;

  @IsOptional()
  @IsString()
  estEndDate?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  progress!: number;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones?: MilestoneDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialDto)
  materials?: MaterialDto[];

  // Quotation-related fields
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items?: QuotationItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export class UpdateProjectStatusDto {
  @IsEnum(['Survey', 'Design', 'Quotation', 'Procurement', 'Installation', 'Commissioned', 'On Hold', 'Cancelled'])
  status!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones?: MilestoneDto[];

  @IsOptional()
  @IsString()
  cancelledBy?: string;

  @IsOptional()
  @IsString()
  userRole?: string;
}
