import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RBACConfig, RBACConfigDocument } from '../schemas/rbac-config.schema';

// Simple in-memory cache implementation for Phase 1
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class RBACService {
  private readonly logger = new Logger(RBACService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 300000; // 5 minutes in milliseconds

  constructor(
    @InjectModel(RBACConfig.name) private rbacConfigModel: Model<RBACConfigDocument>,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Cache Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private getCacheKey(tenantId: string | undefined, suffix: string): string {
    return `rbac:${tenantId || 'global'}:${suffix}`;
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
    const prefix = `rbac:${tenantId || 'global'}`;
    
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${prefix}:${pattern}`)) {
          this.cache.delete(key);
        }
      }
    } else {
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
  // Core RBAC Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get permission for a specific role, module, and action
   * Checks cache first, then database
   */
  async getPermission(
    tenantId: string | undefined,
    roleId: string,
    moduleId: string,
    actionId: string,
  ): Promise<boolean> {
    const cacheKey = this.getCacheKey(tenantId, `perm:${roleId}:${moduleId}:${actionId}`);
    
    const cached = this.getFromCache<boolean>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const tid = this.toObjectId(tenantId);
    const filter = tid 
      ? { tenantId: tid, roleId, moduleId } 
      : { roleId, moduleId };
    
    const config = await this.rbacConfigModel.findOne(filter).exec();
    const permitted = config?.permissions?.get(actionId) ?? false; // Default to false for RBAC

    this.setCache(cacheKey, permitted);
    return permitted;
  }

  /**
   * Get all permissions for a role across all modules
   */
  async getRolePermissions(
    tenantId: string | undefined,
    roleId: string,
  ): Promise<Record<string, Record<string, boolean>>> {
    const cacheKey = this.getCacheKey(tenantId, `role:${roleId}`);
    
    const cached = this.getFromCache<Record<string, Record<string, boolean>>>(cacheKey);
    if (cached) {
      return cached;
    }

    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, roleId } : { roleId };
    
    const configs = await this.rbacConfigModel.find(filter).exec();
    const result: Record<string, Record<string, boolean>> = {};

    for (const config of configs) {
      result[config.moduleId] = this.mapToObject(config.permissions);
    }

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Get full RBAC matrix for all roles
   */
  async getFullRBAC(tenantId: string | undefined): Promise<Record<string, Record<string, Record<string, boolean>>>> {
    const cacheKey = this.getCacheKey(tenantId, 'full');
    
    const cached = this.getFromCache<Record<string, Record<string, Record<string, boolean>>>>(cacheKey);
    if (cached) {
      return cached;
    }

    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid } : {};
    
    const configs = await this.rbacConfigModel.find(filter).exec();
    const result: Record<string, Record<string, Record<string, boolean>>> = {};

    for (const config of configs) {
      if (!result[config.roleId]) {
        result[config.roleId] = {};
      }
      result[config.roleId][config.moduleId] = this.mapToObject(config.permissions);
    }

    this.setCache(cacheKey, result);
    return result;
  }

  private mapToObject(map: Map<string, boolean> | undefined): Record<string, boolean> {
    if (!map) return {};
    return Object.fromEntries(map.entries());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────────────────────────────────

  async getRBACConfigs(tenantId: string | undefined): Promise<RBACConfig[]> {
    const tid = this.toObjectId(tenantId);
    return this.rbacConfigModel.find(tid ? { tenantId: tid } : {}).exec();
  }

  async getRBACConfig(
    tenantId: string | undefined,
    roleId: string,
    moduleId: string,
  ): Promise<RBACConfig | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid 
      ? { tenantId: tid, roleId, moduleId } 
      : { roleId, moduleId };
    return this.rbacConfigModel.findOne(filter).exec();
  }

  async updatePermission(
    tenantId: string | undefined,
    roleId: string,
    moduleId: string,
    actionId: string,
    enabled: boolean,
    userId?: string,
  ): Promise<RBACConfig> {
    const tid = this.toObjectId(tenantId);
    const filter = tid 
      ? { tenantId: tid, roleId, moduleId } 
      : { roleId, moduleId };

    const update = {
      $set: {
        [`permissions.${actionId}`]: enabled,
      },
    };

    const doc = await this.rbacConfigModel.findOneAndUpdate(
      filter,
      update,
      { upsert: true, new: true },
    ).exec();

    // Invalidate caches
    this.invalidateCache(tenantId, `perm:${roleId}:${moduleId}:${actionId}`);
    this.invalidateCache(tenantId, `role:${roleId}`);
    this.invalidateCache(tenantId, 'full');

    this.logger.log(`RBAC updated: role=${roleId}, module=${moduleId}, action=${actionId}, enabled=${enabled}`);

    return doc;
  }

  async updatePermissions(
    tenantId: string | undefined,
    roleId: string,
    moduleId: string,
    permissions: Record<string, boolean>,
  ): Promise<RBACConfig> {
    const tid = this.toObjectId(tenantId);
    const filter = tid 
      ? { tenantId: tid, roleId, moduleId } 
      : { roleId, moduleId };

    const permissionsMap = new Map(Object.entries(permissions));

    const doc = await this.rbacConfigModel.findOneAndUpdate(
      filter,
      { $set: { permissions: permissionsMap } },
      { upsert: true, new: true },
    ).exec();

    // Invalidate all related caches
    this.invalidateCache(tenantId, `perm:${roleId}:${moduleId}:*`);
    this.invalidateCache(tenantId, `role:${roleId}`);
    this.invalidateCache(tenantId, 'full');

    this.logger.log(`RBAC bulk updated: role=${roleId}, module=${moduleId}, permissions=${Object.keys(permissions).join(',')}`);

    return doc;
  }

  async deleteRBACConfig(
    tenantId: string | undefined,
    roleId: string,
    moduleId: string,
  ): Promise<RBACConfig | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid 
      ? { tenantId: tid, roleId, moduleId } 
      : { roleId, moduleId };

    const doc = await this.rbacConfigModel.findOneAndDelete(filter).exec();

    // Invalidate caches
    this.invalidateCache(tenantId, `perm:${roleId}:${moduleId}:*`);
    this.invalidateCache(tenantId, `role:${roleId}`);
    this.invalidateCache(tenantId, 'full');

    return doc;
  }

  async applyPreset(
    tenantId: string | undefined,
    roleId: string,
    preset: 'full' | 'view_only' | 'none',
  ): Promise<void> {
    const tid = this.toObjectId(tenantId);
    const modules = ['dashboard', 'crm', 'projects', 'inventory', 'procurement', 'finance', 
                     'installation', 'commissioning', 'service', 'logistics', 'settings'];
    
    const presets: Record<string, Record<string, boolean>> = {
      full: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
        approve: true,
        assign: true,
      },
      view_only: {
        view: true,
        create: false,
        edit: false,
        delete: false,
        export: true,
        approve: false,
        assign: false,
      },
      none: {
        view: false,
        create: false,
        edit: false,
        delete: false,
        export: false,
        approve: false,
        assign: false,
      },
    };

    const permissions = presets[preset];

    // Update all modules with the preset
    for (const moduleId of modules) {
      const filter = tid 
        ? { tenantId: tid, roleId, moduleId } 
        : { roleId, moduleId };

      const permissionsMap = new Map(Object.entries(permissions));

      await this.rbacConfigModel.findOneAndUpdate(
        filter,
        { $set: { permissions: permissionsMap } },
        { upsert: true, new: true },
      ).exec();
    }

    // Invalidate all caches for this role
    this.invalidateCache(tenantId, `perm:${roleId}:*`);
    this.invalidateCache(tenantId, `role:${roleId}`);
    this.invalidateCache(tenantId, 'full');

    this.logger.log(`RBAC preset applied: role=${roleId}, preset=${preset}`);
  }
}
