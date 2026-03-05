import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VisitDocument = Visit & Document;

@Schema({ timestamps: true })
export class Visit {
  @Prop({ required: true, unique: true })
  visitId!: string;

  @Prop({ required: true })
  contractId!: string;

  @Prop({ required: true })
  customer!: string;

  @Prop({ required: true })
  site!: string;

  @Prop()
  systemSize?: number;

  @Prop({ required: true })
  visitType!: string;

  @Prop({ required: true })
  scheduledDate!: string;

  @Prop({ required: true })
  scheduledTime!: string;

  @Prop({ required: true })
  engineerId!: string;

  @Prop({ required: true })
  engineerName!: string;

  @Prop({ required: true, default: 'Low' })
  priority!: string;

  @Prop()
  notes?: string;

  @Prop({ required: true, default: 'Scheduled' })
  status!: string;

  @Prop({ type: Types.ObjectId, ref: 'Tenant' })
  tenantId?: Types.ObjectId;

  @Prop({ default: false })
  isDeleted?: boolean;
}

export const VisitSchema = SchemaFactory.createForClass(Visit);
