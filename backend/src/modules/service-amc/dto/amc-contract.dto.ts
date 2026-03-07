import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAmcContractDto {
  @IsOptional()
  @IsString()
  contractId?: string;

  @IsString()
  customer!: string;

  @IsString()
  site!: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? Number(value) : 0)
  systemSize?: number;

  @IsString()
  startDate!: string;

  @IsString()
  endDate!: string;

  @IsOptional()
  @IsEnum(['Active', 'Expired', 'Expiring'])
  status?: string;

  @IsString()
  nextVisit!: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? Number(value) : 0)
  amount?: number;

  @IsOptional()
  @IsString()
  tenant_id?: string;
}

export class UpdateAmcContractDto {
  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsString()
  customer?: string;

  @IsOptional()
  @IsString()
  site?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? Number(value) : 0)
  systemSize?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['Active', 'Expired', 'Expiring'])
  status?: string;

  @IsOptional()
  @IsString()
  nextVisit?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? Number(value) : 0)
  amount?: number;

  @IsOptional()
  @IsString()
  tenant_id?: string;
}

export class QueryAmcContractDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? Number(value) : 1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? Number(value) : 25)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
