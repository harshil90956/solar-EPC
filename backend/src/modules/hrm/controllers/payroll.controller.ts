import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, HttpCode, HttpStatus, UseGuards, ForbiddenException } from '@nestjs/common';
import { PayrollService } from '../services/payroll.service';
import { PermissionService } from '../services/permission.service';
import { GeneratePayrollDto, GetPayrollQueryDto, MarkAsPaidDto, UpdatePayrollDto } from '../dto/payroll.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('hrm/payroll')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly permissionService: PermissionService,
  ) {}

  private async checkPermission(req: any, permission: string) {
    const user = req.user;
    if (!user) throw new ForbiddenException('User not authenticated');
    
    // Super admin bypass
    if (user.role === 'Super Admin' || user.role === 'Admin') return true;
    
    // Check user permissions from JWT
    if (user.permissions && Array.isArray(user.permissions)) {
      if (user.permissions.includes(permission)) return true;
    }
    
    const roleId = user.roleId || user.role;
    if (!roleId) throw new ForbiddenException('User has no role assigned');
    
    const hasPermission = await this.permissionService.hasPermission(roleId, permission);
    if (!hasPermission) {
      throw new ForbiddenException(`Permission denied: ${permission} required`);
    }
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generate(@Body() generateDto: GeneratePayrollDto, @Req() req: any) {
    await this.checkPermission(req, 'payroll.generate');
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
    await this.checkPermission(req, 'payroll.generate');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.payrollService.generateBulk(employeeIds, month, year, tenantId, req.user);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: GetPayrollQueryDto, @Req() req: any) {
    await this.checkPermission(req, 'payroll.view');
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
    await this.checkPermission(req, 'payroll.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.payrollService.findOne(id, tenantId, req.user);
    return { success: true, data };
  }

  @Get('employee/:employeeId')
  async findByEmployee(@Param('employeeId') employeeId: string, @Req() req: any) {
    await this.checkPermission(req, 'payroll.view');
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
    await this.checkPermission(req, 'payroll.edit');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.payrollService.markAsPaid(id, markDto, tenantId, req.user);
    return { success: true, data };
  }

  @Get(':id/breakdown')
  async getSalaryBreakdown(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'payroll.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.payrollService.getSalaryBreakdown(id, tenantId, req.user);
    return { success: true, data };
  }

  @Get('salary-slip/:payrollId')
  async generateSalarySlip(@Param('payrollId') payrollId: string, @Req() req: any) {
    await this.checkPermission(req, 'payroll.view');
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
    await this.checkPermission(req, 'payroll.edit');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.payrollService.update(id, updateDto, tenantId, req.user);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.checkPermission(req, 'payroll.delete');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    await this.payrollService.delete(id, tenantId, req.user);
    return { success: true, message: 'Payroll record deleted successfully' };
  }
}
