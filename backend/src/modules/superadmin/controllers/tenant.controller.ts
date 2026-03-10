import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TenantService } from '../services/tenant.service';
import { CreateTenantDto, UpdateTenantDto } from '../dto/tenant.dto';

@Controller('superadmin/tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.tenantService.findAll(query);
  }

  @Get('stats')
  async getStats() {
    return this.tenantService.getStats();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.tenantService.findById(id);
  }

  @Post()
  async create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantService.create(createTenantDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantService.update(id, updateTenantDto);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.tenantService.updateStatus(id, status);
  }

  @Put(':id/plan')
  async updatePlan(@Param('id') id: string, @Body('plan') plan: string) {
    return this.tenantService.updatePlan(id, plan);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.tenantService.delete(id);
  }
}
