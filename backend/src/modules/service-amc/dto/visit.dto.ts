import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateVisitDto {
  @IsString()
  @IsOptional()
  contract_id?: string;

  @IsString()
  @IsOptional()
  customer?: string;

  @IsString()
  @IsOptional()
  site?: string;

  @IsNumber()
  @IsOptional()
  system_size?: number;

  @IsString()
  @IsOptional()
  visit_type?: string;

  @IsString()
  @IsOptional()
  scheduled_date?: string;

  @IsString()
  @IsOptional()
  scheduled_time?: string;

  @IsString()
  @IsOptional()
  engineer_id?: string;

  @IsString()
  @IsOptional()
  engineer_name?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  tenant_id?: string;

  @IsString()
  @IsOptional()
  email?: string;
}

export class UpdateVisitDto {
  @IsString()
  @IsOptional()
  visit_type?: string;

  @IsString()
  @IsOptional()
  scheduled_date?: string;

  @IsString()
  @IsOptional()
  scheduled_time?: string;

  @IsString()
  @IsOptional()
  engineer_id?: string;

  @IsString()
  @IsOptional()
  engineer_name?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class QueryVisitDto {
  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  contract_id?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  engineer_id?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
