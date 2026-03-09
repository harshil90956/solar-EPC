import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { LeadsService } from '../services/leads.service';
import { CreateLeadDto, UpdateLeadDto, QueryLeadDto, AddActivityDto, BulkActionDto } from '../dto/lead.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionGuard } from '../../../modules/settings/guards/permission.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';

@Controller('leads')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class LeadsController {
  private readonly logger = new Logger(LeadsController.name);
  
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('leads', 'create')
  async create(@Body() createLeadDto: CreateLeadDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      this.logger.log(`[DEBUG] create lead - tenantId: ${tenantId}`);
      const result = await this.leadsService.create(createLeadDto, tenantId);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Create lead failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get()
  @RequirePermission('leads', 'view')
  async findAll(@Query() query: QueryLeadDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      const user = req.user;
      this.logger.log(`[DEBUG] findAll leads - tenantId: ${tenantId}, user: ${user?.id}, dataScope: ${user?.dataScope}`);
      const result = await this.leadsService.findAll(query, tenantId, user);
      return { success: true, data: result.data, total: result.total };
    } catch (error: any) {
      this.logger.error(`Find all leads failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('stats')
  async getStats(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      const user = req.user;
      this.logger.log(`[DEBUG] getStats leads - tenantId: ${tenantId}, user: ${user?.id}, dataScope: ${user?.dataScope}`);
      return await this.leadsService.getStats(tenantId, user);
    } catch (error: any) {
      this.logger.error(`Get stats failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('status-options')
  async getStatusOptions(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      return await this.leadsService.getStatusOptions(tenantId);
    } catch (error: any) {
      this.logger.error(`Get status options failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post('recalculate-scores')
  @HttpCode(HttpStatus.OK)
  async recalculateScores(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      return await this.leadsService.recalculateAllScores(tenantId);
    } catch (error: any) {
      this.logger.error(`Recalculate scores failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      const result = await this.leadsService.findOne(id, tenantId, user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Find one lead failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Put(':id')
  @RequirePermission('leads', 'edit')
  async update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto, @Request() req: any) {
    try {
      this.logger.log(`Updating lead ${id} with data: ${JSON.stringify(updateLeadDto)}`);
      const tenantId = req.tenant?.id;
      const result = await this.leadsService.update(id, updateLeadDto, tenantId);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Update lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('leads', 'delete')
  async remove(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      await this.leadsService.remove(id, tenantId);
    } catch (error: any) {
      this.logger.error(`Remove lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicate(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const result = await this.leadsService.duplicate(id, tenantId);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Duplicate lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archive(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const result = await this.leadsService.update(id, { archived: true } as any, tenantId);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Archive lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  async unarchive(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const result = await this.leadsService.update(id, { archived: false } as any, tenantId);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Unarchive lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post(':id/activities')
  @HttpCode(HttpStatus.CREATED)
  async addActivity(@Param('id') id: string, @Body() activityDto: AddActivityDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const result = await this.leadsService.addActivity(id, activityDto, tenantId);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Add activity to lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get(':id/timeline')
  @HttpCode(HttpStatus.OK)
  async getTimeline(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      return await this.leadsService.getTimeline(id, tenantId, user);
    } catch (error: any) {
      this.logger.error(`Get timeline for lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get(':id/tracker')
  @HttpCode(HttpStatus.OK)
  async getTracker(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      const result = await this.leadsService.getTracker(id, tenantId, user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Get tracker for lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Patch(':id/assign')
  @HttpCode(HttpStatus.OK)
  async assignLead(
    @Param('id') id: string,
    @Body('assignedTo') assignedTo: string,
    @Request() req: any
  ) {
    try {
      const tenantId = req.tenant?.id;
      const userId = req.user?.id || req.user?._id;
      this.logger.log(`[DEBUG] assignLead ${id} to ${assignedTo} by ${userId}`);
      const result = await this.leadsService.assignLead(id, assignedTo, userId, tenantId);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Assign lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Patch(':id/stage')
  @HttpCode(HttpStatus.OK)
  async updateStage(@Param('id') id: string, @Body('stage') stage: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const result = await this.leadsService.updateStage(id, stage, tenantId);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Update stage for lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // Bulk actions
  @Post('bulk/archive')
  @HttpCode(HttpStatus.OK)
  async bulkArchive(@Body() bulkDto: BulkActionDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      return await this.leadsService.bulkArchive(bulkDto.ids, tenantId);
    } catch (error: any) {
      this.logger.error(`Bulk archive failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post('bulk/delete')
  @HttpCode(HttpStatus.OK)
  async bulkDelete(@Body() bulkDto: BulkActionDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      return await this.leadsService.bulkDelete(bulkDto.ids, tenantId);
    } catch (error: any) {
      this.logger.error(`Bulk delete failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post('bulk/stage/:stage')
  @HttpCode(HttpStatus.OK)
  async bulkUpdateStage(@Body() bulkDto: BulkActionDto, @Param('stage') stage: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      return await this.leadsService.bulkUpdateStage(bulkDto.ids, stage, tenantId);
    } catch (error: any) {
      this.logger.error(`Bulk update stage failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // ============================================
  // DASHBOARD ANALYTICS ENDPOINTS
  // ============================================

  @Get('dashboard/overview')
  async getDashboardOverview(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      const result = await this.leadsService.getDashboardOverview(tenantId, user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Get dashboard overview failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/funnel')
  async getFunnelData(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      const result = await this.leadsService.getDashboardFunnel(tenantId, user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Get funnel data failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/source')
  async getSourcePerformance(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      const result = await this.leadsService.getDashboardSource(tenantId, user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Get source performance failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/trend')
  async getLeadTrend(@Query('months') months: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      const result = await this.leadsService.getDashboardTrend(tenantId, user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Get lead trend failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/value-trend')
  async getValueTrend(@Query('months') months: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      // Value trend is included in getDashboardTrend
      const result = await this.leadsService.getDashboardTrend(tenantId, user);
      return { success: true, data: result.months };
    } catch (error: any) {
      this.logger.error(`Get value trend failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/score-distribution')
  async getScoreDistribution(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      // Score distribution is included in getDashboardTrend
      const result = await this.leadsService.getDashboardTrend(tenantId, user);
      return { success: true, data: result.scoreBuckets };
    } catch (error: any) {
      this.logger.error(`Get score distribution failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/activity')
  async getActivityStats(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      const user = req.user;
      const result = await this.leadsService.getDashboardActivity(tenantId, user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Get activity stats failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // ============================================
  // LEAD IMPORT ENDPOINT - TEMPORARILY DISABLED
  // ============================================
  /*
  @Post('import')
  @HttpCode(HttpStatus.OK)
  async importLeads(@Request() req: any) {
    const file = await req.file?.();
    if (!file) throw new BadRequestException('No file uploaded');

    const allowedExt = ['.csv', '.xlsx', '.xls', '.json'];
    const ext = extname(file.filename || '').toLowerCase();
    if (!allowedExt.includes(ext)) {
      throw new BadRequestException('Only CSV, XLSX, XLS, or JSON files are allowed');
    }

    const uploadDir = join(process.cwd(), 'uploads', 'leads');
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const storedFileName = `leads-${uniqueSuffix}${ext}`;
    const storedPath = join(uploadDir, storedFileName);

    await pipeline(file.file, createWriteStream(storedPath));

    try {
      const tenantId = req.tenant?.id;
      const fileExtension = ext;
      
      this.logger.log(`Importing leads from file: ${file.filename}, tenant: ${tenantId || 'default'}`);
      
      const result = await this.leadsService.importLeads(storedPath, fileExtension, tenantId);
      
      return result;
    } catch (error: any) {
      this.logger.error(`Import leads failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }
  */
}
