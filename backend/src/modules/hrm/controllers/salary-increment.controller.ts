import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, HttpCode, HttpStatus, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SalaryIncrementService } from '../services/salary-increment.service';
import { CreateIncrementDto, GetIncrementQueryDto, UpdateIncrementDto } from '../dto/salary-increment.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionEngineService } from '../../../common/services/permission-engine.service';

@Controller('hrm/increments')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SalaryIncrementController {
  constructor(
    private readonly incrementService: SalaryIncrementService,
    private readonly permissionEngine: PermissionEngineService,
  ) {}

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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateIncrementDto, @Req() req: any) {
    await this.checkPermission(req, 'increments.create');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    
    const data = await this.incrementService.create(createDto, tenantId, req.user);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: GetIncrementQueryDto, @Req() req: any) {
    await this.checkPermission(req, 'increments.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];

    const scope = await this.getDataScope(req, 'increments');
    const targetEmployeeId = scope === 'own' ? req.user.sub : query.employeeId;

    const data = await this.incrementService.findAll(targetEmployeeId, tenantId, req.user);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'increments.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    
    const data = await this.incrementService.findOne(id, tenantId, req.user);
    
    const scope = await this.getDataScope(req, 'increments');
    if (scope === 'own' && data.employeeId?.toString() !== req.user.sub) {
      throw new NotFoundException('Increment not found');
    }
    
    return { success: true, data };
  }

  @Get('employee/:employeeId')
  async findByEmployee(@Param('employeeId') employeeId: string, @Req() req: any) {
    await this.checkPermission(req, 'increments.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];

    const scope = await this.getDataScope(req, 'increments');
    const effectiveEmployeeId = scope === 'own' ? req.user.sub : employeeId;
    
    const data = await this.incrementService.findByEmployeeId(effectiveEmployeeId, tenantId, req.user);
    return { success: true, data };
  }

  @Get('history/:employeeId')
  async getIncrementHistory(@Param('employeeId') employeeId: string, @Req() req: any) {
    await this.checkPermission(req, 'increments.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];

    const scope = await this.getDataScope(req, 'increments');
    const effectiveEmployeeId = scope === 'own' ? req.user.sub : employeeId;
    
    const data = await this.incrementService.getIncrementHistory(effectiveEmployeeId, tenantId, req.user);
    return { success: true, data };
  }

  @Get('latest-salary/:employeeId')
  async getLatestSalary(@Param('employeeId') employeeId: string, @Req() req: any) {
    await this.checkPermission(req, 'increments.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];

    const scope = await this.getDataScope(req, 'increments');
    const effectiveEmployeeId = scope === 'own' ? req.user.sub : employeeId;
    
    const data = await this.incrementService.getLatestSalary(effectiveEmployeeId, tenantId, req.user);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateIncrementDto,
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'increments.edit');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    
    const data = await this.incrementService.update(id, updateDto, tenantId, req.user);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'increments.delete');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    
    await this.incrementService.delete(id, tenantId, req.user);
    return { success: true, message: 'Salary increment deleted successfully' };
  }
}
