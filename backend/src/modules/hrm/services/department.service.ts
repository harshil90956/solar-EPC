import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department, DepartmentDocument } from '../schemas/department.schema';
import { CreateDepartmentDto, UpdateDepartmentDto } from '../dto/department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectModel(Department.name) private readonly departmentModel: Model<DepartmentDocument>,
  ) {}

  async create(createDto: CreateDepartmentDto, tenantId?: string): Promise<Department> {
    // Check if department name already exists
    const existing = await this.departmentModel.findOne({
      name: createDto.name,
      tenantId: tenantId && tenantId !== 'default' ? new Types.ObjectId(tenantId) : undefined,
    });

    if (existing) {
      throw new BadRequestException('Department with this name already exists');
    }

    const department = new this.departmentModel({
      ...createDto,
      tenantId: tenantId && tenantId !== 'default' ? new Types.ObjectId(tenantId) : undefined,
    });

    return department.save();
  }

  async findAll(tenantId?: string): Promise<Department[]> {
    const query: any = {};
    
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }

    return this.departmentModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, tenantId?: string): Promise<Department> {
    const query: any = { _id: new Types.ObjectId(id) };
    
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }

    const department = await this.departmentModel.findOne(query).exec();
    
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    
    return department;
  }

  async update(id: string, updateDto: UpdateDepartmentDto, tenantId?: string): Promise<Department> {
    const query: any = { _id: new Types.ObjectId(id) };
    
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }

    const department = await this.departmentModel.findOneAndUpdate(
      query,
      { $set: updateDto },
      { new: true },
    ).exec();

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async delete(id: string, tenantId?: string): Promise<void> {
    const query: any = { _id: new Types.ObjectId(id) };
    
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }

    const result = await this.departmentModel.deleteOne(query).exec();
    
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
