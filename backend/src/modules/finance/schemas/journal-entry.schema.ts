import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

export type JournalEntryDocument = JournalEntry & Document;

export type JournalEntryLine = {
  accountName: string;
  debitAmount: number;
  creditAmount: number;
};

@Schema({ ...BaseSchemaOptions, collection: 'financeJournalEntries' })
export class JournalEntry {
  @Prop(BaseSchemaDefinition.tenantId)
  tenantId!: Types.ObjectId;

  @Prop(BaseSchemaDefinition.isDeleted)
  isDeleted!: boolean;

  @Prop({ required: true, index: true })
  journalEntryId!: string;

  @Prop({ required: true, index: true })
  date!: Date;

  @Prop({ required: false })
  narration?: string;

  @Prop({ required: false })
  reference?: string;

  @Prop({ type: [{ accountName: String, debitAmount: Number, creditAmount: Number }], required: true })
  lines!: JournalEntryLine[];

  @Prop({ required: true })
  totalDebit!: number;

  @Prop({ required: true })
  totalCredit!: number;

  @Prop({ required: false, index: true })
  relatedAdjustmentId?: Types.ObjectId;

  @Prop({ required: false })
  createdBy?: Types.ObjectId;
}

export const JournalEntrySchema = SchemaFactory.createForClass(JournalEntry);

JournalEntrySchema.index({ tenantId: 1, date: -1 });
JournalEntrySchema.index({ tenantId: 1, journalEntryId: 1 });
