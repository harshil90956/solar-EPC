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

    // Check for Admin or Super Admin role
    const allowedRoles = ['Admin', 'Super Admin', 'SuperAdmin', 'admin', 'superadmin'];
    const userRole = user.role || user.roleName;
    
    if (!userRole || !allowedRoles.some(role => 
      userRole.toLowerCase() === role.toLowerCase()
    )) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
