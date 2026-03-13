import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FinanceVendorDocument = HydratedDocument<FinanceVendor>;

@Schema({ timestamps: true, collection: 'financeVendors' })
export class FinanceVendor {
  @Prop({ type: Types.ObjectId, ref: 'LogisticsVendor', required: true })
  vendorId!: Types.ObjectId;

  @Prop({ required: true })
  vendorName!: string;

  @Prop({ required: true })
  vendorCode!: string;

  @Prop({ type: Types.ObjectId, ref: 'Tenant' })
  tenantId!: Types.ObjectId;

  @Prop({ default: 0 })
  totalPayable!: number;

  @Prop({ default: 0 })
  totalPaid!: number;

  @Prop({ default: 0 })
  outstandingAmount!: number;

  @Prop({ default: 0 })
  totalPurchaseOrders!: number;

  @Prop({ default: 'Active' })
  status!: string;

  @Prop({ type: Date, default: null })
  lastPaymentDate!: Date | null;

  @Prop({ default: 0 })
  lastPaymentAmount!: number;

  @Prop({ type: [{ 
    date: Date, 
    amount: Number, 
    poId: String,
    poNumber: String,
    notes: String 
  }], default: [] })
  paymentHistory!: Array<{
    date: Date;
    amount: number;
    poId: string;
    poNumber: string;
    notes: string;
  }>;

  @Prop({ default: false })
  isDeleted!: boolean;
}

export const FinanceVendorSchema = SchemaFactory.createForClass(FinanceVendor);
