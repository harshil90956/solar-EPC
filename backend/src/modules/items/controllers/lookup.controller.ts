import { Controller, Get, Post, Patch, Delete, Body, Param, Headers, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { LookupService } from '../services/lookup.service';
import { CreateWarehouseDto, UpdateWarehouseDto, CreateCategoryDto, UpdateCategoryDto, CreateUnitDto, UpdateUnitDto } from '../dto/lookup.dto';

@Controller('lookups')
@UseGuards(JwtAuthGuard, TenantGuard)
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  private getTenantId(headerTenantId: string, queryTenantId: string): string {
    return headerTenantId || queryTenantId || 'solarcorp';
  }

  // Warehouse endpoints
  @Get('warehouses')
  findAllWarehouses(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    const tenantId = this.getTenantId(headerTenantId, queryTenantId);
    return this.lookupService.findAllWarehouses(tenantId);
  }

  @Post('warehouses')
  createWarehouse(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() dto: CreateWarehouseDto,
  ) {
    const tenantId = this.getTenantId(headerTenantId, queryTenantId);
    return this.lookupService.createWarehouse(tenantId, dto);
  }

  @Patch('warehouses/:code')
  updateWarehouse(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('code') code: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    const tenantId = this.getTenantId(headerTenantId, queryTenantId);
    return this.lookupService.updateWarehouse(tenantId, code, dto);
  }

  @Delete('warehouses/:code')
  deleteWarehouse(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('code') code: string,
  ) {
    const tenantId = this.getTenantId(headerTenantId, queryTenantId);
    return this.lookupService.deleteWarehouse(tenantId, code);
  }

  // Category endpoints
  @Get('categories')
  findAllCategories(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    const tenantId = this.getTenantId(headerTenantId, queryTenantId);
    return this.lookupService.findAllCategories(tenantId);
  }

  @Post('categories')
  createCategory(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    const tenantId = this.getTenantId(headerTenantId, queryTenantId);
    return this.lookupService.createCategory(tenantId, dto);
  }

  @Patch('categories/:code')
  updateCategory(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('code') code: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const tenantId = this.getTenantId(headerTenantId, queryTenantId);
    return this.lookupService.updateCategory(tenantId, code, dto);
  }

  @Delete('categories/:code')
  deleteCategory(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('code') code: string,
  ) {
    const tenantId = this.getTenantId(headerTenantId, queryTenantId);
    return this.lookupService.deleteCategory(tenantId, code);
  }

  // Unit endpoints
  @Get('units')
  findAllUnits(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    const tenantId = this.getTenantId(headerTenantId, queryTenantId);
    return this.lookupService.findAllUnits(tenantId);
  }

  @Post('units')
  createUnit(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() dto: CreateUnitDto,
  ) {
    const tenantId = this.getTenantId(headerTenantId, queryTenantId);
    return this.lookupService.createUnit(tenantId, dto);
  }

  @Patch('units/:code')
  updateUnit(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('code') code: string,
    @Body() dto: UpdateUnitDto,
  ) {
    const tenantId = this.getTenantId(headerTenantId, queryTenantId);
    return this.lookupService.updateUnit(tenantId, code, dto);
  }

  @Delete('units/:code')
  deleteUnit(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('code') code: string,
  ) {
    const tenantId = this.getTenantId(headerTenantId, queryTenantId);
    return this.lookupService.deleteUnit(tenantId, code);
  }
}
