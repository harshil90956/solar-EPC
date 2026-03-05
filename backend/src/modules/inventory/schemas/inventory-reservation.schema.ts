import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaOptions, BaseSchemaDefinition } from '../../../shared/database/base.schema';

export type ReservationStatus = 'active' | 'fulfilled' | 'cancelled' | 'expired';

@Schema(BaseSchemaOptions)
export class InventoryReservation extends Document {
  @Prop({ required: true, unique: true })
  reservationId!: string;

  @Prop({ required: true })
  itemId!: string;

  @Prop({ required: true })
  projectId!: string;

  @Prop({ required: false })
  projectName?: string;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({
    required: true,
    enum: ['active', 'fulfilled', 'cancelled', 'expired'],
    default: 'active',
  })
  status!: ReservationStatus;

  @Prop({ required: false })
  reservedDate?: string;

  @Prop({ required: false })
  expiryDate?: string;

  @Prop({ required: false })
  notes?: string;

  @Prop(BaseSchemaDefinition.tenantId)
  tenantId!: Types.ObjectId;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;
}

export const InventoryReservationSchema = SchemaFactory.createForClass(InventoryReservation);

// Indexes for efficient querying
InventoryReservationSchema.index({ tenantId: 1, projectId: 1 });
InventoryReservationSchema.index({ tenantId: 1, itemId: 1 });
InventoryReservationSchema.index({ tenantId: 1, status: 1 });
InventoryReservationSchema.index({ tenantId: 1, projectId: 1, status: 1 });
