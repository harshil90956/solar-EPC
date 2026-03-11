import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  HALF_DAY = 'half_day',
}

export enum AttendanceType {
  OFFICE = 'office',
  SITE = 'site',
  REMOTE = 'remote',
}

@Schema({ timestamps: true })
export class Attendance {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  date!: Date;

  @Prop({ type: Date })
  checkIn?: Date;

  @Prop({ type: Date })
  checkOut?: Date;

  @Prop({ type: Number, default: 0 })
  totalHours!: number;

  @Prop({ default: '' })
  location!: string;

  @Prop({ enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  status!: AttendanceStatus;

  @Prop({ enum: AttendanceType, default: AttendanceType.OFFICE })
  type!: AttendanceType;

  @Prop({ default: '' })
  notes!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;

  @Prop({ default: false })
  isEarlyExit!: boolean;

  @Prop({ type: Date })
  createdAt!: Date;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ tenantId: 1, date: 1 });
