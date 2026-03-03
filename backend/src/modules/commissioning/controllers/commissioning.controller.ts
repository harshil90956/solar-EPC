import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CommissioningService } from '../services/commissioning.service';
import { CreateCommissioningDto, UpdateCommissioningDto, UpdateCommissioningStatusDto } from '../dto/commissioning.dto';

@Controller('commissioning')
export class CommissioningController {
  constructor(private readonly commissioningService: CommissioningService) {}

  @Get()
  async findAll(
    @Query('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.commissioningService.findAll(tenantId, status, projectId);
  }

  @Get('stats')
  async getStats(@Query('tenantId') tenantId: string) {
    return this.commissioningService.getStats(tenantId);
  }

  @Get('by-project/:projectId')
  async findByProject(
    @Query('tenantId') tenantId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.commissioningService.findByProject(tenantId, projectId);
  }

  @Get(':id')
  async findOne(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.commissioningService.findOne(tenantId, id);
  }

  @Post()
  async create(
    @Query('tenantId') tenantId: string,
    @Body() createDto: CreateCommissioningDto,
  ) {
    return this.commissioningService.create(tenantId, createDto);
  }

  @Patch(':id')
  async update(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateCommissioningDto,
  ) {
    return this.commissioningService.update(tenantId, id, updateDto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateCommissioningStatusDto,
  ) {
    return this.commissioningService.updateStatus(tenantId, id, updateStatusDto);
  }

  @Delete(':id')
  async remove(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.commissioningService.remove(tenantId, id);
  }
}
