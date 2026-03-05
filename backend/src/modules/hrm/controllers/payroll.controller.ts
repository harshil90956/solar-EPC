import { Controller, Get, Post, Patch, Body, Param, Query, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { PayrollService } from '../services/payroll.service';
import { GeneratePayrollDto, GetPayrollQueryDto, MarkAsPaidDto } from '../dto/payroll.dto';

@Controller('hrm/payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generate(@Body() generateDto: GeneratePayrollDto, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.payrollService.generate(generateDto, tenantId);
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
    const tenantId = req.tenant?.id || 'default';
    const data = await this.payrollService.generateBulk(employeeIds, month, year, tenantId);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: GetPayrollQueryDto, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.payrollService.findAll(
      query.employeeId,
      query.month,
      query.year,
      tenantId,
    );
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.payrollService.findOne(id, tenantId);
    return { success: true, data };
  }

  @Get('employee/:employeeId')
  async findByEmployee(@Param('employeeId') employeeId: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.payrollService.findByEmployeeId(employeeId, tenantId);
    return { success: true, data };
  }

  @Patch(':id/mark-paid')
  async markAsPaid(
    @Param('id') id: string,
    @Body() markDto: MarkAsPaidDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.payrollService.markAsPaid(id, markDto, tenantId);
    return { success: true, data };
  }

  @Get(':id/breakdown')
  async getSalaryBreakdown(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.payrollService.getSalaryBreakdown(id, tenantId);
    return { success: true, data };
  }

  @Get('salary-slip/:payrollId')
  async generateSalarySlip(@Param('payrollId') payrollId: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.payrollService.getSalaryBreakdown(payrollId, tenantId);
    return { success: true, data };
  }
}
