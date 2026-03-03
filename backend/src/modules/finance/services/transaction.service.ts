import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { CreateTransactionDto, UpdateTransactionDto } from '../dto/transaction.dto';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  async findAll(tenantId: string, type?: string): Promise<Transaction[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };
    if (type && type !== 'All') {
      query.type = type;
    }
    return this.transactionModel.find(query).sort({ transactionDate: -1 }).lean();
  }

  async findById(tenantId: string, id: string): Promise<Transaction> {
    const transaction = await this.transactionModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    }).lean();

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async create(tenantId: string, dto: CreateTransactionDto): Promise<Transaction> {
    const transaction = new this.transactionModel({
      ...dto,
      tenantId: new Types.ObjectId(tenantId),
      invoiceId: dto.invoiceId ? new Types.ObjectId(dto.invoiceId) : undefined,
      expenseId: dto.expenseId ? new Types.ObjectId(dto.expenseId) : undefined,
      transactionDate: new Date(dto.transactionDate),
    });

    const saved = await transaction.save();
    return saved.toObject();
  }

  async update(tenantId: string, id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    const existing = await this.findById(tenantId, id);

    const updated = await this.transactionModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
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
    const result = await this.transactionModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!result) {
      throw new NotFoundException('Transaction not found');
    }
  }

  async getCashFlowData(tenantId: string, months: number = 6): Promise<any[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const transactions = await this.transactionModel.find({
      tenantId: new Types.ObjectId(tenantId),
      transactionDate: { $gte: startDate },
      status: 'Completed',
    }).lean();

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
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const transactions = await this.transactionModel.find({
      tenantId: new Types.ObjectId(tenantId),
      transactionDate: { $gte: startDate },
      status: 'Completed',
    }).lean();

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
}
