import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InventoryService } from '../services/inventory.service';
import { CreateInventoryDto, UpdateInventoryDto, StockInDto, StockOutDto, CreateReservationDto, UpdateReservationDto } from '../dto/inventory.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async findAll(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.inventoryService.findAll(tenantId, category, search);
  }

  @Get('stats')
  async getStats(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.inventoryService.getStats(tenantId);
  }

  @Get('by-category')
  async getItemsByCategory(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.inventoryService.getItemsByCategory(tenantId);
  }

  @Get(':itemId')
  async findOne(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('itemId') itemId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.inventoryService.findOne(tenantId, itemId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() createDto: CreateInventoryDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.inventoryService.create(tenantId, createDto);
  }

  @Patch(':itemId')
  async update(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('itemId') itemId: string,
    @Body() updateDto: UpdateInventoryDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.inventoryService.update(tenantId, itemId, updateDto);
  }

  @Post(':itemId/stock-in')
  async stockIn(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('itemId') itemId: string,
    @Body() stockInDto: StockInDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.inventoryService.stockIn(tenantId, itemId, stockInDto);
  }

  @Post(':itemId/stock-out')
  async stockOut(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('itemId') itemId: string,
    @Body() stockOutDto: StockOutDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.inventoryService.stockOut(tenantId, itemId, stockOutDto);
  }

  @Delete(':itemId')
  async remove(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('itemId') itemId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.inventoryService.remove(tenantId, itemId);
  }

  @Post('reservations')
  @HttpCode(HttpStatus.CREATED)
  async createReservation(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() createDto: CreateReservationDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.inventoryService.createReservation(tenantId, createDto);
  }

  @Get('reservations/by-project/:projectId')
  async getReservationsByProject(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('projectId') projectId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.inventoryService.getReservationsByProject(tenantId, projectId);
  }

  @Get('reservations/by-item/:itemId')
  async getReservationsByItem(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('itemId') itemId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.inventoryService.getReservationsByItem(tenantId, itemId);
  }

  @Get(':itemId/with-reservations')
  async findOneWithReservations(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('itemId') itemId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.inventoryService.findOneWithReservations(tenantId, itemId);
  }

  @Patch('reservations/:reservationId')
  async updateReservation(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('reservationId') reservationId: string,
    @Body() updateDto: UpdateReservationDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.inventoryService.updateReservation(tenantId, reservationId, updateDto);
  }

  @Patch('reservations/:reservationId/cancel')
  async cancelReservation(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('reservationId') reservationId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.inventoryService.cancelReservation(tenantId, reservationId);
  }

  @Patch('reservations/:reservationId/fulfill')
  async fulfillReservation(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('reservationId') reservationId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.inventoryService.fulfillReservation(tenantId, reservationId);
  }
}
