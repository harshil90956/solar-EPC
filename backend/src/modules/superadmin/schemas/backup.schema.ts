import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SystemBackupDocument = SystemBackup & Document;

@Schema({ timestamps: true })
export class SystemBackup {
  @Prop({ type: String, enum: ['full', 'tenant', 'database', 'files'], required: true })
  type!: string;

  @Prop({ type: Types.ObjectId, ref: 'Tenant' })
  tenantId?: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' })
  status!: string;

  @Prop({ type: Number, default: 0 })
  size!: number;

  @Prop()
  duration?: string;

  @Prop()
  filePath?: string;

  @Prop({ type: Object })
  metadata?: {
    collections: string[];
    documentCount: number;
    fileCount: number;
  };

  @Prop()
  completedAt?: Date;

  @Prop()
  errorMessage?: string;

  @Prop({ type: String })
  createdBy!: string;
}

export const SystemBackupSchema = SchemaFactory.createForClass(SystemBackup);
