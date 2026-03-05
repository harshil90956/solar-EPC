import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
    @Query('tenantId') tenantId: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.findAll(tenantId, category, search);
  }

  @Get('stats')
  async getStats(@Query('tenantId') tenantId: string) {
    return this.inventoryService.getStats(tenantId);
  }

  @Get('by-category')
  async getItemsByCategory(@Query('tenantId') tenantId: string) {
    return this.inventoryService.getItemsByCategory(tenantId);
  }

  @Get(':itemId')
  async findOne(
    @Query('tenantId') tenantId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.inventoryService.findOne(tenantId, itemId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Query('tenantId') tenantId: string,
    @Body() createDto: CreateInventoryDto,
  ) {
    return this.inventoryService.create(tenantId, createDto);
  }

  @Patch(':itemId')
  async update(
    @Query('tenantId') tenantId: string,
    @Param('itemId') itemId: string,
    @Body() updateDto: UpdateInventoryDto,
  ) {
    return this.inventoryService.update(tenantId, itemId, updateDto);
  }

  @Post(':itemId/stock-in')
  async stockIn(
    @Query('tenantId') tenantId: string,
    @Param('itemId') itemId: string,
    @Body() stockInDto: StockInDto,
  ) {
    return this.inventoryService.stockIn(tenantId, itemId, stockInDto);
  }

  @Post(':itemId/stock-out')
  async stockOut(
    @Query('tenantId') tenantId: string,
    @Param('itemId') itemId: string,
    @Body() stockOutDto: StockOutDto,
  ) {
    return this.inventoryService.stockOut(tenantId, itemId, stockOutDto);
  }

  @Delete(':itemId')
  async remove(
    @Query('tenantId') tenantId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.inventoryService.remove(tenantId, itemId);
  }

  // ==================== RESERVATION ENDPOINTS ====================

  @Post('reservations')
  @HttpCode(HttpStatus.CREATED)
  async createReservation(
    @Query('tenantId') tenantId: string,
    @Body() createDto: CreateReservationDto,
  ) {
    return this.inventoryService.createReservation(tenantId, createDto);
  }

  @Get('reservations/by-project/:projectId')
  async getReservationsByProject(
    @Query('tenantId') tenantId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.inventoryService.getReservationsByProject(tenantId, projectId);
  }

  @Get('reservations/by-item/:itemId')
  async getReservationsByItem(
    @Query('tenantId') tenantId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.inventoryService.getReservationsByItem(tenantId, itemId);
  }

  @Get(':itemId/with-reservations')
  async findOneWithReservations(
    @Query('tenantId') tenantId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.inventoryService.findOneWithReservations(tenantId, itemId);
  }

  @Patch('reservations/:reservationId')
  async updateReservation(
    @Query('tenantId') tenantId: string,
    @Param('reservationId') reservationId: string,
    @Body() updateDto: UpdateReservationDto,
  ) {
    return this.inventoryService.updateReservation(tenantId, reservationId, updateDto);
  }

  @Patch('reservations/:reservationId/cancel')
  async cancelReservation(
    @Query('tenantId') tenantId: string,
    @Param('reservationId') reservationId: string,
  ) {
    return this.inventoryService.cancelReservation(tenantId, reservationId);
  }

  @Patch('reservations/:reservationId/fulfill')
  async fulfillReservation(
    @Query('tenantId') tenantId: string,
    @Param('reservationId') reservationId: string,
  ) {
    return this.inventoryService.fulfillReservation(tenantId, reservationId);
  }
}
