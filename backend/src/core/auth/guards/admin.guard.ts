import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * AdminGuard - Restricts access to Admin and Super Admin users only
 * Use this guard for sensitive operations like permission management
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check for Admin or Super Admin role (check both role and roleId)
    const allowedRoles = ['Admin', 'Super Admin', 'SuperAdmin', 'admin', 'superadmin'];
    const userRole = user.role || user.roleName;
    const userRoleId = user.roleId || userRole;
    
    // Check if role or roleId matches admin patterns
    const isAdminByRole = userRole && allowedRoles.some(role => 
      userRole.toLowerCase() === role.toLowerCase()
    );
    
    // Also check if roleId looks like an admin role
    const isAdminByRoleId = userRoleId && allowedRoles.some(role =>
      userRoleId.toLowerCase() === role.toLowerCase()
    );
    
    // Check isSuperAdmin flag as well
    const isSuperAdmin = user.isSuperAdmin === true;
    
    if (!isAdminByRole && !isAdminByRoleId && !isSuperAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
