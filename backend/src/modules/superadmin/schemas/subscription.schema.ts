import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, enum: ['free', 'basic', 'professional', 'enterprise'], required: true })
  plan!: string;

  @Prop({ type: String, enum: ['monthly', 'yearly'], default: 'monthly' })
  billingCycle!: string;

  @Prop({ type: Date, required: true })
  startDate!: Date;

  @Prop({ type: Date, required: true })
  endDate!: Date;

  @Prop({ type: String, enum: ['active', 'cancelled', 'expired', 'pending'], default: 'pending' })
  status!: string;

  @Prop({ type: Number, default: 0 })
  price!: number;

  @Prop({ type: String })
  currency!: string;

  @Prop({ type: Object })
  features!: {
    maxUsers: number;
    maxProjects: number;
    maxLeads: number;
    storageGB: number;
    apiAccess: boolean;
    customDomain: boolean;
    prioritySupport: boolean;
    whiteLabel: boolean;
  };

  @Prop({ type: String })
  stripeSubscriptionId?: string;

  @Prop({ type: String })
  stripeCustomerId?: string;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ type: String })
  cancellationReason?: string;

  @Prop({ type: Boolean, default: false })
  autoRenew!: boolean;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
