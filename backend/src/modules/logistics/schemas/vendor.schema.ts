import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VendorDocument = HydratedDocument<Vendor>;

@Schema({ timestamps: true, collection: 'logistics_vendors' })
export class Vendor {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  contact!: string;

  @Prop({ required: true })
  phone!: string;

  @Prop({ required: true })
  email!: string;

  @Prop({ required: true })
  city!: string;

  @Prop({ default: 0 })
  totalOrders!: number;

  @Prop({ default: 5 })
  rating!: number;

  @Prop({ default: true })
  isActive!: boolean;

  // Inventory-related fields - optional
  @Prop({ type: String, required: false })
  itemId?: string;

  @Prop({ type: String, required: false })
  itemName?: string;

  @Prop({ type: String, required: false })
  unit?: string;

  @Prop({ type: Number, required: false, min: [0, 'Quantity must be at least 0'] })
  quantity?: number;

  // Multi-tenant support
  @Prop({ type: Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);
