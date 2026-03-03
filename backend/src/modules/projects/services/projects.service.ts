import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from '../schemas/project.schema';
import { Tenant, TenantSchema } from '../../../core/tenant/schemas/tenant.schema';
import { CreateProjectDto, UpdateProjectDto, UpdateProjectStatusDto } from '../dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
  ) {}

  private async getTenantId(tenantCode: string): Promise<Types.ObjectId> {
    const tenant = await this.tenantModel.findOne({ code: tenantCode });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantCode} not found`);
    }
    return tenant._id as Types.ObjectId;
  }

  async findAll(tenantCode: string, status?: string, search?: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const query: any = { tenantId, isDeleted: false };
    
    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      query.$text = { $search: search };
    }

    return this.projectModel.find(query).sort({ createdAt: -1 }).exec();
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
    userRole?: string,
  ) {
    const tenantId = await this.getTenantId(tenantCode);
    
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
    
    // Handle Cancelled status timestamp
    if (updateStatusDto.status === 'Cancelled') {
      updateData.cancelledAt = new Date();
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

  async getStats(tenantCode: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const stats = await this.projectModel.aggregate([
      {
        $match: {
          tenantId,
          isDeleted: false,
          status: { $ne: 'Cancelled' }, // Exclude cancelled projects from stats
        },
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
}
