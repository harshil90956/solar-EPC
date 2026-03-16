import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Permission, PermissionModule, PermissionAction } from '../schemas/permission.schema';
import { Role } from '../schemas/role.schema';
import { RoleColumnPermission } from '../schemas/role-column-permission.schema';

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
  ) {}

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
  async checkPermission(roleId: string, permissionKey: string, _tenantId?: string): Promise<boolean> {
    return this.hasPermission(roleId, permissionKey);
  }

  // Validate action throws ForbiddenException if permission is not granted
  async validateAction(roleId: string, permissionKey: string, _tenantId?: string): Promise<void> {
    const hasPerm = await this.hasPermission(roleId, permissionKey);
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

  // ==================== HELPER METHODS FOR CONTROLLERS ====================

  async checkPermission(roleId: string, permissionKey: string, tenantId?: string): Promise<boolean> {
    // Admin/Super Admin always have permission
    const role = await this.findRoleByIdOrName(roleId);
    if (role?.name === 'Admin' || role?.name === 'Super Admin') {
      return true;
    }
    if (!role) return false;
    return role.permissions.some((p: any) => p.key === permissionKey);
  }

  async validateAction(roleId: string, permissionKey: string, tenantId?: string): Promise<void> {
    const hasPerm = await this.checkPermission(roleId, permissionKey, tenantId);
    if (!hasPerm) {
      throw new Error(`Permission denied: ${permissionKey} required`);
    }
  }

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
}
