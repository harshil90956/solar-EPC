import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type QuotationDocument = Quotation & Document;

@Schema({ _id: false })
class MaterialItem {
  @Prop({ required: true })
  itemId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  unit?: string;

  @Prop()
  category?: string;

  @Prop({ required: true })
  quantity!: number;

  @Prop({ required: true })
  unitPrice!: number;

  @Prop({ required: true })
  totalPrice!: number;
}

@Schema({ timestamps: true })
export class Quotation {
  @Prop({ required: true, unique: true })
  quotationId!: string;

  @Prop({ required: true })
  tenantId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Customer', required: true })
  customerId!: string;

  @Prop()
  leadId?: string;

  @Prop()
  surveyId?: string;

  @Prop({ required: true })
  customerName!: string;

  @Prop()
  customerPhone!: string;

  @Prop()
  customerEmail!: string;

  @Prop()
  customerAddress!: string;

  // System Configuration
  @Prop({ type: Object })
  systemConfig!: {
    systemSize: number; // kW
    panelCount: number;
    inverterType: string;
    batteryOption: string;
    mountingStructure: string;
  };

  @Prop({ type: [MaterialItem], default: [] })
  materials!: MaterialItem[];

  // Pricing Breakdown
  @Prop({ required: true })
  materialTotal!: number;

  @Prop({ default: 0 })
  installationCost!: number;

  @Prop({ default: 0 })
  transportCost!: number;

  @Prop({ default: 0 })
  gstPercentage!: number;

  @Prop({ default: 0 })
  paymentTerms!: number; // Payment terms percentage (e.g., 50 for 50% advance)

  @Prop({ default: 0 })
  visitInMonth!: number; // Number of visits per month

  @Prop({ default: 0 })
  totalVisit!: number; // Total number of visits

  @Prop({ default: 0 })
  tax!: number;

  @Prop({ required: true })
  finalQuotationPrice!: number;

  @Prop({
    required: true,
    enum: ['Draft', 'Sent', 'Viewed', 'Approved', 'Rejected', 'Expired', 'ConvertedToProject'],
    default: 'Draft',
  })
  status!: string;

  @Prop()
  notes?: string;

  @Prop()
  validUntil?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy!: string;
}

export const QuotationSchema = SchemaFactory.createForClass(Quotation);
