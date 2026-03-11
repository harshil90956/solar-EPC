import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from '../schemas/project.schema';
import { Tenant, TenantSchema } from '../../../core/tenant/schemas/tenant.schema';
import { Item } from '../../items/schemas/item.schema';
import { Inventory } from '../../inventory/schemas/inventory.schema';
import { InventoryReservation } from '../../inventory/schemas/inventory-reservation.schema';
import { CreateProjectDto, UpdateProjectDto, UpdateProjectStatusDto } from '../dto/project.dto';
import { UserWithVisibility } from '../../../common/utils/visibility-filter';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(Item.name) private readonly itemModel: Model<Item>,
    @InjectModel(Inventory.name) private readonly inventoryModel: Model<Inventory>,
    @InjectModel(InventoryReservation.name) private readonly reservationModel: Model<InventoryReservation>,
  ) {}

  private async getTenantId(tenantCode: string): Promise<Types.ObjectId> {
    // If no tenant code provided, use 'default'
    if (!tenantCode || tenantCode === 'undefined') {
      tenantCode = 'default';
    }
    // If it looks like an ObjectId (24 hex chars), use it directly
    if (/^[0-9a-fA-F]{24}$/.test(tenantCode)) {
      return new Types.ObjectId(tenantCode);
    }
    // Otherwise, look up by code
    const tenant = await this.tenantModel.findOne({ code: tenantCode });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantCode} not found`);
    }
    return tenant._id as Types.ObjectId;
  }

  async findAll(tenantCode: string, user?: UserWithVisibility, status?: string, search?: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const query: any = { tenantId, isDeleted: false };
    
    console.log(`[PROJECTS VISIBILITY] user:`, JSON.stringify(user));
    console.log(`[PROJECTS VISIBILITY] user?.dataScope:`, user?.dataScope);
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      console.log(`[PROJECTS VISIBILITY] userId:`, userId);
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        query.assignedTo = objectId;
        console.log(`[PROJECTS VISIBILITY] Applied assignedTo filter - type:`, typeof objectId, `instance:`, objectId instanceof Types.ObjectId, `value:`, objectId);
      }
    } else {
      console.log(`[PROJECTS VISIBILITY] No filter applied - ALL scope or no user`);
    }
    
    console.log(`[PROJECTS VISIBILITY] Final query (stringified):`, JSON.stringify(query));
    console.log(`[PROJECTS VISIBILITY] Query assignedTo type:`, typeof query.assignedTo, `instance:`, query.assignedTo instanceof Types.ObjectId);
    
    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const result = await this.projectModel.find(query).sort({ createdAt: -1 }).exec();
    console.log(`[PROJECTS VISIBILITY] Query returned ${result.length} records`);
    return result;
  }

  async findOne(tenantCode: string, projectId: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const project = await this.projectModel.findOne({
      tenantId,
      projectId,
      isDeleted: false,
    }).exec();

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return project;
  }

  async create(tenantCode: string, createProjectDto: CreateProjectDto) {
    const tenantId = await this.getTenantId(tenantCode);

    const project = new this.projectModel({
      ...createProjectDto,
      tenantId,
    });

    return project.save();
  }

  async update(tenantCode: string, projectId: string, updateProjectDto: UpdateProjectDto) {
    const tenantId = await this.getTenantId(tenantCode);

    const project = await this.projectModel.findOneAndUpdate(
      { tenantId, projectId },
      { $set: updateProjectDto },
      { new: true },
    ).exec();

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return project;
  }

  async updateStatus(
    tenantCode: string,
    projectId: string,
    updateStatusDto: UpdateProjectStatusDto,
    user?: UserWithVisibility,
  ) {
    const tenantId = await this.getTenantId(tenantCode);
    
    // Extract user role and ID from user object
    const userRole = user?.role;
    const userId = user?._id || user?.id;
    
    // Role validation for Cancelled status
    if (updateStatusDto.status === 'Cancelled') {
      const allowedRoles = ['Admin', 'Project Manager'];
      if (!userRole || !allowedRoles.includes(userRole)) {
        throw new UnauthorizedException('Only Admin or Project Manager can cancel a project');
      }
    }
    
    // Build update object dynamically
    const updateData: any = {
      status: updateStatusDto.status,
    };
    
    if (updateStatusDto.progress !== undefined) {
      updateData.progress = updateStatusDto.progress;
    }
    
    if (updateStatusDto.milestones !== undefined) {
      updateData.milestones = updateStatusDto.milestones;
    }
    
    // Handle Cancelled status timestamp and user
    if (updateStatusDto.status === 'Cancelled') {
      updateData.cancelledAt = new Date();
      // Set cancelledBy if provided in DTO or from user
      if (updateStatusDto.cancelledBy) {
        updateData.cancelledBy = updateStatusDto.cancelledBy;
      } else if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        updateData.cancelledBy = objectId;
      }
    }
    
    const project = await this.projectModel.findOneAndUpdate(
      { tenantId, projectId },
      { $set: updateData },
      { new: true },
    ).exec();

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return project;
  }

  async remove(tenantCode: string, projectId: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const project = await this.projectModel.findOneAndUpdate(
      { tenantId, projectId },
      { $set: { isDeleted: true } },
      { new: true },
    ).exec();

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return { message: `Project ${projectId} deleted successfully` };
  }

  async restore(tenantCode: string, projectId: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const project = await this.projectModel.findOneAndUpdate(
      { tenantId, projectId, isDeleted: true },
      { $set: { isDeleted: false } },
      { new: true },
    ).exec();

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found or not deleted`);
    }

    return { message: `Project ${projectId} restored successfully` };
  }

  async getStats(tenantCode: string, user?: UserWithVisibility) {
    const tenantId = await this.getTenantId(tenantCode);
    
    // Build match conditions for aggregation
    const matchConditions: any = {
      tenantId,
      isDeleted: false,
      status: { $ne: 'Cancelled' }, // Exclude cancelled projects from stats
    };
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        // STRICT: Only include projects explicitly assigned to this user
        matchConditions.assignedTo = objectId;
        console.log(`[PROJECTS STATS VISIBILITY] Applied assignedTo filter:`, objectId);
      }
    }
    
    console.log(`[PROJECTS STATS VISIBILITY] Match conditions:`, JSON.stringify(matchConditions));
    
    const stats = await this.projectModel.aggregate([
      {
        $match: matchConditions,
      },
      {
        $group: {
          _id: null,
          totalProjects: { $sum: 1 },
          totalCapacity: { $sum: '$systemSize' },
          avgProgress: { $avg: '$progress' },
          commissioned: {
            $sum: { $cond: [{ $eq: ['$status', 'Commissioned'] }, 1, 0] },
          },
          active: {
            $sum: { $cond: [{ $ne: ['$status', 'Commissioned'] }, 1, 0] },
          },
          totalValue: { $sum: '$value' },
        },
      },
    ]).exec();

    return stats[0] || {
      totalProjects: 0,
      totalCapacity: 0,
      avgProgress: 0,
      commissioned: 0,
      active: 0,
      totalValue: 0,
    };
  }

  async getProjectsByStage(tenantCode: string) {
    const tenantId = await this.getTenantId(tenantCode);
    return this.projectModel.aggregate([
      {
        $match: {
          tenantId,
          isDeleted: false,
          status: { $ne: 'Cancelled' }, // Exclude cancelled projects
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          capacity: { $sum: '$systemSize' },
        },
      },
    ]).exec();
  }

  async getProjectManagers(tenantCode: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const projects = await this.projectModel
      .find({ tenantId, isDeleted: false })
      .select('pm')
      .distinct('pm')
      .exec();
    return { projectManagers: projects.filter(pm => pm && pm.trim() !== '') };
  }
}
