import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department, DepartmentDocument } from '../schemas/department.schema';
import { CreateDepartmentDto, UpdateDepartmentDto } from '../dto/department.dto';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';
import { UserWithVisibility } from '../../../common/utils/visibility-filter';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectModel(Department.name) private readonly departmentModel: Model<DepartmentDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  private async resolveTenantObjectId(tenantId: string): Promise<Types.ObjectId> {
    if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
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

  async create(createDto: CreateDepartmentDto, tenantId?: string, user?: UserWithVisibility): Promise<Department> {
    const query: any = { name: createDto.name };
    let tid: Types.ObjectId | undefined;

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        tid = new Types.ObjectId(tenantId);
        query.tenantId = tid;
      }
    } else {
      // Regular users MUST have a tenantId
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      tid = await this.resolveTenantObjectId(tenantId);
      query.tenantId = tid;
    }

    // Check if department name already exists within the tenant context
    const existing = await this.departmentModel.findOne(query);

    if (existing) {
      throw new BadRequestException('Department with this name already exists');
    }

    const department = new this.departmentModel({
      ...createDto,
      tenantId: tid,
    });

    return department.save();
  }

  async findAll(tenantId?: string, user?: UserWithVisibility): Promise<Department[]> {
    const query: any = {};
    
    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
      // If no valid tenantId, SuperAdmin gets ALL departments (global view)
    } else {
      // Regular users MUST have a tenantId
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      const tid = await this.resolveTenantObjectId(tenantId);
      query.tenantId = tid;
    }

    const result = await this.departmentModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
    
    console.log('[DEBUG DepartmentService] Filtered result count:', result.length);
    return result;
  }

  async findOne(id: string, tenantId?: string, user?: UserWithVisibility): Promise<Department> {
    const query: any = { _id: new Types.ObjectId(id) };
    
    if (!(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
      const tid = await this.resolveTenantObjectId(tenantId || '');
      query.tenantId = tid;
    }

    const department = await this.departmentModel.findOne(query).exec();
    
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    
    return department;
  }

  async update(id: string, updateDto: UpdateDepartmentDto, tenantId?: string, user?: UserWithVisibility): Promise<Department> {
    const query: any = { _id: new Types.ObjectId(id) };
    
    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      // For SuperAdmin, if a tenantId is provided, we filter by it.
      // If not, we only filter by _id.
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

    const department = await this.departmentModel.findOne(query);

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Check name uniqueness if name is being updated
    if (updateDto.name && updateDto.name !== department.name) {
      const nameQuery: any = { 
        name: updateDto.name,
        _id: { $ne: department._id }
      };
      
      // Scoped uniqueness check
      if (department.tenantId) {
        nameQuery.tenantId = department.tenantId;
      } else {
        nameQuery.tenantId = { $exists: false };
      }
      
      const existing = await this.departmentModel.findOne(nameQuery);
      if (existing) {
        throw new BadRequestException('Department with this name already exists');
      }
    }

    // Use findOneAndUpdate to ensure we get the updated document back correctly 
    // and avoid version conflicts if multiple updates happen
    const updatedDepartment = await this.departmentModel.findByIdAndUpdate(
      id,
      { $set: updateDto },
      { new: true }
    ).exec();

    if (!updatedDepartment) {
      throw new NotFoundException('Department not found during update');
    }

    return updatedDepartment;
  }

  async delete(id: string, tenantId?: string, user?: UserWithVisibility): Promise<void> {
    const query: any = { _id: new Types.ObjectId(id) };
    
    if (!(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
      const tid = await this.resolveTenantObjectId(tenantId || '');
      query.tenantId = tid;
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
