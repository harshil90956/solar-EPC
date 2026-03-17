import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseSchemaDefinition } from '../../../shared/database/base.schema';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, index: true })
  role!: string;

  @Prop({ default: false, index: true })
  isSuperAdmin!: boolean;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ type: String, default: 'ASSIGNED', enum: ['ALL', 'ASSIGNED'] })
  dataScope!: string;

  @Prop({ ...BaseSchemaDefinition.tenantId, required: false })
  tenantId?: Types.ObjectId;

  @Prop({ ...BaseSchemaDefinition.isDeleted })
  isDeleted!: boolean;

  // Profile fields
  @Prop({ type: String, required: false })
  firstName?: string;

  @Prop({ type: String, required: false })
  lastName?: string;

  @Prop({ type: String, required: false })
  profileImage?: string;

  @Prop({ type: String, required: false })
  phone?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1, tenantId: 1 }, { unique: true, sparse: true });
