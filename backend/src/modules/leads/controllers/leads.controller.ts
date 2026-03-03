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
} from '@nestjs/common';
import { LeadsService } from '../services/leads.service';
import { CreateLeadDto, UpdateLeadDto, QueryLeadDto, AddActivityDto, BulkActionDto } from '../dto/lead.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('leads')
// @UseGuards(JwtAuthGuard, TenantGuard) // Temporarily disabled for testing
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createLeadDto: CreateLeadDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.create(createLeadDto, tenantId);
  }

  @Get()
  findAll(@Query() query: QueryLeadDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.findAll(query, tenantId);
  }

  @Get('stats')
  getStats(@Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.getStats(tenantId);
  }

  @Post('recalculate-scores')
  @HttpCode(HttpStatus.OK)
  recalculateScores(@Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.recalculateAllScores(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.findOne(id, tenantId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.update(id, updateLeadDto, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.remove(id, tenantId);
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  duplicate(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.duplicate(id, tenantId);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.update(id, { archived: true } as any, tenantId);
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  unarchive(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.update(id, { archived: false } as any, tenantId);
  }

  @Post(':id/activities')
  @HttpCode(HttpStatus.CREATED)
  addActivity(@Param('id') id: string, @Body() activityDto: AddActivityDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.addActivity(id, activityDto, tenantId);
  }

  @Get(':id/timeline')
  @HttpCode(HttpStatus.OK)
  getTimeline(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.getTimeline(id, tenantId);
  }

  // Bulk actions
  @Post('bulk/archive')
  @HttpCode(HttpStatus.OK)
  bulkArchive(@Body() bulkDto: BulkActionDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.bulkArchive(bulkDto.ids, tenantId);
  }

  @Post('bulk/delete')
  @HttpCode(HttpStatus.OK)
  bulkDelete(@Body() bulkDto: BulkActionDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.bulkDelete(bulkDto.ids, tenantId);
  }

  @Post('bulk/stage/:stage')
  @HttpCode(HttpStatus.OK)
  bulkUpdateStage(@Body() bulkDto: BulkActionDto, @Param('stage') stage: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.bulkUpdateStage(bulkDto.ids, stage, tenantId);
  }
}
