import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PermissionModule {
  EMPLOYEES = 'employees',
  LEAVES = 'leaves',
  ATTENDANCE = 'attendance',
  PAYROLL = 'payroll',
  INCREMENTS = 'increments',
  DEPARTMENTS = 'departments',
}

export enum PermissionAction {
  VIEW = 'view',
  CREATE = 'create',
  EDIT = 'edit',
  DELETE = 'delete',
  EXPORT = 'export',
  ASSIGN = 'assign',
  APPROVE = 'approve',
  // Special actions
  CHECK_IN = 'checkin',
  CHECK_OUT = 'checkout',
  MARK_ATTENDANCE = 'mark',
  APPLY_LEAVE = 'apply',
  APPROVE_LEAVE = 'approve',
  REJECT_LEAVE = 'reject',
  GENERATE_PAYROLL = 'generate',
}

@Schema({ timestamps: true })
export class Permission extends Document {
  @Prop({ required: true, unique: true })
  key!: string; // e.g., 'employees.view', 'attendance.checkin'

  @Prop({ required: true })
  name!: string; // e.g., 'View Employees', 'Check In'

  @Prop({ required: true, enum: PermissionModule })
  module!: PermissionModule;

  @Prop({ required: true, enum: PermissionAction })
  action!: PermissionAction;

  @Prop({ default: '' })
  description!: string;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
