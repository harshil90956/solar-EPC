import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionEngineService } from '../../../common/services/permission-engine.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private permissionEngine: PermissionEngineService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenant?.id;
    const user = request.user;

    // STEP 1: Check User Authentication
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const rawRole = String(user?.role || user?.roleName || user?.roleId || '').trim();
    const normalizedRole = rawRole
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/-+/g, '_');
    if (user?.isSuperAdmin === true || normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'SUPERADMIN') {
      return true;
    }

    // STEP 2: Check Tenant Context
    if (!tenantId) {
      throw new ForbiddenException('Tenant context missing. Access denied.');
    }

    const userId = user.id || user._id;
    const roleIdRaw = user.roleId || user.customRoleId || user.role;
    const roleId = typeof roleIdRaw === 'string' ? roleIdRaw : (roleIdRaw ? String(roleIdRaw) : '');

    if (!userId || !roleId) {
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
      `[PERM] check user=${userId} role=${roleId} tenant=${tenantId} required=${requiredModule}:${requiredAction}`,
    );

    const { permissions, dataScope } = await this.permissionEngine.getPermissions(
      String(userId),
      String(tenantId),
      String(roleId),
      user?.isSuperAdmin === true,
    );

    if (permissions?.[requiredModule]?.[requiredAction] !== true) {
      this.logger.warn(
        `[PERM] denied required=${requiredModule}:${requiredAction} user=${userId} role=${roleId} tenant=${tenantId}`,
      );
      throw new ForbiddenException(
        `Access denied: No ${requiredAction} permission for ${requiredModule}`,
      );
    }

    request.user.effectivePermissions = { permitted: true, source: 'redis' };
    request.user.effectiveDataScope = dataScope;
    return true;
  }
}
