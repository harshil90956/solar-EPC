import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RBACConfig, RBACConfigDocument } from '../../modules/settings/schemas/rbac-config.schema';
import { CustomRole, CustomRoleDocument } from '../../modules/settings/schemas/custom-role.schema';
import { UserOverride, UserOverrideDocument } from '../../modules/settings/schemas/user-override.schema';
import { FeatureFlag, FeatureFlagDocument } from '../../modules/settings/schemas/feature-flag.schema';
import { RoleModulePermission, RoleModulePermissionDocument } from '../../modules/hrm/schemas/role-module-permission.schema';
import { RedisService } from './redis.service';

type PermissionObject = Record<string, Record<string, boolean>>;
type DataScopeObject = Record<string, string>;

@Injectable()
export class PermissionEngineService {
  private readonly logger = new Logger(PermissionEngineService.name);
  private readonly ttlSeconds = 300;

  private readonly fixedSchema: Record<string, string[]> = {
    hrm: ['view'],
    employees: ['view', 'create', 'edit', 'delete'],
    attendance: ['view', 'checkin', 'checkout', 'edit'],
    leaves: ['view', 'apply', 'approve', 'reject'],
    payroll: ['view', 'generate', 'export'],
    increments: ['view', 'create', 'edit', 'delete'],
    departments: ['view', 'create', 'edit', 'delete'],
    crm: ['view', 'create', 'edit', 'delete', 'assign', 'convert'],
    inventory: ['view', 'create', 'edit', 'delete'],
    procurement: ['view', 'create', 'approve'],
    projects: ['view', 'create', 'edit', 'delete'],
    installation: ['view', 'assign', 'update'],
    finance: ['view', 'create', 'approve', 'export'],
  };

  constructor(
    private readonly redisService: RedisService,
    @InjectModel(RBACConfig.name) private readonly rbacConfigModel: Model<RBACConfigDocument>,
    @InjectModel(CustomRole.name) private readonly customRoleModel: Model<CustomRoleDocument>,
    @InjectModel(UserOverride.name) private readonly userOverrideModel: Model<UserOverrideDocument>,
    @InjectModel(FeatureFlag.name) private readonly featureFlagModel: Model<FeatureFlagDocument>,
    @InjectModel(RoleModulePermission.name) private readonly roleModulePermissionModel: Model<RoleModulePermissionDocument>,
  ) {}

  private permissionKey(tenantId: string, userId: string): string {
    return `permission:${tenantId}:${userId}`;
  }

