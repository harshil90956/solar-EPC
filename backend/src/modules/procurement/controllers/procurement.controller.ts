import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ProcurementService } from '../services/procurement.service';
import { CreateVendorDto, UpdateVendorDto } from '../dto/create-vendor.dto';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto, UpdatePurchaseOrderStatusDto } from '../dto/create-purchase-order.dto';

@Controller('procurement')
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  // ==================== VENDOR ENDPOINTS ====================

  @Post('vendors')
  async createVendor(@Body() dto: CreateVendorDto, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default';
    const vendor = await this.procurementService.createVendor(dto, tenantId);
    return { success: true, data: vendor };
  }

  @Get('vendors')
  async findAllVendors(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default';
    const vendors = await this.procurementService.findAllVendors(tenantId);
    return { success: true, data: vendors };
  }

  @Get('vendors/:id')
  async findVendorById(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default';
    const vendor = await this.procurementService.findVendorById(id, tenantId);
    return { success: true, data: vendor };
  }

  @Patch('vendors/:id')
  async updateVendor(@Param('id') id: string, @Body() dto: UpdateVendorDto, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default';
    const vendor = await this.procurementService.updateVendor(id, dto, tenantId);
    return { success: true, data: vendor };
  }

  @Delete('vendors/:id')
  async deleteVendor(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default';
    await this.procurementService.deleteVendor(id, tenantId);
    return { success: true, message: 'Vendor deleted successfully' };
  }

  // ==================== PURCHASE ORDER ENDPOINTS ====================

  @Post('purchase-orders')
  async createPurchaseOrder(@Body() dto: CreatePurchaseOrderDto, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default';
    const po = await this.procurementService.createPurchaseOrder(dto, tenantId);
    return { success: true, data: po };
  }

  @Get('purchase-orders')
  async findAllPurchaseOrders(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default';
    const pos = await this.procurementService.findAllPurchaseOrders(tenantId);
    return { success: true, data: pos };
  }

  @Get('purchase-orders/:id')
  async findPurchaseOrderById(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default';
    const po = await this.procurementService.findPurchaseOrderById(id, tenantId);
    return { success: true, data: po };
  }

  @Patch('purchase-orders/:id/status')
  async updatePurchaseOrderStatus(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderStatusDto, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default';
    const po = await this.procurementService.updatePurchaseOrderStatus(id, dto, tenantId);
    return { success: true, data: po };
  }

  @Patch('purchase-orders/:id')
  async updatePurchaseOrder(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default';
    const po = await this.procurementService.updatePurchaseOrder(id, dto, tenantId);
    return { success: true, data: po };
  }

  @Delete('purchase-orders/:id')
  async deletePurchaseOrder(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default';
    await this.procurementService.deletePurchaseOrder(id, tenantId);
    return { success: true, message: 'Purchase Order deleted successfully' };
  }

  // ==================== STATS ENDPOINTS ====================

  @Get('stats')
  async getProcurementStats(@Req() req: any) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'default';
    const stats = await this.procurementService.getProcurementStats(tenantId);
    return { success: true, data: stats };
  }
}
