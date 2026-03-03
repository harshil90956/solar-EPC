import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../services/permission.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required module and action from metadata
    const requiredModule = this.reflector.get<string>('requiredModule', context.getHandler());
    const requiredAction = this.reflector.get<string>('requiredAction', context.getHandler());

    // If no permission metadata, allow access
    if (!requiredModule || !requiredAction) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenant?.id;
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userId = user.id || user._id;
    const baseRoleId = user.role;

    if (!userId || !baseRoleId) {
      throw new ForbiddenException('User ID or role not found in token');
    }

    // Resolve permission
    const result = await this.permissionService.resolvePermission(
      tenantId,
      userId,
      baseRoleId,
      requiredModule,
      requiredAction,
    );

    if (!result.permitted) {
      throw new ForbiddenException(
        `Access denied: ${result.reason || `No permission for ${requiredAction} on ${requiredModule}`}`,
      );
    }

    return true;
  }
}
