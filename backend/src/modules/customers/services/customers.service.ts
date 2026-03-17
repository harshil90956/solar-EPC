import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from '../schemas/customer.schema';
import { CreateCustomerDto, QueryCustomersDto } from '../dto/customer.dto';
import { buildCompleteFilter, UserWithVisibility } from '../../../common/utils/visibility-filter';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  private buildCompleteFilter(tenantId?: string, user?: UserWithVisibility, base: any = {}) {
    return buildCompleteFilter(tenantId, user, base);
  }

  async findByLeadId(leadId: string, tenantId?: string, user?: UserWithVisibility): Promise<Customer | null> {
    const filter = this.buildCompleteFilter(tenantId, user, { leadId });
    return this.customerModel.findOne(filter).exec();
  }

  async create(dto: CreateCustomerDto, tenantId?: string, user?: UserWithVisibility): Promise<Customer> {
    const tid = tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined;
    if (!tid && !(user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin')) {
      throw new BadRequestException('Tenant context is required for creating customers');
    }

    const existing = await this.customerModel.findOne({ tenantId: tid, leadId: dto.leadId, isDeleted: { $ne: true } }).exec();
    if (existing) {
      return existing;
    }

    const created = new this.customerModel({
      tenantId: tid,
      isDeleted: false,
      leadId: dto.leadId,
      name: dto.name,
      email: dto.email || '',
      phone: dto.phone || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return created.save();
  }

  async findAll(query: QueryCustomersDto, tenantId?: string, user?: UserWithVisibility): Promise<{ data: Customer[]; total: number }> {
    const filter = this.buildCompleteFilter(tenantId, user, {});

    if (query.search) {
      filter.$text = { $search: query.search };
    }

    const [data, total] = await Promise.all([
      this.customerModel.find(filter).sort({ createdAt: -1 }).lean().exec(),
      this.customerModel.countDocuments(filter).exec(),
    ]);

    return { data: data as any, total };
  }

  async findOne(id: string, tenantId?: string, user?: UserWithVisibility): Promise<Customer> {
    const filter = this.buildCompleteFilter(tenantId, user, { _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id });
    const customer = await this.customerModel.findOne(filter).exec();
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }
}
