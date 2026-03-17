import { Controller, Get, Post, Put, Delete, Body, Request, UseGuards } from '@nestjs/common';
import { AttendancePolicyService } from '../services/attendance-policy.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { AdminGuard } from '../../../core/auth/guards/admin.guard';

@Controller('hrm/attendance/policy')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AttendancePolicyController {
  constructor(private readonly policyService: AttendancePolicyService) {}

  @Get()
  async getPolicy(@Request() req: any) {
    const tenantId = req.tenant?.id;
    const policy = await this.policyService.getOrCreateDefaultPolicy(tenantId);
    return {
      success: true,
      data: policy,
    };
  }

  @Post()
  @UseGuards(AdminGuard)
  async createOrUpdatePolicy(@Body() policyData: any, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const policy = await this.policyService.updatePolicy(tenantId, policyData);
    return {
      success: true,
      data: policy,
      message: 'Attendance policy updated successfully',
    };
  }

  @Put()
  @UseGuards(AdminGuard)
  async updatePolicy(@Body() policyData: any, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const policy = await this.policyService.updatePolicy(tenantId, policyData);
    return {
      success: true,
      data: policy,
      message: 'Attendance policy updated successfully',
    };
  }

  @Delete()
  @UseGuards(AdminGuard)
  async deletePolicy(@Request() req: any) {
    const tenantId = req.tenant?.id;
    const deleted = await this.policyService.deletePolicy(tenantId);
    return {
      success: deleted,
      message: deleted ? 'Attendance policy deleted successfully' : 'Policy not found',
    };
  }
}
