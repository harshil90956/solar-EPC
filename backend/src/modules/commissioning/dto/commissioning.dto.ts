import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';

export class CreateCommissioningDto {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  employee?: string;

  @IsString()
  date!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage!: number;

  @IsString()
  inverterSerialNo!: string;

  @IsString()
  panelBatchNo!: string;

  @IsOptional()
  @IsEnum(['Pending', 'Completed', 'Cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  completedBy?: string;

  @IsOptional()
  @IsString()
  panelWarranty?: string;

  @IsOptional()
  @IsString()
  inverterWarranty?: string;

  @IsOptional()
  @IsString()
  installWarranty?: string;
}

export class UpdateCommissioningDto extends PartialType(CreateCommissioningDto) {}

export class UpdateCommissioningStatusDto {
  @IsEnum(['Pending', 'Completed', 'Cancelled'])
  status!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  employee?: string;

  @IsOptional()
  @IsString()
  completedBy?: string;
}
