import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionGuard } from '../../settings/guards/permission.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { InstallationService, UserContext } from '../services/installation.service';
import {
  CreateInstallationDto,
  UpdateInstallationDto,
  UpdateInstallationStatusDto,
  UpdateInstallationTasksDto,
  AddPhotoDto,
  QualityCheckDto,
  CustomerSignOffUpdateDto,
} from '../dto/installation.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    tenantId: string;
    dataScope: 'ALL' | 'ASSIGNED' | 'NONE';
    role: string;
  };
}

@Controller('installations')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class InstallationController {
  constructor(private readonly installationService: InstallationService) {}

  private getUserContext(req: AuthenticatedRequest): UserContext {
    const user = req.user as any;
    return {
      userId: user.userId,
      id: user.id,
      tenantId: user.tenantId,
      dataScope: user.dataScope,
      role: user.role,
    };
  }

  /**
   * Get all installations
   */
  @Get()
  @RequirePermission('installation', 'view')
  async getInstallations(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('technicianId') technicianId?: string,
    @Query('search') search?: string,
  ) {
    return this.installationService.getInstallations(this.getUserContext(req), {
      status,
      projectId,
      technicianId,
      search,
    });
  }

  /**
   * Get installation statistics
   */
  @Get('statistics')
  @RequirePermission('installation', 'view')
  async getStatistics(@Request() req: AuthenticatedRequest) {
    return this.installationService.getStatistics(this.getUserContext(req));
  }

  /**
   * Get single installation by ID
   */
  @Get(':id')
  @RequirePermission('installation', 'view')
  async getInstallationById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.installationService.getInstallationById(id, this.getUserContext(req));
  }

  /**
   * Get installation by project ID
   */
  @Get('by-project/:projectId')
  @RequirePermission('installation', 'view')
  async getInstallationByProjectId(
    @Param('projectId') projectId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.installationService.getInstallationByProjectId(projectId, this.getUserContext(req));
  }

  /**
   * Create new installation
   */
  @Post()
  @RequirePermission('installation', 'create')
  async createInstallation(
    @Body() createDto: CreateInstallationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.installationService.createInstallation(createDto, this.getUserContext(req));
  }

  /**
   * Update installation
   */
  @Patch(':id')
  @RequirePermission('installation', 'edit')
  async updateInstallation(
    @Param('id') id: string,
    @Body() updateDto: UpdateInstallationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.installationService.updateInstallation(id, updateDto, this.getUserContext(req));
  }

  /**
   * Update installation status
   * Technicians can update status even without edit permission
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdateInstallationStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // Check if user is technician - allow status update even without edit permission
    const user = req.user as any;
    const isTechnician = user.role?.toLowerCase() === 'technician' || 
                         await this.installationService.isAssignedTechnician(id, user.userId);
    
    if (!isTechnician && !user.can?.('installation', 'edit')) {
      throw new ForbiddenException('Permission denied');
    }
    
    return this.installationService.updateStatus(id, statusDto, this.getUserContext(req));
  }

  /**
   * Update installation tasks
   * Technicians can update tasks even without edit permission
   */
  @Patch(':id/tasks')
  async updateTasks(
    @Param('id') id: string,
    @Body() tasksDto: UpdateInstallationTasksDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // Check if user is technician - allow tasks update even without edit permission
    const user = req.user as any;
    const isTechnician = user.role?.toLowerCase() === 'technician' || 
                         await this.installationService.isAssignedTechnician(id, user.userId);
    
    if (!isTechnician && !user.can?.('installation', 'edit')) {
      throw new ForbiddenException('Permission denied');
    }
    
    return this.installationService.updateTasks(id, tasksDto, this.getUserContext(req));
  }

  /**
   * Add photo to installation
   */
  @Post(':id/photos')
  @RequirePermission('installation', 'edit')
  async addPhoto(
    @Param('id') id: string,
    @Body() photoDto: AddPhotoDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.installationService.addPhoto(id, photoDto, this.getUserContext(req));
  }

  /**
   * Remove photo from installation
   */
  @Delete(':id/photos/:photoKey')
  @RequirePermission('installation', 'edit')
  async removePhoto(
    @Param('id') id: string,
    @Param('photoKey') photoKey: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.installationService.removePhoto(id, photoKey, this.getUserContext(req));
  }

  /**
   * Update quality check
   */
  @Patch(':id/quality-check')
  @RequirePermission('installation', 'edit')
  async updateQualityCheck(
    @Param('id') id: string,
    @Body() qualityDto: QualityCheckDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.installationService.updateQualityCheck(id, qualityDto, this.getUserContext(req));
  }

  /**
   * Update customer sign-off
   */
  @Patch(':id/customer-signoff')
  @RequirePermission('installation', 'edit')
  async updateCustomerSignOff(
    @Param('id') id: string,
    @Body() signOffDto: CustomerSignOffUpdateDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.installationService.updateCustomerSignOff(id, signOffDto, this.getUserContext(req));
  }

  /**
   * Delete installation (soft delete)
   */
  @Delete(':id')
  @RequirePermission('installation', 'delete')
  async deleteInstallation(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.installationService.deleteInstallation(id, this.getUserContext(req));
    return { message: 'Installation deleted successfully' };
  }

  /**
   * Get timeline events for a single installation
   */
  @Get(':id/timeline')
  @RequirePermission('installation', 'view')
  async getTimeline(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.installationService.getTimeline(id, this.getUserContext(req));
  }

  /**
   * Calendar view events across installations
   * Accepts query params: from,to,technicianId,projectId,status
   */
  @Get('calendar')
  @RequirePermission('installation', 'view')
  async getCalendar(
    @Request() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('technicianId') technicianId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
  ) {
    return this.installationService.getCalendarEvents(this.getUserContext(req), {
      from,
      to,
      technicianId,
      projectId,
      status,
    });
  }

  /**
   * Check overdue installations and mark as Delayed
   * Automatically runs to find installations past due date
   */
  @Post('check-overdue')
  @RequirePermission('installation', 'edit')
  async checkOverdue(@Request() req: AuthenticatedRequest) {
    return this.installationService.checkOverdueInstallations(this.getUserContext(req));
  }
}
