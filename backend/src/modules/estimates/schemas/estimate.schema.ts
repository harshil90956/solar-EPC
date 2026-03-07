import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type EstimateDocument = Estimate & Document;

export enum EstimateStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export enum ProjectType {
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
}

export enum InstallationType {
  ROOFTOP = 'rooftop',
  GROUND_MOUNTED = 'ground_mounted',
}

@Schema({ timestamps: true })
export class EstimateItem {
  @Prop({ required: true })
  name!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ type: String, default: '' })
  category!: string;

  @Prop({ type: String, default: '' })
  brand!: string;

  @Prop({ type: String, default: '' })
  model!: string;

  @Prop({ type: Number, required: true })
  quantity!: number;

  @Prop({ type: Number, required: true })
  unitPrice!: number;

  @Prop({ type: Number, required: true })
  total!: number;
}

const EstimateItemSchema = SchemaFactory.createForClass(EstimateItem);

@Schema({ timestamps: true })
export class Estimate {
  @Prop({ required: true, unique: true })
  estimateNumber!: string;

  @Prop({ required: true })
  customerName!: string;

  @Prop({ default: '' })
  companyName!: string;

  @Prop({ default: '' })
  customerEmail!: string;

  @Prop({ default: '' })
  customerPhone!: string;

  @Prop({ default: '' })
  customerAddress!: string;

  @Prop({ default: '' })
  projectLocation!: string;

  @Prop({ required: true })
  projectName!: string;

  @Prop({ type: Number, required: true })
  systemCapacity!: number;

  @Prop({ enum: ProjectType, default: ProjectType.RESIDENTIAL })
  projectType!: ProjectType;

  @Prop({ enum: InstallationType, default: InstallationType.ROOFTOP })
  installationType!: InstallationType;

  @Prop({ default: '' })
  projectDescription!: string;

  @Prop({ type: [EstimateItemSchema], default: [] })
  items!: EstimateItem[];

  @Prop({ type: Number, default: 0 })
  equipmentCost!: number;

  @Prop({ type: Number, default: 0 })
  installationCost!: number;

  @Prop({ type: Number, default: 0 })
  engineeringCost!: number;

  @Prop({ type: Number, default: 0 })
  transportationCost!: number;

  @Prop({ type: Number, default: 0 })
  miscellaneousCost!: number;

  @Prop({ type: Number, default: 0 })
  subtotal!: number;

  @Prop({ type: Number, default: 18 })
  gstRate!: number;

  @Prop({ type: Number, default: 0 })
  gstAmount!: number;

  @Prop({ type: Number, default: 0 })
  total!: number;

  @Prop({ enum: EstimateStatus, default: EstimateStatus.DRAFT })
  status!: EstimateStatus;

  @Prop({ type: Date, default: null })
  sentAt?: Date | null;

  @Prop({ type: Date, default: null })
  acceptedAt?: Date | null;

  @Prop({ default: '' })
  notes!: string;

  @Prop({ default: '' })
  terms!: string;

  @Prop({ default: '' })
  createdBy!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted!: boolean;

  @Prop({ type: Number, default: 1 })
  version!: number;
}

export const EstimateSchema = SchemaFactory.createForClass(Estimate);

EstimateSchema.index({ estimateNumber: 1, tenantId: 1 }, { unique: true, sparse: true });
EstimateSchema.index({ status: 1 });
EstimateSchema.index({ customerName: 1 });
EstimateSchema.index({ projectName: 1 });
EstimateSchema.index({ createdAt: -1 });
