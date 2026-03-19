import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expense, ExpenseDocument } from '../schemas/expense.schema';
import { CreateExpenseDto, UpdateExpenseDto } from '../dto/expense.dto';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';
import { FinanceVendorService } from './finance-vendor.service';

interface UserWithVisibility {
  id?: string;
  _id?: string;
  dataScope?: 'ALL' | 'ASSIGNED';
}

@Injectable()
export class ExpenseService {
  constructor(
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    private readonly financeVendorService: FinanceVendorService,
  ) {}

  private async resolveTenantObjectId(tenantId: string): Promise<Types.ObjectId> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is missing');
    }
    if (Types.ObjectId.isValid(tenantId)) {
      return new Types.ObjectId(tenantId);
    }
    const tenant = await this.tenantModel.findOne({ 
      $or: [{ code: tenantId }, { slug: tenantId }] 
    }).lean();
    if (!tenant) {
      throw new BadRequestException(`Tenant not found for identifier: ${tenantId}`);
    }
    return (tenant as any)._id as Types.ObjectId;
  }

  private notDeletedMatch() {
    return { isDeleted: false };
  }

  async findAll(tenantId: string, status?: string, category?: string): Promise<Expense[]> {
    const query: any = { ...this.notDeletedMatch() };
    if (tenantId && Types.ObjectId.isValid(tenantId)) {
      query.tenantId = new Types.ObjectId(tenantId);
    } else if (tenantId !== '') {
      throw new BadRequestException('Invalid Tenant ID');
    }

    if (status && status !== 'All') {
      query.status = status;
    }
    if (category && category !== 'All') {
      query.category = category;
    }
    return this.expenseModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async findById(tenantId: string, id: string): Promise<Expense> {
    const query: any = {
      _id: new Types.ObjectId(id),
      ...this.notDeletedMatch(),
    };
    if (tenantId && Types.ObjectId.isValid(tenantId)) {
      query.tenantId = new Types.ObjectId(tenantId);
    } else if (tenantId !== '') {
      throw new BadRequestException('Invalid Tenant ID');
    }

    const expense = await this.expenseModel.findOne(query).lean();

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async create(tenantId: string, dto: CreateExpenseDto): Promise<Expense> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const expense = new this.expenseModel({
      ...dto,
      tenantId: tid,
      expenseDate: new Date(dto.expenseDate),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });

    const saved = await expense.save();
    return saved.toObject();
  }

  async update(tenantId: string, id: string, dto: UpdateExpenseDto): Promise<Expense> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const existing = await this.findById(tenantId, id);

    const updated = await this.expenseModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: tid },
      {
        ...dto,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : existing.expenseDate,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : existing.dueDate,
      },
      { new: true },
    ).lean();

    if (!updated) {
      throw new NotFoundException('Expense not found');
    }

    return updated;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const result = await this.expenseModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: tid },
      { isDeleted: true },
    );

    if (!result) {
      throw new NotFoundException('Expense not found');
    }
  }

  async getPayablesSummary(tenantId: string, user?: UserWithVisibility): Promise<any> {
    // Get vendor data from financeVendors collection where paid amounts are persisted
    const vendors = await this.financeVendorService.findAll(tenantId);
    
    const totalPayables = vendors.reduce((sum, v) => sum + (v.totalPayable || 0), 0);
    const totalPaid = vendors.reduce((sum, v) => sum + (v.totalPaid || 0), 0);
    const totalOutstanding = vendors.reduce((sum, v) => sum + (v.outstandingAmount || 0), 0);
    
    // Map to the format expected by frontend
    const vendorWise = vendors.map(v => ({
      vendorId: v.vendorId,
      vendorName: v.vendorName,
      vendorCode: v.vendorCode,
      totalPurchaseOrders: v.totalPurchaseOrders || 0,
      totalPayable: v.totalPayable || 0,
      amountPaid: v.totalPaid || 0,
      outstandingAmount: v.outstandingAmount || 0,
      lastPaymentDate: v.lastPaymentDate,
      lastPaymentAmount: v.lastPaymentAmount || 0,
      status: v.status,
    }));

    return {
      totalPayables,
      totalPaid,
      totalOutstanding,
      count: vendors.length,
      vendorWise,
    };
  }
}
