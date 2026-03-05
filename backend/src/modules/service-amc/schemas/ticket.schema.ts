import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type TicketDocument = Ticket & Document;

@Schema({ timestamps: true })
export class Ticket {
  @Prop({ required: true, unique: true })
  ticketId!: string;

  @Prop({ required: true })
  customerId!: string;

  @Prop({ required: true })
  customerName!: string;

  @Prop({ required: true })
  type!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true, default: 'Low' })
  priority!: string;

  @Prop({ required: true, default: 'Open' })
  status!: string;

  @Prop({ default: '' })
  assignedTo!: string;

  @Prop({ default: Date.now })
  created!: Date;

  @Prop({ type: Date, default: null })
  resolved!: Date | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

TicketSchema.index({ ticketId: 1 });
TicketSchema.index({ status: 1 });
TicketSchema.index({ priority: 1 });
TicketSchema.index({ customerId: 1 });
