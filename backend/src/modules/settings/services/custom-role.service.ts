import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomRole, CustomRoleDocument } from '../schemas/custom-role.schema';

// Simple in-memory cache
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class CustomRoleService {
  private readonly logger = new Logger(CustomRoleService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 300000; // 5 minutes

  constructor(
    @InjectModel(CustomRole.name) private customRoleModel: Model<CustomRoleDocument>,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Cache Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private getCacheKey(tenantId: string | undefined, suffix: string): string {
    return `customrole:${tenantId || 'global'}:${suffix}`;
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

  private invalidateCache(tenantId: string | undefined, pattern?: string): void {
    const prefix = `customrole:${tenantId || 'global'}`;
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${prefix}:${pattern}`)) this.cache.delete(key);
      }
    } else {
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) this.cache.delete(key);
      }
    }
  }

  private toObjectId(tenantId: string | undefined): Types.ObjectId | undefined {
    if (!tenantId) return undefined;
    try { return new Types.ObjectId(tenantId); } catch { return undefined; }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core Methods
  // ─────────────────────────────────────────────────────────────────────────

  async getCustomRoles(tenantId: string | undefined): Promise<CustomRole[]> {
    const tid = this.toObjectId(tenantId);
    return this.customRoleModel.find(tid ? { tenantId: tid } : {}).exec();
  }

  async getCustomRole(tenantId: string | undefined, roleId: string): Promise<CustomRole | null> {
    const cacheKey = this.getCacheKey(tenantId, `role:${roleId}`);
    const cached = this.getFromCache<CustomRole>(cacheKey);
    if (cached) return cached;

    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, roleId } : { roleId };
    const role = await this.customRoleModel.findOne(filter).exec();
    
    if (role) this.setCache(cacheKey, role);
    return role;
  }

  async getPermission(
    tenantId: string | undefined,
    roleId: string,
    moduleId: string,
    actionId: string,
  ): Promise<boolean | undefined> {
    const role = await this.getCustomRole(tenantId, roleId);
    if (!role) return undefined;

    const modulePerms = role.permissions?.get(moduleId);
    if (!modulePerms) return undefined;

    return modulePerms.get(actionId);
  }

  async createCustomRole(
    tenantId: string | undefined,
    data: Partial<CustomRole>,
    userId?: string,
  ): Promise<CustomRole> {
    // Check for circular inheritance
    if (data.baseRole && data.baseRole.startsWith('custom_')) {
      throw new BadRequestException('Custom roles cannot inherit from other custom roles');
    }

    const tid = this.toObjectId(tenantId);
    const roleId = `custom_${Date.now()}`;
    
    const newRole = new this.customRoleModel({
      ...data,
      roleId,
      tenantId: tid,
      isCustom: true,
      permissions: new Map(),
    });

    const saved = await newRole.save();
    this.invalidateCache(tenantId, 'all');
    return saved;
  }

  async updateCustomRole(
    tenantId: string | undefined,
    roleId: string,
    updates: Partial<CustomRole>,
    userId?: string,
  ): Promise<CustomRole | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, roleId } : { roleId };

    // Prevent changing isCustom flag
    delete (updates as any).isCustom;

    const doc = await this.customRoleModel.findOneAndUpdate(
      filter,
      { $set: updates },
      { new: true },
    ).exec();

    if (doc) {
      this.invalidateCache(tenantId, `role:${roleId}`);
      this.invalidateCache(tenantId, 'all');
    }

    return doc;
  }

  async updatePermissions(
    tenantId: string | undefined,
    roleId: string,
    moduleId: string,
    permissions: Record<string, boolean>,
    userId?: string,
  ): Promise<CustomRole | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, roleId } : { roleId };

    const role = await this.customRoleModel.findOne(filter).exec();
    if (!role) throw new NotFoundException(`Custom role ${roleId} not found`);

    // Update permissions for the module
    const currentPerms = role.permissions || new Map();
    const modulePerms = currentPerms.get(moduleId) || new Map<string, boolean>();
    
    for (const [action, enabled] of Object.entries(permissions)) {
      modulePerms.set(action, enabled);
    }
    
    currentPerms.set(moduleId, modulePerms);
    role.permissions = currentPerms;
    
    const saved = await role.save();
    
    this.invalidateCache(tenantId, `role:${roleId}`);
    this.invalidateCache(tenantId, `perm:${roleId}:${moduleId}:*`);
    return saved;
  }

  async deleteCustomRole(
    tenantId: string | undefined,
    roleId: string,
    userId?: string,
  ): Promise<CustomRole | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, roleId } : { roleId };

    const doc = await this.customRoleModel.findOneAndDelete(filter).exec();
    
    if (doc) {
      this.invalidateCache(tenantId, `role:${roleId}`);
      this.invalidateCache(tenantId, 'all');
    }

    return doc;
  }

  async cloneRole(
    tenantId: string | undefined,
    sourceRoleId: string,
    newLabel: string,
    userId?: string,
  ): Promise<CustomRole> {
    const source = await this.getCustomRole(tenantId, sourceRoleId);
    if (!source) throw new NotFoundException(`Source role ${sourceRoleId} not found`);

    const cloned = await this.createCustomRole(tenantId, {
      label: newLabel,
      description: `Cloned from ${source.label}`,
      baseRole: source.baseRole,
      color: source.color,
      bg: source.bg,
      permissions: new Map(source.permissions),
    }, userId);

    return cloned;
  }
}
