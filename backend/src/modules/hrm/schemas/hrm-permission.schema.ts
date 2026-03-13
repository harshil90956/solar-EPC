import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HrmPermissionDocument = HrmPermission & Document;

@Schema({ timestamps: true, collection: 'hrm_permissions' })
export class HrmPermission {
  @Prop({ required: true })
  roleId!: string;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: false })
  tenantId?: Types.ObjectId;

  @Prop({
    type: {
      employees: {
        view: { type: Boolean, default: false },
        manage: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
      leaves: {
        view: { type: Boolean, default: false },
        apply: { type: Boolean, default: false },
        approve: { type: Boolean, default: false },
      },
      attendance: {
        view_self: { type: Boolean, default: false },
        view_all: { type: Boolean, default: false },
        checkin_checkout: { type: Boolean, default: false },
        manage: { type: Boolean, default: false },
      },
      payroll: {
        view: { type: Boolean, default: false },
        manage: { type: Boolean, default: false },
        approve: { type: Boolean, default: false },
      },
      increments: {
        view: { type: Boolean, default: false },
        manage: { type: Boolean, default: false },
      },
      departments: {
        view: { type: Boolean, default: false },
        manage: { type: Boolean, default: false },
      },
      dashboard: {
        view: { type: Boolean, default: false },
      }
    },
    _id: false,
  })
  permissions!: {
    employees: { view: boolean; manage: boolean; delete: boolean };
    leaves: { view: boolean; apply: boolean; approve: boolean };
    attendance: { view_self: boolean; view_all: boolean; checkin_checkout: boolean; manage: boolean };
    payroll: { view: boolean; manage: boolean; approve: boolean };
    increments: { view: boolean; manage: boolean };
    departments: { view: boolean; manage: boolean };
    dashboard: { view: boolean };
  };
}

export const HrmPermissionSchema = SchemaFactory.createForClass(HrmPermission);

// Index for faster lookups
HrmPermissionSchema.index({ roleId: 1, tenantId: 1 }, { unique: true });
