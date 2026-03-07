import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SurveyDocument = Survey & Document;

@Schema({ timestamps: true })
export class Survey {
  @Prop({ required: true, unique: true })
  surveyId!: string;

  @Prop({ required: true })
  customerName!: string;

  @Prop({ default: '' })
  site!: string;

  @Prop({ required: true })
  engineer!: string;

  @Prop({ required: true })
  scheduledDate!: string;

  @Prop({ type: Number, default: 0 })
  estimatedKw!: number;

  @Prop({ default: 'Scheduled' })
  status!: string;

  @Prop({ type: Number, default: 0 })
  shadowPct!: number;

  @Prop({ type: Number, default: 0 })
  roofArea!: number;

  @Prop({ default: '' })
  sourceLeadId!: string;

  @Prop({ default: '' })
  notes!: string;

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt!: Date;
}

export const SurveySchema = SchemaFactory.createForClass(Survey);
