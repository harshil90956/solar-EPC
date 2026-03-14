import { Controller, Get, Post, Patch, Delete, Body, Param, Req, HttpCode, HttpStatus, UseGuards, ForbiddenException } from '@nestjs/common';
import { DepartmentService } from '../services/department.service';
import { PermissionService } from '../services/permission.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from '../dto/department.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('hrm/departments')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DepartmentController {
  constructor(
    private readonly departmentService: DepartmentService,
    private readonly permissionService: PermissionService,
  ) {}

  private async checkPermission(req: any, permission: string) {
    const user = req.user;
    if (!user) throw new ForbiddenException('User not authenticated');
    
    // Super admin bypass
    if (user.role === 'Super Admin' || user.role === 'Admin') return true;
    
    // Check user permissions from JWT
    if (user.permissions && Array.isArray(user.permissions)) {
      if (user.permissions.includes(permission)) return true;
    }
    
    const roleId = user.roleId || user.role;
    if (!roleId) throw new ForbiddenException('User has no role assigned');
    
    const hasPermission = await this.permissionService.hasPermission(roleId, permission);
    if (!hasPermission) {
      throw new ForbiddenException(`Permission denied: ${permission} required`);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateDepartmentDto, @Req() req: any) {
    await this.checkPermission(req, 'departments.create');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.query.tenantId;
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'departments.manage', tenantId);

    const data = await this.departmentService.create(createDto, tenantId, req.user);
    return { success: true, data };
  }

  @Get()
  async findAll(@Req() req: any) {
    await this.checkPermission(req, 'departments.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.query.tenantId;
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'departments.view', tenantId);

    const data = await this.departmentService.findAll(tenantId, req.user);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'departments.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.query.tenantId;
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'departments.view', tenantId);

    const data = await this.departmentService.findOne(id, tenantId, req.user);
    return { success: true, data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateDepartmentDto, @Req() req: any) {
    await this.checkPermission(req, 'departments.edit');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.query.tenantId;
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'departments.manage', tenantId);

    const data = await this.departmentService.update(id, updateDto, tenantId, req.user);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'departments.delete');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.query.tenantId;
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'departments.manage', tenantId);

    await this.departmentService.delete(id, tenantId, req.user);
    return { success: true, message: 'Department deleted successfully' };
  }
}
