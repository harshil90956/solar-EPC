import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LeadStatusService } from '../services/lead-status.service';
import { CreateLeadStatusDto, UpdateLeadStatusDto, ReorderLeadStatusesDto } from '../dto/lead-status.dto';
import { LeadStatus } from '../schemas/lead-status.schema';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('settings/lead-statuses')
@UseGuards(JwtAuthGuard, TenantGuard)
export class LeadStatusController {
  constructor(private readonly leadStatusService: LeadStatusService) {}

  private extractTenantId(req: any): string | undefined {
    const fromReqTenant = req.tenant?.id;
    const fromUser = req.user?.tenantId || req.user?.tenant?.id;
    // Case-insensitive header lookup
    const headers = req.headers || {};
    const fromHeader = headers['x-tenant-id'] || headers['tenant-id'] || headers['X-Tenant-Id'];
    
    console.log('[DEBUG] extractTenantId:', { fromReqTenant, fromUser, fromHeader, headers: Object.keys(headers) });
    
    return fromReqTenant || fromUser || fromHeader;
  }

  private requireTenantId(req: any): string {
    const tenantId = this.extractTenantId(req);
    if (!tenantId) {
      throw new BadRequestException('Tenant context missing (tenantId)');
    }
    return tenantId;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /settings/lead-statuses
  // Get all lead statuses (including inactive)
  // ─────────────────────────────────────────────────────────────────────────

  @Get()
  async getAllStatuses(
    @Request() req: any,
    @Query('active') activeOnly: string,
  ): Promise<{ data: LeadStatus[] }> {
    const tenantId = this.requireTenantId(req);
    
    const statuses = activeOnly === 'true' 
      ? await this.leadStatusService.getActiveStatuses(tenantId)
      : await this.leadStatusService.getAllStatuses(tenantId);

    return { data: statuses };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /settings/lead-statuses/active
  // Get only active lead statuses
  // ─────────────────────────────────────────────────────────────────────────

  @Get('active')
  async getActiveStatuses(@Request() req: any): Promise<{ data: LeadStatus[] }> {
    const tenantId = this.requireTenantId(req);
    const statuses = await this.leadStatusService.getActiveStatuses(tenantId);
    return { data: statuses };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /settings/lead-statuses/:id
  // Get single status by ID
  // ─────────────────────────────────────────────────────────────────────────

  @Get(':id')
  async getStatus(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ data: LeadStatus }> {
    const tenantId = this.requireTenantId(req);
    const status = await this.leadStatusService.getStatus(tenantId, id);
    
    if (!status) {
      throw new NotFoundException('Status not found');
    }

    return { data: status };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /settings/lead-statuses
  // Create new lead status
  // ─────────────────────────────────────────────────────────────────────────

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createStatus(
    @Body() dto: CreateLeadStatusDto,
    @Request() req: any,
  ): Promise<{ data: LeadStatus; message: string }> {
    const tenantId = this.requireTenantId(req);
    
    try {
      const status = await this.leadStatusService.createStatus(tenantId, dto);
      return { 
        data: status, 
        message: `Status '${status.label}' created successfully` 
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH /settings/lead-statuses/:id
  // Update lead status
  // ─────────────────────────────────────────────────────────────────────────

  @Patch(':id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
    @Request() req: any,
  ): Promise<{ data: LeadStatus; message: string }> {
    const tenantId = this.requireTenantId(req);
    
    try {
      const status = await this.leadStatusService.updateStatus(tenantId, id, dto);
      return { 
        data: status, 
        message: `Status '${status.label}' updated successfully` 
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE /settings/lead-statuses/:id
  // Delete lead status (soft delete with usage check)
  // ─────────────────────────────────────────────────────────────────────────

  @Delete(':id')
  async deleteStatus(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ success: boolean; message: string }> {
    const tenantId = this.requireTenantId(req);
    
    try {
      const result = await this.leadStatusService.deleteStatus(tenantId, id);
      return result;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATCH /settings/lead-statuses/reorder
  // Reorder lead statuses
  // ─────────────────────────────────────────────────────────────────────────

  @Patch('reorder')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async reorderStatuses(
    @Body() dto: ReorderLeadStatusesDto,
    @Request() req: any,
  ): Promise<{ data: LeadStatus[]; message: string }> {
    const tenantId = this.requireTenantId(req);
    
    try {
      const statuses = await this.leadStatusService.reorderStatuses(tenantId, dto.statusIds);
      return { 
        data: statuses, 
        message: 'Statuses reordered successfully' 
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /settings/lead-statuses/initialize
  // Initialize default statuses for a tenant (admin use)
  // ─────────────────────────────────────────────────────────────────────────

  @Post('initialize')
  async initializeDefaults(
    @Request() req: any,
  ): Promise<{ data: LeadStatus[]; message: string }> {
    const tenantId = this.requireTenantId(req);
    
    try {
      const statuses = await this.leadStatusService.initializeDefaultStatuses(tenantId);
      return { 
        data: statuses, 
        message: `${statuses.length} default statuses initialized` 
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }
}
