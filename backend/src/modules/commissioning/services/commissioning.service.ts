import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Commissioning } from '../schemas/commissioning.schema';
import { Tenant } from '../../../core/tenant/schemas/tenant.schema';
import { Project } from '../../projects/schemas/project.schema';
import { CreateCommissioningDto, UpdateCommissioningDto, UpdateCommissioningStatusDto } from '../dto/commissioning.dto';

@Injectable()
export class CommissioningService {
  constructor(
    @InjectModel(Commissioning.name) private readonly commissioningModel: Model<Commissioning>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
  ) {}

  private async getTenantId(tenantCode: string): Promise<Types.ObjectId> {
    const tenant = await this.tenantModel.findOne({ code: tenantCode });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantCode} not found`);
    }
    return tenant._id as Types.ObjectId;
  }

  async findAll(tenantCode: string, status?: string, projectId?: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const query: any = { tenantId, isDeleted: false };
    
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

  async getStats(tenantCode: string) {
    const tenantId = await this.getTenantId(tenantCode);
    
    const total = await this.commissioningModel.countDocuments({
      tenantId,
      isDeleted: false,
    });

    const pending = await this.commissioningModel.countDocuments({
      tenantId,
      isDeleted: false,
      status: 'Pending',
    });

    const completed = await this.commissioningModel.countDocuments({
      tenantId,
      isDeleted: false,
      status: 'Completed',
    });

    const cancelled = await this.commissioningModel.countDocuments({
      tenantId,
      isDeleted: false,
      status: 'Cancelled',
    });

    return {
      total,
      pending,
      completed,
      cancelled,
    };
  }
}
