import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type QuotationHistoryDocument = QuotationHistory & Document;

@Schema({ timestamps: true })
export class QuotationHistory {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Quotation', required: true })
  quotationId!: string;

  @Prop({ required: true })
  tenantId!: string;

  @Prop({
    required: true,
    enum: ['created', 'edited', 'sent', 'viewed', 'approved', 'rejected', 'converted'],
  })
  action!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId!: string;

  @Prop()
  notes?: string;

  @Prop({ default: Date.now })
  timestamp!: Date;
}

export const QuotationHistorySchema = SchemaFactory.createForClass(QuotationHistory);
