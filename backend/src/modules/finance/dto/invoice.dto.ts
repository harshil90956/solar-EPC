import { IsString, IsNumber, IsDateString, IsOptional, IsEnum, IsMongoId, Min, MaxLength } from 'class-validator';
import { InvoiceStatus } from '../schemas/invoice.schema';

export class CreateInvoiceDto {
  @IsString()
  @MaxLength(50)
  invoiceNumber!: string;

  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @IsString()
  @MaxLength(200)
  customerName!: string;

  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paid?: number;

  @IsOptional()
  @IsEnum(['Draft', 'Pending', 'Partial', 'Paid', 'Overdue'])
  status?: InvoiceStatus;

  @IsDateString()
  invoiceDate!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsDateString()
  paidDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  projectStatus?: string;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceNumber?: string;

  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerName?: string;

  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paid?: number;

  @IsOptional()
  @IsEnum(['Draft', 'Sent', 'Pending', 'Partial', 'Paid', 'Overdue'])
  status?: InvoiceStatus;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  paidDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  projectStatus?: string;
}

export class RecordPaymentDto {
  @IsMongoId()
  invoiceId!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsEnum(['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card', 'NEFT', 'RTGS'])
  paymentMethod!: string;

  @IsDateString()
  paymentDate!: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
