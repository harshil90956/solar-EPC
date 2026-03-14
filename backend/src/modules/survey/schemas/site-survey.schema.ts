import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseSchemaDefinition } from '../../../shared/database/base.schema';

export type SurveyDocument = Survey & Document;

export enum SurveyStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETE = 'complete'
}

@Schema({ timestamps: true })
export class Survey {

  @Prop({ required: false })
  surveyId!: string;

  // Lead Reference
  @Prop({ required: false })
  leadId?: string;

  // Client Information
  @Prop({ required: false })
  clientName?: string;

  @Prop({ required: false })
  city?: string;

  // Project Details
  @Prop({ required: false })
  projectCapacity?: string;

  // Roof & Structure Information
  @Prop({ required: false })
  roofType?: string;

  @Prop({ required: false })
  structureType?: string;

  @Prop({ required: false })
  structureHeight?: string;

  @Prop({ required: false })
  moduleType?: string;

  @Prop({ required: false })
  solarConsultant?: string;

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

  // Tenant ID for multi-tenancy
  @Prop({ ...BaseSchemaDefinition.tenantId })
  tenantId!: Types.ObjectId;

  // Assignment & Ownership fields
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  createdBy?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  assignedTo?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  assignedBy?: Types.ObjectId;

  // Timestamps
  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const SurveySchema = SchemaFactory.createForClass(Survey);

// Add indexes for common queries
SurveySchema.index({ status: 1 });
SurveySchema.index({ leadId: 1 });
SurveySchema.index({ tenantId: 1 });
SurveySchema.index({ tenantId: 1, status: 1 });
SurveySchema.index({ tenantId: 1, createdBy: 1 }); // For creator-based visibility
SurveySchema.index({ tenantId: 1, assignedTo: 1 }); // For assignment-based visibility
SurveySchema.index({ tenantId: 1, assignedBy: 1 }); // For tracking who assigned
SurveySchema.index({ tenantId: 1, createdBy: 1, assignedTo: 1 }); // Compound for visibility queries
SurveySchema.index({ clientName: 'text', city: 'text' });
SurveySchema.index({ createdAt: -1 });
