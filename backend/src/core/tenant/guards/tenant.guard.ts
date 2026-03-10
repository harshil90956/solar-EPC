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
    // Extract tenant from JWT payload or headers
    const user = request.user;
    if (user?.tenantId) {
      // tenantId could be a string code/slug or an ObjectId
      const tenantIdOrCode = user.tenantId;
      
      // Check if it's already a valid ObjectId
      if (Types.ObjectId.isValid(tenantIdOrCode)) {
        request.tenant = { id: tenantIdOrCode };
      } else {
        // It's a tenant code/slug - look up the actual ObjectId
        const tenant = await this.tenantModel.findOne({ code: tenantIdOrCode }).exec();
        if (!tenant) {
          throw new NotFoundException(`Tenant not found: ${tenantIdOrCode}`);
        }
        request.tenant = { id: tenant._id.toString() };
      }
    }
    return true;
  }
}
