import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type InvoiceDocument = Invoice & Document;

export type InvoiceStatus = 'Draft' | 'Pending' | 'Partial' | 'Paid' | 'Overdue';

export type PaymentTerm = '30% Advance' | '50% on Delivery' | 'Net 30' | 'Net 60';

export interface Milestone {
  label: string;
  percentage: number;
  amount: number;
  dueDate: Date;
  isPaid: boolean;
  paidDate?: Date;
}

@Schema({ ...BaseSchemaOptions, collection: 'invoices' })
export class Invoice {
  @Prop(BaseSchemaDefinition.tenantId)
  tenantId!: Types.ObjectId;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;

  @Prop({ required: true, index: true })
  invoiceNumber!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', index: true })
  projectId?: Types.ObjectId;

  @Prop({ required: false, index: true })
  projectStatus?: string;

  @Prop({ required: true, index: true })
  customerName!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Customer', index: true })
  customerId?: Types.ObjectId;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true, default: 0 })
  paid!: number;

  @Prop({ required: true, default: 0 })
  balance!: number;

  @Prop({ 
    required: true, 
    enum: ['Draft', 'Pending', 'Partial', 'Paid', 'Overdue'],
    default: 'Draft',
    index: true 
  })
  status!: InvoiceStatus;

  @Prop({ required: true })
  invoiceDate!: Date;

  @Prop({ required: true })
  dueDate!: Date;

  @Prop({ required: false })
  paidDate?: Date;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  paymentTerms?: string;

  @Prop({
    type: [{
      label: { type: String, required: true },
      percentage: { type: Number, required: true },
      amount: { type: Number, required: true },
      dueDate: { type: Date, required: true },
      isPaid: { type: Boolean, default: false },
      paidDate: { type: Date, required: false },
    }],
    default: [],
  })
  milestones?: Milestone[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId }], ref: 'Payment', default: [] })
  paymentIds?: Types.ObjectId[];

  @Prop({ required: false })
  lastReminderSentAt?: Date;

  @Prop({ required: false, default: 0 })
  reminderCount?: number;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

InvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ tenantId: 1, status: 1 });
InvoiceSchema.index({ tenantId: 1, customerName: 1 });
InvoiceSchema.index({ tenantId: 1, dueDate: 1 });
