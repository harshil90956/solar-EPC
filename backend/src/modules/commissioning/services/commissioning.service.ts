import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Commissioning } from '../schemas/commissioning.schema';
import { Tenant } from '../../../core/tenant/schemas/tenant.schema';
import { Project } from '../../projects/schemas/project.schema';
import { CreateCommissioningDto, UpdateCommissioningDto, UpdateCommissioningStatusDto } from '../dto/commissioning.dto';

interface UserWithVisibility {
  id?: string;
  _id?: string;
  dataScope?: 'ALL' | 'ASSIGNED';
}

@Injectable()
export class CommissioningService {
  constructor(
    @InjectModel(Commissioning.name) private readonly commissioningModel: Model<Commissioning>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
  ) {}

  private async getTenantId(tenantCode: string): Promise<Types.ObjectId> {
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

  async findAll(tenantCode: string, user?: UserWithVisibility, status?: string, projectId?: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const query: any = { tenantId, isDeleted: false };
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        // Show only items assigned to this user
        query.assignedTo = objectId;
      }
    }
    
    if (status && status !== 'All') {
      query.status = status;
    }

    if (projectId) {
      query.projectIdString = projectId;
    }

    return this.commissioningModel
      .find(query)
      .populate('projectId', 'projectId customerName site systemSize')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(tenantCode: string, id: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const commissioning = await this.commissioningModel
      .findOne({
        tenantId,
        _id: id,
        isDeleted: false,
      })
      .populate('projectId', 'projectId customerName site systemSize')
      .exec();

    if (!commissioning) {
      throw new NotFoundException(`Commissioning record ${id} not found`);
    }

    return commissioning;
  }

  async findByProject(tenantCode: string, projectId: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const commissioning = await this.commissioningModel
      .findOne({
        tenantId,
        projectIdString: projectId,
        isDeleted: false,
      })
      .populate('projectId', 'projectId customerName site systemSize')
      .exec();

    return commissioning;
  }

  async create(tenantCode: string, createDto: CreateCommissioningDto) {
    const tenantId = await this.getTenantId(tenantCode);
    
    // Find the project to get the ObjectId reference
    const project = await this.projectModel.findOne({
      tenantId,
      projectId: createDto.projectId,
      isDeleted: false,
    }).exec();

    if (!project) {
      throw new NotFoundException(`Project ${createDto.projectId} not found`);
    }

    const commissioning = new this.commissioningModel({
      ...createDto,
      projectId: project._id,
      projectIdString: createDto.projectId,
      tenantId,
    });

    const saved = await commissioning.save();
    
    // Update project status to Commissioned
    await this.projectModel.findByIdAndUpdate(
      project._id,
      { 
        $set: { 
          status: 'Commissioned',
          progress: createDto.percentage,
        } 
      }
    );

    return saved.populate('projectId', 'projectId customerName site systemSize');
  }

  async update(tenantCode: string, id: string, updateDto: UpdateCommissioningDto) {
    const tenantId = await this.getTenantId(tenantCode);
    
    const updateData: any = { ...updateDto };
    
    // If projectId is being updated, find the new project ObjectId
    if (updateDto.projectId) {
      const project = await this.projectModel.findOne({
        tenantId,
        projectId: updateDto.projectId,
        isDeleted: false,
      }).exec();

      if (!project) {
        throw new NotFoundException(`Project ${updateDto.projectId} not found`);
      }

      updateData.projectId = project._id;
      updateData.projectIdString = updateDto.projectId;
      delete updateData.projectId;
    }

    const commissioning = await this.commissioningModel.findOneAndUpdate(
      { tenantId, _id: id },
      { $set: updateData },
      { new: true },
    )
      .populate('projectId', 'projectId customerName site systemSize')
      .exec();

    if (!commissioning) {
      throw new NotFoundException(`Commissioning record ${id} not found`);
    }

    // Update project progress if percentage changed
    if (updateDto.percentage !== undefined && commissioning.projectId) {
      await this.projectModel.findByIdAndUpdate(
        commissioning.projectId,
        { $set: { progress: updateDto.percentage } }
      );
    }

    return commissioning;
  }

  async updateStatus(
    tenantCode: string,
    id: string,
    updateStatusDto: UpdateCommissioningStatusDto,
  ) {
    const tenantId = await this.getTenantId(tenantCode);
    
    const updateData: any = {
      status: updateStatusDto.status,
    };

    if (updateStatusDto.status === 'Completed') {
      updateData.completedAt = new Date();
      if (updateStatusDto.completedBy) {
        updateData.completedBy = new Types.ObjectId(updateStatusDto.completedBy);
      }
    }

    if (updateStatusDto.notes) {
      updateData.notes = updateStatusDto.notes;
    }

    const commissioning = await this.commissioningModel.findOneAndUpdate(
      { tenantId, _id: id },
      { $set: updateData },
      { new: true },
    )
      .populate('projectId', 'projectId customerName site systemSize')
      .exec();

    if (!commissioning) {
      throw new NotFoundException(`Commissioning record ${id} not found`);
    }

    return commissioning;
  }

