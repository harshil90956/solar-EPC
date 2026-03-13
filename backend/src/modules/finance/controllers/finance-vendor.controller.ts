import { Controller, Get, Post, Put, Delete, Body, Param, Req, Query } from '@nestjs/common';
import { Request } from 'express';
import { FinanceVendorService } from '../services/finance-vendor.service';

@Controller('finance/vendors')
export class FinanceVendorController {
  constructor(private readonly financeVendorService: FinanceVendorService) {}

  private getTenantId(req: Request): string {
    return (req as any).user?.tenantId || req.headers['x-tenant-id'] || 'default';
  }

  @Get()
  async getAllVendors(@Req() req: Request) {
    const tenantId = this.getTenantId(req);
    return this.financeVendorService.findAll(tenantId);
  }

  @Get(':vendorId')
  async getVendorById(@Req() req: Request, @Param('vendorId') vendorId: string) {
    const tenantId = this.getTenantId(req);
    return this.financeVendorService.findByVendorId(tenantId, vendorId);
  }

  @Post('sync')
  async syncVendor(@Req() req: Request, @Body() body: {
    vendorId: string;
    vendorName: string;
    vendorCode: string;
    totalPayable?: number;
    totalPaid?: number;
    totalPurchaseOrders?: number;
  }) {
    const tenantId = this.getTenantId(req);
    return this.financeVendorService.createOrUpdateVendor(tenantId, body);
  }

  @Post(':vendorId/payment')
  async recordPayment(
    @Req() req: Request,
    @Param('vendorId') vendorId: string,
    @Body() body: {
      amount: number;
      date: string;
      poId?: string;
      poNumber?: string;
      notes?: string;
    }
  ) {
    const tenantId = this.getTenantId(req);
    return this.financeVendorService.recordVendorPayment(tenantId, vendorId, body);
  }

  @Delete(':vendorId')
  async deleteVendor(@Req() req: Request, @Param('vendorId') vendorId: string) {
    const tenantId = this.getTenantId(req);
    await this.financeVendorService.deleteVendor(tenantId, vendorId);
    return { success: true, message: 'Vendor deleted successfully' };
  }
}
