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

export class CreateProjectDto {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  quotationId?: string;

  @IsString()
  customerName!: string;

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
