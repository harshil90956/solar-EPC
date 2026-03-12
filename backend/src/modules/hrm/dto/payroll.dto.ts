import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class GeneratePayrollDto {
  @IsMongoId()
  @IsNotEmpty()
  employeeId!: string;

  @IsNumber()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month!: number;

  @IsNumber()
  @Min(2000)
  @Type(() => Number)
  year!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  baseSalary!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  allowances?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  deductions?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  bonus?: number;
}

export class UpdatePayrollDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  baseSalary?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  allowances?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  deductions?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  bonus?: number;

  @IsString()
  @IsOptional()
  paymentStatus?: string;

  @IsString()
  @IsOptional()
  paymentReference?: string;
}

export class GetPayrollQueryDto {
  @IsMongoId()
  @IsOptional()
  employeeId?: string;

  @IsNumber()
  @IsOptional()
  month?: number;

  @IsNumber()
  @IsOptional()
  year?: number;
}

export class MarkAsPaidDto {
  @IsString()
  @IsNotEmpty()
  paymentReference!: string;
}
