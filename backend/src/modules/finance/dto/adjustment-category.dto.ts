import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAdjustmentCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  categoryName!: string;

  @IsEnum(['credit', 'debit'])
  type!: 'credit' | 'debit';
}

export class UpdateAdjustmentCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  categoryName?: string;

  @IsEnum(['credit', 'debit'])
  type?: 'credit' | 'debit';
}
