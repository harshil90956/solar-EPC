import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class GeneratePayrollDto {
  @IsMongoId()
  @IsNotEmpty()
  employeeId!: string;

  @IsNumber()
  @Min(1)
  @Max(12)
  month!: number;

  @IsNumber()
  @Min(2000)
  year!: number;

  @IsNumber()
  @Min(0)
  baseSalary!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  allowances?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  deductions?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  bonus?: number;
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
