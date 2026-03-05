import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type DepartmentDocument = Department & Document;

@Schema({ timestamps: true })
export class Department {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ default: '' })
  code!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ default: 0 })
  employeeCount!: number;

  @Prop({ default: '' })
  managerId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true })
  tenantId?: Types.ObjectId;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);

DepartmentSchema.index({ name: 1, tenantId: 1 }, { unique: true, sparse: true });
DepartmentSchema.index({ code: 1 });
