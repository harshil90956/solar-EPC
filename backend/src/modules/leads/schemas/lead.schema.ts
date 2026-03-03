import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type LeadDocument = Lead & Document;

@Schema({ timestamps: true })
export class Activity {
  @Prop({ required: true })
  type!: string;

  @Prop({ required: true })
  ts!: string;

  @Prop({ required: true })
  note!: string;

  @Prop({ required: true })
  by!: string;
}

const ActivitySchema = SchemaFactory.createForClass(Activity);

@Schema({ timestamps: true })
export class Lead {
  @Prop({ required: true, unique: true })
  leadId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ default: '' })
  company!: string;

  @Prop({ required: true })
  phone!: string;

  @Prop({ required: true, lowercase: true })
  email!: string;

  @Prop({ required: true })
  source!: string;

  @Prop({ required: true, default: 'new' })
  stage!: string;

  @Prop({ type: Number, default: 0 })
  score!: number;

  @Prop({ default: '' })
  assignedTo!: string;

  @Prop({ default: '' })
  kw!: string;

  @Prop({ type: Number, default: 0 })
  value!: number;

  @Prop({ type: Number, default: 0 })
  age!: number;

  @Prop({ default: '' })
  city!: string;

  @Prop({ default: '' })
  state!: string;

  @Prop({ default: Date.now })
  created!: Date;

  @Prop({ default: Date.now })
  lastContact!: Date;

  @Prop({ type: Number, default: 0 })
  monthlyBill!: number;

  @Prop({ type: Number, default: 0 })
  roofArea!: number;

  @Prop({ default: '' })
  roofType!: string;

  @Prop({ type: Number, default: 0 })
  budget!: number;

  @Prop({ default: 'Commercial' })
  category!: string;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: Number, default: 0 })
  lat!: number;

  @Prop({ type: Number, default: 0 })
  lng!: number;

  @Prop({ type: [ActivitySchema], default: [] })
  activities!: Activity[];

  @Prop({ default: '' })
  nextFollowUp!: string;

  @Prop({ type: Number, default: 24 })
  slaHours!: number;

  @Prop({ type: Boolean, default: false })
  slaBreached!: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);

LeadSchema.index({ email: 1, tenantId: 1 }, { unique: true, sparse: true });
LeadSchema.index({ leadId: 1 });
LeadSchema.index({ stage: 1 });
LeadSchema.index({ source: 1 });
LeadSchema.index({ score: -1 });
