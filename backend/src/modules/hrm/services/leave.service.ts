import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Leave, LeaveDocument, LeaveStatus } from '../schemas/leave.schema';
import { CreateLeaveDto, UpdateLeaveStatusDto, ApproveLeaveDto } from '../dto/leave.dto';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';

@Injectable()
export class LeaveService {
  constructor(
    @InjectModel(Leave.name) private readonly leaveModel: Model<LeaveDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  private async resolveTenantObjectId(tenantId: string): Promise<Types.ObjectId> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is missing');
    }
    if (Types.ObjectId.isValid(tenantId)) {
      return new Types.ObjectId(tenantId);
    }
    const tenant = await this.tenantModel.findOne({ code: tenantId }).lean();
    if (!tenant) {
      throw new BadRequestException(`Tenant not found for identifier: ${tenantId}`);
    }
    return (tenant as any)._id as Types.ObjectId;
  }

  async create(createLeaveDto: CreateLeaveDto, tenantId?: string): Promise<Leave> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    // Calculate days between start and end date
    const start = new Date(createLeaveDto.startDate);
    const end = new Date(createLeaveDto.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const leave = new this.leaveModel({
      ...createLeaveDto,
      employeeId: new Types.ObjectId(createLeaveDto.employeeId),
      days,
      status: LeaveStatus.PENDING,
      tenantId: tid,
    });

    return leave.save();
  }

  async findAll(employeeId?: string, status?: LeaveStatus, startDate?: Date, endDate?: Date, tenantId?: string): Promise<Leave[]> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { tenantId: tid };
    
    if (employeeId) {
      query.employeeId = new Types.ObjectId(employeeId);
    }
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) {
        query.startDate.$gte = startDate;
      }
      if (endDate) {
        query.endDate = { $lte: endDate };
      }
    }

    return this.leaveModel
      .find(query)
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, tenantId?: string): Promise<Leave> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { _id: new Types.ObjectId(id), tenantId: tid };

    const leave = await this.leaveModel
      .findOne(query)
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName')
      .exec();

    if (!leave) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    return leave;
  }

  async approve(id: string, approveDto: ApproveLeaveDto, tenantId?: string): Promise<Leave> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { _id: new Types.ObjectId(id), tenantId: tid };

    const leave = await this.leaveModel
      .findOneAndUpdate(
        query,
        {
          $set: {
            status: LeaveStatus.APPROVED,
            approvedBy: new Types.ObjectId(approveDto.approvedBy),
            approvedAt: new Date(),
          },
        },
        { new: true }
      )
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName')
      .exec();

    if (!leave) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    return leave;
  }

  async reject(id: string, updateDto: UpdateLeaveStatusDto, tenantId?: string): Promise<Leave> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { _id: new Types.ObjectId(id), tenantId: tid };

    const leave = await this.leaveModel
      .findOneAndUpdate(
        query,
        {
          $set: {
            status: LeaveStatus.REJECTED,
            rejectionReason: updateDto.rejectionReason || '',
          },
        },
        { new: true }
      )
      .populate('employeeId', 'firstName lastName employeeId')
      .exec();

    if (!leave) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    return leave;
  }

  async delete(id: string, tenantId?: string): Promise<void> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { _id: new Types.ObjectId(id), tenantId: tid };

    const result = await this.leaveModel.deleteOne(query).exec();
    
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }
  }

  async getLeaveBalance(employeeId: string, year: number, tenantId?: string): Promise<any> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = {
      employeeId: new Types.ObjectId(employeeId),
      year: year,
      status: LeaveStatus.APPROVED,
      tenantId: tid,
    };

    const leaves = await this.leaveModel.find(query).exec();

    const totalLeaves = leaves.reduce((sum, leave) => sum + leave.days, 0);
    
    // Default leave allocation (can be customized per employee)
    const defaultAllocation = {
      paid: 15,
      sick: 10,
      casual: 8,
      earned: 0,
    };

    const usedByType = {
      paid: leaves.filter(l => l.leaveType === 'paid').reduce((sum, l) => sum + l.days, 0),
      sick: leaves.filter(l => l.leaveType === 'sick').reduce((sum, l) => sum + l.days, 0),
      casual: leaves.filter(l => l.leaveType === 'casual').reduce((sum, l) => sum + l.days, 0),
      earned: leaves.filter(l => l.leaveType === 'earned').reduce((sum, l) => sum + l.days, 0),
    };

    return {
      year,
      totalUsed: totalLeaves,
      allocation: defaultAllocation,
      used: usedByType,
      remaining: {
        paid: defaultAllocation.paid - usedByType.paid,
        sick: defaultAllocation.sick - usedByType.sick,
        casual: defaultAllocation.casual - usedByType.casual,
        earned: defaultAllocation.earned - usedByType.earned,
      },
    };
  }
}
