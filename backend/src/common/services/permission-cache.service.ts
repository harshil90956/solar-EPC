import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RBACConfig, RBACConfigDocument } from '../../modules/settings/schemas/rbac-config.schema';
import { CustomRole, CustomRoleDocument } from '../../modules/settings/schemas/custom-role.schema';
import { UserOverride, UserOverrideDocument } from '../../modules/settings/schemas/user-override.schema';
import { FeatureFlag, FeatureFlagDocument } from '../../modules/settings/schemas/feature-flag.schema';
import { Employee, EmployeeDocument } from '../../modules/hrm/schemas/employee.schema';

/**
 * Permission Matrix Structure
 * Map<moduleId, Map<actionId, boolean>>
 * Provides O(1) permission lookups
 */
export type PermissionMatrix = Map<string, Map<string, boolean>>;

/**
 * Cached user permissions with metadata
 */


export interface CachedPermissions {
  userId: string;
  tenantId: string | undefined;
  baseRoleId: string;
  customRoleId: string | null;
  dataScope: 'ALL' | 'ASSIGNED';
  permissions: PermissionMatrix;
  generatedAt: Date;
  expiresAt: Date;
}

/**
 * Permission Cache Service
 * 
 * Provides O(1) permission checks by pre-computing and caching
 * the complete permission matrix for users at login time.
 * 
 * Features:
 * - In-memory cache with TTL
 * - Automatic cache invalidation on permission changes
 * - Lazy loading for users not in cache
 * - O(1) permission lookup via Map
 */
