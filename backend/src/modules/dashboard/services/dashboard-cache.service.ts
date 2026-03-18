import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DashboardCache } from '../schemas/dashboard-cache.schema';

@Injectable()
export class DashboardCacheService {
  constructor(
    @InjectModel(DashboardCache.name) private cacheModel: Model<DashboardCache>,
  ) {}

  async getCachedData(tenantId: string, key: string): Promise<any | null> {
    const cache = await this.cacheModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      cacheKey: key,
      expiresAt: { $gt: new Date() },
    });
    return cache?.data || null;
  }

  async setCachedData(tenantId: string, key: string, data: any, ttlMinutes = 5): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

    await this.cacheModel.findOneAndUpdate(
      { tenantId: new Types.ObjectId(tenantId), cacheKey: key },
      { data, expiresAt },
      { upsert: true },
    );
  }

  async invalidateCache(tenantId: string, key?: string): Promise<void> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };
    if (key) query.cacheKey = key;
    await this.cacheModel.deleteMany(query);
  }
}
