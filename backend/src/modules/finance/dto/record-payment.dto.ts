import { IsString, IsNumber, IsDateString, IsOptional, IsEnum, IsNotEmpty, Min } from 'class-validator';

export enum PaymentType {
  CUSTOMER = 'Customer Payment',
  VENDOR = 'Vendor Payment',
}

export enum ReferenceType {
  INVOICE = 'Invoice',
  VENDOR = 'Vendor',
}

export enum PaymentMethod {
  CASH = 'Cash',
  BANK_TRANSFER = 'Bank Transfer',
  CHEQUE = 'Cheque',
  UPI = 'UPI',
  OTHER = 'Other',
}

export class RecordPaymentDto {
  @IsEnum(PaymentType)
  @IsNotEmpty()
  paymentType!: PaymentType;

  @IsEnum(ReferenceType)
  @IsNotEmpty()
  referenceType!: ReferenceType;

  @IsString()
  @IsNotEmpty()
  referenceId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsDateString()
  @IsNotEmpty()
  paymentDate!: string;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod!: PaymentMethod;

  @IsString()
  @IsOptional()
  notes?: string;
}
