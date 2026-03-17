import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, HttpCode, HttpStatus, UseGuards, ForbiddenException } from '@nestjs/common';
import { SalaryIncrementService } from '../services/salary-increment.service';
import { HrmPermissionService } from '../services/hrm-permission.service';
import { CreateIncrementDto, GetIncrementQueryDto, UpdateIncrementDto } from '../dto/salary-increment.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('hrm/increments')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SalaryIncrementController {
  constructor(
    private readonly incrementService: SalaryIncrementService,
    private readonly hrmPermissionService: HrmPermissionService,
  ) {}

  private async checkPermission(req: any, permission: string) {
    const user = req.user;
    if (!user) throw new ForbiddenException('User not authenticated');

    // Fast-path: honor permissions already present on JWT/user payload
    const userPerms: string[] = Array.isArray(user?.permissions) ? user.permissions : [];
    const [module, action] = permission.split('.');
    const modulePerms = user?.modulePermissions?.[module];

    if (userPerms.includes(permission) || userPerms.includes(permission.replace('.', ':'))) {
      return;
    }

    if (modulePerms?.actions?.includes(action)) {
      return;
    }

    const roleId = user.roleId || user.role;
    if (!roleId) throw new ForbiddenException('User has no role assigned');
    
    const hasPermission = await this.hrmPermissionService.checkPermission(roleId, permission);
    if (!hasPermission) {
      throw new ForbiddenException(`Permission denied: ${permission} required`);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateIncrementDto, @Req() req: any) {
    await this.checkPermission(req, 'increments.create');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'increments.manage', tenantId);
    
    const data = await this.incrementService.create(createDto, tenantId, req.user);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: GetIncrementQueryDto, @Req() req: any) {
    await this.checkPermission(req, 'increments.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    
    // Check if user can view all increments or just their own
    const hasFullAccess = await this.hrmPermissionService.checkPermission(roleId, 'increments.view', tenantId);
    const targetEmployeeId = hasFullAccess ? query.employeeId : req.user.sub;

    const data = await this.incrementService.findAll(targetEmployeeId, tenantId, req.user);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'increments.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    
    const data = await this.incrementService.findOne(id, tenantId, req.user);
    
    // Check ownership or full access
    if (data.employeeId?.toString() !== req.user.sub) {
      await this.hrmPermissionService.validateAction(roleId, 'increments.view', tenantId);
    }
    
    return { success: true, data };
  }

  @Get('employee/:employeeId')
  async findByEmployee(@Param('employeeId') employeeId: string, @Req() req: any) {
    await this.checkPermission(req, 'increments.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    
    if (employeeId !== req.user.sub) {
      await this.hrmPermissionService.validateAction(roleId, 'increments.view', tenantId);
    }
    
    const data = await this.incrementService.findByEmployeeId(employeeId, tenantId, req.user);
    return { success: true, data };
  }

  @Get('history/:employeeId')
  async getIncrementHistory(@Param('employeeId') employeeId: string, @Req() req: any) {
    await this.checkPermission(req, 'increments.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    
    if (employeeId !== req.user.sub) {
      await this.hrmPermissionService.validateAction(roleId, 'increments.view', tenantId);
    }
    
    const data = await this.incrementService.getIncrementHistory(employeeId, tenantId, req.user);
    return { success: true, data };
  }

  @Get('latest-salary/:employeeId')
  async getLatestSalary(@Param('employeeId') employeeId: string, @Req() req: any) {
    await this.checkPermission(req, 'increments.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    
    if (employeeId !== req.user.sub) {
      await this.hrmPermissionService.validateAction(roleId, 'increments.view', tenantId);
    }
    
    const data = await this.incrementService.getLatestSalary(employeeId, tenantId, req.user);
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
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'increments.manage', tenantId);
    
    const data = await this.incrementService.update(id, updateDto, tenantId, req.user);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'increments.delete');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'increments.manage', tenantId);
    
    await this.incrementService.delete(id, tenantId, req.user);
    return { success: true, message: 'Salary increment deleted successfully' };
  }
}
