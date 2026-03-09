import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Request } from 'express';

/**
 * Extended Request interface with tenant and user info
 */
interface RequestWithTenant extends Request {
  tenant?: { id?: string };
  user?: {
    id?: string;
    tenantId?: string;
    role?: string;
    isSuperAdmin?: boolean;
    dataScope?: 'ALL' | 'ASSIGNED';
  };
}

/**
 * Tenant Enforcement Guard
 * 
 * Ensures all database queries have proper tenant isolation.
 * This guard should be applied globally to enforce security at the route level.
 * 
 * Rules:
 * 1. SUPER_ADMIN bypasses tenant checks (can access all tenants)
 * 2. Regular users MUST have tenantId in their JWT
 * 3. Requests without tenant context are rejected
 * 4. tenantId on request must match user's tenantId
 */
@Injectable()
export class TenantEnforcementGuard implements CanActivate {
  private readonly logger = new Logger(TenantEnforcementGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    
    const user = request.user;
    const tenant = request.tenant;

    this.logger.debug(`Tenant check - user: ${user?.id}, tenant: ${tenant?.id}, userTenant: ${user?.tenantId}`);

    // Rule 1: SUPER_ADMIN bypasses all checks
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      this.logger.debug('SUPER_ADMIN bypass - granting access');
      return true;
    }

    // Rule 2: Regular users must have tenantId
    if (!user?.tenantId) {
      this.logger.warn(`Access denied: User ${user?.id} missing tenantId`);
      throw new ForbiddenException('User must be associated with a tenant');
    }

    // Rule 3: Request must have tenant context
    if (!tenant?.id) {
      this.logger.warn(`Access denied: Request missing tenant context`);
      throw new ForbiddenException('Request must include tenant context');
    }

    // Rule 4: Tenant ID consistency check
    // The tenant on the request must match the user's tenant
    if (tenant.id !== user.tenantId) {
      this.logger.warn(`Access denied: Tenant mismatch - user tenant: ${user.tenantId}, request tenant: ${tenant.id}`);
      throw new ForbiddenException('Tenant mismatch detected');
    }

    this.logger.debug(`Tenant check passed for user ${user.id}`);
    return true;
  }
}
