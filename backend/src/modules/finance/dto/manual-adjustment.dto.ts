import { IsEnum, IsNumber, IsOptional, IsString, IsDateString, Min, MaxLength } from 'class-validator';

export class CreateManualAdjustmentDto {
  @IsEnum(['credit', 'debit'])
  type!: 'credit' | 'debit';

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsDateString()
  date!: string;
}
