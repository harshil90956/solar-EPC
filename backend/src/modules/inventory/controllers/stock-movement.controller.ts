import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionGuard } from '../../settings/guards/permission.guard';
import { StockMovementService } from '../services/stock-movement.service';
import { StockMovementType } from '../schemas/stock-movement.schema';

interface CreateStockMovementBody {
  itemId: string;
  type: StockMovementType;
  quantity: number;
  warehouseId?: string;
  warehouseName?: string;
  reference?: string;
  referenceType?: string;
  note?: string;
}

@Controller('inventory/stock-movements')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class StockMovementController {
  constructor(private readonly stockMovementService: StockMovementService) {}

  @Get()
  async findAll(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Query('itemId') itemId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('type') type?: StockMovementType,
    @Query('reference') reference?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    const query: any = {};
    
    if (itemId) query.itemId = itemId;
    if (warehouseId) query.warehouseId = warehouseId;
    if (type) query.type = type;
    if (reference) query.reference = reference;
    if (startDate) query.startDate = new Date(startDate);
    if (endDate) query.endDate = new Date(endDate);

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    return this.stockMovementService.findAll(tenantId, query, pageNum, limitNum);
  }

  @Get('types')
  async getMovementTypes() {
    return {
      types: [
        { value: 'PURCHASE', label: 'Purchase', color: 'green', icon: 'ArrowDown' },
        { value: 'RESERVE', label: 'Reserve', color: 'blue', icon: 'Lock' },
        { value: 'RELEASE', label: 'Release', color: 'cyan', icon: 'Unlock' },
        { value: 'TRANSFER', label: 'Transfer', color: 'purple', icon: 'ArrowRightLeft' },
        { value: 'DISPATCH', label: 'Dispatch', color: 'orange', icon: 'Truck' },
        { value: 'CONSUME', label: 'Consume', color: 'red', icon: 'PackageX' },
        { value: 'ADJUSTMENT', label: 'Adjustment', color: 'gray', icon: 'Settings' },
      ],
    };
  }

  @Get('stats')
  async getStats(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.stockMovementService.getStats(tenantId, start, end);
  }

  @Get('by-item/:itemId')
  async findByItem(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('itemId') itemId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.stockMovementService.findByItem(tenantId, itemId, pageNum, limitNum);
  }

  @Get('by-warehouse/:warehouseId')
  async findByWarehouse(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('warehouseId') warehouseId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.stockMovementService.findByWarehouse(tenantId, warehouseId, pageNum, limitNum);
  }

  @Get('ledger/:itemId')
  async getStockLedger(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('itemId') itemId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.stockMovementService.getStockLedger(tenantId, itemId, start, end);
  }

  @Get(':id')
  async findOne(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('id') id: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.stockMovementService.findOne(tenantId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() createDto: CreateStockMovementBody,
    @Request() req?: any,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    const createdBy = req?.user?.id || req?.user?._id;
    const createdByName = req?.user?.name || req?.user?.email;

    return this.stockMovementService.logMovement(tenantId, {
      ...createDto,
      createdBy,
      createdByName,
    });
  }

  @Delete(':id')
  async remove(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('id') id: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.stockMovementService.remove(tenantId, id);
  }
}
