import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type TransactionDocument = Transaction & Document;

export type TransactionType = 'Income' | 'Expense' | 'Transfer';

@Schema({ ...BaseSchemaOptions, collection: 'transactions' })
export class Transaction {
  @Prop({ ...BaseSchemaDefinition.tenantId })
  tenantId!: Types.ObjectId;

  @Prop({ ...BaseSchemaDefinition.isDeleted })
  isDeleted!: boolean;

  @Prop({ required: true, index: true })
  transactionNumber!: string;

  @Prop({ 
    required: true, 
    enum: ['Income', 'Expense', 'Transfer'],
    index: true 
  })
  type!: TransactionType;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true })
  transactionDate!: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Invoice', index: true })
  invoiceId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Expense', index: true })
  expenseId?: Types.ObjectId;

  @Prop({ required: false })
  referenceId?: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  category?: string;

  @Prop({ required: false })
  bankAccount?: string;

  @Prop({ required: true, default: 'Completed', enum: ['Pending', 'Completed', 'Failed', 'Cancelled'] })
  status!: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ tenantId: 1, transactionNumber: 1 }, { unique: true });
TransactionSchema.index({ tenantId: 1, type: 1 });
TransactionSchema.index({ tenantId: 1, transactionDate: 1 });
TransactionSchema.index({ tenantId: 1, status: 1 });
