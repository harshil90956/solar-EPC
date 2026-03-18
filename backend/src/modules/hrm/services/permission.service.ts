import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Permission, PermissionModule, PermissionAction, DataScope } from '../schemas/permission.schema';
import { Role } from '../schemas/role.schema';
import { RoleColumnPermission } from '../schemas/role-column-permission.schema';
import { RoleModulePermission } from '../schemas/role-module-permission.schema';

export const DEFAULT_PERMISSIONS = [
  // Employees
  { key: 'employees.view', name: 'View Employees', module: PermissionModule.EMPLOYEES, action: PermissionAction.VIEW },
  { key: 'employees.create', name: 'Create Employee', module: PermissionModule.EMPLOYEES, action: PermissionAction.CREATE },
  { key: 'employees.edit', name: 'Edit Employee', module: PermissionModule.EMPLOYEES, action: PermissionAction.EDIT },
  { key: 'employees.delete', name: 'Delete Employee', module: PermissionModule.EMPLOYEES, action: PermissionAction.DELETE },
  { key: 'employees.export', name: 'Export Employees', module: PermissionModule.EMPLOYEES, action: PermissionAction.EXPORT },
  { key: 'employees.assign', name: 'Assign Employee', module: PermissionModule.EMPLOYEES, action: PermissionAction.ASSIGN },

  // Leaves
  { key: 'leaves.view', name: 'View Leaves', module: PermissionModule.LEAVES, action: PermissionAction.VIEW },
  { key: 'leaves.create', name: 'Create Leave', module: PermissionModule.LEAVES, action: PermissionAction.CREATE },
  { key: 'leaves.edit', name: 'Edit Leave', module: PermissionModule.LEAVES, action: PermissionAction.EDIT },
  { key: 'leaves.delete', name: 'Delete Leave', module: PermissionModule.LEAVES, action: PermissionAction.DELETE },
  { key: 'leaves.approve', name: 'Approve Leave', module: PermissionModule.LEAVES, action: PermissionAction.APPROVE },
  { key: 'leaves.export', name: 'Export Leaves', module: PermissionModule.LEAVES, action: PermissionAction.EXPORT },

  // Attendance
  { key: 'attendance.view', name: 'View Attendance', module: PermissionModule.ATTENDANCE, action: PermissionAction.VIEW },
  { key: 'attendance.create', name: 'Create Attendance', module: PermissionModule.ATTENDANCE, action: PermissionAction.CREATE },
  { key: 'attendance.edit', name: 'Edit Attendance', module: PermissionModule.ATTENDANCE, action: PermissionAction.EDIT },
  { key: 'attendance.delete', name: 'Delete Attendance', module: PermissionModule.ATTENDANCE, action: PermissionAction.DELETE },
  { key: 'attendance.export', name: 'Export Attendance', module: PermissionModule.ATTENDANCE, action: PermissionAction.EXPORT },
  { key: 'attendance.checkin', name: 'Check In', module: PermissionModule.ATTENDANCE, action: PermissionAction.CHECK_IN },
  { key: 'attendance.checkout', name: 'Check Out', module: PermissionModule.ATTENDANCE, action: PermissionAction.CHECK_OUT },

  // Payroll
  { key: 'payroll.view', name: 'View Payroll', module: PermissionModule.PAYROLL, action: PermissionAction.VIEW },
  { key: 'payroll.create', name: 'Create Payroll', module: PermissionModule.PAYROLL, action: PermissionAction.CREATE },
  { key: 'payroll.edit', name: 'Edit Payroll', module: PermissionModule.PAYROLL, action: PermissionAction.EDIT },
  { key: 'payroll.delete', name: 'Delete Payroll', module: PermissionModule.PAYROLL, action: PermissionAction.DELETE },
  { key: 'payroll.export', name: 'Export Payroll', module: PermissionModule.PAYROLL, action: PermissionAction.EXPORT },
  { key: 'payroll.generate', name: 'Generate Payroll', module: PermissionModule.PAYROLL, action: PermissionAction.GENERATE_PAYROLL },
  { key: 'payroll.approve', name: 'Approve Payroll', module: PermissionModule.PAYROLL, action: PermissionAction.APPROVE },

  // Increments
  { key: 'increments.view', name: 'View Increments', module: PermissionModule.INCREMENTS, action: PermissionAction.VIEW },
  { key: 'increments.create', name: 'Create Increment', module: PermissionModule.INCREMENTS, action: PermissionAction.CREATE },
  { key: 'increments.edit', name: 'Edit Increment', module: PermissionModule.INCREMENTS, action: PermissionAction.EDIT },
  { key: 'increments.delete', name: 'Delete Increment', module: PermissionModule.INCREMENTS, action: PermissionAction.DELETE },
  { key: 'increments.export', name: 'Export Increments', module: PermissionModule.INCREMENTS, action: PermissionAction.EXPORT },

  // Departments
  { key: 'departments.view', name: 'View Departments', module: PermissionModule.DEPARTMENTS, action: PermissionAction.VIEW },
  { key: 'departments.create', name: 'Create Department', module: PermissionModule.DEPARTMENTS, action: PermissionAction.CREATE },
  { key: 'departments.edit', name: 'Edit Department', module: PermissionModule.DEPARTMENTS, action: PermissionAction.EDIT },
  { key: 'departments.delete', name: 'Delete Department', module: PermissionModule.DEPARTMENTS, action: PermissionAction.DELETE },
  { key: 'departments.export', name: 'Export Departments', module: PermissionModule.DEPARTMENTS, action: PermissionAction.EXPORT },
  { key: 'departments.assign', name: 'Assign to Department', module: PermissionModule.DEPARTMENTS, action: PermissionAction.ASSIGN },
];

