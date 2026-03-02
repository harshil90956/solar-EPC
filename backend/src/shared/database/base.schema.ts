import { Schema, Types } from 'mongoose';

export interface BaseSchema {
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export const BaseSchemaDefinition = {
  tenantId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
} as const;

export const BaseSchemaOptions = {
  timestamps: true,
} as const;
