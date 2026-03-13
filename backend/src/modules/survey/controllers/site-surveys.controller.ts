import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Patch,
  Request,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { SiteSurveysService } from '../services/site-surveys.service';
import {
  CreateSiteSurveyDto,
  UpdateSiteSurveyDto,
  QuerySiteSurveyDto,
  MoveToActiveDto,
  MoveToCompleteDto,
  AssignSurveyDto
} from '../dto/site-survey.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionGuard } from '../../../modules/settings/guards/permission.guard';
import { RequirePermission } from '../../../modules/settings/decorators/permissions.decorator';

@Controller('site-surveys')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class SiteSurveysController {
  private readonly logger = new Logger(SiteSurveysController.name);

  constructor(private readonly siteSurveysService: SiteSurveysService) {}

  // Create new site survey
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('surveys', 'create')
  create(@Body() createDto: CreateSiteSurveyDto, @Request() req: any) {
    try {
      const tenantId = req.tenant?.id;
      this.logger.log(`[DEBUG] create survey - tenantId: ${tenantId}`);
      const result = this.siteSurveysService.create(createDto, tenantId, req.user);
      return { success: true, data: result };
    } catch (error: any) {
      this.logger.error(`Create survey failed: ${error?.message || 'Unknown error'}`, error?.stack);
      throw error;
    }
  }

  // Get all surveys with filters
  @Get()
  @RequirePermission('surveys', 'view')
  findAll(@Query() query: QuerySiteSurveyDto, @Request() req: any) {
    console.log('[SITE-SURVEYS] API called with query:', query);
    const tenantId = req?.tenant?.id;
    const user = req?.user;
    return this.siteSurveysService.findAll(query, tenantId, user);
  }

  // Get statistics
  @Get('stats')
  @RequirePermission('surveys', 'view')
  getStats(@Request() req: any) {
    const tenantId = req?.tenant?.id;
    const user = req?.user;
    return this.siteSurveysService.getStats(tenantId, user);
  }

  // Get survey by ID
  @Get(':id')
  @RequirePermission('surveys', 'view')
  findOne(@Param('id') id: string, @Request() req: any) {
    const tenantId = req?.tenant?.id;
    const user = req?.user;
    return this.siteSurveysService.findOne(id, tenantId, user);
  }

  // Get survey by lead ID
  @Get('lead/:leadId')
  @RequirePermission('surveys', 'view')
  findByLeadId(@Param('leadId') leadId: string, @Request() req: any) {
    const tenantId = req?.tenant?.id;
    const user = req?.user;
    return this.siteSurveysService.findByLeadId(leadId, tenantId, user);
  }

  // Update survey
  @Put(':id')
  @RequirePermission('surveys', 'edit')
  update(@Param('id') id: string, @Body() updateDto: UpdateSiteSurveyDto, @Request() req: any) {
    const tenantId = req?.tenant?.id;
    const user = req?.user;
    return this.siteSurveysService.update(id, updateDto, tenantId, user);
  }

  // Move survey to Active status
  @Patch(':id/move-to-active')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('surveys', 'edit')
  moveToActive(@Param('id') id: string, @Body() moveDto: MoveToActiveDto, @Request() req: any) {
    const tenantId = req?.tenant?.id;
    const user = req?.user;
    return this.siteSurveysService.moveToActive(id, moveDto, tenantId, user);
  }

  // Move survey to Complete status
  @Patch(':id/move-to-complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('surveys', 'edit')
  moveToComplete(@Param('id') id: string, @Body() moveDto: MoveToCompleteDto, @Request() req: any) {
    const tenantId = req?.tenant?.id;
    const user = req?.user;
    return this.siteSurveysService.moveToComplete(id, moveDto, tenantId, user);
  }

  // Auto-create from lead (when lead stage changes to Site Survey)
  @Post('create-from-lead')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('surveys', 'create')
  createFromLead(
    @Body() leadData: {
      leadId: string;
      clientName: string;
      city: string;
      projectCapacity?: string;
      engineer?: string;
    },
    @Request() req: any
  ) {
    const tenantId = req?.tenant?.id;
    const user = req?.user;
    return this.siteSurveysService.createFromLead(leadData, tenantId, user);
  }

  // Assign survey to a user
  @Patch(':id/assign')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('surveys', 'edit')
  assign(
    @Param('id') id: string,
    @Body() assignDto: AssignSurveyDto,
    @Request() req: any
  ) {
    const tenantId = req?.tenant?.id;
    const user = req?.user;
    return this.siteSurveysService.assign(id, assignDto, tenantId, user);
  }

  // Delete survey
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('surveys', 'delete')
  remove(@Param('id') id: string, @Request() req: any) {
    const tenantId = req?.tenant?.id;
    const user = req?.user;
    return this.siteSurveysService.remove(id, tenantId, user);
  }
}
