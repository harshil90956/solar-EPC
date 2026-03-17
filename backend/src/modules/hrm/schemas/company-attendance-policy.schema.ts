import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CompanyAttendancePolicyDocument = CompanyAttendancePolicy & Document;

@Schema({ timestamps: true, collection: 'company_attendance_policies' })
export class CompanyAttendancePolicy {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId!: Types.ObjectId;

  @Prop({ required: true, default: '09:00' })
  checkInTime!: string;

  @Prop({ required: true, default: '18:00' })
  checkOutTime!: string;

  @Prop({ required: true, default: 15, min: 0, max: 60 })
  gracePeriodMinutes!: number;

  @Prop({ required: true, default: 240, min: 0, max: 480 })
  halfDayAfterMinutes!: number;

  @Prop({ required: true, type: [String], default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] })
  workingDays!: string[];

  @Prop({ required: true, default: 30, min: 0, max: 120 })
  lateMarkAfterMinutes!: number;

  @Prop({ required: true, default: 30, min: 0, max: 120 })
  earlyLeaveBeforeMinutes!: number;

  @Prop({ required: true, default: 30, min: 0, max: 120 })
  overtimeThresholdMinutes!: number;

  @Prop({ required: true, default: '12:00' })
  breakStartTime!: string;

  @Prop({ required: true, default: '13:00' })
  breakEndTime!: string;

  @Prop({ required: true, default: true })
  isBreakTimeDeducted!: boolean;

  @Prop({ required: true, default: true })
  isActive!: boolean;

  @Prop({ type: Date, default: Date.now })
  updatedAt!: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;
}

export const CompanyAttendancePolicySchema = SchemaFactory.createForClass(CompanyAttendancePolicy);

CompanyAttendancePolicySchema.index({ tenantId: 1 }, { unique: true });
CompanyAttendancePolicySchema.index({ isActive: 1 });
