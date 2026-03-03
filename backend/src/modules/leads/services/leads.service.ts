import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead, LeadDocument } from '../schemas/lead.schema';
import { CreateLeadDto, UpdateLeadDto, QueryLeadDto } from '../dto/lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
  ) {}

  async create(createLeadDto: CreateLeadDto, tenantId?: string): Promise<Lead> {
    const lead = new this.leadModel({
      ...createLeadDto,
      tenantId: tenantId ? new Types.ObjectId(tenantId) : undefined,
    });
    return lead.save();
  }

  async findAll(query: QueryLeadDto, tenantId?: string): Promise<{ data: Lead[]; total: number }> {
    const filter: any = { isDeleted: false };
    
    if (tenantId) {
      filter.tenantId = new Types.ObjectId(tenantId);
    }

    if (query.stage) {
      filter.stage = query.stage;
    }

    if (query.source) {
      filter.source = query.source;
    }

    if (query.assignedTo) {
      filter.assignedTo = query.assignedTo;
    }

    if (query.minScore) {
      filter.score = { $gte: query.minScore };
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { company: { $regex: query.search, $options: 'i' } },
        { phone: { $regex: query.search, $options: 'i' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 25;
    const skip = (page - 1) * limit;

    const sortBy = query.sortBy || 'created';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.leadModel
        .find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.leadModel.countDocuments(filter),
    ]);

    return { data, total };
  }

  async findOne(id: string, tenantId?: string): Promise<Lead> {
    const filter: any = { leadId: id, isDeleted: false };
    
    if (tenantId) {
      filter.tenantId = new Types.ObjectId(tenantId);
    }

    const lead = await this.leadModel.findOne(filter).exec();
    
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }
    
    return lead;
  }

  async update(id: string, updateLeadDto: UpdateLeadDto, tenantId?: string): Promise<Lead> {
    const filter: any = { leadId: id, isDeleted: false };
    
    if (tenantId) {
      filter.tenantId = new Types.ObjectId(tenantId);
    }

    const lead = await this.leadModel.findOneAndUpdate(
      filter,
      { $set: updateLeadDto },
      { new: true },
    ).exec();
    
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }
    
    return lead;
  }

  async remove(id: string, tenantId?: string): Promise<void> {
    const filter: any = { leadId: id, isDeleted: false };
    
    if (tenantId) {
      filter.tenantId = new Types.ObjectId(tenantId);
    }

    const result = await this.leadModel.findOneAndUpdate(
      filter,
      { $set: { isDeleted: true } },
      { new: true },
    ).exec();
    
    if (!result) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }
  }

  async addActivity(leadId: string, activity: any, tenantId?: string): Promise<Lead> {
    const filter: any = { leadId, isDeleted: false };
    
    if (tenantId) {
      filter.tenantId = new Types.ObjectId(tenantId);
    }

    const lead = await this.leadModel.findOneAndUpdate(
      filter,
      { $push: { activities: activity } },
      { new: true },
    ).exec();
    
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }
    
    return lead;
  }

  async getStats(tenantId?: string): Promise<any> {
    const filter: any = { isDeleted: false };
    
    if (tenantId) {
      filter.tenantId = new Types.ObjectId(tenantId);
    }

    const [total, byStage, bySource, totalValue] = await Promise.all([
      this.leadModel.countDocuments(filter),
      this.leadModel.aggregate([
        { $match: filter },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]),
      this.leadModel.aggregate([
        { $match: filter },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
      this.leadModel.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$value' } } },
      ]),
    ]);

    return {
      total,
      byStage: byStage.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      bySource: bySource.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      totalValue: totalValue[0]?.total || 0,
    };
  }
}
