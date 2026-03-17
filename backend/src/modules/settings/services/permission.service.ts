import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FeatureFlagService } from './feature-flag.service';
import { RBACService } from './rbac.service';
import { CustomRoleService } from './custom-role.service';
import { UserOverrideService } from './user-override.service';
import { Employee, EmployeeDocument } from '../../hrm/schemas/employee.schema';

// Permission resolution result
export interface PermissionResult {
  permitted: boolean;
  source: 'feature_flag' | 'user_override' | 'custom_role' | 'base_rbac' | 'default';
  reason?: string;
}

// Full permission matrix for a user
export interface UserPermissionMatrix {
  [moduleId: string]: {
    [actionId: string]: PermissionResult;
  };
}

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    private featureFlagService: FeatureFlagService,
    private rbacService: RBACService,
    private customRoleService: CustomRoleService,
    private userOverrideService: UserOverrideService,
  ) {}

  /**
   * Resolve permission using the hierarchy:
   * 1. Feature Flag Check (Global Kill Switch) - Module/Action must be enabled
   * 2. User Override Check (Hard Override) - User-specific override takes precedence
   * 3. Custom Role Check (User-Assigned Role) - Custom role permissions
   * 4. Base RBAC Check (Default Role Permissions) - System role defaults
   * 5. Admin Fallback - Admin roles get full permissions if no RBAC config
   */
  async resolvePermission(
    tenantId: string | undefined,
    userId: string,
    baseRoleId: string,
    moduleId: string,
    actionId: string,
  ): Promise<PermissionResult> {
    // Check if this is an admin-like role (for fallback)
    // Custom roles (starting with custom_) must NEVER hit this auto-grant fallback.
    const roleLower = baseRoleId.toLowerCase();
    const isCustomRole = roleLower.startsWith('custom_');
    const isAdminLike = !isCustomRole && (
         roleLower === 'admin' 
      || roleLower === 'superadmin' 
      || roleLower === 'super-admin'
    );

    // ─────────────────────────────────────────────────────────────────────
    // STEP 1: Feature Flag Check (Global Kill Switch)
    // ─────────────────────────────────────────────────────────────────────
    const moduleEnabled = await this.featureFlagService.isModuleEnabled(tenantId, moduleId);
    if (!moduleEnabled) {
      return {
        permitted: false,
        source: 'feature_flag',
        reason: `Module ${moduleId} is disabled by feature flag`,
      };
    }

    // Check if action is enabled at feature flag level
    const actionEnabled = await this.featureFlagService.isActionEnabled(tenantId, moduleId, actionId);
    if (!actionEnabled) {
      return {
        permitted: false,
        source: 'feature_flag',
        reason: `Action ${actionId} is disabled by feature flag for module ${moduleId}`,
      };
    }

    // Settings module must be strictly admin-only.
    // Never auto-grant this module to non-admin roles.
    if (moduleId === 'settings' && !isAdminLike) {
      return {
        permitted: false,
        source: 'default',
        reason: 'Settings module is restricted to Admin users',
      };
    }

    // Keep backend consistent with frontend: admin-like roles have full access by default
    // (unless blocked by feature flags above).
    if (isAdminLike) {
      return {
        permitted: true,
        source: 'default',
        reason: `Admin role ${baseRoleId} granted permission by default`,
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    // STEP 2: User Override Check (Highest Priority)
    // ─────────────────────────────────────────────────────────────────────
    const userOverride = await this.userOverrideService.getOverride(tenantId, userId, moduleId, actionId);
    if (userOverride !== null) {
      return {
        permitted: userOverride,
        source: 'user_override',
        reason: userOverride 
          ? 'User override grants permission' 
          : 'User override denies permission',
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    // STEP 3: Custom Role Check
    // ─────────────────────────────────────────────────────────────────────
    let customRoleId = await this.userOverrideService.getCustomRoleId(tenantId, userId);

    // HRM employee fallback:
    // HRM assigns roles via employees.roleId (not useroverrides.customRoleId).
    // If no customRoleId is found via user override, treat employee.roleId as customRoleId.
    if (!customRoleId && userId && Types.ObjectId.isValid(userId)) {
      const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;
      const employee = await this.employeeModel.findOne({
        _id: new Types.ObjectId(userId),
        ...(tid ? { tenantId: tid } : {}),
      }).select('roleId').lean();

      const empRoleId = (employee as any)?.roleId;
      if (typeof empRoleId === 'string' && empRoleId.toLowerCase().startsWith('custom_')) {
        customRoleId = empRoleId;
      }
    }

    if (customRoleId) {
      const customPerm = await this.customRoleService.getPermission(
        tenantId, 
        customRoleId, 
        moduleId, 
        actionId,
      );
      
      if (customPerm !== undefined) {
        return {
          permitted: customPerm,
          source: 'custom_role',
          reason: `Custom role ${customRoleId} sets ${actionId}=${customPerm}`,
        };
      }
      // Frontend behavior: for custom roles, 'view' defaults to allow unless explicitly denied.
      // Keep backend consistent to avoid UI allowing access while API denies.
      if (actionId === 'view') {
        return {
          permitted: true,
          source: 'custom_role',
          reason: `Custom role ${customRoleId} defaults view=true (not explicitly denied)`,
        };
      }

      // If custom role doesn't define this permission, fall through to base role
    }

    // ─────────────────────────────────────────────────────────────────────
    // STEP 4: Base RBAC Check (Default)
    // ─────────────────────────────────────────────────────────────────────
    const basePerm = await this.rbacService.getPermission(tenantId, baseRoleId, moduleId, actionId);
    
    // If RBAC config exists, use it
    if (basePerm !== undefined) {
      return {
        permitted: basePerm,
        source: 'base_rbac',
        reason: `Base role ${baseRoleId} sets ${actionId}=${basePerm}`,
      };
    }

    // Non-admin roles denied by default
    return {
      permitted: false,
      source: 'default',
      reason: `No permission config found for role ${baseRoleId}`,
    };
  }

  /**
   * Quick check - returns only boolean (for guards)
   */
  async can(
    tenantId: string | undefined,
    userId: string,
    baseRoleId: string,
    moduleId: string,
    actionId: string,
  ): Promise<boolean> {
    const result = await this.resolvePermission(tenantId, userId, baseRoleId, moduleId, actionId);
    return result.permitted;
  }

  /**
   * Check if user can access a module (any action)
   */
  async canAccessModule(
    tenantId: string | undefined,
    userId: string,
    baseRoleId: string,
    moduleId: string,
  ): Promise<boolean> {
    // First check if module is enabled
    const moduleEnabled = await this.featureFlagService.isModuleEnabled(tenantId, moduleId);
    if (!moduleEnabled) return false;

    // Check if user has any permission for this module
    const matrix = await this.resolveAllPermissions(tenantId, userId, baseRoleId);
    const modulePerms = matrix[moduleId];
    
    if (!modulePerms) return false;
    
    // User can access if they have at least one permitted action
    return Object.values(modulePerms).some(result => result.permitted);
  }

  /**
   * Resolve all permissions for a user across all modules
   */
  async resolveAllPermissions(
    tenantId: string | undefined,
    userId: string,
    baseRoleId: string,
  ): Promise<UserPermissionMatrix> {
    const matrix: UserPermissionMatrix = {};
    
    // Get all feature flags to know which modules exist
    const flags = await this.featureFlagService.getAllFlags(tenantId);
    const modules = Object.keys(flags);
    
    // Standard actions to check
    const actions = ['view', 'create', 'edit', 'delete', 'export', 'approve', 'assign'];

    for (const moduleId of modules) {
      matrix[moduleId] = {};
      
      for (const actionId of actions) {
        matrix[moduleId][actionId] = await this.resolvePermission(
          tenantId, 
          userId, 
          baseRoleId, 
          moduleId, 
          actionId,
        );
      }
    }

    return matrix;
  }

  /**
   * Get enriched user data with effective permissions
   */
  async getEnrichedUser(
    tenantId: string | undefined,
    userId: string,
    baseRoleId: string,
    userData?: any,
  ): Promise<any> {
    const [customRoleId, overrideCount, matrix] = await Promise.all([
      this.userOverrideService.getCustomRoleId(tenantId, userId),
      this.userOverrideService.getOverrideCount(tenantId, userId),
      this.resolveAllPermissions(tenantId, userId, baseRoleId),
    ]);

    // Calculate effective role
    let effectiveRole = baseRoleId;
    let effectiveRoleLabel = baseRoleId;
    
    if (customRoleId) {
      const customRole = await this.customRoleService.getCustomRole(tenantId, customRoleId);
      if (customRole) {
        effectiveRole = customRoleId;
        effectiveRoleLabel = customRole.label;
      }
    }

    return {
      ...userData,
      id: userId,
      baseRole: baseRoleId,
      customRoleId,
      effectiveRole,
      effectiveRoleLabel,
      overrideCount,
      permissions: matrix,
    };
  }

  /**
   * Batch resolve permissions for multiple users
   */
  async getEnrichedUsers(
    tenantId: string | undefined,
    users: Array<{ id: string; role: string; [key: string]: any }>,
  ): Promise<any[]> {
    const enriched = await Promise.all(
      users.map(user => this.getEnrichedUser(tenantId, user.id, user.role, user)),
    );
    return enriched;
  }

  /**
   * Get permission summary for debugging
   */
  async getPermissionDebug(
    tenantId: string | undefined,
    userId: string,
    baseRoleId: string,
    moduleId: string,
    actionId: string,
  ): Promise<{
    resolution: PermissionResult;
    featureFlagEnabled: boolean;
    actionEnabled: boolean;
    userOverride: boolean | null;
    customRoleId: string | null;
    customRolePermission: boolean | undefined;
    baseRolePermission: boolean | undefined;
  }> {
    const [featureFlagEnabled, actionEnabled, userOverride, customRoleId, customRolePermission, baseRolePermission] = 
      await Promise.all([
        this.featureFlagService.isModuleEnabled(tenantId, moduleId),
        this.featureFlagService.isActionEnabled(tenantId, moduleId, actionId),
        this.userOverrideService.getOverride(tenantId, userId, moduleId, actionId),
        this.userOverrideService.getCustomRoleId(tenantId, userId),
        this.userOverrideService.getCustomRoleId(tenantId, userId).then(async (roleId) => {
          if (!roleId) return undefined;
          return this.customRoleService.getPermission(tenantId, roleId, moduleId, actionId);
        }),
        this.rbacService.getPermission(tenantId, baseRoleId, moduleId, actionId),
      ]);

    const resolution = await this.resolvePermission(tenantId, userId, baseRoleId, moduleId, actionId);

    return {
      resolution,
      featureFlagEnabled,
      actionEnabled,
      userOverride,
      customRoleId,
      customRolePermission,
      baseRolePermission,
    };
  }
}