  private dataScopeKey(tenantId: string, userId: string): string {
    return `datascope:${tenantId}:${userId}`;
  }

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    if (!Types.ObjectId.isValid(id)) return undefined;
    return new Types.ObjectId(id);
  }

  private getAllowedActions(moduleId: string): string[] {
    return this.fixedSchema[moduleId] || ['view'];
  }

  private ensureModuleShape(perms: PermissionObject, moduleId: string): void {
    if (perms[moduleId]) return;
    const actions = this.getAllowedActions(moduleId);
    perms[moduleId] = Object.fromEntries(actions.map(a => [a, false]));
  }

  private setPermission(perms: PermissionObject, moduleId: string, actionId: string, value: boolean): void {
    const allowed = this.getAllowedActions(moduleId);
    if (!allowed.includes(actionId)) {
      return;
    }
    this.ensureModuleShape(perms, moduleId);
    perms[moduleId][actionId] = value === true;
  }

  private async getAllKnownModules(tenantId: string | undefined): Promise<string[]> {
    const tid = this.toObjectId(tenantId);
    const flags = await this.featureFlagModel
      .find(tid ? { tenantId: tid } : {})
      .select('moduleId')
      .lean();

    const fromFlags = (flags || [])
      .map((f: any) => String(f.moduleId || '').trim())
      .filter(Boolean);

    const fromSchema = Object.keys(this.fixedSchema);
    const out = new Set<string>([...fromSchema, ...fromFlags]);
    return Array.from(out);
  }

  private normalizeRbacPermissions(raw: any): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    if (!raw || typeof raw !== 'object') return out;

    if (typeof raw.entries === 'function') {
      for (const [k, v] of raw.entries()) {
        out[String(k)] = v === true;
      }
      return out;
    }

    for (const [k, v] of Object.entries(raw)) {
      out[String(k)] = v === true;
    }
    return out;
  }

  private normalizeNestedPermissions(raw: any): Record<string, Record<string, boolean>> {
    const out: Record<string, Record<string, boolean>> = {};
    if (!raw || typeof raw !== 'object') return out;

    const entries: Array<[any, any]> = typeof raw.entries === 'function'
      ? (Array.from((raw as any).entries()) as Array<[any, any]>)
      : (Object.entries(raw) as Array<[any, any]>);
    for (const [moduleIdRaw, modulePermsRaw] of entries) {
      const moduleId = String(moduleIdRaw);
      out[moduleId] = this.normalizeRbacPermissions(modulePermsRaw);
    }
    return out;
  }

  async getPermissions(userId: string, tenantId: string, roleId: string): Promise<{ permissions: PermissionObject; dataScope: DataScopeObject }> {
    const cached = await this.redisService.get(this.permissionKey(tenantId, userId));
    const cachedScope = await this.redisService.get(this.dataScopeKey(tenantId, userId));

    if (cached && cachedScope) {
      try {
        return {
          permissions: JSON.parse(cached),
          dataScope: JSON.parse(cachedScope),
        };
      } catch {
      }
    }

    const result = await this.buildAndCachePermissions(userId, tenantId, roleId);
    return result;
  }

  async buildAndCachePermissions(userId: string, tenantId: string, roleId: string): Promise<{ permissions: PermissionObject; dataScope: DataScopeObject }> {
    const [modules, rbacDocs, userOverrideDoc] = await Promise.all([
      this.getAllKnownModules(tenantId),
      this.rbacConfigModel.find({ tenantId: this.toObjectId(tenantId), roleId }).lean(),
      this.userOverrideModel.findOne({ tenantId: this.toObjectId(tenantId), userId: this.toObjectId(userId) }).lean(),
    ]);

    const effectiveRoleId = (userOverrideDoc as any)?.customRoleId || roleId;

    const [customRoleDoc, hrmModulePerms] = await Promise.all([
      this.customRoleModel.findOne({ tenantId: this.toObjectId(tenantId), roleId: effectiveRoleId }).lean(),
      this.roleModulePermissionModel.find({ tenantId: this.toObjectId(tenantId), roleId: effectiveRoleId }).lean(),
    ]);

    const permissions: PermissionObject = {};
    const dataScope: DataScopeObject = {};

    for (const moduleId of modules) {
      this.ensureModuleShape(permissions, moduleId);
      dataScope[moduleId] = 'ALL';
    }

    for (const doc of rbacDocs || []) {
      const moduleId = String((doc as any).moduleId || '').trim();
      if (!moduleId) continue;
      const permsObj = this.normalizeRbacPermissions((doc as any).permissions);
      for (const [actionId, val] of Object.entries(permsObj)) {
        this.setPermission(permissions, moduleId, actionId, val === true);
      }
    }

    if (customRoleDoc) {
      const nested = this.normalizeNestedPermissions((customRoleDoc as any).permissions);
      for (const [moduleId, actions] of Object.entries(nested)) {
        for (const [actionId, val] of Object.entries(actions)) {
          this.setPermission(permissions, moduleId, actionId, val === true);
        }
      }
    }

    for (const perm of hrmModulePerms || []) {
      const moduleId = String((perm as any).module || '').trim();
      if (!moduleId) continue;
      const actions = (perm as any).actions || {};
      for (const [actionId, val] of Object.entries(actions)) {
        this.setPermission(permissions, moduleId, actionId, val === true);
      }
      const ds = (perm as any).dataScope;
      if (typeof ds === 'string' && ds) {
        dataScope[moduleId] = ds;
      }
    }

    if (userOverrideDoc && (userOverrideDoc as any).overrides) {
      const raw: any = (userOverrideDoc as any).overrides;
      const entries: Array<[any, any]> = typeof raw.entries === 'function'
        ? (Array.from((raw as any).entries()) as Array<[any, any]>)
        : (Object.entries(raw) as Array<[any, any]>);

      for (const [moduleIdRaw, moduleOverridesRaw] of entries) {
        const moduleId = String(moduleIdRaw);
        const actionEntries =
          moduleOverridesRaw && typeof (moduleOverridesRaw as any).entries === 'function'
            ? (Array.from((moduleOverridesRaw as any).entries()) as Array<[any, any]>)
            : (Object.entries(moduleOverridesRaw || {}) as Array<[any, any]>);

        for (const [actionIdRaw, value] of actionEntries) {
          if (value === null || value === undefined) continue;
          this.setPermission(permissions, moduleId, String(actionIdRaw), value === true);
        }
      }
    }

    try {
      await Promise.all([
        this.redisService.set(this.permissionKey(tenantId, userId), JSON.stringify(permissions), this.ttlSeconds),
        this.redisService.set(this.dataScopeKey(tenantId, userId), JSON.stringify(dataScope), this.ttlSeconds),
      ]);
    } catch {
    }

    return { permissions, dataScope };
  }

  async invalidateTenantPermissions(tenantId: string): Promise<void> {
    const permissionKeys = await this.redisService.keys(`permission:${tenantId}:*`);
    const scopeKeys = await this.redisService.keys(`datascope:${tenantId}:*`);
    const all = [...permissionKeys, ...scopeKeys];
    await Promise.all(all.map(k => this.redisService.del(k)));
    await this.redisService.publish('permission_update', tenantId);
  }

  async invalidateUserPermissions(tenantId: string, userId: string): Promise<void> {
    await Promise.all([
      this.redisService.del(this.permissionKey(tenantId, userId)),
      this.redisService.del(this.dataScopeKey(tenantId, userId)),
    ]);
    await this.redisService.publish('permission_update', tenantId);
  }
}
