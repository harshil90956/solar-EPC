import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, IsObject, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

class MaterialItemDto {
  @IsString()
  itemId!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  unitPrice!: number;

  @IsNumber()
  totalPrice!: number;
}

class SystemConfigDto {
  @IsNumber()
  systemSize!: number;

  @IsNumber()
  panelCount!: number;

  @IsString()
  inverterType!: string;

  @IsString()
  batteryOption!: string;

  @IsString()
  mountingStructure!: string;
}

export class CreateQuotationDto {
  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  surveyId?: string;

  @IsString()
  customerName!: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => SystemConfigDto)
  systemConfig!: SystemConfigDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialItemDto)
  materials!: MaterialItemDto[];

  @IsNumber()
  materialTotal!: number;

  @IsNumber()
  @IsOptional()
  installationCost?: number;

  @IsNumber()
  @IsOptional()
  transportCost?: number;

  @IsNumber()
  @IsOptional()
  tax?: number;

  @IsNumber()
  finalQuotationPrice!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class UpdateQuotationDto extends PartialType(CreateQuotationDto) {
  @IsOptional()
  @IsEnum(['Draft', 'Sent', 'Viewed', 'Approved', 'Rejected', 'Expired', 'ConvertedToProject'])
  status?: string;
}