export const DEFAULT_ROLES = [
  {
    name: 'Admin',
    description: 'Full system access',
    isSystem: true,
    permissions: [], // All permissions
  },
  {
    name: 'HR Manager',
    description: 'Manage all HRM operations',
    isSystem: true,
    permissions: [
      'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
      'leaves.view', 'leaves.apply', 'leaves.approve', 'leaves.reject', 'leaves.delete',
      'attendance.view', 'attendance.checkin', 'attendance.checkout', 'attendance.mark', 'attendance.edit', 'attendance.delete',
      'payroll.view', 'payroll.generate', 'payroll.edit', 'payroll.delete',
      'increments.view', 'increments.create', 'increments.edit', 'increments.delete',
      'departments.view', 'departments.create', 'departments.edit', 'departments.delete',
    ],
  },
  {
    name: 'HR Executive',
    description: 'Handle day-to-day HRM tasks',
    isSystem: true,
    permissions: [
      'employees.view', 'employees.create', 'employees.edit',
      'leaves.view', 'leaves.apply', 'leaves.approve', 'leaves.reject',
      'attendance.view', 'attendance.checkin', 'attendance.checkout', 'attendance.mark',
      'payroll.view', 'payroll.generate',
      'increments.view', 'increments.create',
      'departments.view',
    ],
  },
  {
    name: 'Employee',
    description: 'Basic employee access',
    isSystem: true,
    permissions: [
      'employees.view',
      'leaves.view', 'leaves.apply',
      'attendance.checkin', 'attendance.checkout',
      'payroll.view',
    ],
  },
];

@Injectable()
export class PermissionService implements OnModuleInit {
  constructor(
    @InjectModel(Permission.name) private permissionModel: Model<Permission>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(RoleColumnPermission.name) private roleColumnPermissionModel: Model<RoleColumnPermission>,
    @InjectModel(RoleModulePermission.name) private roleModulePermissionModel: Model<RoleModulePermission>,
  ) {}

