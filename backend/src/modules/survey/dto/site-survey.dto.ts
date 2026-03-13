import { IsString, IsNumber, IsOptional, IsDateString, IsEnum, IsBoolean, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SurveyStatus } from '../schemas/site-survey.schema';

// Roof Measurements DTO
export class RoofMeasurementsDto {
  @IsNumber()
  @IsOptional()
  length?: number;

  @IsNumber()
  @IsOptional()
  width?: number;

  @IsNumber()
  @IsOptional()
  area?: number;

  @IsString()
  @IsOptional()
  orientation?: string;

  @IsNumber()
  @IsOptional()
  tiltAngle?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

// Active Survey Data DTO
export class ActiveSurveyDataDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  siteImages?: string[];

  @IsString()
  @IsOptional()
  roofMeasurements?: string;

  @IsString()
  @IsOptional()
  electricalPoints?: string;

  @IsString()
  @IsOptional()
  shadowAnalysis?: string;

  @IsString()
  @IsOptional()
  structuralAssessment?: string;

  @IsDateString()
  @IsOptional()
  startedAt?: string;

  @IsString()
  @IsOptional()
  startedBy?: string;
}

// Complete Survey Data DTO
export class CompleteSurveyDataDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  finalImages?: string[];

  @IsString()
  @IsOptional()
  finalRoofLayout?: string;

  @IsString()
  @IsOptional()
  panelPlacementDetails?: string;

  @IsString()
  @IsOptional()
  finalNotes?: string;

  @IsBoolean()
  @IsOptional()
  engineerApproval?: boolean;

  @IsString()
  @IsOptional()
  engineerName?: string;

  @IsDateString()
  @IsOptional()
  completionDate?: string;

  @IsDateString()
  @IsOptional()
  approvedAt?: string;
}

// Create Site Survey DTO
export class CreateSiteSurveyDto {
  @IsString()
  leadId!: string;

  @IsString()
  clientName!: string;

  @IsString()
  city!: string;

  @IsString()
  projectCapacity!: string;

  @IsString()
  roofType!: string;

  @IsString()
  structureType!: string;

  @IsString()
  structureHeight!: string;

  @IsString()
  moduleType!: string;

  @IsString()
  solarConsultant!: string;

  @IsNumber()
  @IsOptional()
  floors?: number;

  @IsOptional()
  roofMeasurements?: RoofMeasurementsDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  surveyImages?: string[];

  @IsString()
  @IsOptional()
  roofLayout?: string;

  @IsString()
  @IsOptional()
  surveyDrawing?: string;

  @IsString()
  @IsOptional()
  notes?: string;

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
  assignedTo?: string; // User ID to assign during creation
}

// Update Site Survey DTO
export class UpdateSiteSurveyDto {
  @IsString()
  @IsOptional()
  clientName?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  projectCapacity?: string;

  @IsString()
  @IsOptional()
  roofType?: string;

  @IsString()
  @IsOptional()
  structureType?: string;

  @IsString()
  @IsOptional()
  structureHeight?: string;

  @IsString()
  @IsOptional()
  moduleType?: string;

  @IsString()
  @IsOptional()
  solarConsultant?: string;

  @IsNumber()
  @IsOptional()
  floors?: number;

  @IsOptional()
  roofMeasurements?: RoofMeasurementsDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  surveyImages?: string[];

  @IsString()
  @IsOptional()
  roofLayout?: string;

  @IsString()
  @IsOptional()
  surveyDrawing?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(SurveyStatus)
  @IsOptional()
  status?: string;

  @IsOptional()
  activeData?: ActiveSurveyDataDto;

  @IsOptional()
  completeData?: CompleteSurveyDataDto;

  @IsString()
  @IsOptional()
  engineer?: string;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsNumber()
  @IsOptional()
  estimatedKw?: number;
}

// Move to Active DTO
export class MoveToActiveDto {
  @IsOptional()
  activeData!: ActiveSurveyDataDto;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  engineer?: string;

  @IsString()
  @IsOptional()
  solarConsultant?: string;
}

// Move to Complete DTO
export class MoveToCompleteDto {
  @IsOptional()
  completeData!: CompleteSurveyDataDto;

  @IsString()
  @IsOptional()
  notes?: string;
}

// Query Site Survey DTO
export class QuerySiteSurveyDto {
  @IsEnum(SurveyStatus)
  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  status?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  engineer?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

// Assign Survey DTO
export class AssignSurveyDto {
  @IsString()
  assignedTo!: string; // User ID to assign the survey to

  @IsString()
  @IsOptional()
  notes?: string; // Optional notes about the assignment
}
