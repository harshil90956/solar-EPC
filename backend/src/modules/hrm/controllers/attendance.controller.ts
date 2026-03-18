import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Headers, HttpCode, HttpStatus, UseGuards, ForbiddenException } from '@nestjs/common';
import { AttendanceService } from '../services/attendance.service';
import { DataScope } from '../schemas/permission.schema';
import { CheckInDto, CheckOutDto, GetAttendanceQueryDto } from '../dto/attendance.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionEngineService } from '../../../common/services/permission-engine.service';

@Controller('hrm/attendance')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
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

  @Post('checkin')
  @HttpCode(HttpStatus.CREATED)
  async checkIn(@Body() checkInDto: CheckInDto, @Req() req: any) {
    await this.checkPermission(req, 'attendance', 'checkin');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.attendanceService.checkIn(checkInDto, tenantId, req.user);
    return { success: true, data };
  }

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  async checkOut(@Body() checkOutDto: CheckOutDto, @Req() req: any) {
    await this.checkPermission(req, 'attendance', 'checkout');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.attendanceService.checkOut(checkOutDto, tenantId, req.user);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: GetAttendanceQueryDto, @Req() req: any) {
    await this.checkPermission(req, 'attendance', 'view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
 
    // Get data scope filter
    const scopeFilter = await this.getDataScopeFilter(req, 'attendance');

    let data;
    if (scopeFilter.employeeId) {
      // Own scope - only own attendance
      data = await this.attendanceService.findByEmployee(req.user.sub, query.startDate, query.endDate, tenantId, req.user);
    } else if (scopeFilter.department) {
      // Department scope - filter by department
      data = await this.attendanceService.findAll(query.employeeId, query.startDate, query.endDate, tenantId, req.user);
      // Filter by department
      data = data.filter((a: any) => a.department === scopeFilter.department);
    } else {
      // All scope - full access
      data = await this.attendanceService.findAll(
        query.employeeId,
        query.startDate,
        query.endDate,
        tenantId,
        req.user,
      );
    }
    return { success: true, data };
  }

  @Get('today-summary')
  async getTodaySummary(@Req() req: any) {
    await this.checkPermission(req, 'attendance', 'view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.attendanceService.getTodaySummary(tenantId, req.user);
    return { success: true, data };
  }

  @Get(':employeeId')
  async findByEmployee(@Param('employeeId') employeeId: string, @Req() req: any) {
    await this.checkPermission(req, 'attendance', 'view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];

    // Check data scope
    const scopeFilter = await this.getDataScopeFilter(req, 'attendance');

    const effectiveEmployeeId = scopeFilter.employeeId ? scopeFilter.employeeId : employeeId;

    const data = await this.attendanceService.findByEmployeeId(effectiveEmployeeId, tenantId, req.user);
    return { success: true, data };
  }

  @Get('summary/:employeeId')
  async getMonthlySummary(
    @Param('employeeId') employeeId: string,
    @Query('month') month: number,
    @Query('year') year: number,
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'attendance', 'view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];

    // Check data scope
    const scopeFilter = await this.getDataScopeFilter(req, 'attendance');

    const effectiveEmployeeId = scopeFilter.employeeId ? scopeFilter.employeeId : employeeId;

    const data = await this.attendanceService.getMonthlySummary(effectiveEmployeeId, month, year, tenantId, req.user);
    return { success: true, data };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
    @Req() req: any,
  ) {
    await this.checkPermission(req, 'attendance', 'edit');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.attendanceService.update(id, updateData, tenantId, req.user);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'attendance', 'delete');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    await this.attendanceService.delete(id, tenantId, req.user);
    return { success: true, message: 'Attendance record deleted' };
  }
}
