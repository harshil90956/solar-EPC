import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DispatchDocument = HydratedDocument<Dispatch>;

@Schema({ timestamps: true })
export class Dispatch {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true })
  projectId!: string;

  @Prop({ required: true })
  customer!: string;

  @Prop({ required: true })
  items!: string;

  @Prop({ required: true })
  from!: string;

  @Prop({ required: true })
  to!: string;

  @Prop({ required: true, enum: ['Scheduled', 'In Transit', 'Delivered', 'Cancelled'], default: 'Scheduled' })
  status!: string;

  @Prop({ required: true })
  dispatchDate!: string;

  @Prop({ default: 'TBD' })
  driver!: string;

  @Prop({ default: 'TBD' })
  vehicle!: string;

  @Prop({ required: true, default: 0 })
  cost!: number;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Date })
  deliveredDate?: Date;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;
}

export const DispatchSchema = SchemaFactory.createForClass(Dispatch);
