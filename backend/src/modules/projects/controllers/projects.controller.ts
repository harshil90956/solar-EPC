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
} from '@nestjs/common';
import { ProjectsService } from '../services/projects.service';
import { CreateProjectDto, UpdateProjectDto, UpdateProjectStatusDto } from '../dto/project.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.projectsService.findAll(tenantId, status, search);
  }

  @Get('stats')
  async getStats(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.projectsService.getStats(tenantId);
  }

  @Get('by-stage')
  async getProjectsByStage(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.projectsService.getProjectsByStage(tenantId);
  }

  @Get('project-managers')
  async getProjectManagers(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.projectsService.getProjectManagers(tenantId);
  }

  @Get(':projectId')
  async findOne(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('projectId') projectId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.projectsService.findOne(tenantId, projectId);
  }

  @Post()
  async create(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.projectsService.create(tenantId, createProjectDto);
  }

  @Patch(':projectId')
  async update(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('projectId') projectId: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.projectsService.update(tenantId, projectId, updateProjectDto);
  }

  @Patch(':projectId/status')
  async updateStatus(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('projectId') projectId: string,
    @Body() updateStatusDto: UpdateProjectStatusDto,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.projectsService.updateStatus(
      tenantId, 
      projectId, 
      updateStatusDto,
      updateStatusDto.userRole
    );
  }

  @Patch(':projectId/restore')
  async restore(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('projectId') projectId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.projectsService.restore(tenantId, projectId);
  }

  @Delete(':projectId')
  async remove(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('projectId') projectId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId || 'solarcorp';
    return this.projectsService.remove(tenantId, projectId);
  }
}