  private normalizeActionKey(action: string): string {
    const raw = String(action || '').trim();
    if (!raw) return raw;
    const lower = raw.replace(/\s+/g, '_').toLowerCase();
    if (lower === 'check_in' || lower === 'checkin') return 'checkin';
    if (lower === 'check_out' || lower === 'checkout') return 'checkout';
    if (lower === 'checkin_checkout') return 'checkin_checkout';
    return lower;
  }

  private normalizeActionsObject(actions: any): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    if (!actions || typeof actions !== 'object') return out;
    for (const [k, v] of Object.entries(actions)) {
      out[this.normalizeActionKey(k)] = v === true;
    }
    if (out.checkin_checkout === true) {
      out.checkin = true;
      out.checkout = true;
    }
    return out;
  }

  async onModuleInit() {
    await this.seedPermissions();
    await this.seedRoles();
    await this.seedDefaultColumnPermissions();
  }

  // Column definitions for each module
  public static readonly MODULE_COLUMNS: Record<string, string[]> = {
    employees: ['employee', 'contact', 'department', 'role', 'joinDate', 'salary', 'status', 'actions'],
    leaves: ['employee', 'leaveType', 'startDate', 'endDate', 'days', 'status', 'actions'],
    attendance: ['employee', 'department', 'date', 'checkIn', 'checkOut', 'totalHours', 'breakTime', 'overtime', 'status', 'workMode', 'location', 'lateMark', 'earlyExit', 'actions'],
    payroll: ['employee', 'month', 'year', 'baseSalary', 'allowances', 'deductions', 'netSalary', 'status', 'actions'],
    increments: ['employee', 'previousSalary', 'increasePercent', 'newSalary', 'increaseAmount', 'effectiveFrom', 'reason', 'actions'],
    departments: ['departmentName', 'code', 'employees', 'description', 'status', 'created', 'actions'],
  };

  async seedPermissions() {
    for (const perm of DEFAULT_PERMISSIONS) {
      await this.permissionModel.findOneAndUpdate(
        { key: perm.key },
        perm,
        { upsert: true, new: true },
      );
    }
  }

  async seedRoles() {
    const allPermissions = await this.permissionModel.find().exec();
    const permMap = new Map(allPermissions.map(p => [p.key, p._id]));

    for (const roleDef of DEFAULT_ROLES) {
      let permissionIds: any[] = [];
      
      if (roleDef.name === 'Admin') {
        // Admin gets all permissions
        permissionIds = allPermissions.map(p => p._id);
      } else {
        permissionIds = roleDef.permissions
          .map(key => permMap.get(key))
          .filter(Boolean);
      }

      await this.roleModel.findOneAndUpdate(
        { name: roleDef.name },
        {
          name: roleDef.name,
          description: roleDef.description,
          isSystem: roleDef.isSystem,
          permissions: permissionIds,
        },
        { upsert: true, new: true },
      );
    }
  }

  async findAllPermissions(): Promise<Permission[]> {
    return this.permissionModel.find().sort({ module: 1, action: 1 }).exec();
  }

  async findPermissionByKey(key: string): Promise<Permission | null> {
    return this.permissionModel.findOne({ key }).exec();
  }

  async findAllRoles(): Promise<Role[]> {
    return this.roleModel.find().populate('permissions').exec();
  }

  async findRoleById(id: string): Promise<Role | null> {
    return this.roleModel.findById(id).populate('permissions').exec();
  }

  async findRoleByName(name: string): Promise<Role | null> {
    return this.roleModel.findOne({ name }).populate('permissions').exec();
  }

  async createRole(name: string, description: string, permissionKeys: string[]): Promise<Role> {
    const permissions = await this.permissionModel.find({ key: { $in: permissionKeys } }).exec();
    const role = new this.roleModel({
      name,
      description,
      permissions: permissions.map(p => p._id),
    });
    return role.save();
  }

  async updateRole(id: string, updates: Partial<Role>, permissionKeys?: string[]): Promise<Role | null> {
    const updateData: any = { ...updates };
    
    if (permissionKeys) {
      const permissions = await this.permissionModel.find({ key: { $in: permissionKeys } }).exec();
      updateData.permissions = permissions.map(p => p._id);
    }

    return this.roleModel.findByIdAndUpdate(id, updateData, { new: true }).populate('permissions').exec();
  }

  async deleteRole(id: string): Promise<boolean> {
    const role = await this.roleModel.findById(id).exec();
    if (role?.isSystem) {
      throw new Error('Cannot delete system roles');
    }
    const result = await this.roleModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  private async findRoleByIdOrName(roleId: string): Promise<Role | null> {
    // Check if it's a valid ObjectId
    if (Types.ObjectId.isValid(roleId)) {
      return this.roleModel.findById(roleId).populate('permissions').exec();
    }
    // Otherwise treat it as a role name
    return this.roleModel.findOne({ name: roleId }).populate('permissions').exec();
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
    const role = await this.findRoleByIdOrName(roleId);
    if (!role) return [];
    return role.permissions.map((p: any) => p.key);
  }

  async hasPermission(roleId: string, permissionKey: string): Promise<boolean> {
    const role = await this.findRoleByIdOrName(roleId);
    if (!role) return false;
    return role.permissions.some((p: any) => p.key === permissionKey);
  }

  // Alias for hasPermission - used by controllers
  async checkPermission(roleId: string, permissionKey: string, tenantId?: string): Promise<boolean> {
    // Admin/Super Admin always have permission
    const role = await this.findRoleByIdOrName(roleId);
    if (role?.name === 'Admin' || role?.name === 'Super Admin') {
      return true;
    }
    if (!role) return false;
    return role.permissions.some((p: any) => p.key === permissionKey);
  }

  // Validate action throws ForbiddenException if permission is not granted
  async validateAction(roleId: string, permissionKey: string, tenantId?: string): Promise<void> {
    const hasPerm = await this.checkPermission(roleId, permissionKey, tenantId);
    if (!hasPerm) {
      throw new Error(`Permission denied: ${permissionKey} required`);
    }
  }

  // ==================== COLUMN PERMISSION METHODS ====================

  async seedDefaultColumnPermissions(): Promise<void> {
    const roles = await this.roleModel.find().exec();
    
    for (const role of roles) {
      for (const [module, columns] of Object.entries(PermissionService.MODULE_COLUMNS)) {
        for (const columnName of columns) {
          await this.roleColumnPermissionModel.findOneAndUpdate(
            { roleId: role._id.toString(), module, columnName },
            { 
              roleId: role._id.toString(), 
              module, 
              columnName, 
              isVisible: true // Default all columns to visible
            },
            { upsert: true, new: true }
          );
        }
      }
    }
  }

  async getRoleColumnPermissions(roleId: string, module?: string): Promise<RoleColumnPermission[]> {
    const query: any = { roleId };
    if (module) {
      query.module = module;
    }
    return this.roleColumnPermissionModel.find(query).exec();
  }

  async getRoleColumnPermissionsMap(roleId: string): Promise<Record<string, string[]>> {
    const permissions = await this.roleColumnPermissionModel.find({ roleId }).exec();
    const result: Record<string, string[]> = {};
    
    for (const perm of permissions) {
      if (perm.isVisible) {
        if (!result[perm.module]) {
          result[perm.module] = [];
        }
        result[perm.module].push(perm.columnName);
      }
    }
    
    return result;
  }

  async updateColumnPermission(
    roleId: string, 
    module: string, 
    columnName: string, 
    isVisible: boolean
  ): Promise<RoleColumnPermission> {
    return this.roleColumnPermissionModel.findOneAndUpdate(
      { roleId, module, columnName },
      { roleId, module, columnName, isVisible },
      { upsert: true, new: true }
    ).exec();
  }

  async updateMultipleColumnPermissions(
    roleId: string,
    module: string,
    columns: Record<string, boolean>
  ): Promise<RoleColumnPermission[]> {
    const results: RoleColumnPermission[] = [];
    
    for (const [columnName, isVisible] of Object.entries(columns)) {
      const result = await this.updateColumnPermission(roleId, module, columnName, isVisible);
      results.push(result);
    }
    
    return results;
  }

  async isColumnVisible(roleId: string, module: string, columnName: string): Promise<boolean> {
    const perm = await this.roleColumnPermissionModel.findOne({ roleId, module, columnName }).exec();
    return perm?.isVisible ?? true; // Default to visible if not set
  }

<<<<<<< Updated upstream
=======
  // ==================== HELPER METHODS FOR CONTROLLERS ====================

>>>>>>> Stashed changes
  async copyColumnPermissions(sourceRoleId: string, targetRoleId: string): Promise<void> {
    const sourcePermissions = await this.roleColumnPermissionModel.find({ roleId: sourceRoleId }).exec();
    
    for (const perm of sourcePermissions) {
      await this.roleColumnPermissionModel.findOneAndUpdate(
        { roleId: targetRoleId, module: perm.module, columnName: perm.columnName },
        {
          roleId: targetRoleId,
          module: perm.module,
          columnName: perm.columnName,
          isVisible: perm.isVisible
        },
        { upsert: true, new: true }
      );
    }
  }

  getModuleColumns(module: string): string[] {
    return PermissionService.MODULE_COLUMNS[module] || [];
  }

  getAllModulesWithColumns(): Record<string, string[]> {
    return { ...PermissionService.MODULE_COLUMNS };
  }

  // ==================== DATA SCOPE METHODS ====================

  async getRoleModulePermission(roleId: string, module: string, tenantId?: string): Promise<RoleModulePermission | null> {
    const query: any = { roleId, module };
    if (tenantId) {
      query.tenantId = new Types.ObjectId(tenantId);
    }
    const found = await this.roleModulePermissionModel.findOne(query).exec();
    if (found) return found;

    // Backward compatibility: older records may not have tenantId set.
    // If tenantId-scoped lookup misses, try tenant-agnostic.
    if (tenantId) {
      return this.roleModulePermissionModel.findOne({ roleId, module }).exec();
    }
    return null;
  }

  async getAllRoleModulePermissions(roleId: string, tenantId?: string): Promise<RoleModulePermission[]> {
    const query: any = { roleId };
    if (tenantId) {
      query.tenantId = new Types.ObjectId(tenantId);
    }
    return this.roleModulePermissionModel.find(query).exec();
  }

  async setRoleModulePermission(
    roleId: string,
    module: string,
    actions: any,
    dataScope: DataScope,
    tenantId?: string,
  ): Promise<RoleModulePermission> {
    const query: any = { roleId, module };
    if (tenantId) {
      query.tenantId = new Types.ObjectId(tenantId);
    }

    const update = {
      roleId,
      module,
      actions: this.normalizeActionsObject(actions),
      dataScope,
      tenantId: tenantId ? new Types.ObjectId(tenantId) : undefined,
      updatedAt: new Date(),
    };

    return this.roleModulePermissionModel.findOneAndUpdate(
      query,
      update,
      { upsert: true, new: true },
    ).exec();
  }

  async getDataScope(roleId: string, module: string, tenantId?: string): Promise<DataScope> {
    // Admin/Super Admin always have ALL scope
    const role = await this.findRoleByIdOrName(roleId);
    if (role?.name === 'Admin' || role?.name === 'Super Admin') {
      return DataScope.ALL;
    }

    const perm = await this.getRoleModulePermission(roleId, module, tenantId);
    return perm?.dataScope || DataScope.OWN;
  }

  async checkModuleAction(
    roleId: string,
    module: string,
    action: string,
    tenantId?: string,
  ): Promise<boolean> {
    // Admin/Super Admin always have permission
    const role = await this.findRoleByIdOrName(roleId);
    if (role?.name === 'Admin' || role?.name === 'Super Admin') {
      return true;
    }

    const perm = await this.getRoleModulePermission(roleId, module, tenantId);
    if (!perm) return false;

    const normalizedAction = this.normalizeActionKey(action);
    if (normalizedAction === 'checkin_checkout') {
      return (perm.actions as Record<string, boolean>).checkin === true || (perm.actions as Record<string, boolean>).checkout === true;
    }
    return (perm.actions as Record<string, boolean>)[normalizedAction] === true;
  }

  async seedDefaultModulePermissions(tenantId?: string): Promise<void> {
    const roles = await this.roleModel.find().exec();
    const modules = ['employees', 'leaves', 'attendance', 'payroll', 'increments', 'departments'];

    for (const role of roles) {
      for (const module of modules) {
        const query: any = { roleId: role._id.toString(), module };
        if (tenantId) {
          query.tenantId = new Types.ObjectId(tenantId);
        }

        const existing = await this.roleModulePermissionModel.findOne(query).exec();
        if (!existing) {
          // Set default permissions based on role
          let actions: any = {
            view: false,
            create: false,
            edit: false,
            delete: false,
            export: false,
            assign: false,
            approve: false,
            reject: false,
            checkin: false,
            checkout: false,
            apply: false,
            generate: false,
          };
          let dataScope = DataScope.OWN;

          if (role.name === 'Admin' || role.name === 'Super Admin') {
            actions = {
              view: true, create: true, edit: true, delete: true,
              export: true, assign: true, approve: true, reject: true,
              checkin: true, checkout: true, apply: true, generate: true,
            };
            dataScope = DataScope.ALL;
          } else if (role.name === 'HR Manager') {
            actions.view = true;
            if (module === 'employees') {
              actions.create = true; actions.edit = true; actions.export = true; actions.assign = true;
              dataScope = DataScope.ALL;
            } else if (module === 'leaves') {
              actions.apply = true; actions.approve = true; actions.reject = true; actions.delete = true;
              dataScope = DataScope.ALL;
            } else if (module === 'attendance') {
              actions.checkin = true; actions.checkout = true; actions.edit = true; actions.delete = true;
              dataScope = DataScope.ALL;
            } else if (module === 'payroll') {
              actions.view = true; actions.generate = true; actions.edit = true; actions.delete = true;
              dataScope = DataScope.ALL;
            } else if (module === 'increments') {
              actions.view = true; actions.create = true; actions.edit = true; actions.delete = true;
              dataScope = DataScope.ALL;
            } else if (module === 'departments') {
              actions.view = true; actions.create = true; actions.edit = true; actions.delete = true; actions.assign = true;
              dataScope = DataScope.ALL;
            }
          } else if (role.name === 'Employee') {
            if (module === 'employees') {
              actions.view = true; // Employee can view own employee record
            } else if (module === 'leaves') {
              actions.view = true; actions.apply = true;
            } else if (module === 'attendance') {
              actions.checkin = true; actions.checkout = true; actions.view = true;
            } else if (module === 'payroll') {
              actions.view = true;
            }
            dataScope = DataScope.OWN;
          }

          await this.roleModulePermissionModel.create({
            roleId: role._id.toString(),
            module,
            actions,
            dataScope,
            tenantId: tenantId ? new Types.ObjectId(tenantId) : undefined,
          });
        }
      }
    }
  }

  // Helper to build query filter based on data scope
  buildDataScopeQuery(
    userId: string,
    departmentId?: string,
    dataScope: DataScope = DataScope.OWN,
  ): any {
    switch (dataScope) {
      case DataScope.OWN:
        return { employeeId: userId };
      case DataScope.DEPARTMENT:
        return departmentId ? { departmentId } : { employeeId: userId };
      case DataScope.ALL:
      default:
        return {};
    }
  }
}