  async remove(tenantCode: string, id: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const commissioning = await this.commissioningModel.findOneAndUpdate(
      { tenantId, _id: id },
      { $set: { isDeleted: true } },
      { new: true },
    ).exec();

    if (!commissioning) {
      throw new NotFoundException(`Commissioning record ${id} not found`);
    }

    return { message: 'Commissioning record deleted successfully' };
  }

  async getStats(tenantCode: string, user?: UserWithVisibility) {
    const tenantId = await this.getTenantId(tenantCode);
    
    const query: any = {
      tenantId,
      isDeleted: false,
    };
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        // Show only items assigned to this user
        query.assignedTo = objectId;
      }
    }
    
    const total = await this.commissioningModel.countDocuments(query);

    const pending = await this.commissioningModel.countDocuments({
      ...query,
      status: 'Pending',
    });

    const completed = await this.commissioningModel.countDocuments({
      ...query,
      status: 'Completed',
    });

    const cancelled = await this.commissioningModel.countDocuments({
      ...query,
      status: 'Cancelled',
    });

    return {
      total,
      pending,
      completed,
      cancelled,
    };
  }

  async getDashboardStats(tenantCode: string, user?: UserWithVisibility, startDate?: string, endDate?: string, projectType?: string) {
    const tenantId = await this.getTenantId(tenantCode);
    
    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    // Base query
    const baseQuery: any = {
      tenantId,
      isDeleted: false,
    };
    if (Object.keys(dateFilter).length > 0) {
      baseQuery.createdAt = dateFilter;
    }
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        // Show only items assigned to this user
        baseQuery.assignedTo = objectId;
      }
    }

    // Status distribution
    const statusDistribution = await this.commissioningModel.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Monthly trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyTrends = await this.commissioningModel.aggregate([
      { 
        $match: { 
          tenantId, 
          isDeleted: false,
          createdAt: { $gte: sixMonthsAgo }
        } 
      },
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          completed: { 
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          pending: { 
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Performance metrics
    const performanceMetrics = await this.commissioningModel.aggregate([
      { $match: { ...baseQuery, status: 'Completed' } },
      {
        $group: {
          _id: null,
          avgPR: { $avg: '$percentage' },
          maxPR: { $max: '$percentage' },
          minPR: { $min: '$percentage' },
          totalCapacity: { $sum: '$projectId.systemSize' }
        }
      }
    ]);

    // Recent activity (last 10 records)
    const recentActivity = await this.commissioningModel
      .find(baseQuery)
      .populate('projectId', 'projectId customerName site systemSize')
      .sort({ updatedAt: -1 })
      .limit(10)
      .exec();

    // Employee performance
    const employeeStats = await this.commissioningModel.aggregate([
      { $match: { ...baseQuery, status: 'Completed' } },
      {
        $group: {
          _id: '$employee',
          totalProjects: { $sum: 1 },
          avgPR: { $avg: '$percentage' }
        }
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { totalProjects: -1 } },
      { $limit: 5 }
    ]);

    // Project type distribution (if project type field exists)
    const projectTypeDistribution = await this.commissioningModel.aggregate([
      { $match: baseQuery },
      {
        $lookup: {
          from: 'projects',
          localField: 'projectId',
          foreignField: '_id',
          as: 'project'
        }
      },
      { $unwind: '$project' },
      {
        $group: {
          _id: { $ifNull: ['$project.type', 'Standard'] },
          count: { $sum: 1 }
        }
      }
    ]);

    // Warranty expiring soon (next 3 months)
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    
    const warrantyAlerts = await this.commissioningModel
      .find({
        tenantId,
        isDeleted: false,
        $or: [
          { panelWarranty: { $lte: threeMonthsFromNow.toISOString(), $gte: new Date().toISOString() } },
          { inverterWarranty: { $lte: threeMonthsFromNow.toISOString(), $gte: new Date().toISOString() } },
          { installWarranty: { $lte: threeMonthsFromNow.toISOString(), $gte: new Date().toISOString() } }
        ]
      })
      .populate('projectId', 'projectId customerName site')
      .limit(10)
      .exec();

    return {
      summary: {
        total: await this.commissioningModel.countDocuments(baseQuery),
        pending: await this.commissioningModel.countDocuments({ ...baseQuery, status: 'Pending' }),
        completed: await this.commissioningModel.countDocuments({ ...baseQuery, status: 'Completed' }),
        inProgress: await this.commissioningModel.countDocuments({ ...baseQuery, status: 'In Progress' }),
        cancelled: await this.commissioningModel.countDocuments({ ...baseQuery, status: 'Cancelled' }),
      },
      statusDistribution,
      monthlyTrends,
      performanceMetrics: performanceMetrics[0] || { avgPR: 0, maxPR: 0, minPR: 0, totalCapacity: 0 },
      recentActivity,
      employeeStats,
      projectTypeDistribution,
      warrantyAlerts,
      dateRange: { startDate, endDate }
    };
  }
}
