import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { LeaveService } from '../services/leave.service';
import { CreateLeaveDto, UpdateLeaveStatusDto, ApproveLeaveDto, GetLeaveQueryDto } from '../dto/leave.dto';

@Controller('hrm/leaves')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createLeaveDto: CreateLeaveDto, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.leaveService.create(createLeaveDto, tenantId);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: GetLeaveQueryDto, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.leaveService.findAll(
      query.employeeId,
      query.status,
      query.startDate,
      query.endDate,
      tenantId,
    );
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.leaveService.findOne(id, tenantId);
    return { success: true, data };
  }

  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() approveDto: ApproveLeaveDto,
    @Req() req: any,
  ) {
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
    const tenantId = req.tenant?.id || 'default';
    const data = await this.leaveService.reject(id, updateDto, tenantId);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: any) {
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
    const tenantId = req.tenant?.id || 'default';
    const currentYear = year || new Date().getFullYear();
    const data = await this.leaveService.getLeaveBalance(employeeId, currentYear, tenantId);
    return { success: true, data };
  }
}
