import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SurveyDocument = Survey & Document;

export enum SurveyStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETE = 'complete'
}

@Schema({ timestamps: true })
export class Survey {
  @Prop({ required: true, unique: true })
  surveyId!: string;

  // Lead Reference
  @Prop({ required: true })
  leadId!: string;

  // Client Information
  @Prop({ required: true })
  clientName!: string;

  @Prop({ required: true })
  city!: string;

  // Project Details
  @Prop({ required: true })
  projectCapacity!: string;

  // Roof & Structure Information
  @Prop({ required: true })
  roofType!: string;

  @Prop({ required: true })
  structureType!: string;

  @Prop({ required: true })
  structureHeight!: string;

  @Prop({ required: true })
  moduleType!: string;

  @Prop({ required: true })
  solarConsultant!: string;

  @Prop({ type: Number, default: 1 })
  floors!: number;

  // Roof Measurements (stored as object with dimensions)
  @Prop({ type: Object, default: {} })
  roofMeasurements!: {
    length?: number;
    width?: number;
    area?: number;
    orientation?: string;
    tiltAngle?: number;
    notes?: string;
  };

  // Survey Images (array of URLs)
  @Prop({ type: [String], default: [] })
  surveyImages!: string[];

  // Roof Layout / Drawing
  @Prop({ type: String, default: '' })
  roofLayout!: string;

  // Site Drawing / Sketch
  @Prop({ type: String, default: '' })
  surveyDrawing!: string;

  // Notes
  @Prop({ type: String, default: '' })
  notes!: string;

  // Status: pending, active, complete
  @Prop({ type: String, enum: SurveyStatus, default: SurveyStatus.PENDING })
  status!: string;

  // Active Survey Fields (filled when moving to active)
  @Prop({ type: Object, default: null })
  activeData!: {
    siteImages?: string[];
    roofMeasurements?: string;
    electricalPoints?: string;
    shadowAnalysis?: string;
    structuralAssessment?: string;
    startedAt?: Date;
    startedBy?: string;
  } | null;

  // Complete Survey Fields (filled when moving to complete)
  @Prop({ type: Object, default: null })
  completeData!: {
    finalImages?: string[];
    finalRoofLayout?: string;
    panelPlacementDetails?: string;
    finalNotes?: string;
    engineerApproval?: boolean;
    engineerName?: string;
    completionDate?: Date;
    approvedAt?: Date;
  } | null;

  // Assigned Engineer
  @Prop({ type: String, default: '' })
  engineer!: string;

  // Scheduled Date
  @Prop({ type: String, default: '' })
  scheduledDate!: string;

  // Estimated kW
  @Prop({ type: Number, default: 0 })
  estimatedKw!: number;

  // Legacy fields for compatibility
  @Prop({ type: Number, default: 0 })
  shadowPct!: number;

  @Prop({ type: Number, default: 0 })
  roofArea!: number;

  @Prop({ type: String, default: '' })
  site!: string;

  @Prop({ type: String, default: '' })
  sourceLeadId!: string;

  // Timestamps
  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt!: Date;
}

export const SurveySchema = SchemaFactory.createForClass(Survey);

// Add indexes for common queries
SurveySchema.index({ status: 1 });
SurveySchema.index({ leadId: 1 });
SurveySchema.index({ clientName: 'text', city: 'text' });
SurveySchema.index({ createdAt: -1 });
