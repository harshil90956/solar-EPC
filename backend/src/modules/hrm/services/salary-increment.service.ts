import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SalaryIncrement, SalaryIncrementDocument } from '../schemas/salary-increment.schema';
import { CreateIncrementDto, UpdateIncrementDto } from '../dto/salary-increment.dto';

@Injectable()
export class SalaryIncrementService {
  constructor(
    @InjectModel(SalaryIncrement.name) private readonly incrementModel: Model<SalaryIncrementDocument>,
  ) {}

  async create(createDto: CreateIncrementDto, tenantId?: string): Promise<SalaryIncrement> {
    // Validate that new salary is greater than previous
    if (createDto.newSalary <= createDto.previousSalary) {
      throw new BadRequestException('New salary must be greater than previous salary');
    }

    // Calculate increment amount
    const incrementAmount = createDto.newSalary - createDto.previousSalary;

    const increment = new this.incrementModel({
      ...createDto,
      employeeId: new Types.ObjectId(createDto.employeeId),
      incrementAmount,
      approvedBy: createDto.approvedBy ? new Types.ObjectId(createDto.approvedBy) : undefined,
      tenantId: tenantId && tenantId !== 'default' ? new Types.ObjectId(tenantId) : undefined,
    });

    return increment.save();
  }

  async findAll(employeeId?: string, tenantId?: string): Promise<SalaryIncrement[]> {
    const query: any = {};
    
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }
    
    if (employeeId) {
      query.employeeId = new Types.ObjectId(employeeId);
    }

    return this.incrementModel
      .find(query)
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName')
      .sort({ effectiveFrom: -1 })
      .exec();
  }

  async findOne(id: string, tenantId?: string): Promise<SalaryIncrement> {
    const query: any = { _id: new Types.ObjectId(id) };
    
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }

    const increment = await this.incrementModel
      .findOne(query)
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName')
      .exec();

    if (!increment) {
      throw new NotFoundException(`Salary increment with ID ${id} not found`);
    }

    return increment;
  }

  async findByEmployeeId(employeeId: string, tenantId?: string): Promise<SalaryIncrement[]> {
    const query: any = { 
      employeeId: new Types.ObjectId(employeeId) 
    };
    
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }

    return this.incrementModel
      .find(query)
      .populate('approvedBy', 'firstName lastName')
      .sort({ effectiveFrom: -1 })
      .exec();
  }

  async getLatestSalary(employeeId: string, tenantId?: string): Promise<number> {
    const query: any = { 
      employeeId: new Types.ObjectId(employeeId) 
    };
    
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }

    const latestIncrement = await this.incrementModel
      .findOne(query)
      .sort({ effectiveFrom: -1 })
      .exec();

    return latestIncrement ? latestIncrement.newSalary : 0;
  }

  async getIncrementHistory(employeeId: string, tenantId?: string): Promise<any> {
    const increments = await this.findByEmployeeId(employeeId, tenantId);
    
    const currentSalary = increments.length > 0 ? increments[0].newSalary : 0;
    const totalIncrementPercentage = increments.reduce((sum, inc) => sum + inc.incrementPercentage, 0);
    
    return {
      employeeId,
      currentSalary,
      totalIncrements: increments.length,
      totalIncrementPercentage: Math.round(totalIncrementPercentage * 100) / 100,
      increments: increments.map(inc => ({
        id: (inc as any)._id,
        previousSalary: inc.previousSalary,
        newSalary: inc.newSalary,
        incrementAmount: inc.incrementAmount,
        incrementPercentage: inc.incrementPercentage,
        effectiveFrom: inc.effectiveFrom,
        reason: inc.reason,
        createdAt: inc.createdAt,
      })),
    };
  }

  async update(id: string, updateDto: UpdateIncrementDto, tenantId?: string): Promise<SalaryIncrement> {
    const query: any = { _id: new Types.ObjectId(id) };
    
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }

    // If updating salaries, recalculate increment amount
    const updateData: any = { ...updateDto };
    if (updateDto.previousSalary !== undefined && updateDto.newSalary !== undefined) {
      if (updateDto.newSalary <= updateDto.previousSalary) {
        throw new BadRequestException('New salary must be greater than previous salary');
      }
      updateData.incrementAmount = updateDto.newSalary - updateDto.previousSalary;
    }

    if (updateDto.approvedBy) {
      updateData.approvedBy = new Types.ObjectId(updateDto.approvedBy);
    }

    const increment = await this.incrementModel
      .findOneAndUpdate(
        query,
        { $set: updateData },
        { new: true }
      )
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('approvedBy', 'firstName lastName')
      .exec();

    if (!increment) {
      throw new NotFoundException(`Salary increment with ID ${id} not found`);
    }

    return increment;
  }

  async delete(id: string, tenantId?: string): Promise<void> {
    const query: any = { _id: new Types.ObjectId(id) };
    
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }

    const result = await this.incrementModel.deleteOne(query).exec();
    
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Salary increment with ID ${id} not found`);
    }
  }
}
