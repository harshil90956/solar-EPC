import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { LogisticsService } from '../services/logistics.service';
import { Dispatch } from '../schemas/dispatch.schema';

@Controller('logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Get('dispatches')
  async findAll() {
    const data = await this.logisticsService.findAll();
    return { success: true, data };
  }

  @Get('dispatches/:id')
  async findOne(@Param('id') id: string) {
    const data = await this.logisticsService.findOne(id);
    return { success: true, data };
  }

  @Post('dispatches')
  async create(@Body() createDto: Partial<Dispatch>) {
    const data = await this.logisticsService.create(createDto);
    return { success: true, data, message: 'Dispatch created successfully' };
  }

  @Patch('dispatches/:id')
  async update(@Param('id') id: string, @Body() updateDto: Partial<Dispatch>) {
    const data = await this.logisticsService.update(id, updateDto);
    return { success: true, data, message: 'Dispatch updated successfully' };
  }

  @Patch('dispatches/:id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    const data = await this.logisticsService.updateStatus(id, status);
    return { success: true, data, message: 'Status updated successfully' };
  }

  @Delete('dispatches/:id')
  async delete(@Param('id') id: string) {
    await this.logisticsService.delete(id);
    return { success: true, message: 'Dispatch deleted successfully' };
  }

  @Get('stats')
  async getStats() {
    const data = await this.logisticsService.getStats();
    return { success: true, data };
  }
}
