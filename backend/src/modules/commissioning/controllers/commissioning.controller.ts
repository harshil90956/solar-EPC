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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CommissioningService } from '../services/commissioning.service';
import { CreateCommissioningDto, UpdateCommissioningDto, UpdateCommissioningStatusDto } from '../dto/commissioning.dto';

@Controller('commissioning')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CommissioningController {
  constructor(private readonly commissioningService: CommissioningService) {}

  @Get()
  async findAll(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.commissioningService.findAll(tenantId, status, projectId);
  }

  @Get('stats')
  async getStats(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.commissioningService.getStats(tenantId);
  }

  @Get('dashboard')
  async getDashboardStats(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('projectType') projectType?: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.commissioningService.getDashboardStats(tenantId, startDate, endDate, projectType);
  }

  @Get('by-project/:projectId')
  async findByProject(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('projectId') projectId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.commissioningService.findByProject(tenantId, projectId);
  }

  @Get(':id')
  async findOne(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('id') id: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.commissioningService.findOne(tenantId, id);
  }

  @Post()
  async create(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() createDto: CreateCommissioningDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.commissioningService.create(tenantId, createDto);
  }

  @Patch(':id')
  async update(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateCommissioningDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.commissioningService.update(tenantId, id, updateDto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateCommissioningStatusDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.commissioningService.updateStatus(tenantId, id, updateStatusDto);
  }

  @Delete(':id')
  async remove(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('id') id: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.commissioningService.remove(tenantId, id);
  }
}
