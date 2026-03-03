import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ItemsService } from '../services/items.service';
import { CreateItemDto, UpdateItemDto } from '../dto/item.dto';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  findAll(
    @Query('tenantId') tenantId: string,
    @Query('search') search?: string,
    @Query('itemGroupId') itemGroupId?: string,
  ) {
    return this.itemsService.findAll(tenantId, search, itemGroupId);
  }

  @Get(':id')
  findOne(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.itemsService.findOne(tenantId, id);
  }

  @Post()
  create(
    @Query('tenantId') tenantId: string,
    @Body() createItemDto: CreateItemDto,
  ) {
    return this.itemsService.create(tenantId, createItemDto);
  }

  @Patch(':id')
  update(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    return this.itemsService.update(tenantId, id, updateItemDto);
  }

  @Delete(':id')
  remove(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.itemsService.remove(tenantId, id);
  }

  @Delete('bulk/delete')
  bulkDelete(
    @Query('tenantId') tenantId: string,
    @Body('ids') ids: string[],
  ) {
    return this.itemsService.bulkDelete(tenantId, ids);
  }
}
