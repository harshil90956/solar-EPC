import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HrmPermission, HrmPermissionDocument } from '../schemas/hrm-permission.schema';

@Injectable()
export class HrmPermissionService {
  private readonly logger = new Logger(HrmPermissionService.name);

  constructor(
    @InjectModel(HrmPermission.name) private hrmPermissionModel: Model<HrmPermissionDocument>,
  ) {}

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id || !Types.ObjectId.isValid(id)) return undefined;
    return new Types.ObjectId(id);
  }

  async getPermissions(roleId: string, tenantId?: string): Promise<HrmPermission> {
    const tid = this.toObjectId(tenantId);
    const query: any = { roleId };
    if (tid) query.tenantId = tid;

    let permission = await this.hrmPermissionModel.findOne(query).exec();
    
    if (!permission) {
      // Return default restricted permissions if not found
      return {
        roleId,
        tenantId: tid,
        permissions: {
          employees: { view: false, manage: false, delete: false },
          leaves: { view: false, apply: false, approve: false },
          attendance: { view_self: false, view_all: false, checkin_checkout: false, manage: false },
          payroll: { view: false, manage: false, approve: false },
          increments: { view: false, manage: false },
          departments: { view: false, manage: false },
          dashboard: { view: false }
        },
      } as HrmPermission;
    }

    return permission;
  }

  async getAllPermissions(tenantId?: string): Promise<HrmPermission[]> {
    const tid = this.toObjectId(tenantId);
    const query: any = {};
    if (tid) query.tenantId = tid;
    return this.hrmPermissionModel.find(query).exec();
  }

  async updatePermissions(roleId: string, permissions: any, tenantId?: string): Promise<HrmPermission> {
    const tid = this.toObjectId(tenantId);
    const query: any = { roleId };
    if (tid) query.tenantId = tid;

    let hrmPerm = await this.hrmPermissionModel.findOne(query).exec();

    if (hrmPerm) {
      // Deep merge permissions
      hrmPerm.permissions = { ...hrmPerm.permissions, ...permissions };
      return hrmPerm.save();
    } else {
      hrmPerm = new this.hrmPermissionModel({
        roleId,
        tenantId: tid,
        permissions,
      });
      return hrmPerm.save();
    }
  }

  async checkPermission(roleId: string, featurePath: string, tenantId?: string): Promise<boolean> {
    const tid = this.toObjectId(tenantId);
    const query: any = { roleId };
    if (tid) query.tenantId = tid;

    const hrmPerm = await this.hrmPermissionModel.findOne(query).exec();
    if (!hrmPerm) {
      // Default roles fallback if no DB entry yet
      if (roleId.toLowerCase() === 'admin' || roleId.toLowerCase() === 'superadmin') return true;
      return false;
    }

    // Support nested path like 'attendance.view_self'
    const parts = featurePath.split('.');
    let current: any = hrmPerm.permissions;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return false;
      }
    }

    return !!current;
  }

  async validateAction(roleId: string, featurePath: string, tenantId?: string): Promise<void> {
    const isAllowed = await this.checkPermission(roleId, featurePath, tenantId);
    if (!isAllowed) {
      throw new ForbiddenException(`Access denied for HRM feature: ${featurePath}`);
    }
  }

  async seedDefaults(tenantId?: string): Promise<void> {
    const tid = this.toObjectId(tenantId);
    const defaults = [
      {
        roleId: 'Employee',
        permissions: {
          employees: { view: false, manage: false, delete: false },
          leaves: { view: true, apply: true, approve: false },
          attendance: { view_self: true, view_all: false, checkin_checkout: true, manage: false },
          payroll: { view: true, manage: false, approve: false },
          increments: { view: true, manage: false },
          departments: { view: false, manage: false },
          dashboard: { view: false }
        },
      },
      {
        roleId: 'HR',
        permissions: {
          employees: { view: true, manage: true, delete: false },
          leaves: { view: true, apply: true, approve: true },
          attendance: { view_self: true, view_all: true, checkin_checkout: true, manage: true },
          payroll: { view: true, manage: true, approve: false },
          increments: { view: true, manage: true },
          departments: { view: true, manage: true },
          dashboard: { view: true }
        },
      },
      {
        roleId: 'Manager',
        permissions: {
          employees: { view: true, manage: false, delete: false },
          leaves: { view: true, apply: true, approve: true },
          attendance: { view_self: true, view_all: true, checkin_checkout: true, manage: false },
          payroll: { view: false, manage: false, approve: false },
          increments: { view: false, manage: false },
          departments: { view: true, manage: false },
          dashboard: { view: false }
        },
      },
      {
        roleId: 'Admin',
        permissions: {
          employees: { view: true, manage: true, delete: true },
          leaves: { view: true, apply: true, approve: true },
          attendance: { view_self: true, view_all: true, checkin_checkout: true, manage: true },
          payroll: { view: true, manage: true, approve: true },
          increments: { view: true, manage: true },
          departments: { view: true, manage: true },
          dashboard: { view: true }
        },
      },
    ];

    for (const def of defaults) {
      const query: any = { roleId: def.roleId };
      if (tid) query.tenantId = tid;
      
      const existing = await this.hrmPermissionModel.findOne(query).exec();
      if (!existing) {
        await new this.hrmPermissionModel({ ...def, tenantId: tid }).save();
      }
    }
  }
}
