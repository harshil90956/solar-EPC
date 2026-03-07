import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, index: true })
  role!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tenant', index: true, required: false })
  tenantId?: Types.ObjectId;

  @Prop({ default: false, index: true })
  isSuperAdmin!: boolean;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ type: String, default: 'ASSIGNED', enum: ['ALL', 'ASSIGNED'] })
  dataScope!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1, tenantId: 1 }, { unique: true, sparse: true });