@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name);
  
  // Primary cache: userId -> tenantId -> CachedPermissions
  private readonly cache = new Map<string, Map<string, CachedPermissions>>();
  
  // Default TTL: 5 minutes
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000;
  
  // Standard actions to check
  private readonly STANDARD_ACTIONS = ['view', 'create', 'edit', 'delete', 'export', 'approve', 'assign'];

  constructor(
    @InjectModel(RBACConfig.name) private rbacConfigModel: Model<RBACConfigDocument>,
    @InjectModel(CustomRole.name) private customRoleModel: Model<CustomRoleDocument>,
    @InjectModel(UserOverride.name) private userOverrideModel: Model<UserOverrideDocument>,
    @InjectModel(FeatureFlag.name) private featureFlagModel: Model<FeatureFlagDocument>,
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
  ) {}

  /**
   * Get or generate permission matrix for a user
   * This is the primary method for O(1) permission checks
   */
  async getPermissionMatrix(
    tenantId: string | undefined,
    userId: string,
    baseRoleId: string,
  ): Promise<PermissionMatrix> {
    const cached = this.getFromCache(userId, tenantId);
    if (cached && cached.expiresAt > new Date()) {
      this.logger.debug(`Cache hit for user ${userId}`);
      return cached.permissions;
    }

    // Cache miss - generate matrix
    this.logger.debug(`Cache miss for user ${userId}, generating matrix`);
    const matrix = await this.generatePermissionMatrix(tenantId, userId, baseRoleId);
    
    // Store in cache
    await this.cachePermissions(tenantId, userId, baseRoleId, matrix);
    
    return matrix;
  }

  /**
   * Check permission in O(1) time
   * @returns boolean indicating if permission is granted
   */
  async checkPermission(
    tenantId: string | undefined,
    userId: string,
    baseRoleId: string,
    moduleId: string,
    actionId: string,
  ): Promise<boolean> {
    const matrix = await this.getPermissionMatrix(tenantId, userId, baseRoleId);
    
    // O(1) lookup via Map
    const modulePerms = matrix.get(moduleId);
    if (!modulePerms) {
      return false; // No permissions for this module
    }
    
    return modulePerms.get(actionId) ?? false;
  }

  /**
   * Get all permissions for a user in O(1) time
   * Returns a plain object for easy serialization
   */
  async getAllPermissions(
    tenantId: string | undefined,
    userId: string,
    baseRoleId: string,
  ): Promise<Record<string, Record<string, boolean>>> {
    const matrix = await this.getPermissionMatrix(tenantId, userId, baseRoleId);
    
    // Convert Map to plain object
    const result: Record<string, Record<string, boolean>> = {};
    for (const [moduleId, actions] of matrix.entries()) {
      result[moduleId] = {};
      for (const [actionId, permitted] of actions.entries()) {
        result[moduleId][actionId] = permitted;
      }
    }
    
    return result;
  }

  /**
   * Generate complete permission matrix for a user
   * This combines: Feature Flags -> User Overrides -> Custom Role -> Base RBAC
   * Admin roles get full permissions by default if no RBAC config exists
   */
  private async generatePermissionMatrix(
    tenantId: string | undefined,
    userId: string,
    baseRoleId: string,
  ): Promise<PermissionMatrix> {
    const matrix: PermissionMatrix = new Map();
    
    // Ensure we handle 'default' tenantId correctly
    const tid = tenantId === 'default' ? undefined : this.toObjectId(tenantId);
    
    // Strict mode: no implicit bypass based on role names.
    // All permissions must come from feature flags / overrides / custom role / base RBAC.
    
    // Get all feature flags to know available modules
    const featureFlags = await this.featureFlagModel.find(
      tid ? { tenantId: tid } : {}
    ).exec();

    // Get user overrides
    const userOverride = userId && Types.ObjectId.isValid(userId)
      ? await this.userOverrideModel.findOne({
          userId: new Types.ObjectId(userId),
          ...(tid ? { tenantId: tid } : {}),
        }).exec()
      : null;

    // Get custom role if assigned
    let customRoleId = userOverride?.customRoleId;

    // HRM employee fallback:
    // HRM assigns roles via employees.roleId (not useroverrides.customRoleId).
    // If no customRoleId is found via user override, treat employee.roleId as customRoleId.
    if (!customRoleId && userId && Types.ObjectId.isValid(userId)) {
      const employee = await this.employeeModel.findOne({
        _id: new Types.ObjectId(userId),
        ...(tid ? { tenantId: tid } : {}),
      }).select('roleId').lean();

      const empRoleId = (employee as any)?.roleId;
      if (typeof empRoleId === 'string' && empRoleId.toLowerCase().startsWith('custom_')) {
        customRoleId = empRoleId;
      }
    }
    let customRolePerms: Map<string, Map<string, boolean>> | null = null;
    
    if (customRoleId) {
      const customRole = await this.customRoleModel.findOne({
        roleId: customRoleId,
        ...(tid ? { tenantId: tid } : {}),
      }).exec();
      
      if (customRole && customRole.permissions) {
        customRolePerms = this.convertPermissionsToMap(customRole.permissions);
        this.logger.debug(`Loaded custom role permissions for ${customRoleId}: ${JSON.stringify(Array.from(customRolePerms.keys()))}`);
      } else {
        this.logger.warn(`Custom role ${customRoleId} not found or has no permissions`);
      }
    }

    // Get base RBAC configs
    const rbacConfigs = await this.rbacConfigModel.find({
      roleId: baseRoleId,
      ...(tid ? { tenantId: tid } : {}),
    }).exec();
    
    const baseRbacPerms = new Map<string, Map<string, boolean>>();
    for (const config of rbacConfigs) {
      baseRbacPerms.set(config.moduleId, this.convertMapToMap(config.permissions));
    }
    
    // Check if any RBAC config exists for this role
    // (No implicit allow if missing.)

    // Build final matrix using hierarchy
    for (const flag of featureFlags) {
      const moduleId = flag.moduleId;
      const modulePerms: Map<string, boolean> = new Map();
      
      // Check if module is enabled
      if (!flag.enabled) {
        // Module disabled - all actions denied
        for (const action of this.STANDARD_ACTIONS) {
          modulePerms.set(action, false);
        }
        matrix.set(moduleId, modulePerms);
        continue;
      }

      // Process each action
      for (const action of this.STANDARD_ACTIONS) {
        let permitted = false;
        
        // 1. Check feature flag action setting
        const actionEnabled = flag.actions?.get(action);
        if (actionEnabled === false) {
          permitted = false;
        } else {
          // 2. Check user override
          const overrideValue = userOverride?.overrides?.get(moduleId)?.get(action);
          if (overrideValue !== null && overrideValue !== undefined) {
            permitted = overrideValue;
          } else {
            // 3. Check custom role
            const customPerm = customRolePerms?.get(moduleId)?.get(action);
            if (customPerm !== undefined) {
              permitted = customPerm;
            } else {
              // CRM special case: fallback to 'leads'
              if (moduleId === 'crm' && customRolePerms?.get('leads')?.get(action) !== undefined) {
                permitted = customRolePerms.get('leads')!.get(action)!;
              } else {
                // 4. Check base RBAC
                const rbacPerm = baseRbacPerms.get(moduleId)?.get(action);
                if (rbacPerm !== undefined) {
                  permitted = rbacPerm;
                } else {
                  // Strict final fallback: deny
                  permitted = false;
                }
              }
            }
          }
        }
        
        modulePerms.set(action, permitted);
      }
      
      matrix.set(moduleId, modulePerms);
    }

    return matrix;
  }

  /**
   * Cache permissions for a user
   */
  async cachePermissions(
    tenantId: string | undefined,
    userId: string,
    baseRoleId: string,
    matrix: PermissionMatrix,
    customRoleId?: string | null,
    dataScope: 'ALL' | 'ASSIGNED' = 'ASSIGNED',
    ttlMs: number = this.DEFAULT_TTL_MS,
  ): Promise<void> {
    const tenantKey = tenantId || 'global';
    
    const cached: CachedPermissions = {
      userId,
      tenantId,
      baseRoleId,
      customRoleId: customRoleId || null,
      dataScope,
      permissions: matrix,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + ttlMs),
    };

    if (!this.cache.has(userId)) {
      this.cache.set(userId, new Map());
    }
    
    this.cache.get(userId)!.set(tenantKey, cached);
    this.logger.debug(`Cached permissions for user ${userId}, tenant ${tenantKey}`);
  }

  /**
   * Get cached permissions (internal)
   */
  private getFromCache(
    userId: string,
    tenantId: string | undefined,
  ): CachedPermissions | null {
    const tenantKey = tenantId || 'global';
    const userCache = this.cache.get(userId);
    
    if (!userCache) {
      return null;
    }
    
    const cached = userCache.get(tenantKey);
    if (!cached || cached.expiresAt <= new Date()) {
      return null;
    }
    
    return cached;
  }

  /**
   * Invalidate cache for a user
   */
  invalidateUserCache(userId: string, tenantId?: string): void {
    if (tenantId) {
      // Invalidate specific tenant
      const userCache = this.cache.get(userId);
      if (userCache) {
        userCache.delete(tenantId);
        this.logger.debug(`Invalidated cache for user ${userId}, tenant ${tenantId}`);
      }
    } else {
      // Invalidate all tenants for user
      this.cache.delete(userId);
      this.logger.debug(`Invalidated all cache for user ${userId}`);
    }
  }

  /**
   * Invalidate cache for a role (when role permissions change)
   */
  invalidateRoleCache(roleId: string, tenantId?: string): void {
    // Invalidate all users with this role
    for (const [userId, userCache] of this.cache.entries()) {
      for (const [cachedTenantId, cached] of userCache.entries()) {
        if (cached.baseRoleId === roleId || cached.customRoleId === roleId) {
          if (!tenantId || cached.tenantId === tenantId) {
            userCache.delete(cachedTenantId);
            this.logger.debug(`Invalidated cache for user ${userId} due to role ${roleId} change`);
          }
        }
      }
    }
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Permission cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalUsers: number;
    totalEntries: number;
    memoryEstimate: string;
  } {
    let totalEntries = 0;
    for (const userCache of this.cache.values()) {
      totalEntries += userCache.size;
    }
    
    // Rough estimate: ~500 bytes per entry
    const memoryEstimate = `${(totalEntries * 500 / 1024).toFixed(2)} KB`;
    
    return {
      totalUsers: this.cache.size,
      totalEntries,
      memoryEstimate,
    };
  }

  /**
   * Helper: Convert Mongoose Map to JS Map
   */
  private convertMapToMap(mongooseMap: Map<string, boolean> | any): Map<string, boolean> {
    if (mongooseMap instanceof Map) {
      return mongooseMap;
    }
    // Handle Mongoose's Map type
    const result = new Map<string, boolean>();
    if (mongooseMap && typeof mongooseMap === 'object') {
      for (const [key, value] of Object.entries(mongooseMap)) {
        if (typeof value === 'boolean') {
          result.set(key, value);
        }
      }
    }
    return result;
  }

  /**
   * Helper: Convert nested permissions to Map
   */
  private convertPermissionsToMap(
    permissions: Map<string, any> | any,
  ): Map<string, Map<string, boolean>> {
    const result = new Map<string, Map<string, boolean>>();
    
    if (!permissions) {
      return result;
    }

    // Handle Mongoose Map
    const entries = permissions instanceof Map 
      ? Array.from(permissions.entries())
      : Object.entries(permissions);

    for (const [moduleId, modulePerms] of entries) {
      result.set(moduleId, this.convertMapToMap(modulePerms));
    }
    
    return result;
  }

  /**
   * Helper: Convert string to ObjectId
   */
  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    if (Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    return undefined;
  }
}
