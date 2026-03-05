import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Visit, VisitDocument } from '../schemas/visit.schema';
import { CreateVisitDto, UpdateVisitDto, QueryVisitDto } from '../dto/visit.dto';

@Injectable()
export class VisitsService {
  constructor(
    @InjectModel(Visit.name) private visitModel: Model<VisitDocument>,
  ) {}

  async create(createVisitDto: CreateVisitDto, tenantId?: string): Promise<Visit> {
    const visitId = `V${Date.now().toString().slice(-5)}`;
    
    // Ensure all required fields have values - using snake_case from DTO
    const visitData: any = {
      contractId: createVisitDto.contract_id || 'N/A',
      customer: createVisitDto.customer || 'Unknown',
      site: createVisitDto.site || 'Unknown',
      systemSize: createVisitDto.system_size ? Number(createVisitDto.system_size) : 0,
      visitType: createVisitDto.visit_type || 'Routine Maintenance',
      scheduledDate: createVisitDto.scheduled_date || new Date().toISOString().split('T')[0],
      scheduledTime: createVisitDto.scheduled_time || '09:00',
      engineerId: createVisitDto.engineer_id || 'N/A',
      engineerName: createVisitDto.engineer_name || 'Unassigned',
      priority: createVisitDto.priority || 'Low',
      notes: createVisitDto.notes || '',
      status: createVisitDto.status || 'Scheduled',
      visitId,
    };
    
    if (tenantId) {
      // Handle both string tenant IDs (like 'solarcorp') and ObjectId
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        visitData.tenantId = new Types.ObjectId(tenantId);
      } else {
        visitData.tenantId = tenantId; // Store as string for named tenants
      }
    }
    
    console.log('Creating visit with data:', visitData);
    const createdVisit = new this.visitModel(visitData);
    return createdVisit.save();
  }

  async findAll(query: QueryVisitDto, tenantId?: string): Promise<{ data: Visit[]; total: number }> {
    const { page = 1, limit = 25, contract_id, status, engineer_id, search } = query;
    const filter: any = { isDeleted: { $ne: true } };
    if (tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        filter.tenantId = new Types.ObjectId(tenantId);
      } else {
        filter.tenantId = tenantId;
      }
    }
    if (contract_id) filter.contractId = contract_id;
    if (status) filter.status = status;
    if (engineer_id) filter.engineerId = engineer_id;
    if (search) {
      filter.$or = [
        { visitId: { $regex: search, $options: 'i' } },
        { customer: { $regex: search, $options: 'i' } },
        { site: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.visitModel.find(filter).sort({ scheduledDate: 1, scheduledTime: 1 }).skip(skip).limit(limit).lean().exec(),
      this.visitModel.countDocuments(filter),
    ]);
    return { data: data as unknown as Visit[], total };
  }

  async findOne(id: string, tenantId?: string): Promise<Visit> {
    const filter: any = {
      $or: [{ _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined }, { visitId: id }].filter(Boolean),
      isDeleted: { $ne: true }
    };
    if (tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        filter.tenantId = new Types.ObjectId(tenantId);
      } else {
        filter.tenantId = tenantId;
      }
    }
    const visit = await this.visitModel.findOne(filter).lean().exec();
    if (!visit) throw new NotFoundException('Visit not found');
    return { ...visit, id: visit.visitId } as unknown as Visit;
  }

  async update(id: string, updateVisitDto: UpdateVisitDto, tenantId?: string): Promise<Visit> {
    const filter: any = {
      $or: [{ _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined }, { visitId: id }].filter(Boolean),
      isDeleted: { $ne: true }
    };
    if (tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        filter.tenantId = new Types.ObjectId(tenantId);
      } else {
        filter.tenantId = tenantId;
      }
    }
    const existingVisit = await this.visitModel.findOne(filter).exec();
    if (!existingVisit) throw new NotFoundException('Visit not found');
    Object.assign(existingVisit, updateVisitDto);
    const saved = await existingVisit.save();
    return { ...saved.toObject(), id: saved.visitId } as unknown as Visit;
  }

  async remove(id: string, tenantId?: string): Promise<void> {
    const filter: any = {
      $or: [{ _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined }, { visitId: id }].filter(Boolean),
    };
    if (tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        filter.tenantId = new Types.ObjectId(tenantId);
      } else {
        filter.tenantId = tenantId;
      }
    }
    const result = await this.visitModel.deleteOne(filter).exec();
    if (result.deletedCount === 0) throw new NotFoundException('Visit not found');
  }

  async getStats(tenantId?: string): Promise<any> {
    const filter: any = { isDeleted: { $ne: true } };
    if (tenantId) {
      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
        filter.tenantId = new Types.ObjectId(tenantId);
      } else {
        filter.tenantId = tenantId;
      }
    }
    const [totalVisits, scheduled, completed, cancelled] = await Promise.all([
      this.visitModel.countDocuments(filter),
      this.visitModel.countDocuments({ ...filter, status: 'Scheduled' }),
      this.visitModel.countDocuments({ ...filter, status: 'Completed' }),
      this.visitModel.countDocuments({ ...filter, status: 'Cancelled' }),
    ]);
    return { totalVisits, scheduled, completed, cancelled };
  }
}
