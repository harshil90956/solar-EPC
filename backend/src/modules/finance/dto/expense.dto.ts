import { IsString, IsNumber, IsDateString, IsOptional, IsEnum, IsMongoId, Min, MaxLength } from 'class-validator';
import { ExpenseCategory, ExpenseStatus } from '../schemas/expense.schema';

export class CreateExpenseDto {
  @IsString()
  @MaxLength(50)
  expenseNumber!: string;

  @IsString()
  @MaxLength(200)
  vendorName!: string;

  @IsOptional()
  @IsMongoId()
  vendorId?: string;

  @IsEnum(['Vendor Payment', 'Salaries', 'Utilities', 'Rent', 'Travel', 'Marketing', 'Maintenance', 'Other'])
  category!: ExpenseCategory;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsDateString()
  expenseDate!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(['Pending', 'Approved', 'Paid', 'Rejected'])
  status?: ExpenseStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  poReference?: string;

  @IsOptional()
  @IsString()
  invoiceReference?: string;
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  expenseNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  vendorName?: string;

  @IsOptional()
  @IsMongoId()
  vendorId?: string;

  @IsOptional()
  @IsEnum(['Vendor Payment', 'Salaries', 'Utilities', 'Rent', 'Travel', 'Marketing', 'Maintenance', 'Other'])
  category?: ExpenseCategory;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(['Pending', 'Approved', 'Paid', 'Rejected'])
  status?: ExpenseStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  poReference?: string;

  @IsOptional()
  @IsString()
  invoiceReference?: string;
}
