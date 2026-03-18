import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { TasksService } from '../services/tasks.service';
import { CreateTaskDto, UpdateTaskDto, QueryTaskDto } from '../dto/task.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { UserWithVisibility } from '../../../common/utils/visibility-filter';

interface AuthenticatedRequest {
  user: UserWithVisibility;
}

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  private isAdmin(user: UserWithVisibility): boolean {
    const roleLower = (user?.role || '').toLowerCase();
    return user?.isSuperAdmin 
      || roleLower === 'admin'
      || roleLower === 'superadmin'
      || roleLower === 'super-admin'
      || roleLower === 'super_admin';
  }

  private getTenantId(req: any): string | undefined {
    return req.user?.tenantId || req.tenant?.id;
  }

  /**
   * Create a new task (Admin only)
   * POST /tasks
   */
  @Post()
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const tenantId = this.getTenantId(req);

    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    const task = await this.tasksService.create(createTaskDto, user, tenantId);
    return {
      success: true,
      data: task,
      message: 'Task created successfully',
    };
  }

  /**
   * Get all tasks with tenant isolation
   * - Admin: sees all tasks in their tenant
   * - Employee: only sees assigned tasks
   * GET /tasks
   */
  @Get()
  async findAll(
    @Query() query: QueryTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const tenantId = this.getTenantId(req);

    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    const result = await this.tasksService.findAll(query, user, tenantId);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: query.page || 1,
      limit: query.limit || 20,
    };
  }

  /**
   * Get task by ID
   * GET /tasks/:id
   */
  @Get(':id')
  async findOne(
    @Param('id') taskId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const tenantId = this.getTenantId(req);

    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    const task = await this.tasksService.findOne(taskId, user, tenantId);
    return {
      success: true,
      data: task,
    };
  }

  /**
   * Update a task
   * - Admin: full update
   * - Employee: status update only on assigned tasks
   * PATCH /tasks/:id
   */
  @Patch(':id')
  async update(
    @Param('id') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const tenantId = this.getTenantId(req);

    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    const task = await this.tasksService.update(taskId, updateTaskDto, user, tenantId);
    return {
      success: true,
      data: task,
      message: 'Task updated successfully',
    };
  }

  /**
   * Delete a task (Admin only)
   * DELETE /tasks/:id
   */
  @Delete(':id')
  async delete(
    @Param('id') taskId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const tenantId = this.getTenantId(req);

    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    const result = await this.tasksService.delete(taskId, user, tenantId);
    return {
      success: true,
      message: result.message,
    };
  }

  /**
   * Get users in same tenant for task assignment
   * GET /tasks/users/assignees
   */
  @Get('users/assignees')
  async getTenantUsers(@Request() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    // Only admin can see all users for assignment
    if (!this.isAdmin(req.user)) {
      throw new ForbiddenException('Only admin can view assignable users');
    }

    const users = await this.tasksService.getTenantUsers(tenantId);
    return {
      success: true,
      data: users,
    };
  }

  /**
   * Get task statistics
   * GET /tasks/stats/overview
   */
  @Get('stats/overview')
  async getStats(@Request() req: AuthenticatedRequest) {
    const user = req.user;
    const tenantId = this.getTenantId(req);

    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    const stats = await this.tasksService.getStats(user, tenantId);
    return {
      success: true,
      data: stats,
    };
  }
}
