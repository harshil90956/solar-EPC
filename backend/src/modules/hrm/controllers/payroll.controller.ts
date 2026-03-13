import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, HttpCode, HttpStatus, UseGuards, ForbiddenException } from '@nestjs/common';
import { PayrollService } from '../services/payroll.service';
import { HrmPermissionService } from '../services/hrm-permission.service';
import { GeneratePayrollDto, GetPayrollQueryDto, MarkAsPaidDto, UpdatePayrollDto } from '../dto/payroll.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('hrm/payroll')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly hrmPermissionService: HrmPermissionService,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generate(@Body() generateDto: GeneratePayrollDto, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'payroll.manage', tenantId);
    
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
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'payroll.manage', tenantId);
    
    const data = await this.payrollService.generateBulk(employeeIds, month, year, tenantId, req.user);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: GetPayrollQueryDto, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    
    // Non-admin/HR users can only see their own payroll if they don't have full access
    const hasFullAccess = await this.hrmPermissionService.checkPermission(roleId, 'payroll.view', tenantId);
    
    const targetEmployeeId = hasFullAccess ? query.employeeId : req.user.sub;

    const data = await this.payrollService.findAll(
      targetEmployeeId,
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
    const roleId = req.user?.roleId || req.user?.role;
    
    const data = await this.payrollService.findOne(id, tenantId, req.user);
    
    // Check if user owns this payroll or has payroll access
    if (data.employeeId?.toString() !== req.user.sub) {
      await this.hrmPermissionService.validateAction(roleId, 'payroll.view', tenantId);
    }
    
    return { success: true, data };
  }

  @Patch(':id/mark-paid')
  async markAsPaid(
    @Param('id') id: string,
    @Body() markDto: MarkAsPaidDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'payroll.approve', tenantId);
    
    const data = await this.payrollService.markAsPaid(id, markDto, tenantId, req.user);
    return { success: true, data };
  }

  @Get(':id/breakdown')
  async getSalaryBreakdown(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    
    const data = await this.payrollService.getSalaryBreakdown(id, tenantId, req.user);
    
    // Check ownership or access
    if (data.employeeId?.toString() !== req.user.sub) {
      await this.hrmPermissionService.validateAction(roleId, 'payroll.view', tenantId);
    }
    
    return { success: true, data };
  }

  @Get('salary-slip/:payrollId')
  async generateSalarySlip(@Param('payrollId') payrollId: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.payrollService.getSalaryBreakdown(payrollId, tenantId, req.user);
    
    // Check ownership or access
    if (data.employeeId?.toString() !== req.user.sub) {
      const roleId = req.user?.roleId || req.user?.role;
      await this.hrmPermissionService.validateAction(roleId, 'payroll.view', tenantId);
    }
    
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePayrollDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'payroll.manage', tenantId);
    
    const data = await this.payrollService.update(id, updateDto, tenantId, req.user);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const roleId = req.user?.roleId || req.user?.role;
    await this.hrmPermissionService.validateAction(roleId, 'payroll.manage', tenantId);
    
    await this.payrollService.delete(id, tenantId, req.user);
    return { success: true, message: 'Payroll record deleted successfully' };
  }
}
