import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TenantDocument = Tenant & Document;

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ required: true, unique: true })
  slug!: string;

  @Prop({ required: true })
  companyName!: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  adminEmail!: string;

  @Prop({ required: true })
  adminName!: string;

  @Prop({ type: String, enum: ['active', 'suspended', 'expired', 'pending'], default: 'pending' })
  status!: string;

  @Prop({ type: String, enum: ['free', 'basic', 'professional', 'enterprise'], default: 'free' })
  plan!: string;

  @Prop({ type: Date })
  subscriptionStartDate?: Date;

  @Prop({ type: Date })
  subscriptionEndDate?: Date;

  @Prop({ type: Object })
  limits?: {
    maxUsers: number;
    maxProjects: number;
    maxLeads: number;
    storageGB: number;
  };

  @Prop({ type: Object })
  settings?: {
    timezone: string;
    currency: string;
    language: string;
    dateFormat: string;
  };

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  users?: Types.ObjectId[];

  @Prop({ type: Object })
  billingInfo?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    taxId?: string;
  };

  @Prop({ type: Object })
  stats?: {
    totalUsers: number;
    totalProjects: number;
    totalLeads: number;
    storageUsed: number;
    lastActiveAt: Date;
  };
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
