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
} from '@nestjs/common';
import { SiteSurveysService } from '../services/site-surveys.service';
import {
  CreateSiteSurveyDto,
  UpdateSiteSurveyDto,
  QuerySiteSurveyDto,
  MoveToActiveDto,
  MoveToCompleteDto
} from '../dto/site-survey.dto';

@Controller('site-surveys')
export class SiteSurveysController {
  constructor(private readonly siteSurveysService: SiteSurveysService) {}

  // Create new site survey
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateSiteSurveyDto) {
    return this.siteSurveysService.create(createDto);
  }

  // Get all surveys with filters
  @Get()
  findAll(@Query() query: QuerySiteSurveyDto, @Request() req: any) {
    console.log('[SITE-SURVEYS] API called with query:', query);
    const tenantId = req?.tenant?.id;
    const user = req?.user;
    return this.siteSurveysService.findAll(query, tenantId, user);
  }

  // Get statistics
  @Get('stats')
  getStats() {
    return this.siteSurveysService.getStats();
  }

  // Get survey by ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.siteSurveysService.findOne(id);
  }

  // Get survey by lead ID
  @Get('lead/:leadId')
  findByLeadId(@Param('leadId') leadId: string) {
    return this.siteSurveysService.findByLeadId(leadId);
  }

  // Update survey
  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateSiteSurveyDto) {
    return this.siteSurveysService.update(id, updateDto);
  }

  // Move survey to Active status
  @Patch(':id/move-to-active')
  @HttpCode(HttpStatus.OK)
  moveToActive(@Param('id') id: string, @Body() moveDto: MoveToActiveDto) {
    return this.siteSurveysService.moveToActive(id, moveDto);
  }

  // Move survey to Complete status
  @Patch(':id/move-to-complete')
  @HttpCode(HttpStatus.OK)
  moveToComplete(@Param('id') id: string, @Body() moveDto: MoveToCompleteDto) {
    return this.siteSurveysService.moveToComplete(id, moveDto);
  }

  // Auto-create from lead (when lead stage changes to Site Survey)
  @Post('create-from-lead')
  @HttpCode(HttpStatus.CREATED)
  createFromLead(
    @Body() leadData: {
      leadId: string;
      clientName: string;
      city: string;
      projectCapacity?: string;
      engineer?: string;
    }
  ) {
    return this.siteSurveysService.createFromLead(leadData);
  }

  // Delete survey
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.siteSurveysService.remove(id);
  }
}
