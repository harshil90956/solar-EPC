import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, HttpCode, HttpStatus, UseGuards, ForbiddenException } from '@nestjs/common';
import { PayrollService } from '../services/payroll.service';
import { GeneratePayrollDto, GetPayrollQueryDto, MarkAsPaidDto, UpdatePayrollDto } from '../dto/payroll.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionEngineService } from '../../../common/services/permission-engine.service';

@Controller('hrm/payroll')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly permissionEngine: PermissionEngineService,
  ) {}

  private async checkPermission(req: any, permission: string) {
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

    const [moduleId, actionId] = String(permission || '').split('.');
    if (!moduleId || !actionId) {
      throw new ForbiddenException('Invalid permission format');
    }

    const { permissions } = await this.permissionEngine.getPermissions(
      String(userId),
      String(tenantId),
      String(roleId),
    );

    if (permissions?.[moduleId]?.[actionId] !== true) {
      throw new ForbiddenException(`Permission denied: ${permission} required`);
    }
  }

  private async getDataScope(req: any, moduleId: string): Promise<string> {
    const user = req.user;
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const userId = user?.id || user?._id || user?.sub;
    const roleIdRaw = user?.roleId || user?.customRoleId || user?.role;
    const roleId = typeof roleIdRaw === 'string' ? roleIdRaw : (roleIdRaw ? String(roleIdRaw) : '');
    if (!tenantId || !userId || !roleId) return 'ALL';

    const { dataScope } = await this.permissionEngine.getPermissions(
      String(userId),
      String(tenantId),
      String(roleId),
    );
    return dataScope?.[moduleId] || 'ALL';
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

    const scope = await this.getDataScope(req, 'payroll');
    const targetEmployeeId = scope === 'OWN' ? req.user.sub : query.employeeId;

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

    const scope = await this.getDataScope(req, 'payroll');
    if (scope === 'OWN' && data.employeeId?.toString() !== req.user.sub) {
      throw new ForbiddenException('You can only view your own payroll');
    }

    return { success: true, data };
  }

  @Get('salary-slip/:payrollId')
  async generateSalarySlip(@Param('payrollId') payrollId: string, @Req() req: any) {
    await this.checkPermission(req, 'payroll.view');
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.payrollService.getSalaryBreakdown(payrollId, tenantId, req.user);

    const scope = await this.getDataScope(req, 'payroll');
    if (scope === 'OWN' && data.employeeId?.toString() !== req.user.sub) {
      throw new ForbiddenException('You can only view your own payroll');
    }

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
    return { success: true, message: 'Payroll deleted successfully' };
  }
}
