import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    // Extract tenant from JWT payload or headers
    const user = request.user;
    if (user?.tenantId) {
      request.tenant = { id: user.tenantId };
    }
    return true;
  }
}
