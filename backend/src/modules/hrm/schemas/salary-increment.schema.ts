import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type SalaryIncrementDocument = SalaryIncrement & Document;

@Schema({ ...BaseSchemaOptions, collection: 'hrmSalaryIncrements' })
export class SalaryIncrement {
  @Prop({ ...BaseSchemaDefinition.tenantId })
  tenantId!: Types.ObjectId;

  @Prop({ ...BaseSchemaDefinition.isDeleted })
  isDeleted!: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId!: Types.ObjectId;

  @Prop({ required: true })
  previousSalary!: number;

  @Prop({ required: true })
  newSalary!: number;

  @Prop({ required: true })
  incrementAmount!: number;

  @Prop({ required: true })
  incrementPercentage!: number;

  @Prop({ required: true })
  effectiveFrom!: Date;

  @Prop({ default: '' })
  reason!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;
}

export const SalaryIncrementSchema = SchemaFactory.createForClass(SalaryIncrement);

SalaryIncrementSchema.index({ tenantId: 1, employeeId: 1 });
SalaryIncrementSchema.index({ tenantId: 1, effectiveFrom: -1 });

SalaryIncrementSchema.index({ employeeId: 1, effectiveFrom: -1 });
SalaryIncrementSchema.index({ tenantId: 1, createdAt: -1 });
