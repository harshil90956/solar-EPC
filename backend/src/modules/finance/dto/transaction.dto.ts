import { IsString, IsNumber, IsDateString, IsOptional, IsEnum, IsMongoId, Min, MaxLength } from 'class-validator';
import { TransactionType } from '../schemas/transaction.schema';

export class CreateTransactionDto {
  @IsString()
  @MaxLength(50)
  transactionNumber!: string;

  @IsEnum(['Income', 'Expense', 'Transfer'])
  type!: TransactionType;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsDateString()
  transactionDate!: string;

  @IsOptional()
  @IsMongoId()
  invoiceId?: string;

  @IsOptional()
  @IsMongoId()
  expenseId?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsEnum(['Pending', 'Completed', 'Failed', 'Cancelled'])
  status?: string;
}

export class UpdateTransactionDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  transactionNumber?: string;

  @IsOptional()
  @IsEnum(['Income', 'Expense', 'Transfer'])
  type?: TransactionType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsMongoId()
  invoiceId?: string;

  @IsOptional()
  @IsMongoId()
  expenseId?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsEnum(['Pending', 'Completed', 'Failed', 'Cancelled'])
  status?: string;
}
