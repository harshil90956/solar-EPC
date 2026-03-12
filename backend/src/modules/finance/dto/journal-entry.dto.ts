import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class JournalEntryLineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  accountName!: string;

  @IsNumber()
  @Min(0)
  debitAmount!: number;

  @IsNumber()
  @Min(0)
  creditAmount!: number;
}

export class CreateJournalEntryDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  narration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsArray()
  @ValidateNested({ each: true })
  lines!: JournalEntryLineDto[];

  @IsOptional()
  @IsString()
  relatedAdjustmentId?: string;

  @IsOptional()
  @IsNumber()
  lf?: number;
}

export class CreateJournalEntryFromAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  type!: 'credit' | 'debit';

  @IsString()
  @IsNotEmpty()
  category!: string;

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

  @IsOptional()
  @IsNumber()
  lf?: number;
}
