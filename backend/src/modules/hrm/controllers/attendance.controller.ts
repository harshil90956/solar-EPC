import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Headers, HttpCode, HttpStatus } from '@nestjs/common';
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

  @Get('today-summary')
  async getTodaySummary(@Headers('x-tenant-id') tenantId?: string) {
    return this.attendanceService.getTodaySummary(tenantId);
  }

  @Get(':employeeId')
  async findByEmployee(@Param('employeeId') employeeId: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.attendanceService.findByEmployeeId(employeeId, tenantId);
    return { success: true, data };
  }

  @Get('summary/:employeeId')
  async getMonthlySummary(
    @Param('employeeId') employeeId: string,
    @Query('month') month: number,
    @Query('year') year: number,
    @Req() req: any,
  ) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.attendanceService.getMonthlySummary(employeeId, month, year, tenantId);
    return { success: true, data };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
    @Req() req: any,
  ) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.attendanceService.update(id, updateData, tenantId);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    await this.attendanceService.delete(id, tenantId);
    return { success: true };
  }
}
