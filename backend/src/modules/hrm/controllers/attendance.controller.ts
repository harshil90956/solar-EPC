import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Headers, HttpCode, HttpStatus, UseGuards, ForbiddenException } from '@nestjs/common';
import { AttendanceService } from '../services/attendance.service';
import { HrmPermissionService } from '../services/hrm-permission.service';
import { CheckInDto, CheckOutDto, GetAttendanceQueryDto } from '../dto/attendance.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('hrm/attendance')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly hrmPermissionService: HrmPermissionService,
  ) {}

  @Post('checkin')
  @HttpCode(HttpStatus.CREATED)
  async checkIn(@Body() checkInDto: CheckInDto, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'attendance.checkin_checkout', tenantId);
    
    const data = await this.attendanceService.checkIn(checkInDto, tenantId, req.user);
    return { success: true, data };
  }

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  async checkOut(@Body() checkOutDto: CheckOutDto, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'attendance.checkin_checkout', tenantId);
    
    const data = await this.attendanceService.checkOut(checkOutDto, tenantId, req.user);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: GetAttendanceQueryDto, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    
    // Check if user has permission to view all attendance
    const canViewAll = await this.hrmPermissionService.checkPermission(roleId, 'attendance.view_all', tenantId);
    
    if (canViewAll) {
      const data = await this.attendanceService.findAll(
        query.employeeId,
        query.startDate,
        query.endDate,
        tenantId,
        req.user,
      );
      return { success: true, data };
    }
    
    // Fallback: Check if allowed to see personal attendance
    const canViewSelf = await this.hrmPermissionService.checkPermission(roleId, 'attendance.view_self', tenantId);
    if (!canViewSelf) {
      throw new ForbiddenException('Access denied for attendance records');
    }
    
    const data = await this.attendanceService.findByEmployee(req.user.sub, query.startDate, query.endDate, tenantId, req.user);
    return { success: true, data };
  }

  @Get('today-summary')
  async getTodaySummary(@Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.attendanceService.getTodaySummary(tenantId, req.user);
    return { success: true, data };
  }

  @Get(':employeeId')
  async findByEmployee(@Param('employeeId') employeeId: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
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
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.attendanceService.getMonthlySummary(employeeId, month, year, tenantId, req.user);
    return { success: true, data };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
    @Req() req: any,
  ) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'attendance.manage', tenantId);

    const data = await this.attendanceService.update(id, updateData, tenantId, req.user);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'attendance.manage', tenantId);

    await this.attendanceService.delete(id, tenantId, req.user);
    return { success: true, message: 'Attendance record deleted' };
  }
}
