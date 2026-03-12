import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SalaryIncrement, SalaryIncrementDocument } from '../schemas/salary-increment.schema';
import { Employee, EmployeeSchema } from '../schemas/employee.schema';
import { CreateIncrementDto, UpdateIncrementDto } from '../dto/salary-increment.dto';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';
import { UserWithVisibility } from '../../../common/utils/visibility-filter';

@Injectable()
export class SalaryIncrementService {
  constructor(
    @InjectModel(SalaryIncrement.name) private readonly incrementModel: Model<SalaryIncrementDocument>,
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

  async create(createDto: CreateIncrementDto, tenantId?: string, user?: UserWithVisibility): Promise<SalaryIncrement> {
    // 1. First, find the employee to get their actual tenantId
    const employee = await this.tenantModel.db.model('Employee', EmployeeSchema).findById(createDto.employeeId).lean();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    const employeeTenantId = (employee as any).tenantId;

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
      tenantId: employeeTenantId,
    });

    return increment.save();
  }

  async findAll(employeeId?: string, tenantId?: string, user?: UserWithVisibility): Promise<SalaryIncrement[]> {
    const query: any = {};

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      // Regular users MUST have a tenantId
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
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

  async findOne(id: string, tenantId?: string, user?: UserWithVisibility): Promise<SalaryIncrement> {
    const query: any = { _id: new Types.ObjectId(id) };

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
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

  async findByEmployeeId(employeeId: string, tenantId?: string, user?: UserWithVisibility): Promise<SalaryIncrement[]> {
    const query: any = { 
      employeeId: new Types.ObjectId(employeeId),
    };

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
    }

    return this.incrementModel
      .find(query)
      .populate('approvedBy', 'firstName lastName')
      .sort({ effectiveFrom: -1 })
      .exec();
  }

  async getLatestSalary(employeeId: string, tenantId?: string, user?: UserWithVisibility): Promise<number> {
    const query: any = { 
      employeeId: new Types.ObjectId(employeeId),
    };

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
    }

    const latestIncrement = await this.incrementModel
      .findOne(query)
      .sort({ effectiveFrom: -1 })
      .exec();

    return latestIncrement ? latestIncrement.newSalary : 0;
  }

  async getIncrementHistory(employeeId: string, tenantId?: string, user?: UserWithVisibility): Promise<any> {
    const increments = await this.findByEmployeeId(employeeId, tenantId, user);
    
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
        createdAt: (inc as any).createdAt,
      })),
    };
  }

  async update(id: string, updateDto: UpdateIncrementDto, tenantId?: string, user?: UserWithVisibility): Promise<SalaryIncrement> {
    const query: any = { _id: new Types.ObjectId(id) };

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
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

  async delete(id: string, tenantId?: string, user?: UserWithVisibility): Promise<void> {
    const query: any = { _id: new Types.ObjectId(id) };

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
    }

    const result = await this.incrementModel.deleteOne(query).exec();
    
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Salary increment with ID ${id} not found`);
    }
  }
}
