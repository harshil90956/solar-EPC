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

    // STEP 1: Check Tenant Context
    if (!tenantId) {
      throw new ForbiddenException('Tenant context missing. Access denied.');
    }

    // STEP 2: Check User Authentication
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
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
    // Hierarchy: Feature Flag → User Override → Custom Role → Base RBAC
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
