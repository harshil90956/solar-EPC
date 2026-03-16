import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DataScope } from './permission.schema';

export type RoleModulePermissionDocument = RoleModulePermission & Document;

/**
 * RoleModulePermission Schema
 * Stores module-level permissions with data scope for each role
 * This enables granular control over what data users can see (own/department/all)
 */
@Schema({ timestamps: true, collection: 'role_module_permissions' })
export class RoleModulePermission {
  @Prop({ required: true, type: String })
  roleId!: string;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: false })
  tenantId?: Types.ObjectId;

  @Prop({ required: true, enum: ['employees', 'leaves', 'attendance', 'payroll', 'increments', 'departments', 'hrm_permissions'] })
  module!: string;

  @Prop({
    type: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      export: { type: Boolean, default: false },
      assign: { type: Boolean, default: false },
      approve: { type: Boolean, default: false },
      reject: { type: Boolean, default: false },
      checkin: { type: Boolean, default: false },
      checkout: { type: Boolean, default: false },
      apply: { type: Boolean, default: false },
      generate: { type: Boolean, default: false },
    },
    _id: false,
  })
  actions!: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    export: boolean;
    assign: boolean;
    approve: boolean;
    reject: boolean;
    checkin: boolean;
    checkout: boolean;
    apply: boolean;
    generate: boolean;
  };

  @Prop({ required: true, enum: DataScope, default: DataScope.ALL })
  dataScope!: DataScope;

  @Prop({ type: Date, default: Date.now })
  updatedAt!: Date;
}

export const RoleModulePermissionSchema = SchemaFactory.createForClass(RoleModulePermission);

// Compound index for efficient lookups
RoleModulePermissionSchema.index({ roleId: 1, module: 1, tenantId: 1 }, { unique: true });
RoleModulePermissionSchema.index({ roleId: 1, tenantId: 1 });
