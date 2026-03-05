import { IsString, IsNotEmpty, IsOptional, IsDate, IsEnum, IsMongoId, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { LeaveType, LeaveStatus } from '../schemas/leave.schema';

export class CreateLeaveDto {
  @IsMongoId()
  @IsNotEmpty()
  employeeId!: string;

  @IsEnum(LeaveType)
  @IsNotEmpty()
  leaveType!: LeaveType;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  endDate!: Date;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class UpdateLeaveStatusDto {
  @IsEnum(LeaveStatus)
  @IsNotEmpty()
  status!: LeaveStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class GetLeaveQueryDto {
  @IsMongoId()
  @IsOptional()
  employeeId?: string;

  @IsEnum(LeaveStatus)
  @IsOptional()
  status?: LeaveStatus;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;
}

export class ApproveLeaveDto {
  @IsMongoId()
  @IsNotEmpty()
  approvedBy!: string;
}
