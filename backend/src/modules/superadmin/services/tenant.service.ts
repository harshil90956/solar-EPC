import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';
import { CreateTenantDto, UpdateTenantDto } from '../dto/tenant.dto';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private authService: AuthService,
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
    const slug = (createTenantDto.slug || '').trim().toLowerCase();
    const adminEmail = (createTenantDto.adminEmail || '').trim().toLowerCase();

    if (!slug || !adminEmail) {
      console.error('[TenantService] Missing required fields:', { slug, adminEmail, dto: createTenantDto });
      throw new BadRequestException('Tenant slug and admin email are required');
    }

    // Check if tenant already exists
    const existingTenant = await this.tenantModel.findOne({ 
      $or: [
        { slug }, 
        { adminEmail }
      ] 
    }).exec();
    
    if (existingTenant) {
      const conflictField = existingTenant.slug === slug ? 'slug' : 'admin email';
      throw new ConflictException(`Tenant with this ${conflictField} already exists`);
    }

    const tenant = new this.tenantModel({
      ...createTenantDto,
      slug,
      code: slug, // Map slug to required code field
      adminEmail,
      status: 'active',
      stats: {
        totalUsers: 1,
        totalProjects: 0,
        totalLeads: 0,
        storageUsed: 0,
      },
    });
    
    const savedTenant = await tenant.save();

    // Create Admin User for this tenant using AuthService
    const adminUser = await this.authService.createUser(createTenantDto.slug, {
      email: createTenantDto.adminEmail.toLowerCase(),
      password: createTenantDto.adminPassword,
      role: 'Admin',
      tenantId: savedTenant._id.toString(),
      isSuperAdmin: false,
    });

    // Sync totalUsers stat
    if (savedTenant.stats) {
      savedTenant.stats.totalUsers = 1;
      await savedTenant.save();
    }

    return savedTenant;
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
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid tenant ID format: ${id}`);
    }
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
