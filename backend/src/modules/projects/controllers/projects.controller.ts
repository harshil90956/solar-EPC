import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ProjectsService } from '../services/projects.service';
import { CreateProjectDto, UpdateProjectDto, UpdateProjectStatusDto } from '../dto/project.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll(
    @Query('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.projectsService.findAll(tenantId, status, search);
  }

  @Get('stats')
  async getStats(@Query('tenantId') tenantId: string) {
    return this.projectsService.getStats(tenantId);
  }

  @Get('by-stage')
  async getProjectsByStage(@Query('tenantId') tenantId: string) {
    return this.projectsService.getProjectsByStage(tenantId);
  }

  @Get('project-managers')
  async getProjectManagers(@Query('tenantId') tenantId: string) {
    return this.projectsService.getProjectManagers(tenantId);
  }

  @Get(':projectId')
  async findOne(
    @Query('tenantId') tenantId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.findOne(tenantId, projectId);
  }

  @Post()
  async create(
    @Query('tenantId') tenantId: string,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create(tenantId, createProjectDto);
  }

  @Patch(':projectId')
  async update(
    @Query('tenantId') tenantId: string,
    @Param('projectId') projectId: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(tenantId, projectId, updateProjectDto);
  }

  @Patch(':projectId/status')
  async updateStatus(
    @Query('tenantId') tenantId: string,
    @Param('projectId') projectId: string,
    @Body() updateStatusDto: UpdateProjectStatusDto,
  ) {
    return this.projectsService.updateStatus(
      tenantId, 
      projectId, 
      updateStatusDto,
      updateStatusDto.userRole
    );
  }

  @Delete(':projectId')
  async remove(
    @Query('tenantId') tenantId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projectsService.remove(tenantId, projectId);
  }
}
