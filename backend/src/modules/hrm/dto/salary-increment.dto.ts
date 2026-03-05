import { IsString, IsNotEmpty, IsOptional, IsDate, IsNumber, Min, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateIncrementDto {
  @IsMongoId()
  @IsNotEmpty()
  employeeId!: string;

  @IsNumber()
  @Min(0)
  previousSalary!: number;

  @IsNumber()
  @Min(0)
  incrementPercentage!: number;

  @IsNumber()
  @Min(0)
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
