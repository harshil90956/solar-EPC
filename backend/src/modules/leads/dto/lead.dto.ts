import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, IsEnum } from 'class-validator';
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

  @IsOptional()
  timestamp?: Date;
}

export class AddActivityDto {
  @IsEnum(['call', 'email', 'whatsapp', 'note', 'stage_change'])
  type!: string;

  @IsString()
  note!: string;

  @IsOptional()
  @IsString()
  by?: string;
}

export class BulkActionDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}

export class CreateLeadDto {
  @IsOptional()
  @IsString()
  leadId?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  statusKey?: string;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  kw?: number;

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

  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  statusKey?: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  kw?: number;

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

  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryLeadDto {
  @IsOptional()
  @IsString()
  statusKey?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value, obj }) => {
    // Support legacy query param `stage` by mapping it to statusKey
    if (value && !obj?.statusKey) {
      (obj as any).statusKey = value;
    }
    return value;
  })
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
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? Number(value) : undefined)
  minScore?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? Number(value) : undefined)
  maxScore?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? Number(value) : undefined)
  minValue?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? Number(value) : undefined)
  maxValue?: number;

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

  @IsOptional()
  @IsEnum(['highScore', 'slaBreached', 'highValue', 'referral', 'automation', 'recent'])
  quickFilter?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

// ============================================
// IMPORT DTOs
// ============================================

export class ImportLeadDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsString()
  statusKey?: string;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  value?: string | number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  activity_logs?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsNumber()
  kw?: number;

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

  // Allow any additional fields for customFields
  [key: string]: any;
}

export interface ImportResultDto {
  success: boolean;
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; reason: string; data?: any }>;
}
