import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type ExpenseDocument = Expense & Document;

export type ExpenseCategory = 'Vendor Payment' | 'Salaries' | 'Utilities' | 'Rent' | 'Travel' | 'Marketing' | 'Maintenance' | 'Other';

export type ExpenseStatus = 'Pending' | 'Approved' | 'Paid' | 'Rejected';

@Schema({ ...BaseSchemaOptions, collection: 'expenses' })
export class Expense {
  @Prop({ ...BaseSchemaDefinition.tenantId })
  tenantId!: Types.ObjectId;

  @Prop({ ...BaseSchemaDefinition.isDeleted })
  isDeleted!: boolean;

  @Prop({ required: true, index: true })
  expenseNumber!: string;

  @Prop({ required: true, index: true })
  vendorName!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Vendor', index: true })
  vendorId?: Types.ObjectId;

  @Prop({ 
    required: true, 
    enum: ['Vendor Payment', 'Salaries', 'Utilities', 'Rent', 'Travel', 'Marketing', 'Maintenance', 'Other'],
    default: 'Other'
  })
  category!: ExpenseCategory;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true })
  expenseDate!: Date;

  @Prop({ required: false })
  dueDate?: Date;

  @Prop({ 
    required: true, 
    enum: ['Pending', 'Approved', 'Paid', 'Rejected'],
    default: 'Pending',
    index: true 
  })
  status!: ExpenseStatus;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  poReference?: string;

  @Prop({ required: false })
  invoiceReference?: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId }], ref: 'Payment', default: [] })
  paymentIds?: Types.ObjectId[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  assignedTo?: Types.ObjectId;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);

ExpenseSchema.index({ tenantId: 1, expenseNumber: 1 }, { unique: true });
ExpenseSchema.index({ tenantId: 1, status: 1 });
ExpenseSchema.index({ tenantId: 1, vendorName: 1 });
ExpenseSchema.index({ tenantId: 1, category: 1 });
ExpenseSchema.index({ tenantId: 1, dueDate: 1 });
ExpenseSchema.index({ tenantId: 1, assignedTo: 1 });
