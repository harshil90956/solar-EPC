import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, IsDate } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ActivityDto {
  @IsString()
  type!: string;

  @IsString()
  ts!: string;

  @IsString()
  note!: string;

  @IsString()
  by!: string;
}

export class CreateLeadDto {
  @IsString()
  leadId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsString()
  phone!: string;

  @IsString()
  email!: string;

  @IsString()
  source!: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  kw?: string;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsDate()
  created?: Date;

  @IsOptional()
  @IsDate()
  lastContact?: Date;

  @IsOptional()
  @IsNumber()
  monthlyBill?: number;

  @IsOptional()
  @IsNumber()
  roofArea?: number;

  @IsOptional()
  @IsString()
  roofType?: string;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsArray()
  activities?: ActivityDto[];

  @IsOptional()
  @IsString()
  nextFollowUp?: string;

  @IsOptional()
  @IsNumber()
  slaHours?: number;

  @IsOptional()
  @IsBoolean()
  slaBreached?: boolean;
}

export class UpdateLeadDto extends CreateLeadDto {}

export class QueryLeadDto {
  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? Number(value) : undefined)
  minScore?: number;

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
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
