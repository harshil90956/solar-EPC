import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user is superadmin
    const isSuperAdmin = user.isSuperAdmin === true;
    
    // Also check role string as fallback
    const roleLower = (user.role || '').toLowerCase();
    const isSuperAdminRole = 
      roleLower === 'superadmin' || 
      roleLower === 'super-admin' || 
      roleLower === 'super_admin';

    if (!isSuperAdmin && !isSuperAdminRole) {
      throw new ForbiddenException('Access denied. Superadmin privileges required.');
    }

    return true;
  }
}
