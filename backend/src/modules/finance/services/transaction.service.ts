import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { ManualAdjustment, ManualAdjustmentDocument } from '../schemas/manual-adjustment.schema';
import { CreateTransactionDto, UpdateTransactionDto } from '../dto/transaction.dto';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(ManualAdjustment.name) private readonly manualAdjustmentModel: Model<ManualAdjustmentDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
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

  async findAll(tenantId: string, type?: string): Promise<Transaction[]> {
    const query: any = {};
    if (tenantId && Types.ObjectId.isValid(tenantId)) {
      query.tenantId = new Types.ObjectId(tenantId);
    } else if (tenantId !== '') {
      throw new BadRequestException('Invalid Tenant ID');
    }

    if (type && type !== 'All') {
      query.type = type;
    }
    return this.transactionModel.find(query).sort({ transactionDate: -1 }).lean();
  }

  async findById(tenantId: string, id: string): Promise<Transaction> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const transaction = await this.transactionModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: tid,
    }).lean();

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async create(tenantId: string, dto: CreateTransactionDto): Promise<Transaction> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const transaction = new this.transactionModel({
      ...dto,
      tenantId: tid,
      invoiceId: dto.invoiceId ? new Types.ObjectId(dto.invoiceId) : undefined,
      expenseId: dto.expenseId ? new Types.ObjectId(dto.expenseId) : undefined,
      transactionDate: new Date(dto.transactionDate),
    });

    const saved = await transaction.save();
    return saved.toObject();
  }

  async update(tenantId: string, id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const existing = await this.findById(tenantId, id);

    const updated = await this.transactionModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: tid },
      {
        ...dto,
        invoiceId: dto.invoiceId ? new Types.ObjectId(dto.invoiceId) : existing.invoiceId,
        expenseId: dto.expenseId ? new Types.ObjectId(dto.expenseId) : existing.expenseId,
        transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : existing.transactionDate,
      },
      { new: true },
    ).lean();

    if (!updated) {
      throw new NotFoundException('Transaction not found');
    }

    return updated;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const result = await this.transactionModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      tenantId: tid,
    });

    if (!result) {
      throw new NotFoundException('Transaction not found');
    }
  }

  async getCashFlowData(tenantId: string, months: number = 6): Promise<any[]> {
    const query: any = { status: 'Completed' };
    if (tenantId && Types.ObjectId.isValid(tenantId)) {
      query.tenantId = new Types.ObjectId(tenantId);
    } else if (tenantId !== '') {
      throw new BadRequestException('Invalid Tenant ID');
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    query.transactionDate = { $gte: startDate };

    const transactions = await this.transactionModel.find(query).lean();

    const monthlyData: { [key: string]: { inflow: number; outflow: number } } = {};

    transactions.forEach(txn => {
      const date = new Date(txn.transactionDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = { inflow: 0, outflow: 0 };
      }

      if (txn.type === 'Income') {
        monthlyData[key].inflow += txn.amount;
      } else if (txn.type === 'Expense') {
        monthlyData[key].outflow += txn.amount;
      }
    });

    return Object.keys(monthlyData)
      .sort()
      .map(key => ({
        month: key,
        inflow: monthlyData[key].inflow,
        outflow: monthlyData[key].outflow,
      }));
  }

  async getMonthlyRevenue(tenantId: string, months: number = 6): Promise<any[]> {
    const query: any = { status: 'Completed' };
    if (tenantId && Types.ObjectId.isValid(tenantId)) {
      query.tenantId = new Types.ObjectId(tenantId);
    } else if (tenantId !== '') {
      throw new BadRequestException('Invalid Tenant ID');
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    query.transactionDate = { $gte: startDate };

    const transactions = await this.transactionModel.find(query).lean();

    const monthlyData: { [key: string]: { revenue: number; cost: number } } = {};

    transactions.forEach(txn => {
      const date = new Date(txn.transactionDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = { revenue: 0, cost: 0 };
      }

      if (txn.type === 'Income') {
        monthlyData[key].revenue += txn.amount;
      } else if (txn.type === 'Expense' && txn.category !== 'Vendor Payment') {
        monthlyData[key].cost += txn.amount;
      }
    });

    return Object.keys(monthlyData)
      .sort()
      .map(key => ({
        month: key,
        revenue: monthlyData[key].revenue,
        cost: monthlyData[key].cost,
      }));
  }

  async getAnalyticsByCategory(tenantId: string, months: number = 6): Promise<any> {
    const query: any = {};
    if (tenantId && Types.ObjectId.isValid(tenantId)) {
      query.tenantId = new Types.ObjectId(tenantId);
    } else if (tenantId !== '') {
      throw new BadRequestException('Invalid Tenant ID');
    }

    // Fetch all manual adjustments (journal entries) - no date filter
    const adjustments = await this.manualAdjustmentModel.find(query).lean();

    // Predefined Income categories (must all appear in chart)
    const INCOME_CATEGORIES = [
      'Adjustment Credit',
      'Bank Interest',
      'Customer Advance',
      'Extra Payment Received',
      'Misc Income',
      'Refund Received'
    ];

    // Predefined Expense categories (must all appear in chart)
    const EXPENSE_CATEGORIES = [
      'Adjustment Debit',
      'Bank Charges',
      'Correction Entry',
      'Misc Expense',
      'Office Expense',
      'Refund to Customer'
    ];

    // Initialize all income categories with 0
    const incomeByCategory: { [key: string]: number } = {};
    INCOME_CATEGORIES.forEach(cat => incomeByCategory[cat] = 0);

    // Add credit adjustments grouped by category
    adjustments.forEach(adj => {
      if (adj.type === 'credit') {
        // Only count if it's a predefined income category
        if (adj.category && INCOME_CATEGORIES.includes(adj.category)) {
          incomeByCategory[adj.category] = (incomeByCategory[adj.category] || 0) + adj.amount;
        }
      }
    });

    // Initialize all expense categories with 0
    const expenseByCategory: { [key: string]: number } = {};
    EXPENSE_CATEGORIES.forEach(cat => expenseByCategory[cat] = 0);

    // Add debit adjustments grouped by category
    adjustments.forEach(adj => {
      if (adj.type === 'debit') {
        // Only count if it's a predefined expense category
        if (adj.category && EXPENSE_CATEGORIES.includes(adj.category)) {
          expenseByCategory[adj.category] = (expenseByCategory[adj.category] || 0) + adj.amount;
        }
      }
    });

    // Convert to arrays and sort by amount descending
    const incomeData = Object.entries(incomeByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const expenseData = Object.entries(expenseByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      incomeByCategory: incomeData,
      expenseByCategory: expenseData,
      totalIncome: incomeData.reduce((sum, item) => sum + item.amount, 0),
      totalExpense: expenseData.reduce((sum, item) => sum + item.amount, 0),
    };
  }
}
