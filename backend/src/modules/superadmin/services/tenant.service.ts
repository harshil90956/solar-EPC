import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';
import { CreateTenantDto, UpdateTenantDto } from '../dto/tenant.dto';

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  async findAll(query: any = {}): Promise<Tenant[]> {
    return this.tenantModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantModel.findById(id).exec();
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.tenantModel.findOne({ slug }).exec();
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    const tenant = new this.tenantModel({
      ...createTenantDto,
      status: 'pending',
      stats: {
        totalUsers: 0,
        totalProjects: 0,
        totalLeads: 0,
        storageUsed: 0,
      },
    });
    return tenant.save();
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.tenantModel
      .findByIdAndUpdate(id, updateTenantDto, { new: true })
      .exec();
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async delete(id: string): Promise<void> {
    const result = await this.tenantModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Tenant not found');
    }
  }

  async updateStatus(id: string, status: string): Promise<Tenant> {
    return this.update(id, { status } as UpdateTenantDto);
  }

  async updatePlan(id: string, plan: string): Promise<Tenant> {
    return this.update(id, { plan } as UpdateTenantDto);
  }

  async getStats(): Promise<any> {
    const total = await this.tenantModel.countDocuments();
    const active = await this.tenantModel.countDocuments({ status: 'active' });
    const pending = await this.tenantModel.countDocuments({ status: 'pending' });
    const suspended = await this.tenantModel.countDocuments({ status: 'suspended' });
    const expired = await this.tenantModel.countDocuments({ status: 'expired' });

    return {
      total,
      active,
      pending,
      suspended,
      expired,
    };
  }
}
