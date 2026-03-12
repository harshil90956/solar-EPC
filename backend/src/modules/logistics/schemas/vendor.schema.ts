import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VendorDocument = HydratedDocument<Vendor>;

@Schema({ timestamps: true, collection: 'logistics_vendors' })
export class Vendor {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, type: String })
  category!: string;

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

  // Inventory-related fields - REQUIRED
  @Prop({ type: String, required: [true, 'Item is required'] })
  itemId!: string;

  @Prop({ type: String, required: [true, 'Item name is required'] })
  itemName!: string;

  @Prop({ type: String, required: [true, 'Unit is required'] })
  unit!: string;

  @Prop({ type: Number, required: [true, 'Quantity is required'], min: [0, 'Quantity must be at least 0'] })
  quantity!: number;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);
