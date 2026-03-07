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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { LeadsService } from '../services/leads.service';
import { CreateLeadDto, UpdateLeadDto, QueryLeadDto, AddActivityDto, BulkActionDto } from '../dto/lead.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('leads')
@UseGuards(JwtAuthGuard, TenantGuard)
export class LeadsController {
  private readonly logger = new Logger(LeadsController.name);
  
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
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
  async findAll(@Query() query: QueryLeadDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      this.logger.log(`[DEBUG] findAll leads - tenantId: ${tenantId}`);
      const result = await this.leadsService.findAll(query, tenantId);
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
      this.logger.log(`[DEBUG] getStats leads - tenantId: ${tenantId}`);
      return await this.leadsService.getStats(tenantId);
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

  @Get('dashboard/overview')
  async getDashboardOverview(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      return await this.leadsService.getDashboardOverview(tenantId);
    } catch (error: any) {
      this.logger.error(`Get dashboard overview failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/funnel')
  async getDashboardFunnel(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      return await this.leadsService.getDashboardFunnel(tenantId);
    } catch (error: any) {
      this.logger.error(`Get dashboard funnel failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/source')
  async getDashboardSource(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      return await this.leadsService.getDashboardSource(tenantId);
    } catch (error: any) {
      this.logger.error(`Get dashboard source failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/trend')
  async getDashboardTrend(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      return await this.leadsService.getDashboardTrend(tenantId);
    } catch (error: any) {
      this.logger.error(`Get dashboard trend failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('dashboard/activity')
  async getDashboardActivity(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      return await this.leadsService.getDashboardActivity(tenantId);
    } catch (error: any) {
      this.logger.error(`Get dashboard activity failed: ${error?.message || 'Unknown error'}`, error?.stack);
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
      const result = await this.leadsService.findOne(id, tenantId);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Find one lead failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Put(':id')
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
      return await this.leadsService.getTimeline(id, tenantId);
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
      const result = await this.leadsService.getTracker(id, tenantId);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Get tracker for lead ${id} failed: ${error?.message || 'Unknown error'}`, error?.stack);
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
  // LEAD IMPORT ENDPOINT
  // ============================================

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/leads',
      filename: (req: any, file: any, cb: any) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `leads-${uniqueSuffix}${extname(file.originalname)}`);
      }
    }),
    fileFilter: (req: any, file: any, cb: any) => {
      const allowedExt = ['.csv', '.xlsx', '.xls', '.json'];
      const ext = extname(file.originalname).toLowerCase();
      if (allowedExt.includes(ext)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only CSV, XLSX, XLS, or JSON files are allowed'), false);
      }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  }))
  async importLeads(
    @UploadedFile() file: any,
    @Request() req: any
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const tenantId = req.tenant?.id;
      const fileExtension = extname(file.originalname).toLowerCase();
      
      this.logger.log(`Importing leads from file: ${file.originalname}, size: ${file.size} bytes, tenant: ${tenantId || 'default'}`);
      
      const result = await this.leadsService.importLeads(file.path, fileExtension, tenantId);
      
      return result;
    } catch (error: any) {
      this.logger.error(`Import leads failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }
}
