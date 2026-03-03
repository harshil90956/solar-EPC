import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PurchaseOrderDocument = HydratedDocument<PurchaseOrder>;

@Schema({ timestamps: true, collection: 'purchase_orders' })
export class PurchaseOrder {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Vendor' })
  vendorId!: Types.ObjectId;

  @Prop({ required: true })
  vendorName!: string;

  @Prop({ required: true })
  items!: string;

  @Prop({ required: true })
  totalAmount!: number;

  @Prop({ required: true, enum: ['Draft', 'Ordered', 'In Transit', 'Delivered', 'Cancelled'], default: 'Draft' })
  status!: string;

  @Prop({ required: true })
  orderedDate!: string;

  @Prop({ required: true })
  expectedDate!: string;

  @Prop({ type: String, default: null })
  deliveredDate!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null })
  relatedProjectId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Tenant' })
  tenantId!: Types.ObjectId;

  @Prop({ default: true })
  isActive!: boolean;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);
