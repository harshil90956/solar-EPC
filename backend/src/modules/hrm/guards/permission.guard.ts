import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionService } from '../services/permission.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private permissionService: PermissionService,
    private requiredPermission: string,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Super admin bypass
    if (user.role === 'Super Admin' || user.role === 'Admin') {
      return true;
    }

    const roleId = user.roleId || user.role;
    if (!roleId) {
      throw new ForbiddenException('User has no role assigned');
    }

    const hasPermission = await this.permissionService.hasPermission(roleId, this.requiredPermission);
    
    if (!hasPermission) {
      throw new ForbiddenException(`Permission denied: ${this.requiredPermission} required`);
    }

    return true;
  }
}

// Factory function to create permission guard with specific permission
export function RequirePermission(permission: string) {
  return class extends PermissionGuard {
    constructor(permissionService: PermissionService) {
      super(permissionService, permission);
    }
  };
}
