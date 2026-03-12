import { Injectable, CanActivate, ExecutionContext, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';
import { Observable } from 'rxjs';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // Extract tenant from headers or JWT payload
    // Priority:
    // - For regular users where JWT has a placeholder tenantId like 'default', prefer x-tenant-id header.
    // - Otherwise, prefer JWT tenantId.
    const user = request.user;
    const headerTenantRaw =
      request?.headers?.['x-tenant-id'] ||
      request?.headers?.['X-Tenant-Id'] ||
      request?.headers?.['x-tenantid'] ||
      request?.headers?.['tenantid'];
    const headerTenantIdOrCode = Array.isArray(headerTenantRaw) ? headerTenantRaw[0] : headerTenantRaw;

    const userTenantIdOrCode = user?.tenantId;
    const userTenantStr = userTenantIdOrCode ? String(userTenantIdOrCode) : '';
    const headerTenantStr = headerTenantIdOrCode ? String(headerTenantIdOrCode) : '';

    const isPlaceholderUserTenant = !userTenantStr || userTenantStr === 'default' || userTenantStr === 'undefined' || userTenantStr === 'null';
    const preferredTenant = (!user?.isSuperAdmin && isPlaceholderUserTenant && headerTenantStr)
      ? headerTenantStr
      : userTenantStr;

    if (preferredTenant) {
      if (Types.ObjectId.isValid(preferredTenant)) {
        request.tenant = { id: preferredTenant };
      } else {
        const tenant = await this.tenantModel.findOne({ code: preferredTenant }).exec();
        if (!tenant) {
          throw new NotFoundException(`Tenant not found: ${preferredTenant}`);
        }
        request.tenant = { id: tenant._id.toString() };
      }
    }
    return true;
  }
}
