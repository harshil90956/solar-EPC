import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FeatureFlag, FeatureFlagDocument } from '../schemas/feature-flag.schema';

// Simple in-memory cache implementation for Phase 1
// Can be replaced with Redis cache manager in later phases
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 300000; // 5 minutes in milliseconds

  constructor(
    @InjectModel(FeatureFlag.name) private featureFlagModel: Model<FeatureFlagDocument>,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Cache Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private getCacheKey(tenantId: string | undefined, suffix: string): string {
    return `${tenantId || 'global'}:${suffix}`;
  }

  private getFromCache<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  private setCache<T>(key: string, value: T, ttlMs: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  private invalidateCache(tenantId: string | undefined, pattern?: string): void {
    const prefix = tenantId || 'global';
    
    if (pattern) {
      // Invalidate specific pattern
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${prefix}:${pattern}`)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Invalidate all tenant cache
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    }
  }

  private toObjectId(tenantId: string | undefined): Types.ObjectId | undefined {
    if (!tenantId) return undefined;
    // Check if tenantId is a valid 24-character hex string (MongoDB ObjectId format)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(tenantId);
    if (!isValidObjectId) return undefined;
    try { return new Types.ObjectId(tenantId); } catch { return undefined; }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core Feature Flag Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if a module is enabled
   * Caches result for 5 minutes
   */
  async isModuleEnabled(tenantId: string | undefined, moduleId: string): Promise<boolean> {
    const cacheKey = this.getCacheKey(tenantId, `module:${moduleId}`);
    
    const cached = this.getFromCache<boolean>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, moduleId } : { moduleId };
    
    const flag = await this.featureFlagModel.findOne(filter).exec();
    const enabled = flag?.enabled ?? true; // Default to true if not found

    this.setCache(cacheKey, enabled);
    return enabled;
  }

  /**
   * Check if a specific feature is enabled within a module
   */
  async isFeatureEnabled(
    tenantId: string | undefined,
    moduleId: string,
    featureId: string,
  ): Promise<boolean> {
    // First check if module is enabled
    const moduleEnabled = await this.isModuleEnabled(tenantId, moduleId);
    if (!moduleEnabled) return false;

    const cacheKey = this.getCacheKey(tenantId, `feature:${moduleId}:${featureId}`);
    
    const cached = this.getFromCache<boolean>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, moduleId } : { moduleId };
    
    const flag = await this.featureFlagModel.findOne(filter).exec();
    const enabled = flag?.features?.get(featureId) ?? true; // Default to true

    this.setCache(cacheKey, enabled);
    return enabled;
  }

  /**
   * Check if a specific action is enabled within a module
   */
  async isActionEnabled(
    tenantId: string | undefined,
    moduleId: string,
    actionId: string,
  ): Promise<boolean> {
    // First check if module is enabled
    const moduleEnabled = await this.isModuleEnabled(tenantId, moduleId);
    if (!moduleEnabled) return false;

    const cacheKey = this.getCacheKey(tenantId, `action:${moduleId}:${actionId}`);
    
    const cached = this.getFromCache<boolean>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, moduleId } : { moduleId };
    
    const flag = await this.featureFlagModel.findOne(filter).exec();
    const enabled = flag?.actions?.get(actionId) ?? false; // Default to false for actions

    this.setCache(cacheKey, enabled);
    return enabled;
  }

  /**
   * Get all feature flags for a tenant
   */
  async getAllFlags(tenantId: string | undefined): Promise<Record<string, any>> {
    const cacheKey = this.getCacheKey(tenantId, 'all');
    
    const cached = this.getFromCache<Record<string, any>>(cacheKey);
    if (cached) {
      return cached;
    }

    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid } : {};
    
    const flags = await this.featureFlagModel.find(filter).exec();
    const result: Record<string, any> = {};

    for (const flag of flags) {
      result[flag.moduleId] = {
        enabled: flag.enabled,
        features: this.mapToObject(flag.features),
        actions: this.mapToObject(flag.actions),
      };
    }

    return result;
  }

  private mapToObject(map: Map<string, boolean> | undefined): Record<string, boolean> {
    if (!map) return {};
    return Object.fromEntries(map.entries());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────────────────────────────────

  async getFeatureFlags(tenantId: string | undefined): Promise<FeatureFlag[]> {
    const tid = this.toObjectId(tenantId);
    return this.featureFlagModel.find(tid ? { tenantId: tid } : {}).exec();
  }

  async getFeatureFlag(tenantId: string | undefined, moduleId: string): Promise<FeatureFlag | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, moduleId } : { moduleId };
    return this.featureFlagModel.findOne(filter).exec();
  }

  async toggle(
    tenantId: string | undefined,
    moduleId: string,
    type: 'module' | 'feature' | 'action',
    id: string | null,
    enabled: boolean,
    userId?: string,
  ): Promise<FeatureFlag> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, moduleId } : { moduleId };

    const update: any = {};
    
    if (type === 'module') {
      update.enabled = enabled;
    } else if (type === 'feature' && id) {
      update[`features.${id}`] = enabled;
    } else if (type === 'action' && id) {
      update[`actions.${id}`] = enabled;
    }

    const doc = await this.featureFlagModel.findOneAndUpdate(
      filter,
      { $set: update },
      { upsert: true, new: true },
    ).exec();

    // Invalidate relevant caches
    if (type === 'module') {
      this.invalidateCache(tenantId, `module:${moduleId}`);
      this.invalidateCache(tenantId, `feature:${moduleId}:*`);
      this.invalidateCache(tenantId, `action:${moduleId}:*`);
    } else if (type === 'feature' && id) {
      this.invalidateCache(tenantId, `feature:${moduleId}:${id}`);
    } else if (type === 'action' && id) {
      this.invalidateCache(tenantId, `action:${moduleId}:${id}`);
    }
    this.invalidateCache(tenantId, 'all');

    this.logger.log(`Feature flag toggled: ${type}=${id || moduleId}, enabled=${enabled}, tenant=${tenantId}`);

    return doc;
  }

  async updateFeatureFlag(
    tenantId: string | undefined,
    moduleId: string,
    update: Partial<FeatureFlag>,
  ): Promise<FeatureFlag> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, moduleId } : { moduleId };

    const doc = await this.featureFlagModel.findOneAndUpdate(
      filter,
      { $set: update },
      { upsert: true, new: true },
    ).exec();

    // Invalidate all caches for this module
    this.invalidateCache(tenantId, `module:${moduleId}`);
    this.invalidateCache(tenantId, `feature:${moduleId}:*`);
    this.invalidateCache(tenantId, `action:${moduleId}:*`);
    this.invalidateCache(tenantId, 'all');

    return doc;
  }

  async resetToDefaults(tenantId: string | undefined, moduleId?: string): Promise<void> {
    const tid = this.toObjectId(tenantId);
    
    if (moduleId) {
      // Delete specific module
      const filter = tid ? { tenantId: tid, moduleId } : { moduleId };
      await this.featureFlagModel.deleteOne(filter).exec();
      this.invalidateCache(tenantId, `module:${moduleId}`);
    } else {
      // Delete all flags for tenant
      const filter = tid ? { tenantId: tid } : {};
      await this.featureFlagModel.deleteMany(filter).exec();
      this.invalidateCache(tenantId);
    }

    this.invalidateCache(tenantId, 'all');
  }
}
