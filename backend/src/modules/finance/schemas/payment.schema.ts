import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type PaymentDocument = Payment & Document;

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Cheque' | 'UPI' | 'Card' | 'NEFT' | 'RTGS';

@Schema({ ...BaseSchemaOptions, collection: 'payments' })
export class Payment {
  @Prop(BaseSchemaDefinition.tenantId)
  tenantId!: Types.ObjectId;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;

  @Prop({ required: true, index: true })
  paymentNumber!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Invoice', required: true, index: true })
  invoiceId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  customerName!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Customer', index: true })
  customerId?: Types.ObjectId;

  @Prop({ required: true })
  amount!: number;

  @Prop({ 
    required: true, 
    enum: ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card', 'NEFT', 'RTGS'],
    default: 'Bank Transfer'
  })
  paymentMethod!: PaymentMethod;

  @Prop({ required: true })
  paymentDate!: Date;

  @Prop({ required: false })
  referenceNumber?: string;

  @Prop({ required: false })
  bankName?: string;

  @Prop({ required: false })
  notes?: string;

  @Prop({ required: false })
  receiptUrl?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ tenantId: 1, paymentNumber: 1 }, { unique: true });
PaymentSchema.index({ tenantId: 1, invoiceId: 1 });
PaymentSchema.index({ tenantId: 1, paymentDate: 1 });
