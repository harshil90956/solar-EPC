import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VendorDocument = HydratedDocument<Vendor>;

@Schema({ timestamps: true, collection: 'vendors' })
export class Vendor {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, enum: ['Panel', 'Inverter', 'BOS', 'Structure', 'Cable', 'Other'] })
  category!: string;

  @Prop({ required: true })
  contact!: string;

  @Prop({ required: true })
  phone!: string;

  @Prop({ required: true })
  email!: string;

  @Prop({ required: true })
  city!: string;

  @Prop({ default: 0, min: 0, max: 5 })
  rating!: number;

  @Prop({ default: 0 })
  totalOrders!: number;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Tenant' })
  tenantId!: Types.ObjectId;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);
