import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true, unique: true })
  logId!: string;

  @Prop({ required: true })
  ts!: string;

  @Prop({ required: true })
  user!: string;

  @Prop({ required: true })
  action!: string;

  @Prop({ required: true })
  target!: string;

  @Prop({ default: '' })
  from!: string;

  @Prop({ default: '' })
  to!: string;

  @Prop({ default: '127.0.0.1' })
  ip!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ logId: 1, tenantId: 1 }, { unique: true, sparse: true });
AuditLogSchema.index({ ts: -1 });
