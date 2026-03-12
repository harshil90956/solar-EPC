import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../services/permission.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenant?.id;
    const user = request.user;

    // STEP 1: Check User Authentication
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Super Admin bypass - can access without tenant context
    if (user.isSuperAdmin) {
      // Attach default permissions for Super Admin
      request.user.effectivePermissions = { permitted: true, reason: 'Super Admin' };
      request.user.effectiveDataScope = 'ALL';
      return true;
    }

    // STEP 2: Check Tenant Context (for non-Super Admin)
    if (!tenantId) {
      throw new ForbiddenException('Tenant context missing. Access denied.');
    }

    const userId = user.id || user._id;
    const baseRoleIdRaw = user.customRoleId || user.roleId || user.role;
    const baseRoleId = typeof baseRoleIdRaw === 'string'
      ? baseRoleIdRaw
      : (baseRoleIdRaw ? String(baseRoleIdRaw) : '');
    const dataScope = user.dataScope || 'ASSIGNED';

    if (!userId || !baseRoleId) {
      throw new ForbiddenException('User ID or role not found in token');
    }

    // STEP 3: Get Required Permission from Metadata
    const requiredModule = this.reflector.get<string>('requiredModule', context.getHandler());
    const requiredAction = this.reflector.get<string>('requiredAction', context.getHandler());

    // If no permission metadata required, just check tenant + auth (public endpoints within tenant)
    if (!requiredModule || !requiredAction) {
      return true;
    }

    this.logger.debug(
      `[PERM] check user=${userId} role=${baseRoleId} tenant=${tenantId} required=${requiredModule}:${requiredAction}`,
    );

    // STEP 4: Check Module-Level Permission
    // Priority 1: Use cached permissions from JWT (O(1) lookup)
    const cachedPermissions = user.permissions;
    
    // Check if user has a custom role (employees with custom_ role IDs)
    const hasCustomRole = Boolean(
      (typeof user.customRoleId === 'string' && user.customRoleId.toLowerCase().startsWith('custom_'))
      || (baseRoleId && baseRoleId.toLowerCase().startsWith('custom_'))
    );
    
    if (cachedPermissions && 
        cachedPermissions[requiredModule] && 
        cachedPermissions[requiredModule][requiredAction] === true) {
      // O(1) permission granted from cache
      request.user.effectivePermissions = { 
        permitted: true, 
        source: 'cached',
        reason: 'Permission granted from cached matrix' 
      };
      request.user.effectiveDataScope = dataScope;
      return true;
    }

    // Priority 1b: If user has custom role, allow access (permissions checked at service level)
    if (hasCustomRole) {
      request.user.effectivePermissions = { 
        permitted: true, 
        source: 'custom_role',
        reason: 'Permission granted via custom role' 
      };
      request.user.effectiveDataScope = dataScope;
      return true;
    }

    // Priority 2: Fallback to permissionService for complex resolution
    // This handles cases where cache doesn't have the permission or it's false
    const result = await this.permissionService.resolvePermission(
      tenantId,
      userId,
      baseRoleId,
      requiredModule,
      requiredAction,
    );

    // Frontend route access is based on view permission, but some tenants/roles might have
    // incomplete matrices where view isn't explicitly granted while other actions are.
    // If the user can access the module (has any permitted action), allow 'view' to avoid
    // UI allowing access while list API 403s.
    if (!result.permitted && requiredAction === 'view') {
      const canAccess = await this.permissionService.canAccessModule(
        tenantId,
        userId,
        baseRoleId,
        requiredModule,
      );

      if (canAccess) {
        request.user.effectivePermissions = {
          permitted: true,
          source: 'module_access',
          reason: `Allowed view via module access (has at least one permitted action)`
        };
        request.user.effectiveDataScope = dataScope;
        return true;
      }
    }

    // Backward-compat: some tenants may still store RBAC under legacy module id (e.g. leads)
    // while UI and newer APIs use 'crm'. Do NOT grant access unless the legacy permission is
    // explicitly permitted by Settings.
    if (!result.permitted && requiredModule === 'crm') {
      const legacyResult = await this.permissionService.resolvePermission(
        tenantId,
        userId,
        baseRoleId,
        'leads',
        requiredAction,
      );

      if (legacyResult.permitted) {
        request.user.effectivePermissions = {
          ...legacyResult,
          source: (legacyResult as any)?.source || 'legacy',
          reason: legacyResult.reason || `Permission granted via legacy module leads`,
        };
        request.user.effectiveDataScope = dataScope;
        return true;
      }

      // Same 'view' fallback for legacy module id
      if (!legacyResult.permitted && requiredAction === 'view') {
        const canAccessLegacy = await this.permissionService.canAccessModule(
          tenantId,
          userId,
          baseRoleId,
          'leads',
        );

        if (canAccessLegacy) {
          request.user.effectivePermissions = {
            permitted: true,
            source: 'module_access',
            reason: `Allowed view via legacy module access (leads)`
          };
          request.user.effectiveDataScope = dataScope;
          return true;
        }
      }

      this.logger.warn(
        `[PERM] denied required=${requiredModule}:${requiredAction} user=${userId} role=${baseRoleId} tenant=${tenantId} reason=${result?.reason || 'unknown'} legacyReason=${legacyResult?.reason || 'unknown'}`,
      );
    }

    if (!result.permitted) {
      this.logger.warn(
        `[PERM] denied required=${requiredModule}:${requiredAction} user=${userId} role=${baseRoleId} tenant=${tenantId} reason=${result?.reason || 'unknown'}`,
      );
      throw new ForbiddenException(
        `Access denied: ${result.reason || `No ${requiredAction} permission for ${requiredModule}`}`,
      );
    }

    // STEP 5: Attach effective permissions and dataScope to request for downstream use
    request.user.effectivePermissions = result;
    request.user.effectiveDataScope = dataScope;

    return true;
  }
}
