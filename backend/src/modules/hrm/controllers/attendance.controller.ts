import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Headers, HttpCode, HttpStatus, UseGuards, ForbiddenException } from '@nestjs/common';
import { AttendanceService } from '../services/attendance.service';
import { PermissionService } from '../services/permission.service';
import { DataScope } from '../schemas/permission.schema';
import { CheckInDto, CheckOutDto, GetAttendanceQueryDto } from '../dto/attendance.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('hrm/attendance')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly permissionService: PermissionService,
  ) {}

  private async checkPermission(req: any, module: string, action: string) {
    const user = req.user;
    if (!user) throw new ForbiddenException('User not authenticated');

    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId;
    console.log('[PERMISSION BACKEND]', { roleId: user?.roleId || user?.role, module, action, tenantId });

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

    if (scopeFilter.employeeId && employeeId !== scopeFilter.employeeId) {
      throw new ForbiddenException('You can only view your own attendance');
    }

    const data = await this.attendanceService.findByEmployeeId(employeeId, tenantId, req.user);
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

    if (scopeFilter.employeeId && employeeId !== scopeFilter.employeeId) {
      throw new ForbiddenException('You can only view your own attendance summary');
    }

    const data = await this.attendanceService.getMonthlySummary(employeeId, month, year, tenantId, req.user);
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
