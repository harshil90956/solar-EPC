import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type SalaryIncrementDocument = SalaryIncrement & Document;

@Schema({ timestamps: true })
export class SalaryIncrement {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId!: Types.ObjectId;

  @Prop({ required: true })
  previousSalary!: number;

  @Prop({ required: true })
  incrementPercentage!: number;

  @Prop({ required: true })
  incrementAmount!: number;

  @Prop({ required: true })
  newSalary!: number;

  @Prop({ required: true })
  effectiveFrom!: Date;

  @Prop({ default: '' })
  reason!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Employee' })
  approvedBy?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const SalaryIncrementSchema = SchemaFactory.createForClass(SalaryIncrement);

SalaryIncrementSchema.index({ employeeId: 1, effectiveFrom: -1 });
SalaryIncrementSchema.index({ tenantId: 1, createdAt: -1 });
