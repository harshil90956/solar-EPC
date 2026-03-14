import { IsString, IsNotEmpty, IsOptional, IsDate, IsEnum, IsMongoId, IsNumber, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AttendanceType } from '../schemas/attendance.schema';

export class CheckInDto {
  @IsMongoId()
  @IsNotEmpty()
  employeeId!: string;

  @IsEnum(AttendanceType)
  @IsOptional()
  type?: AttendanceType;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CheckOutDto {
  @IsMongoId()
  @IsNotEmpty()
  employeeId!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class GetAttendanceQueryDto {
  @IsMongoId()
  @IsOptional()
  employeeId?: string;

  @IsDate()
  @Type(() => Date)
  @Transform(({ value }) => value ? new Date(value) : undefined)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @Transform(({ value }) => value ? new Date(value) : undefined)
  @IsOptional()
  endDate?: Date;
}
