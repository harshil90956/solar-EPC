import { PartialType } from '@nestjs/mapped-types';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsDateString,
  IsMongoId,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TaskItemDto {
  @IsString()
  name!: string;

  @IsBoolean()
  done!: boolean;

  @IsOptional()
  completedAt?: Date;

  @IsOptional()
  @IsMongoId()
  completedBy?: string;

  @IsOptional()
  @IsBoolean()
  photoRequired?: boolean;
}

export class PhotoItemDto {
  @IsString()
  url!: string;

  @IsString()
  key!: string;

  @IsOptional()
  uploadedAt?: Date;

  @IsMongoId()
  uploadedBy!: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsEnum(['before', 'during', 'after'])
  category?: 'before' | 'during' | 'after';
}

export class MaterialUsedDto {
  @IsString()
  itemId!: string;

  @IsString()
  itemName!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serialNumbers?: string[];
}

export class CustomerSignOffDto {
  @IsBoolean()
  signed!: boolean;

  @IsOptional()
  signedAt?: Date;

  @IsOptional()
  @IsString()
  signatureUrl?: string;
}

export class CreateCommissioningDto {
  @IsOptional()
  @IsString()
  commissioningId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  projectIdString?: string;

  @IsOptional()
  @IsString()
  dispatchId?: string;

  @IsString()
  customerName!: string;

  @IsString()
  site!: string;

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsString()
  technicianName?: string;

  @IsOptional()
  @IsString()
  supervisorId?: string;

  @IsOptional()
  @IsString()
  supervisorName?: string;

  @IsDateString()
  scheduledDate!: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsEnum(['Pending Assign', 'Pending', 'In Progress', 'Delayed', 'Completed'])
  status?: 'Pending Assign' | 'Pending' | 'In Progress' | 'Delayed' | 'Completed';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskItemDto)
  tasks?: TaskItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  siteObservations?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialUsedDto)
  materialsUsed?: MaterialUsedDto[];

  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class UpdateCommissioningDto extends PartialType(CreateCommissioningDto) {}

export class UpdateCommissioningStatusDto {
  @IsEnum(['Pending Assign', 'Pending', 'In Progress', 'Delayed', 'Completed'])
  status!: 'Pending Assign' | 'Pending' | 'In Progress' | 'Delayed' | 'Completed';

  @IsOptional()
  @IsString()
  delayReason?: string;
}

export class UpdateCommissioningTasksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskItemDto)
  tasks!: TaskItemDto[];
}

export class AddPhotoDto {
  @IsString()
  url!: string;

  @IsString()
  key!: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsEnum(['before', 'during', 'after'])
  category?: 'before' | 'during' | 'after';
}

export class QualityCheckDto {
  @IsBoolean()
  passed!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CustomerSignOffUpdateDto {
  @IsBoolean()
  signed!: boolean;

  @IsOptional()
  @IsString()
  signatureUrl?: string;
}
