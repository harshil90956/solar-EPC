import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Document, Schema as MongooseSchema, Types } from 'mongoose';



export type AmcContractDocument = AmcContract & Document;



@Schema({ timestamps: true })

export class AmcContract {

  @Prop({ required: true, unique: true })

  contractId!: string;



  @Prop({ required: true })

  customer!: string;



  @Prop({ type: String, default: '—' })

  employee?: string;



  @Prop({ required: true })

  site!: string;



  @Prop({ type: Number, default: 0 })

  systemSize!: number;



  @Prop({ required: true })

  startDate!: string;



  @Prop({ required: true })

  endDate!: string;



  @Prop({ required: true, default: 'Active' })

  status!: string;



  @Prop({ required: true })

  nextVisit!: string;



  @Prop({ type: Number, default: 0 })

  amount!: number;



  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })

  tenantId?: Types.ObjectId;



  @Prop({ type: Boolean, default: false })

  isDeleted!: boolean;

}



export const AmcContractSchema = SchemaFactory.createForClass(AmcContract);



AmcContractSchema.index({ contractId: 1 });

AmcContractSchema.index({ status: 1 });

AmcContractSchema.index({ customer: 1 });

