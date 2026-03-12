import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type InventoryReservationDocument = InventoryReservation & Document;

@Schema({ ...BaseSchemaOptions, collection: 'inventoryReservations' })
export class InventoryReservation {
  @Prop({ ...BaseSchemaDefinition.tenantId })
  tenantId!: Types.ObjectId;

  @Prop({ ...BaseSchemaDefinition.isDeleted })
  isDeleted!: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Inventory', required: false, index: true })
  inventoryId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  itemId!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true, index: true })
  projectId!: Types.ObjectId | string;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({ required: true, enum: ['Pending', 'Fulfilled', 'Cancelled', 'active', 'fulfilled', 'cancelled'], default: 'Pending' })
  status!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  reservedBy?: Types.ObjectId;

  @Prop({ default: Date.now })
  reservedAt!: Date;
}

export const InventoryReservationSchema = SchemaFactory.createForClass(InventoryReservation);

InventoryReservationSchema.index({ tenantId: 1, inventoryId: 1 });
InventoryReservationSchema.index({ tenantId: 1, projectId: 1 });

// Indexes for efficient querying
InventoryReservationSchema.index({ tenantId: 1, projectId: 1 });
InventoryReservationSchema.index({ tenantId: 1, itemId: 1 });
InventoryReservationSchema.index({ tenantId: 1, status: 1 });
InventoryReservationSchema.index({ tenantId: 1, projectId: 1, status: 1 });
