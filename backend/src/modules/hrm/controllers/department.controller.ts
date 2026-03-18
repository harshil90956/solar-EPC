import { Controller, Get, Post, Patch, Delete, Body, Param, Req, HttpCode, HttpStatus, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DepartmentService } from '../services/department.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from '../dto/department.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionEngineService } from '../../../common/services/permission-engine.service';

@Controller('hrm/departments')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DepartmentController {
  constructor(
    private readonly departmentService: DepartmentService,
    private readonly permissionEngine: PermissionEngineService,
  ) {}

  private async getDataScope(req: any, moduleId: string): Promise<string> {
    const user = req.user;
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const userId = user?.id || user?._id || user?.sub;
    const roleIdRaw = user?.roleId || user?.customRoleId || user?.role;
    const roleId = typeof roleIdRaw === 'string' ? roleIdRaw : (roleIdRaw ? String(roleIdRaw) : '');
    if (!tenantId || !userId || !roleId) return 'all';

    const { dataScope } = await this.permissionEngine.getPermissions(
      String(userId),
      String(tenantId),
      String(roleId),
    );
    const scopeRaw = dataScope?.[moduleId] || 'all';
    return String(scopeRaw).toLowerCase();
  }

  private async checkPermission(req: any, permission: string) {
    const user = req.user;
    if (!user) throw new ForbiddenException('User not authenticated');

    const tenantId = req.tenant?.id || req.user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context missing. Access denied.');
    }

    const userId = user.id || user._id || user.sub;
    const roleIdRaw = user.roleId || user.customRoleId || user.role;
    const roleId = typeof roleIdRaw === 'string' ? roleIdRaw : (roleIdRaw ? String(roleIdRaw) : '');

    if (!userId || !roleId) {
      throw new ForbiddenException('User ID or role not found in token');
    }

    const [moduleId, actionId] = String(permission || '').split('.');
    if (!moduleId || !actionId) {
      throw new ForbiddenException('Invalid permission format');
    }

    const { permissions } = await this.permissionEngine.getPermissions(
      String(userId),
      String(tenantId),
      String(roleId),
    );

    if (permissions?.[moduleId]?.[actionId] !== true) {
      throw new ForbiddenException(`Permission denied: ${permission} required`);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateDepartmentDto, @Req() req: any) {
    await this.checkPermission(req, 'departments.create');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.query.tenantId;

    const data = await this.departmentService.create(createDto, tenantId, req.user);
    return { success: true, data };
  }

  @Get()
  async findAll(@Req() req: any) {
    await this.checkPermission(req, 'departments.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.query.tenantId;

    const data = await this.departmentService.findAll(tenantId, req.user);

    const scope = await this.getDataScope(req, 'departments');
    if (scope === 'own' || scope === 'department') {
      const deptName = req.user?.department;
      const filtered = deptName ? (data || []).filter((d: any) => String(d?.name || '') === String(deptName)) : [];
      return { success: true, data: filtered };
    }

    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'departments.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.query.tenantId;

    const data = await this.departmentService.findOne(id, tenantId, req.user);

    const scope = await this.getDataScope(req, 'departments');
    if (scope === 'own' || scope === 'department') {
      const deptName = req.user?.department;
      if (!deptName || String(data?.name || '') !== String(deptName)) {
        throw new NotFoundException('Department not found');
      }
    }

    return { success: true, data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateDepartmentDto, @Req() req: any) {
    await this.checkPermission(req, 'departments.edit');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.query.tenantId;

    const data = await this.departmentService.update(id, updateDto, tenantId, req.user);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'departments.delete');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.query.tenantId;

    await this.departmentService.delete(id, tenantId, req.user);
    return { success: true, message: 'Department deleted successfully' };
  }
}
