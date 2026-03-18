import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'dashboard_cache' })
export class DashboardCache {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ required: true })
  cacheKey!: string;

  @Prop({ type: Object, required: true })
  data!: any;

  @Prop({ type: Date, required: true, index: true })
  expiresAt!: Date;
}

export const DashboardCacheSchema = SchemaFactory.createForClass(DashboardCache);
DashboardCacheSchema.index({ tenantId: 1, cacheKey: 1 });
DashboardCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
