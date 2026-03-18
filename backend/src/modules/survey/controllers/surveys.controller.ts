import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards, Request, Logger } from '@nestjs/common';
import { SurveysService } from '../services/surveys.service';
import { CreateSurveyDto, UpdateSurveyDto, QuerySurveyDto } from '../dto/survey.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionGuard } from '../../../modules/settings/guards/permission.guard';
import { RequirePermission } from '../../../modules/settings/decorators/permissions.decorator';

@Controller('surveys')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class SurveysController {
  private readonly logger = new Logger(SurveysController.name);

  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('survey', 'create')
  create(@Body() createSurveyDto: CreateSurveyDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    this.logger.log(`[DEBUG] create survey - tenantId: ${tenantId}`);
    return this.surveysService.create(createSurveyDto, tenantId, req.user);
  }

  @Get()
  @RequirePermission('survey', 'view')
  findAll(@Query() query: QuerySurveyDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const user = req.user;
    return this.surveysService.findAll(query, tenantId, user).then((result) => ({
      success: true,
      data: result.data,
      total: result.total,
      surveys: result.surveys,
    }));
  }

  @Get('stats')
  @RequirePermission('survey', 'view')
  getStats(@Request() req: any) {
    const tenantId = req.tenant?.id;
    const user = req.user;
    return this.surveysService.getStats(tenantId, user);
  }

  @Get(':id')
  @RequirePermission('survey', 'view')
  findOne(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const user = req.user;
    return this.surveysService.findOne(id, tenantId, user);
  }

  @Put(':id')
  @RequirePermission('survey', 'edit')
  update(@Param('id') id: string, @Body() updateSurveyDto: UpdateSurveyDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const user = req.user;
    return this.surveysService.update(id, updateSurveyDto, tenantId, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('survey', 'delete')
  remove(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const user = req.user;
    return this.surveysService.remove(id, tenantId, user);
  }
}
