import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaDefinition } from '../../../shared/database/base.schema';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true, collection: 'customers' })
export class Customer {
  @Prop({ ...BaseSchemaDefinition.tenantId })
  tenantId!: Types.ObjectId;

  @Prop({ ...BaseSchemaDefinition.isDeleted })
  isDeleted!: boolean;

  @Prop({ type: String, required: true })
  leadId!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: false, default: '' })
  email!: string;

  @Prop({ type: String, required: false, default: '' })
  phone!: string;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

CustomerSchema.index({ tenantId: 1, leadId: 1 }, { unique: true, sparse: true });
CustomerSchema.index({ tenantId: 1, createdAt: -1 });
CustomerSchema.index({ tenantId: 1, name: 'text', email: 'text', phone: 'text' });
