import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { HrmPermissionService } from '../services/hrm-permission.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('hrm/permissions')
@UseGuards(JwtAuthGuard, TenantGuard)
export class HrmPermissionController {
  constructor(private readonly permissionService: HrmPermissionService) {}

  @Get()
  async getAllPermissions(@Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.permissionService.getAllPermissions(tenantId);
  }

  @Get('role/:roleId')
  async getByRole(@Param('roleId') roleId: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.permissionService.getPermissions(roleId, tenantId);
  }

  @Put('role/:roleId')
  async updateByRole(
    @Param('roleId') roleId: string,
    @Body() permissions: any,
    @Request() req: any,
  ) {
    const tenantId = req.tenant?.id;
    await this.permissionService.validateAction(roleId, 'attendance.checkin_checkout', tenantId);
    return this.permissionService.updatePermissions(roleId, permissions, tenantId);
  }

  @Post('seed')
  async seed(@Request() req: any) {
    const tenantId = req.tenant?.id;
    await this.permissionService.seedDefaults(tenantId);
    return { message: 'HRM permissions seeded successfully' };
  }
}
