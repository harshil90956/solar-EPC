import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Headers, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionGuard } from '../../settings/guards/permission.guard';
import { ItemsService } from '../services/items.service';
import { CreateItemDto, UpdateItemDto } from '../dto/item.dto';

@Controller('items')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  async findAll(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Query('search') search?: string,
    @Query('itemGroupId') itemGroupId?: string,
    @Req() req?: any,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    // Extract user with dataScope from JWT (same pattern as Finance controller)
    const user = req?.user ? {
      id: String(req.user.id || req.user._id),
      _id: String(req.user.id || req.user._id),
      dataScope: (req.user.dataScope as 'ALL' | 'ASSIGNED') || 'ALL',
    } : undefined;
    console.log(`[ITEMS CTRL] user.dataScope:`, user?.dataScope);
    return this.itemsService.findAll(tenantId, user, search, itemGroupId);
  }

  @Get(':id')
  findOne(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('id') id: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.itemsService.findOne(tenantId, id);
  }

  @Post()
  create(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() createItemDto: CreateItemDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.itemsService.create(tenantId, createItemDto);
  }

  @Patch(':id')
  update(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('id') id: string,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.itemsService.update(tenantId, id, updateItemDto);
  }

  @Delete(':id')
  remove(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('id') id: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.itemsService.remove(tenantId, id);
  }

  @Delete('bulk/delete')
  bulkDelete(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body('ids') ids: string[],
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.itemsService.bulkDelete(tenantId, ids);
  }

  @Post(':id/stock-in')
  stockIn(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @Body('poReference') poReference?: string,
    @Body('receivedDate') receivedDate?: string,
    @Body('remarks') remarks?: string,
    @Body('warehouse') warehouse?: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.itemsService.stockIn(tenantId, id, quantity, poReference, receivedDate, remarks, warehouse);
  }

  @Post(':id/stock-out')
  stockOut(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @Body('projectId') projectId?: string,
    @Body('issuedDate') issuedDate?: string,
    @Body('remarks') remarks?: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.itemsService.stockOut(tenantId, id, quantity, projectId, issuedDate, remarks);
  }

  @Post('transfers')
  transfer(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() transferDto: { fromInventoryId: string; toWarehouseId: string; quantity: number; remarks?: string },
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.itemsService.transfer(tenantId, transferDto.fromInventoryId, transferDto.toWarehouseId, transferDto.quantity, transferDto.remarks);
  }
}
