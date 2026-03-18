import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument, TaskStatus } from '../schemas/task.schema';
import { CreateTaskDto, UpdateTaskDto, QueryTaskDto } from '../dto/task.dto';
import { UserWithVisibility, buildCompleteFilter, canAccessRecord } from '../../../common/utils/visibility-filter';
import { User, UserDocument } from '../../../core/auth/schemas/user.schema';
import { Employee, EmployeeDocument } from '../../../modules/hrm/schemas/employee.schema';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
  ) {}

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    if (Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    return undefined;
  }

  private isAdmin(user: UserWithVisibility): boolean {
    const roleLower = (user?.role || '').toLowerCase();
    return user?.isSuperAdmin 
      || roleLower === 'admin'
      || roleLower === 'superadmin'
      || roleLower === 'super-admin'
      || roleLower === 'super_admin';
  }

  /**
   * Create a new task (Admin only)
   * - Validates assignedTo user belongs to same tenant
   * - Automatically sets createdBy from logged-in user
   * - Automatically sets tenantId from logged-in user
   */
  async create(
    createTaskDto: CreateTaskDto,
    user: UserWithVisibility,
    tenantId: string,
  ): Promise<Task> {
    // Only admin can create tasks
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only admin can create tasks');
    }

    const tenantObjId = this.toObjectId(tenantId);
    if (!tenantObjId) {
      throw new BadRequestException('Invalid tenant ID');
    }

    // DEBUG: Log incoming data
    console.log('[TASKS DEBUG] CREATE - DTO:', JSON.stringify(createTaskDto));
    console.log('[TASKS DEBUG] CREATE - title:', createTaskDto.title);
    console.log('[TASKS DEBUG] CREATE - description:', createTaskDto.description);
    console.log('[TASKS DEBUG] CREATE - assignedTo:', createTaskDto.assignedTo);

    // Validate assignedTo user exists and belongs to same tenant
    const assignedTo = createTaskDto.assignedTo;
    if (!assignedTo) {
      throw new BadRequestException('Invalid assigned user');
    }

    // Check user/employee exists (optional validation)
    const assignedUser = await this.userModel.findOne({
      email: assignedTo,
      tenantId: tenantObjId,
      isActive: true,
    }).lean();

    const assignedEmployee = await this.employeeModel.findOne({
      email: assignedTo,
      tenantId: tenantObjId,
      status: { $in: ['active', 'inactive'] },
    }).lean();

    if (!assignedUser && !assignedEmployee) {
      console.log('[TASKS DEBUG] Warning: Assigned user not found:', assignedTo);
      // Allow anyway like Survey does
    }

    const userId = user._id || user.id;
    const createdByObjId = this.toObjectId(userId?.toString());

    const taskData = {
      title: createTaskDto.title,
      description: createTaskDto.description,
      assignedTo: assignedTo, // Store as string like Survey (engineer field)
      assignedToUserId: assignedUser ? assignedUser._id : (assignedEmployee ? assignedEmployee._id : null),
      createdBy: createdByObjId,
      tenantId: tenantObjId,
      status: createTaskDto.status || 'pending' as TaskStatus,
      dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : undefined,
      isDeleted: false,
    };

    const newTask = new this.taskModel(taskData);
    return newTask.save();
  }

  /**
   * Get all tasks with tenant isolation and role-based visibility
   * - Admin: sees all tasks in their tenant
   * - Employee: only sees tasks assigned to them
   */
  async findAll(
    query: QueryTaskDto,
    user: UserWithVisibility,
    tenantId: string,
  ): Promise<{ data: Task[]; total: number }> {
    const { status, assignedTo, search, page = 1, limit = 20 } = query;

    // Build base filter with tenant isolation and visibility
    const baseFilter: any = {};
    if (status) baseFilter.status = status;
    if (assignedTo) baseFilter.assignedTo = assignedTo; // assignedTo is now string (email)
    if (search) {
      baseFilter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // For employees, only show tasks assigned to them
    if (!this.isAdmin(user)) {
      const userId = user?._id || user?.id;
      if (userId) {
        const objectId =
          typeof userId === 'string' && Types.ObjectId.isValid(userId)
            ? new Types.ObjectId(userId)
            : userId;
        baseFilter.assignedToUserId = objectId;
        console.log('[TASKS DEBUG] Employee filter - only showing tasks assigned to userId:', String(userId));
      } else {
        // No userId context, safest behavior is to match nothing for non-admin
        baseFilter.assignedToUserId = null;
        console.log('[TASKS DEBUG] Employee filter - missing userId, returning empty result set');
      }
    }

    const filter = buildCompleteFilter(tenantId, user, baseFilter);

    // Debug: Log the final filter
    console.log('[TASKS DEBUG] Final filter:', JSON.stringify(filter));
    console.log('[TASKS DEBUG] User:', { id: user.id, role: user.role, tenantId });

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.taskModel
        .find(filter)
        .populate('assignedToUserId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.taskModel.countDocuments(filter),
    ]);

    console.log('[TASKS DEBUG] Found', data.length, 'tasks, total:', total);
    console.log('[TASKS DEBUG] First task data:', data[0] ? JSON.stringify(data[0]) : 'no tasks');

    return { data, total };
  }

  /**
   * Get a single task by ID with access check
   */
  async findOne(
    taskId: string,
    user: UserWithVisibility,
    tenantId: string,
  ): Promise<Task> {
    const filter = buildCompleteFilter(tenantId, user, { _id: this.toObjectId(taskId) });

    const task = await this.taskModel
      .findOne(filter)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  /**
   * Update a task (Admin: full access, Employee: status only on assigned tasks)
   */
  async update(
    taskId: string,
    updateTaskDto: UpdateTaskDto,
    user: UserWithVisibility,
    tenantId: string,
  ): Promise<Task> {
    const isAdminUser = this.isAdmin(user);
    const userId = user._id || user.id;

    // First, find the task with access check
    const task = await this.findOne(taskId, user, tenantId);

    // If employee, can only update status of their assigned tasks
    if (!isAdminUser) {
      // Check if task is assigned to this user
      const taskAssignedTo = task.assignedTo?.toString();
      if (taskAssignedTo !== userId) {
        throw new ForbiddenException('You can only update tasks assigned to you');
      }

      // Employee can only update status
      if (Object.keys(updateTaskDto).length > 1 || 
          (updateTaskDto.status === undefined && Object.keys(updateTaskDto).length > 0)) {
        throw new ForbiddenException('You can only update task status');
      }

      // Only allow status update
      const allowedUpdate = { status: updateTaskDto.status };
      const updated = await this.taskModel
        .findByIdAndUpdate((task as any)._id, allowedUpdate, { new: true })
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .exec();

      if (!updated) {
        throw new NotFoundException('Task not found');
      }

      return updated;
    }

    // Admin can update everything
    const updateData: any = {};
    if (updateTaskDto.title !== undefined) updateData.title = updateTaskDto.title;
    if (updateTaskDto.description !== undefined) updateData.description = updateTaskDto.description;
    if (updateTaskDto.status !== undefined) updateData.status = updateTaskDto.status;
    if (updateTaskDto.dueDate !== undefined) updateData.dueDate = new Date(updateTaskDto.dueDate);

    // If reassigning, validate new user belongs to same tenant
    if (updateTaskDto.assignedTo) {
      const newAssigneeObjId = this.toObjectId(updateTaskDto.assignedTo);
      if (!newAssigneeObjId) {
        throw new BadRequestException('Invalid assigned user ID');
      }

      const tenantObjId = this.toObjectId(tenantId);
      
      // Check in Users collection first
      let newAssignee: any = await this.userModel.findOne({
        _id: newAssigneeObjId,
        tenantId: tenantObjId,
        isActive: true,
      }).lean();

      // If not found in Users, check in Employees collection
      if (!newAssignee) {
        newAssignee = await this.employeeModel.findOne({
          _id: newAssigneeObjId,
          tenantId: tenantObjId,
          status: { $in: ['active', 'inactive'] },
        }).lean();
      }

      if (!newAssignee) {
        throw new BadRequestException('New assignee not found in your tenant');
      }

      updateData.assignedTo = newAssigneeObjId;
    }

    const updated = await this.taskModel
      .findByIdAndUpdate((task as any)._id, updateData, { new: true })
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .exec();

    if (!updated) {
      throw new NotFoundException('Task not found');
    }

    return updated;
  }

  /**
   * Delete a task (Admin only)
   */
  async delete(
    taskId: string,
    user: UserWithVisibility,
    tenantId: string,
  ): Promise<{ message: string }> {
    // Only admin can delete
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only admin can delete tasks');
    }

    // Find task with tenant filter
    const task = await this.findOne(taskId, user, tenantId);

    // Soft delete
    await this.taskModel.findByIdAndUpdate((task as any)._id, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    return { message: 'Task deleted successfully' };
  }

  /**
   * Get users in same tenant for assignment dropdown
   * Includes both Users (admins) and Employees
   */
  async getTenantUsers(tenantId: string): Promise<{ id: string; name: string; email: string; role: string }[]> {
    const tenantObjId = this.toObjectId(tenantId);
    if (!tenantObjId) {
      throw new BadRequestException('Invalid tenant ID');
    }

    try {
      // Get users (admins, managers)
      const users = await this.userModel
        .find({ tenantId: tenantObjId, isActive: true })
        .select('firstName lastName email role')
        .lean();

      // Get employees - handle case where employee tenantId might be different format
      let employees: any[] = [];
      try {
        employees = await this.employeeModel
          .find({ 
            $or: [
              { tenantId: tenantObjId },
              { tenantId: tenantId },
            ],
            status: { $in: ['active', 'inactive'] } 
          })
          .select('firstName lastName email employeeId department')
          .lean();
      } catch (e: any) {
        console.log('[TASKS] Employee query failed:', e.message);
      }

      const userList = users.map(u => ({
        id: String(u._id),
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email.split('@')[0],
        email: u.email,
        role: u.role,
      }));

      const employeeList = employees.map(e => ({
        id: String(e._id),
        name: `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.email.split('@')[0],
        email: e.email,
        role: e.department || 'Employee',
      }));

      // Combine both lists
      return [...userList, ...employeeList];
    } catch (error) {
      console.error('[TASKS] Error fetching tenant users:', error);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Get task stats for dashboard
   */
  async getStats(
    user: UserWithVisibility,
    tenantId: string,
  ): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  }> {
    const filter = buildCompleteFilter(tenantId, user);

    const [total, pending, inProgress, completed] = await Promise.all([
      this.taskModel.countDocuments(filter),
      this.taskModel.countDocuments({ ...filter, status: 'pending' }),
      this.taskModel.countDocuments({ ...filter, status: 'in-progress' }),
      this.taskModel.countDocuments({ ...filter, status: 'completed' }),
    ]);

    return { total, pending, inProgress, completed };
  }
}
