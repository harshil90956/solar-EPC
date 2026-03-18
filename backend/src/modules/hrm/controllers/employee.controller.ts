import { Controller, Get, Post, Patch, Delete, Body, Param, Req, Headers, Query, HttpCode, HttpStatus, UnauthorizedException, UseGuards, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmployeeService } from '../services/employee.service';
import { PermissionService } from '../services/permission.service';
import { DataScope } from '../schemas/permission.schema';
import { CreateEmployeeDto, UpdateEmployeeDto } from '../dto/employee.dto';
import { EmployeeDocument } from '../schemas/employee.schema';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('hrm/employees')
@UseGuards(JwtAuthGuard, TenantGuard)
export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly permissionService: PermissionService,
    private readonly configService: ConfigService,
  ) {}

  private async checkPermission(req: any, module: string, action: string) {
    const user = req.user;
    if (!user) throw new ForbiddenException('User not authenticated');

    // NEW: Check permissions from req.user.permissions object (single source of truth)
    // Format: { employees: { view: true, edit: false }, attendance: { view: true } }
    if (user?.permissions && typeof user.permissions === 'object') {
      const modulePerms = user.permissions[module];
      if (modulePerms && typeof modulePerms === 'object') {
        if (modulePerms[action] === true) {
          return; // Permission granted
        }
        if (modulePerms[action] === false) {
          throw new ForbiddenException(`Permission denied: ${module}.${action} required`);
        }
      }
    }

    // Fallback: Check legacy format for backward compatibility during transition
    const userPerms: string[] = Array.isArray(user?.permissions) ? user.permissions : [];
    if (userPerms.length > 0) {
      const keyColon = `${module}:${action}`;
      const keyDot = `${module}.${action}`;
      if (userPerms.includes(keyColon) || userPerms.includes(keyDot)) {
        return;
      }
    }

    // Fallback: Check modulePermissions (legacy format)
    const modulePermsLegacy = user?.modulePermissions?.[module];
    if (modulePermsLegacy?.actions?.includes(action)) {
      return;
    }

    // No permission found - check via PermissionService as last resort
    const roleId = user.roleId || user.role;
    if (!roleId) throw new ForbiddenException('User has no role assigned');

    const tenantId = req.tenant?.id || req.user?.tenantId;
    const hasPermission = await this.permissionService.checkModuleAction(roleId, module, action, tenantId);
    if (!hasPermission) {
      throw new ForbiddenException(`Permission denied: ${module}.${action} required`);
    }
  }

  private async getDataScopeFilter(req: any, module: string): Promise<any> {
    const user = req.user;
    const userDepartment = user?.department;

    // NEW: Check dataScope from req.user.dataScope object (single source of truth)
    // Format: { employees: 'OWN', attendance: 'ALL', leaves: 'DEPARTMENT' }
    if (user?.dataScope && typeof user.dataScope === 'object' && !Array.isArray(user.dataScope)) {
      const scope = user.dataScope[module];
      if (scope) {
        switch (scope) {
          case 'OWN':
            return { employeeId: user?.sub };
          case 'DEPARTMENT':
            return userDepartment ? { department: userDepartment } : { employeeId: user?.sub };
          case 'ALL':
            return {};
          default:
            return {}; // Default to ALL if unknown scope
        }
      }
    }

    // Legacy: Check if dataScope is a string (old format)
    if (typeof user?.dataScope === 'string') {
      switch (user.dataScope) {
        case 'OWN':
          return { employeeId: user?.sub };
        case 'DEPARTMENT':
          return userDepartment ? { department: userDepartment } : { employeeId: user?.sub };
        case 'ALL':
        default:
          return {};
      }
    }

    // Fallback: Check modulePermissions (legacy format)
    const modulePermsLegacy = user?.modulePermissions?.[module];
    if (modulePermsLegacy?.dataScope) {
      const dataScope = modulePermsLegacy.dataScope;
      switch (dataScope) {
        case DataScope.OWN:
          return { employeeId: user?.sub };
        case DataScope.DEPARTMENT:
          return userDepartment ? { department: userDepartment } : { employeeId: user?.sub };
        case DataScope.ALL:
        default:
          return {};
      }
    }

    // Default fallback
    return {};
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: { email: string; password: string },
    @Req() req: any,
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    // For login, try to resolve tenantId from headers, query, or context.
    // If multiple tenants exist, we need to know which one the user belongs to.
    const tenantId = headerTenantId || queryTenantId || req.tenant?.id || req.user?.tenantId;
    
    // If no tenantId provided, we'll try to find the employee across all tenants by email.
    // This is useful if the frontend hasn't set the tenant context yet.
    const resolvedTenantId = tenantId || 'ANY_TENANT';

    const employee = await this.employeeService.validateLogin(loginDto.email, loginDto.password, resolvedTenantId) as EmployeeDocument | null;
    
    if (!employee) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // IMPORTANT:
    // Always embed the employee's actual tenant ObjectId in the JWT.
    // The incoming tenantId may be a placeholder like 'default' if frontend didn't send x-tenant-id.
    const effectiveTenantId = employee?.tenantId ? String(employee.tenantId) : tenantId;

    // Get role permissions from unified system
    const roleId = employee.roleId?.toString() || '';
    const permissions = await this.permissionService.getRolePermissions(roleId);
    const modulePermissions = await this.permissionService.getAllRoleModulePermissions(roleId, effectiveTenantId);

    // Generate JWT token using same secret as JwtStrategy
    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    const token = require('jsonwebtoken').sign(
      {
        sub: employee._id,
        email: employee.email,
        role: 'Employee',
        roleId: employee.roleId,
        tenantId: effectiveTenantId,
        department: employee.department,
        permissions,
        modulePermissions: modulePermissions.reduce((acc: Record<string, any>, mp) => {
          acc[mp.module] = { actions: mp.actions, dataScope: mp.dataScope };
          return acc;
        }, {}),
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    return {
      success: true,
      data: {
        id: employee._id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        roleId: employee.roleId,
        department: employee.department,
        tenantId: effectiveTenantId,
        permissions,
        token
      }
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createEmployeeDto: CreateEmployeeDto, @Req() req: any) {
    await this.checkPermission(req, 'employees', 'create');
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';

    const data = await this.employeeService.create(createEmployeeDto, tenantId);
    return { success: true, data };
  }

  @Get()
  async findAll(@Req() req: any) {
    await this.checkPermission(req, 'employees', 'view');
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';

    // Get data scope filter
    const scopeFilter = await this.getDataScopeFilter(req, 'employees');

    // Fetch all employees for the tenant
    const allData = await this.employeeService.findAll(tenantId);

    // Normalize data for frontend (convert Dates to ISO strings)
    const normalizedData = allData.map((e: any) => ({
      ...e,
      _id: e._id?.toString(),
      joiningDate: e.joiningDate ? new Date(e.joiningDate).toISOString() : null,
      createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : null,
      updatedAt: e.updatedAt ? new Date(e.updatedAt).toISOString() : null,
    }));

    // Apply data scope filtering
    let filteredData = normalizedData;
    if (scopeFilter.employeeId) {
      filteredData = normalizedData.filter((e: any) =>
        e._id === scopeFilter.employeeId ||
        e.employeeId === scopeFilter.employeeId
      );
    } else if (scopeFilter.department) {
      filteredData = normalizedData.filter((e: any) => e.department === scopeFilter.department);
    }

    return { success: true, data: filteredData };
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    await this.checkPermission(req, 'employees', 'view');
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';

    // Get data scope filter
    const scopeFilter = await this.getDataScopeFilter(req, 'employees');

    // Fetch all employees
    const allData = await this.employeeService.findAll(tenantId);

    // Normalize data (convert Dates to strings)
    const normalizedData = allData.map((e: any) => ({
      ...e,
      _id: e._id?.toString(),
      joiningDate: e.joiningDate ? new Date(e.joiningDate).toISOString() : null,
    }));

    // Apply data scope filtering
    let filteredData = normalizedData;
    if (scopeFilter.employeeId) {
      filteredData = normalizedData.filter((e: any) =>
        e._id === scopeFilter.employeeId
      );
    } else if (scopeFilter.department) {
      filteredData = normalizedData.filter((e: any) => e.department === scopeFilter.department);
    }

    const stats = {
      total: filteredData.length,
      active: filteredData.filter((e: any) => e.status === 'active').length,
      inactive: filteredData.filter((e: any) => e.status === 'inactive').length,
      suspended: filteredData.filter((e: any) => e.status === 'suspended').length,
      terminated: filteredData.filter((e: any) => e.status === 'terminated').length,
    };
    return { success: true, data: stats };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'employees', 'view');
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';

    const data = await this.employeeService.findOne(id, tenantId);

    // Check if user can access this specific employee based on data scope
    const scopeFilter = await this.getDataScopeFilter(req, 'employees');

    if (scopeFilter.employeeId && data._id?.toString() !== req.user?.sub && data.employeeId !== req.user?.sub) {
      throw new ForbiddenException('You can only view your own employee record');
    }

    if (scopeFilter.department && data.department !== scopeFilter.department) {
      throw new ForbiddenException('You can only view employees in your department');
    }

    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'employees', 'edit');
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';

    // Check data scope - can only edit if has access to this employee
    const scopeFilter = await this.getDataScopeFilter(req, 'employees');
    const existingEmployee = await this.employeeService.findOne(id, tenantId);

    if (scopeFilter.employeeId && existingEmployee._id?.toString() !== req.user?.sub) {
      throw new ForbiddenException('You can only edit your own employee record');
    }

    if (scopeFilter.department && existingEmployee.department !== scopeFilter.department) {
      throw new ForbiddenException('You can only edit employees in your department');
    }

    const data = await this.employeeService.update(id, updateEmployeeDto, tenantId);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'employees', 'delete');
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';

    // Check data scope - can only delete if has access to this employee
    const scopeFilter = await this.getDataScopeFilter(req, 'employees');
    const existingEmployee = await this.employeeService.findOne(id, tenantId);

    if (scopeFilter.employeeId && existingEmployee._id?.toString() !== req.user?.sub) {
      throw new ForbiddenException('You can only delete your own employee record');
    }

    if (scopeFilter.department && existingEmployee.department !== scopeFilter.department) {
      throw new ForbiddenException('You can only delete employees in your department');
    }

    const data = await this.employeeService.remove(id, tenantId);
    return { success: true, data };
  }

  @Get('by-department/:department')
  async findByDepartment(@Param('department') department: string, @Req() req: any) {
    await this.checkPermission(req, 'employees', 'view');
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';

    // Check data scope - can only view own department
    const scopeFilter = await this.getDataScopeFilter(req, 'employees');

    if (scopeFilter.department && scopeFilter.department !== department) {
      throw new ForbiddenException('You can only view employees in your department');
    }

    const data = await this.employeeService.findByDepartment(department, tenantId);

    // Normalize data for frontend
    const normalizedData = data.map((e: any) => ({
      ...e,
      _id: e._id?.toString(),
      joiningDate: e.joiningDate ? new Date(e.joiningDate).toISOString() : null,
      createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : null,
      updatedAt: e.updatedAt ? new Date(e.updatedAt).toISOString() : null,
    }));

    return { success: true, data: normalizedData };
  }

  @Get('by-role/:roleId')
  async findByRole(@Param('roleId') roleId: string, @Req() req: any) {
    await this.checkPermission(req, 'employees', 'view');
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';

    const data = await this.employeeService.findByRole(roleId, tenantId);

    // Normalize data for frontend
    const normalizedData = data.map((e: any) => ({
      ...e,
      _id: e._id?.toString(),
      joiningDate: e.joiningDate ? new Date(e.joiningDate).toISOString() : null,
      createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : null,
      updatedAt: e.updatedAt ? new Date(e.updatedAt).toISOString() : null,
    }));

    // Apply data scope filtering
    const scopeFilter = await this.getDataScopeFilter(req, 'employees');
    let filteredData = normalizedData;

    if (scopeFilter.employeeId) {
      filteredData = normalizedData.filter((e: any) => e._id === scopeFilter.employeeId);
    } else if (scopeFilter.department) {
      filteredData = normalizedData.filter((e: any) => e.department === scopeFilter.department);
    }

    return { success: true, data: filteredData };
  }
}
