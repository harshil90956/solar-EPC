import { Controller, Get, Post, Body, Param, Query, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AttendanceService } from '../services/attendance.service';
import { CheckInDto, CheckOutDto, GetAttendanceQueryDto } from '../dto/attendance.dto';

@Controller('hrm/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('checkin')
  @HttpCode(HttpStatus.CREATED)
  async checkIn(@Body() checkInDto: CheckInDto, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.attendanceService.checkIn(checkInDto, tenantId);
    return { success: true, data };
  }

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  async checkOut(@Body() checkOutDto: CheckOutDto, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.attendanceService.checkOut(checkOutDto, tenantId);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: GetAttendanceQueryDto, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.attendanceService.findAll(
      query.employeeId,
      query.startDate,
      query.endDate,
      tenantId,
    );
    return { success: true, data };
  }

  @Get('employee/:employeeId')
  async findByEmployee(@Query('employeeId') employeeId: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.attendanceService.findByEmployeeId(employeeId, tenantId);
    return { success: true, data };
  }

  @Get('summary/:employeeId')
  async getMonthlySummary(
    @Query('employeeId') employeeId: string,
    @Query('month') month: number,
    @Query('year') year: number,
    @Req() req: any,
  ) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.attendanceService.getMonthlySummary(employeeId, month, year, tenantId);
    return { success: true, data };
  }
}
