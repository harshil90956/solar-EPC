import { IsString, IsNumber, IsDateString, IsOptional, IsEnum, IsMongoId, Min, MaxLength } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @MaxLength(50)
  paymentNumber!: string;

  @IsMongoId()
  invoiceId!: string;

  @IsString()
  @MaxLength(200)
  customerName!: string;

  @IsOptional()
  @IsMongoId()
  customerId?: string;

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

export class UpdatePaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentNumber?: string;

  @IsOptional()
  @IsMongoId()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  customerName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsEnum(['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card', 'NEFT', 'RTGS'])
  paymentMethod?: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

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
