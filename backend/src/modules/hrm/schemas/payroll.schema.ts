import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type PayrollDocument = Payroll & Document;

@Schema({ ...BaseSchemaOptions, collection: 'hrmPayrolls', timestamps: true })
export class Payroll {
  @Prop({ ...BaseSchemaDefinition.tenantId })
  tenantId!: Types.ObjectId;

  @Prop({ ...BaseSchemaDefinition.isDeleted })
  isDeleted!: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId!: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 12 })
  month!: number;

  @Prop({ required: true })
  year!: number;

  @Prop({ required: true })
  baseSalary!: number;

  @Prop({ type: Number, default: 0 })
  allowances!: number;

  @Prop({ type: Number, default: 0 })
  deductions!: number;

  @Prop({ type: Number, default: 0 })
  bonus!: number;

  @Prop({ type: Number, required: true })
  netSalary!: number;

  @Prop({ type: Date, default: Date.now })
  generatedAt!: Date;

  @Prop({ default: false })
  isPaid!: boolean;

  @Prop({ type: Date })
  paidAt?: Date;

  @Prop({ default: '' })
  paymentReference!: string;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const PayrollSchema = SchemaFactory.createForClass(Payroll);

PayrollSchema.index({ tenantId: 1, employeeId: 1, month: 1, year: 1 }, { unique: true });
PayrollSchema.index({ tenantId: 1, year: 1, month: 1 });

PayrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
PayrollSchema.index({ tenantId: 1, month: 1, year: 1 });
PayrollSchema.index({ isPaid: 1 });
