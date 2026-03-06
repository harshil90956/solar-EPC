import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserOverride, UserOverrideDocument } from '../schemas/user-override.schema';

// Simple in-memory cache
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class UserOverrideService {
  private readonly logger = new Logger(UserOverrideService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 300000; // 5 minutes

  constructor(
    @InjectModel(UserOverride.name) private userOverrideModel: Model<UserOverrideDocument>,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Cache Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private getCacheKey(tenantId: string | undefined, suffix: string): string {
    return `override:${tenantId || 'global'}:${suffix}`;
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
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  private invalidateCache(tenantId: string | undefined, userId?: string): void {
    const prefix = `override:${tenantId || 'global'}`;
    if (userId) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${prefix}:${userId}`)) this.cache.delete(key);
      }
    } else {
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) this.cache.delete(key);
      }
    }
  }

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    // Check if id is a valid 24-character hex string (MongoDB ObjectId format)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId) return undefined;
    try { return new Types.ObjectId(id); } catch { return undefined; }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core Methods
  // ─────────────────────────────────────────────────────────────────────────

  async getUserOverride(tenantId: string | undefined, userId: string): Promise<UserOverride | null> {
    const cacheKey = this.getCacheKey(tenantId, `user:${userId}`);
    const cached = this.getFromCache<UserOverride>(cacheKey);
    if (cached) return cached;

    const tid = this.toObjectId(tenantId);
    const uid = this.toObjectId(userId);
    const filter = tid ? { tenantId: tid, userId: uid } : { userId: uid };
    
    const override = await this.userOverrideModel.findOne(filter).exec();
    if (override) this.setCache(cacheKey, override);
    return override;
  }

  async getCustomRoleId(tenantId: string | undefined, userId: string): Promise<string | null> {
    const override = await this.getUserOverride(tenantId, userId);
    return override?.customRoleId ?? null;
  }

  async getOverride(
    tenantId: string | undefined,
    userId: string,
    moduleId: string,
    actionId: string,
  ): Promise<boolean | null> {
    const override = await this.getUserOverride(tenantId, userId);
    if (!override) return null;

    const moduleOverrides = override.overrides?.get(moduleId);
    if (!moduleOverrides) return null;

    return moduleOverrides.get(actionId) ?? null;
  }

  async getAllOverrides(tenantId: string | undefined, userId: string): Promise<Record<string, Record<string, boolean | null>>> {
    const override = await this.getUserOverride(tenantId, userId);
    if (!override) return {};

    const result: Record<string, Record<string, boolean | null>> = {};
    
    for (const [moduleId, moduleMap] of (override.overrides || new Map()).entries()) {
      result[moduleId] = {};
      for (const [actionId, value] of moduleMap.entries()) {
        result[moduleId][actionId] = value;
      }
    }

    return result;
  }

  async getAllUserOverrides(tenantId: string | undefined): Promise<UserOverride[]> {
    const tid = this.toObjectId(tenantId);
    return this.userOverrideModel.find(tid ? { tenantId: tid } : {}).exec();
  }

  async assignCustomRole(
    tenantId: string | undefined,
    userId: string,
    customRoleId: string | null,
    updatedBy?: string,
  ): Promise<UserOverride> {
    const tid = this.toObjectId(tenantId);
    const uid = this.toObjectId(userId);
    const filter = tid ? { tenantId: tid, userId: uid } : { userId: uid };

    const doc = await this.userOverrideModel.findOneAndUpdate(
      filter,
      { 
        $set: { 
          customRoleId,
          updatedBy: updatedBy ? this.toObjectId(updatedBy) : undefined,
        },
        $setOnInsert: { overrides: new Map() },
      },
      { upsert: true, new: true },
    ).exec();

    this.invalidateCache(tenantId, userId);
    this.logger.log(`Custom role assigned to user: ${userId} -> ${customRoleId} by ${updatedBy}`);
    return doc;
  }

  async setPermissionOverride(
    tenantId: string | undefined,
    userId: string,
    moduleId: string,
    actionId: string,
    value: boolean | null,
    updatedBy?: string,
  ): Promise<UserOverride> {
    const tid = this.toObjectId(tenantId);
    const uid = this.toObjectId(userId);
    const filter = tid ? { tenantId: tid, userId: uid } : { userId: uid };

    // First get or create the override document
    let override = await this.userOverrideModel.findOne(filter).exec();
    
    if (!override) {
      override = new this.userOverrideModel({
        tenantId: tid,
        userId: uid,
        customRoleId: null,
        overrides: new Map(),
        updatedBy: updatedBy ? this.toObjectId(updatedBy) : undefined,
      });
    }

    // Update the nested permission
    const currentOverrides = override.overrides || new Map();
    const moduleOverrides = currentOverrides.get(moduleId) || new Map<string, boolean | null>();
    
    moduleOverrides.set(actionId, value);
    currentOverrides.set(moduleId, moduleOverrides);
    override.overrides = currentOverrides;
    override.updatedBy = updatedBy ? this.toObjectId(updatedBy) : override.updatedBy;

    const saved = await override.save();
    
    this.invalidateCache(tenantId, userId);
    this.logger.log(`Permission override set: ${userId} -> ${moduleId}.${actionId}=${value} by ${updatedBy}`);
    return saved;
  }

  async clearUserOverrides(
    tenantId: string | undefined,
    userId: string,
    updatedBy?: string,
  ): Promise<void> {
    const tid = this.toObjectId(tenantId);
    const uid = this.toObjectId(userId);
    const filter = tid ? { tenantId: tid, userId: uid } : { userId: uid };

    await this.userOverrideModel.deleteOne(filter).exec();
    
    this.invalidateCache(tenantId, userId);
    this.logger.log(`User overrides cleared: ${userId} by ${updatedBy}`);
  }

  async clearSpecificOverride(
    tenantId: string | undefined,
    userId: string,
    moduleId: string,
    actionId: string,
    updatedBy?: string,
  ): Promise<void> {
    const tid = this.toObjectId(tenantId);
    const uid = this.toObjectId(userId);
    const filter = tid ? { tenantId: tid, userId: uid } : { userId: uid };

    const override = await this.userOverrideModel.findOne(filter).exec();
    if (!override) return;

    const moduleOverrides = override.overrides?.get(moduleId);
    if (moduleOverrides) {
      moduleOverrides.delete(actionId);
      if (moduleOverrides.size === 0) {
        override.overrides?.delete(moduleId);
      }
    }

    // If no overrides left and no custom role, delete the document
    const hasOverrides = override.overrides && override.overrides.size > 0;
    const hasCustomRole = override.customRoleId !== null;
    
    if (!hasOverrides && !hasCustomRole) {
      await this.userOverrideModel.deleteOne(filter).exec();
    } else {
      override.updatedBy = updatedBy ? this.toObjectId(updatedBy) : override.updatedBy;
      await override.save();
    }

    this.invalidateCache(tenantId, userId);
    this.logger.log(`Specific override cleared: ${userId} -> ${moduleId}.${actionId} by ${updatedBy}`);
  }

  async getOverrideCount(tenantId: string | undefined, userId: string): Promise<number> {
    const override = await this.getUserOverride(tenantId, userId);
    if (!override || !override.overrides) return 0;

    let count = 0;
    for (const moduleMap of override.overrides.values()) {
      for (const value of moduleMap.values()) {
        if (value !== null && value !== undefined) count++;
      }
    }
    return count;
  }
}
