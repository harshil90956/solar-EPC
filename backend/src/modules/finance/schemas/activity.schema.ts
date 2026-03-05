import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type ActivityDocument = Activity & Document;

export type ActivityAction = 
  | 'INVOICE_CREATED'
  | 'INVOICE_UPDATED'
  | 'STATUS_CHANGED'
  | 'PAYMENT_ADDED'
  | 'REMINDER_SENT';

export type ActivityModule = 'invoice' | 'payment' | 'expense' | 'transaction';

@Schema({ ...BaseSchemaOptions, collection: 'activities' })
export class Activity {
  @Prop(BaseSchemaDefinition.tenantId)
  tenantId!: Types.ObjectId;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;

  @Prop({ 
    required: true,
    enum: ['invoice', 'payment', 'expense', 'transaction'],
    index: true 
  })
  module!: ActivityModule;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  moduleId!: Types.ObjectId;

  @Prop({ 
    required: true,
    enum: ['INVOICE_CREATED', 'INVOICE_UPDATED', 'STATUS_CHANGED', 'PAYMENT_ADDED', 'REMINDER_SENT'],
  })
  action!: ActivityAction;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  performedBy!: Types.ObjectId;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;

  @Prop({ required: true, default: Date.now })
  createdAt!: Date;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

ActivitySchema.index({ tenantId: 1, module: 1, moduleId: 1, createdAt: -1 });
ActivitySchema.index({ tenantId: 1, createdAt: -1 });
