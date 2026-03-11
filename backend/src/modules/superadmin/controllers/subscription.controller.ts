import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { SubscriptionService } from '../services/subscription.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from '../dto/subscription.dto';

@Controller('superadmin/subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.subscriptionService.findAll(query);
  }

  @Get('stats')
  async getStats() {
    return this.subscriptionService.getStats();
  }

  @Get('tenant/:tenantId')
  async findByTenantId(@Param('tenantId') tenantId: string) {
    return this.subscriptionService.findByTenantId(tenantId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.subscriptionService.findById(id);
  }

  @Post()
  async create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionService.create(createSubscriptionDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateSubscriptionDto: UpdateSubscriptionDto) {
    return this.subscriptionService.update(id, updateSubscriptionDto);
  }

  @Put(':id/cancel')
  async cancel(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.subscriptionService.cancel(id, reason);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.subscriptionService.delete(id);
  }
}
