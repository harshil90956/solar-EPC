import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../services/permission.service';

@Injectable()
export class PermissionGuard implements CanActivate {
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
    const baseRoleId = user.role;
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

    // STEP 4: Check Module-Level Permission
    // Priority 1: Use cached permissions from JWT (O(1) lookup)
    const cachedPermissions = user.permissions;
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

    // Priority 2: Fallback to permissionService for complex resolution
    // This handles cases where cache doesn't have the permission or it's false
    const result = await this.permissionService.resolvePermission(
      tenantId,
      userId,
      baseRoleId,
      requiredModule,
      requiredAction,
    );

    if (!result.permitted) {
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
