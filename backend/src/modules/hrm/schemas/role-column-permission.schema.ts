import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoleColumnPermissionDocument = RoleColumnPermission & Document;

@Schema({ timestamps: true, collection: 'role_column_permissions' })
export class RoleColumnPermission {
  @Prop({ required: true, type: String })
  roleId!: string;

  @Prop({ required: true, type: String })
  module!: string;

  @Prop({ required: true, type: String })
  columnName!: string;

  @Prop({ required: true, type: Boolean, default: true })
  isVisible!: boolean;
}

export const RoleColumnPermissionSchema = SchemaFactory.createForClass(RoleColumnPermission);

// Compound index to ensure unique role-module-column combinations
RoleColumnPermissionSchema.index({ roleId: 1, module: 1, columnName: 1 }, { unique: true });
RoleColumnPermissionSchema.index({ roleId: 1, module: 1 });
RoleColumnPermissionSchema.index({ module: 1 });
