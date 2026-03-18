import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, HttpCode, HttpStatus, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeaveService } from '../services/leave.service';
import { DataScope } from '../schemas/permission.schema';
import { CreateLeaveDto, UpdateLeaveStatusDto, ApproveLeaveDto, GetLeaveQueryDto, UpdateLeaveDto } from '../dto/leave.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionEngineService } from '../../../common/services/permission-engine.service';

@Controller('hrm/leaves')
@UseGuards(JwtAuthGuard, TenantGuard)
export class LeaveController {
  constructor(
    private readonly leaveService: LeaveService,
    private readonly permissionEngine: PermissionEngineService,
  ) {}

  private async checkPermission(req: any, module: string, action: string) {
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

    const { permissions } = await this.permissionEngine.getPermissions(
      String(userId),
      String(tenantId),
      String(roleId),
    );

    if (permissions?.[module]?.[action] !== true) {
      throw new ForbiddenException(`Permission denied: ${module}.${action} required`);
    }
  }

  private async getDataScopeFilter(req: any, module: string): Promise<any> {
    const user = req.user;
    const userDepartment = user?.department;

    const tenantId = req.tenant?.id || req.user?.tenantId;
    const userId = user?.id || user?._id || user?.sub;
    const roleIdRaw = user?.roleId || user?.customRoleId || user?.role;
    const roleId = typeof roleIdRaw === 'string' ? roleIdRaw : (roleIdRaw ? String(roleIdRaw) : '');

    if (!tenantId || !userId || !roleId) return { employeeId: user?.sub };

    const { dataScope } = await this.permissionEngine.getPermissions(
      String(userId),
      String(tenantId),
      String(roleId),
    );

    const scope = dataScope?.[module];

    switch (scope) {
      case DataScope.OWN:
        return { employeeId: user?.sub };
      case DataScope.DEPARTMENT:
        return userDepartment ? { department: userDepartment } : { employeeId: user?.sub };
      case DataScope.ALL:
      default:
        return {};
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createLeaveDto: CreateLeaveDto, @Req() req: any) {
    await this.checkPermission(req, 'leaves', 'apply');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.leaveService.create(createLeaveDto, tenantId);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: GetLeaveQueryDto, @Req() req: any) {
    await this.checkPermission(req, 'leaves', 'view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];

    // Get data scope filter
    const scopeFilter = await this.getDataScopeFilter(req, 'leaves');

    // If OWN scope, force filter by current user's employeeId
    if (scopeFilter.employeeId && !query.employeeId) {
      query.employeeId = scopeFilter.employeeId;
    }

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
    await this.checkPermission(req, 'leaves', 'view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];

    const data = await this.leaveService.findOne(id, tenantId);

    // Check data scope - verify user can view this specific leave
    const scopeFilter = await this.getDataScopeFilter(req, 'leaves');

    if (scopeFilter.employeeId) {
      const leaveEmployeeId = data.employeeId?._id?.toString() || data.employeeId;
      if (leaveEmployeeId !== scopeFilter.employeeId) {
        throw new NotFoundException('Leave not found');
      }
    }

    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateLeaveDto: UpdateLeaveDto,
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'leaves', 'apply');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];

    // Check data scope
    const scopeFilter = await this.getDataScopeFilter(req, 'leaves');
    const existingLeave = await this.leaveService.findOne(id, tenantId);

    if (scopeFilter.employeeId) {
      const leaveEmployeeId = existingLeave.employeeId?._id?.toString() || existingLeave.employeeId;
      if (leaveEmployeeId !== scopeFilter.employeeId) {
        throw new ForbiddenException('You can only edit your own leaves');
      }
    }

    const data = await this.leaveService.update(id, updateLeaveDto, tenantId, req.user);
    return { success: true, data };
  }

  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() approveDto: ApproveLeaveDto,
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'leaves', 'approve');
    const tenantId = req.tenant?.id || 'default';

    const data = await this.leaveService.approve(id, approveDto, tenantId);
    return { success: true, data };
  }

  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() updateDto: UpdateLeaveStatusDto,
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'leaves', 'reject');
    const tenantId = req.tenant?.id || 'default';

    const data = await this.leaveService.reject(id, updateDto, tenantId);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'leaves', 'apply');
    const tenantId = req.tenant?.id || 'default';

    // Check data scope
    const scopeFilter = await this.getDataScopeFilter(req, 'leaves');
    const existingLeave = await this.leaveService.findOne(id, tenantId);

    if (scopeFilter.employeeId) {
      const leaveEmployeeId = existingLeave.employeeId?._id?.toString() || existingLeave.employeeId;
      if (leaveEmployeeId !== scopeFilter.employeeId) {
        throw new ForbiddenException('You can only delete your own leaves');
      }
    }

    await this.leaveService.delete(id, tenantId);
    return { success: true, message: 'Leave deleted successfully' };
  }

  @Get('balance/:employeeId')
  async getLeaveBalance(
    @Param('employeeId') employeeId: string,
    @Query('year') year: number,
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'leaves', 'view');
    const tenantId = req.tenant?.id || 'default';

    // Check data scope - users can only view their own balance
    const scopeFilter = await this.getDataScopeFilter(req, 'leaves');

    const effectiveEmployeeId = scopeFilter.employeeId ? scopeFilter.employeeId : employeeId;

    const currentYear = year || new Date().getFullYear();
    const data = await this.leaveService.getLeaveBalance(effectiveEmployeeId, currentYear, tenantId);
    return { success: true, data };
  }
}
