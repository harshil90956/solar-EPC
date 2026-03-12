import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { PayrollService } from '../services/payroll.service';
import { GeneratePayrollDto, GetPayrollQueryDto, MarkAsPaidDto, UpdatePayrollDto } from '../dto/payroll.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('hrm/payroll')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generate(@Body() generateDto: GeneratePayrollDto, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.payrollService.generate(generateDto, tenantId, req.user);
    return { success: true, data };
  }

  @Post('generate-bulk')
  @HttpCode(HttpStatus.CREATED)
  async generateBulk(
    @Body('employeeIds') employeeIds: string[],
    @Body('month') month: number,
    @Body('year') year: number,
    @Req() req: any,
  ) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.payrollService.generateBulk(employeeIds, month, year, tenantId, req.user);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: GetPayrollQueryDto, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.payrollService.findAll(
      query.employeeId,
      query.month,
      query.year,
      tenantId,
      req.user,
    );
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.payrollService.findOne(id, tenantId, req.user);
    return { success: true, data };
  }

  @Get('employee/:employeeId')
  async findByEmployee(@Param('employeeId') employeeId: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.payrollService.findByEmployeeId(employeeId, tenantId, req.user);
    return { success: true, data };
  }

  @Patch(':id/mark-paid')
  async markAsPaid(
    @Param('id') id: string,
    @Body() markDto: MarkAsPaidDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.payrollService.markAsPaid(id, markDto, tenantId, req.user);
    return { success: true, data };
  }

  @Get(':id/breakdown')
  async getSalaryBreakdown(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.payrollService.getSalaryBreakdown(id, tenantId, req.user);
    return { success: true, data };
  }

  @Get('salary-slip/:payrollId')
  async generateSalarySlip(@Param('payrollId') payrollId: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.payrollService.getSalaryBreakdown(payrollId, tenantId, req.user);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePayrollDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.payrollService.update(id, updateDto, tenantId, req.user);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    await this.payrollService.delete(id, tenantId, req.user);
    return { success: true, message: 'Payroll record deleted successfully' };
  }
}
