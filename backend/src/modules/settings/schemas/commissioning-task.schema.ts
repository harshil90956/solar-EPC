import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseSchemaDefinition, BaseSchemaOptions } from '../../../shared/database/base.schema';

@Schema(BaseSchemaOptions)
export class CommissioningTaskConfig extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Tenant' })
  tenantId?: Types.ObjectId;

  @Prop({
    type: [{
      name: { type: String, required: true },
      photoRequired: { type: Boolean, default: false },
    }],
    default: [],
  })
  tasks!: { name: string; photoRequired: boolean }[];
}

export const CommissioningTaskConfigSchema = SchemaFactory.createForClass(CommissioningTaskConfig);

export type CommissioningTaskConfigDocument = CommissioningTaskConfig & Document;
