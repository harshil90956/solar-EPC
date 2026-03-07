import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expense, ExpenseDocument } from '../schemas/expense.schema';
import { CreateExpenseDto, UpdateExpenseDto } from '../dto/expense.dto';

interface UserWithVisibility {
  id?: string;
  _id?: string;
  dataScope?: 'ALL' | 'ASSIGNED';
}

@Injectable()
export class ExpenseService {
  constructor(
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
  ) {}

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId) return undefined;
    try {
      return new Types.ObjectId(id);
    } catch {
      return undefined;
    }
  }

  async findAll(tenantId: string, status?: string, category?: string): Promise<Expense[]> {
    const tid = this.toObjectId(tenantId);
    const query: any = tid ? { tenantId: tid, isDeleted: false } : { isDeleted: false };
    if (status && status !== 'All') {
      query.status = status;
    }
    if (category && category !== 'All') {
      query.category = category;
    }
    return this.expenseModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async findById(tenantId: string, id: string): Promise<Expense> {
    const tid = this.toObjectId(tenantId);
    const expense = await this.expenseModel.findOne({
      _id: new Types.ObjectId(id),
      ...(tid ? { tenantId: tid } : {}),
      isDeleted: false,
    }).lean();

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async create(tenantId: string, dto: CreateExpenseDto): Promise<Expense> {
    const expense = new this.expenseModel({
      ...dto,
      tenantId: this.toObjectId(tenantId),
      expenseDate: new Date(dto.expenseDate),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });

    const saved = await expense.save();
    return saved.toObject();
  }

  async update(tenantId: string, id: string, dto: UpdateExpenseDto): Promise<Expense> {
    const existing = await this.findById(tenantId, id);

    const updated = await this.expenseModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
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
    const result = await this.expenseModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
      { isDeleted: true },
    );

    if (!result) {
      throw new NotFoundException('Expense not found');
    }
  }

  async getPayablesSummary(tenantId: string, user?: UserWithVisibility): Promise<any> {
    const tid = this.toObjectId(tenantId);
    const query: any = {
      ...(tid ? { tenantId: tid } : {}),
      isDeleted: false,
      status: { $in: ['Pending', 'Approved'] },
    };
    
    console.log(`[EXPENSE PAYABLES VISIBILITY] user:`, JSON.stringify(user));
    console.log(`[EXPENSE PAYABLES VISIBILITY] user?.dataScope:`, user?.dataScope);
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        query.assignedTo = objectId;
        console.log(`[EXPENSE PAYABLES VISIBILITY] Applied assignedTo filter:`, objectId);
      }
    } else {
      console.log(`[EXPENSE PAYABLES VISIBILITY] No filter applied - ALL scope or no user`);
    }
    
    console.log(`[EXPENSE PAYABLES VISIBILITY] Final query:`, JSON.stringify(query));

    const expenses = await this.expenseModel.find(query).lean();

    const totalPayables = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const dueIn30Days = expenses.filter(exp => {
      if (!exp.dueDate) return false;
      const daysDiff = Math.ceil((new Date(exp.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 30;
    });

    return {
      totalPayables,
      count: expenses.length,
      dueIn30Days: dueIn30Days.reduce((sum, exp) => sum + exp.amount, 0),
      items: expenses,
    };
  }
}
