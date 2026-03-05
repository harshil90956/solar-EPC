import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type ReminderLogDocument = ReminderLog & Document;

export type ReminderType = 'Gentle' | 'Due Today' | 'Overdue';

@Schema({ ...BaseSchemaOptions, collection: 'reminder_logs' })
export class ReminderLog {
  @Prop(BaseSchemaDefinition.tenantId)
  tenantId!: Types.ObjectId;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Invoice', required: true, index: true })
  invoiceId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  invoiceNumber!: string;

  @Prop({ required: true })
  customerName!: string;

  @Prop({ required: true })
  customerEmail!: string;

  @Prop({ 
    required: true,
    enum: ['Gentle', 'Due Today', 'Overdue'],
  })
  reminderType!: ReminderType;

  @Prop({ required: true })
  messageBody!: string;

  @Prop({ required: true })
  balanceAtSend!: number;

  @Prop({ required: true })
  dueDate!: Date;

  @Prop({ required: true, default: Date.now })
  sentAt!: Date;

  @Prop({ required: false })
  emailSent?: boolean;

  @Prop({ required: false })
  emailError?: string;
}

export const ReminderLogSchema = SchemaFactory.createForClass(ReminderLog);

ReminderLogSchema.index({ tenantId: 1, invoiceId: 1 });
ReminderLogSchema.index({ tenantId: 1, sentAt: -1 });
