import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type FinancePaymentDocument = FinancePayment & Document;

export type PaymentType = 'Customer Payment' | 'Vendor Payment';
export type ReferenceType = 'Invoice' | 'Vendor';
export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Cheque' | 'UPI' | 'Other';
export type FinancePaymentStatus = 'Initiated' | 'Processing' | 'Completed';

@Schema({ ...BaseSchemaOptions, collection: 'financePayments' })
export class FinancePayment {
  @Prop({ ...BaseSchemaDefinition.tenantId })
  tenantId!: Types.ObjectId;

  @Prop({ ...BaseSchemaDefinition.isDeleted })
  isDeleted!: boolean;

  @Prop({ required: true, index: true })
  paymentNumber!: string;

  @Prop({ 
    required: true, 
    enum: ['Customer Payment', 'Vendor Payment'],
    index: true 
  })
  paymentType!: PaymentType;

  @Prop({ 
    required: true, 
    enum: ['Invoice', 'Vendor'],
    index: true 
  })
  referenceType!: ReferenceType;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  referenceId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Invoice', required: false, index: true })
  invoiceId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Vendor', required: false, index: true })
  vendorId?: Types.ObjectId;

  @Prop({ required: true })
  amount!: number;

  @Prop({
    required: true,
    enum: ['Initiated', 'Processing', 'Completed'],
    default: 'Initiated',
    index: true,
  })
  status!: FinancePaymentStatus;

  @Prop({ 
    required: true, 
    enum: ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Other'],
    default: 'Bank Transfer'
  })
  paymentMethod!: PaymentMethod;

  @Prop({ required: true })
  paymentDate!: Date;

  @Prop({ required: false })
  initiatedAt?: Date;

  @Prop({ required: false })
  processingAt?: Date;

  @Prop({ required: false })
  completedAt?: Date;

  @Prop({ type: Object, required: false })
  methodDetails?: {
    bankName?: string;
    accountNumber?: string;
    transactionReference?: string;
    transferDate?: Date;
    upiId?: string;
    upiRequestId?: string;
    chequeNumber?: string;
    chequeDate?: Date;
    description?: string;
    cashConfirmed?: boolean;
  };

  @Prop({ required: false })
  notes?: string;

  @Prop({ required: false })
  createdBy?: Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt!: Date;
}

export const FinancePaymentSchema = SchemaFactory.createForClass(FinancePayment);

FinancePaymentSchema.index({ tenantId: 1, paymentNumber: 1 }, { unique: true });
FinancePaymentSchema.index({ tenantId: 1, paymentType: 1 });
FinancePaymentSchema.index({ tenantId: 1, referenceId: 1 });
FinancePaymentSchema.index({ tenantId: 1, paymentDate: 1 });
FinancePaymentSchema.index({ tenantId: 1, invoiceId: 1 });
FinancePaymentSchema.index({ tenantId: 1, vendorId: 1 });
FinancePaymentSchema.index({ tenantId: 1, status: 1 });
