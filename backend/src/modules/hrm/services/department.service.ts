import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department, DepartmentDocument } from '../schemas/department.schema';
import { CreateDepartmentDto, UpdateDepartmentDto } from '../dto/department.dto';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectModel(Department.name) private readonly departmentModel: Model<DepartmentDocument>,
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

  async create(createDto: CreateDepartmentDto, tenantId?: string): Promise<Department> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    // Check if department name already exists
    const existing = await this.departmentModel.findOne({
      name: createDto.name,
      tenantId: tid,
    });

    if (existing) {
      throw new BadRequestException('Department with this name already exists');
    }

    const department = new this.departmentModel({
      ...createDto,
      tenantId: tid,
    });

    return department.save();
  }

  async findAll(tenantId?: string): Promise<Department[]> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    return this.departmentModel
      .find({ tenantId: tid })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, tenantId?: string): Promise<Department> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const department = await this.departmentModel.findOne({ 
      _id: new Types.ObjectId(id),
      tenantId: tid 
    }).exec();
    
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    
    return department;
  }

  async update(id: string, updateDto: UpdateDepartmentDto, tenantId?: string): Promise<Department> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const department = await this.departmentModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: tid },
      { $set: updateDto },
      { new: true },
    ).exec();

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async delete(id: string, tenantId?: string): Promise<void> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const result = await this.departmentModel.deleteOne({ 
      _id: new Types.ObjectId(id),
      tenantId: tid 
    }).exec();
    
    if (result.deletedCount === 0) {
      throw new NotFoundException('Department not found');
    }
  }

  async updateEmployeeCount(departmentId: string, count: number): Promise<void> {
    await this.departmentModel.findByIdAndUpdate(
      departmentId,
      { $set: { employeeCount: count } },
    ).exec();
  }
}
