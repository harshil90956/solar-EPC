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

    // Fast-path: honor permissions already present on JWT/user payload
    // Supports:
    // 1. permissions array: ["employees.view", "employees:view"]
    // 2. modulePermissions object: { employees: { actions: ["view"], ... } }
    const userPerms: string[] = Array.isArray(user?.permissions) ? user.permissions : [];
    const modulePerms = user?.modulePermissions?.[module];
    
    const keyColon = `${module}:${action}`;
    const keyDot = `${module}.${action}`;
    
    if (userPerms.includes(keyColon) || userPerms.includes(keyDot)) {
      return;
    }

    if (modulePerms?.actions?.includes(action)) {
      return;
    }

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
    const roleId = user?.roleId || user?.role;
    const tenantId = req.tenant?.id;

    if (!roleId) return { employeeId: user?.sub };

    const dataScope = await this.permissionService.getDataScope(roleId, module, tenantId);
    const userDepartment = user?.department;

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

    // Apply data scope filtering
    let filteredData = allData;
    if (scopeFilter.employeeId) {
      filteredData = allData.filter((e: any) =>
        e._id?.toString() === scopeFilter.employeeId ||
        e.employeeId === scopeFilter.employeeId
      );
    } else if (scopeFilter.department) {
      filteredData = allData.filter((e: any) => e.department === scopeFilter.department);
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

    // Apply data scope filtering
    let filteredData = allData;
    if (scopeFilter.employeeId) {
      filteredData = allData.filter((e: any) =>
        e._id?.toString() === scopeFilter.employeeId
      );
    } else if (scopeFilter.department) {
      filteredData = allData.filter((e: any) => e.department === scopeFilter.department);
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
    return { success: true, data };
  }

  @Get('by-role/:roleId')
  async findByRole(@Param('roleId') roleId: string, @Req() req: any) {
    await this.checkPermission(req, 'employees', 'view');
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';

    const data = await this.employeeService.findByRole(roleId, tenantId);

    // Apply data scope filtering
    const scopeFilter = await this.getDataScopeFilter(req, 'employees');
    let filteredData = data;

    if (scopeFilter.employeeId) {
      filteredData = data.filter((e: any) => e._id?.toString() === scopeFilter.employeeId);
    } else if (scopeFilter.department) {
      filteredData = data.filter((e: any) => e.department === scopeFilter.department);
    }

    return { success: true, data: filteredData };
  }
}
