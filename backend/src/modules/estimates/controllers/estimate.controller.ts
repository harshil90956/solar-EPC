import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { EstimateService } from '../services/estimate.service';
import { CreateEstimateDto, UpdateEstimateDto, QueryEstimateDto } from '../dto/estimate.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PDFService } from '../services/pdf.service';

@Controller('estimates')
@UseGuards(JwtAuthGuard, TenantGuard)
export class EstimateController {
  private readonly logger = new Logger(EstimateController.name);

  constructor(
    private readonly estimateService: EstimateService,
    private readonly pdfService: PDFService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateEstimateDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      const createdBy = req.user?.id || 'system';
      this.logger.log(`[DEBUG] Creating estimate - tenantId: ${tenantId}`);
      
      const estimate = await this.estimateService.create(createDto, tenantId, createdBy);
      return { success: true, data: estimate };
    } catch (error: any) {
      this.logger.error(`Create estimate failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get()
  async findAll(@Query() query: QueryEstimateDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      this.logger.log(`[DEBUG] Finding all estimates - tenantId: ${tenantId}`);
      
      const result = await this.estimateService.findAll(query, tenantId);
      return { success: true, data: result.data, total: result.total };
    } catch (error: any) {
      this.logger.error(`Find all estimates failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get('stats')
  async getStats(@Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      this.logger.log(`[DEBUG] Getting estimate stats - tenantId: ${tenantId}`);
      
      const stats = await this.estimateService.getStats(tenantId);
      return { success: true, data: stats };
    } catch (error: any) {
      this.logger.error(`Get estimate stats failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      this.logger.log(`[DEBUG] Finding estimate ${id} - tenantId: ${tenantId}`);
      
      const estimate = await this.estimateService.findOne(id, tenantId);
      return { success: true, data: estimate };
    } catch (error: any) {
      this.logger.error(`Find estimate failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateEstimateDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      this.logger.log(`[DEBUG] Updating estimate ${id} - tenantId: ${tenantId}`);
      
      const estimate = await this.estimateService.update(id, updateDto, tenantId);
      return { success: true, data: estimate };
    } catch (error: any) {
      this.logger.error(`Update estimate failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      this.logger.log(`[DEBUG] Deleting estimate ${id} - tenantId: ${tenantId}`);
      
      await this.estimateService.remove(id, tenantId);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Delete estimate failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id || 'default';
      const createdBy = req.user?.id || 'system';
      this.logger.log(`[DEBUG] Duplicating estimate ${id} - tenantId: ${tenantId}`);
      
      const estimate = await this.estimateService.duplicate(id, tenantId, createdBy);
      return { success: true, data: estimate };
    } catch (error: any) {
      this.logger.error(`Duplicate estimate failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    try {
      const tenantId = req.tenant?.id || 'default';
      this.logger.log(`[DEBUG] Generating PDF for estimate ${id} - tenantId: ${tenantId}`);
      
      const estimate = await this.estimateService.findOne(id, tenantId);
      const pdfBuffer = await this.pdfService.generateEstimatePdf(estimate);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Estimate-${estimate.estimateNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      this.logger.error(`Generate PDF failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }
}
