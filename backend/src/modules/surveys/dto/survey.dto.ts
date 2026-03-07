import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateSurveyDto {
  @IsString()
  customerName!: string;

  @IsString()
  @IsOptional()
  site?: string;

  @IsString()
  engineer!: string;

  @IsDateString()
  scheduledDate!: string;

  @IsNumber()
  @IsOptional()
  estimatedKw?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  shadowPct?: number;

  @IsNumber()
  @IsOptional()
  roofArea?: number;

  @IsString()
  @IsOptional()
  sourceLeadId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateSurveyDto {
  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  site?: string;

  @IsString()
  @IsOptional()
  engineer?: string;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsNumber()
  @IsOptional()
  estimatedKw?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  shadowPct?: number;

  @IsNumber()
  @IsOptional()
  roofArea?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class QuerySurveyDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  engineer?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}
