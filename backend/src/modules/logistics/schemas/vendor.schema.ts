import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VendorDocument = HydratedDocument<Vendor>;

@Schema({ timestamps: true })
export class Vendor {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
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
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);
