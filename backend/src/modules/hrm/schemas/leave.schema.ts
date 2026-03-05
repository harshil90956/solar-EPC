import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type LeaveDocument = Leave & Document;

export enum LeaveType {
  PAID = 'paid',
  UNPAID = 'unpaid',
  SICK = 'sick',
  CASUAL = 'casual',
  EARNED = 'earned',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Leave {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId!: Types.ObjectId;

  @Prop({ enum: LeaveType, required: true })
  leaveType!: LeaveType;

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true })
  endDate!: Date;

  @Prop({ type: Number, required: true })
  days!: number;

  @Prop({ required: true })
  reason!: string;

  @Prop({ enum: LeaveStatus, default: LeaveStatus.PENDING })
  status!: LeaveStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Employee' })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop({ default: '' })
  rejectionReason!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const LeaveSchema = SchemaFactory.createForClass(Leave);

LeaveSchema.index({ employeeId: 1, status: 1 });
LeaveSchema.index({ tenantId: 1, status: 1 });
LeaveSchema.index({ startDate: 1, endDate: 1 });
