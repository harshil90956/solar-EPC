import { IsString, IsNotEmpty, IsOptional, IsDate, IsNumber, Min, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateIncrementDto {
  @IsMongoId()
  @IsNotEmpty()
  employeeId!: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  previousSalary!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  incrementAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  incrementPercentage?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  newSalary!: number;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  effectiveFrom!: Date;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsMongoId()
  @IsOptional()
  approvedBy?: string;
}

export class GetIncrementQueryDto {
  @IsMongoId()
  @IsOptional()
  employeeId?: string;
}

export class UpdateIncrementDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  previousSalary?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  incrementPercentage?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  newSalary?: number;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  effectiveFrom?: Date;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsMongoId()
  @IsOptional()
  approvedBy?: string;
}
