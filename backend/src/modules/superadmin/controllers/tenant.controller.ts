import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { TenantService } from '../services/tenant.service';
import { CreateTenantDto, UpdateTenantDto } from '../dto/tenant.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';

@Controller('superadmin/tenants')
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  async findAll(@Req() req: any, @Query() query: any) {
    // Verify superadmin
    if (!req.user?.isSuperAdmin && req.user?.role?.toLowerCase() !== 'superadmin') {
      throw new Error('Access denied. Superadmin privileges required.');
    }
    return this.tenantService.findAll(query);
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    if (!req.user?.isSuperAdmin && req.user?.role?.toLowerCase() !== 'superadmin') {
      throw new Error('Access denied. Superadmin privileges required.');
    }
    return this.tenantService.getStats();
  }

  @Get(':id')
  async findById(@Req() req: any, @Param('id') id: string) {
    if (!req.user?.isSuperAdmin && req.user?.role?.toLowerCase() !== 'superadmin') {
      throw new Error('Access denied. Superadmin privileges required.');
    }
    return this.tenantService.findById(id);
  }

  @Post()
  async create(@Req() req: any, @Body() createTenantDto: CreateTenantDto) {
    console.log('[TenantController] Create request body:', JSON.stringify(createTenantDto));
    if (!req.user?.isSuperAdmin && req.user?.role?.toLowerCase() !== 'superadmin') {
      throw new Error('Access denied. Superadmin privileges required.');
    }
    return this.tenantService.create(createTenantDto);
  }

  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    if (!req.user?.isSuperAdmin && req.user?.role?.toLowerCase() !== 'superadmin') {
      throw new Error('Access denied. Superadmin privileges required.');
    }
    return this.tenantService.update(id, updateTenantDto);
  }

  @Put(':id/status')
  async updateStatus(@Req() req: any, @Param('id') id: string, @Body('status') status: string) {
    if (!req.user?.isSuperAdmin && req.user?.role?.toLowerCase() !== 'superadmin') {
      throw new Error('Access denied. Superadmin privileges required.');
    }
    return this.tenantService.updateStatus(id, status);
  }

  @Put(':id/plan')
  async updatePlan(@Req() req: any, @Param('id') id: string, @Body('plan') plan: string) {
    if (!req.user?.isSuperAdmin && req.user?.role?.toLowerCase() !== 'superadmin') {
      throw new Error('Access denied. Superadmin privileges required.');
    }
    return this.tenantService.updatePlan(id, plan);
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    if (!req.user?.isSuperAdmin && req.user?.role?.toLowerCase() !== 'superadmin') {
      throw new Error('Access denied. Superadmin privileges required.');
    }
    return this.tenantService.delete(id);
  }
}
