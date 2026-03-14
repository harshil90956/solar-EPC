import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, HttpCode, HttpStatus, UseGuards, ForbiddenException } from '@nestjs/common';
import { LeaveService } from '../services/leave.service';
import { HrmPermissionService } from '../services/hrm-permission.service';
import { CreateLeaveDto, UpdateLeaveStatusDto, ApproveLeaveDto, GetLeaveQueryDto, UpdateLeaveDto } from '../dto/leave.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('hrm/leaves')
@UseGuards(JwtAuthGuard, TenantGuard)
export class LeaveController {
  constructor(
    private readonly leaveService: LeaveService,
    private readonly hrmPermissionService: HrmPermissionService,
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
    
    const hasPermission = await this.hrmPermissionService.checkPermission(roleId, permission);
    if (!hasPermission) {
      throw new ForbiddenException(`Permission denied: ${permission} required`);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createLeaveDto: CreateLeaveDto, @Req() req: any) {
    await this.checkPermission(req, 'leaves.apply');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.leaveService.create(createLeaveDto, tenantId);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: GetLeaveQueryDto, @Req() req: any) {
    await this.checkPermission(req, 'leaves.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.leaveService.findAll(
      query.employeeId,
      query.status,
      query.startDate,
      query.endDate,
      tenantId,
      req.user,
    );
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'leaves.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.leaveService.findOne(id, tenantId);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateLeaveDto: UpdateLeaveDto,
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'leaves.edit');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.leaveService.update(id, updateLeaveDto, tenantId, req.user);
    return { success: true, data };
  }

  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() approveDto: ApproveLeaveDto,
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'leaves.approve');
    const tenantId = req.tenant?.id || 'default';
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'leaves.approve', tenantId);

    const data = await this.leaveService.approve(id, approveDto, tenantId);
    return { success: true, data };
  }

  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() updateDto: UpdateLeaveStatusDto,
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'leaves.reject');
    const tenantId = req.tenant?.id || 'default';
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'leaves.approve', tenantId);

    const data = await this.leaveService.reject(id, updateDto, tenantId);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'leaves.delete');
    const tenantId = req.tenant?.id || 'default';
    await this.leaveService.delete(id, tenantId);
    return { success: true, message: 'Leave deleted successfully' };
  }

  @Get('balance/:employeeId')
  async getLeaveBalance(
    @Param('employeeId') employeeId: string,
    @Query('year') year: number,
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'leaves.view');
    const tenantId = req.tenant?.id || 'default';
    const currentYear = year || new Date().getFullYear();
    const data = await this.leaveService.getLeaveBalance(employeeId, currentYear, tenantId);
    return { success: true, data };
  }
}
