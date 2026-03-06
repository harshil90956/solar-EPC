import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ManualAdjustment, ManualAdjustmentDocument } from '../schemas/manual-adjustment.schema';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import { Expense, ExpenseDocument } from '../schemas/expense.schema';
import { CreateManualAdjustmentDto } from '../dto/manual-adjustment.dto';

@Injectable()
export class ManualAdjustmentService {
  constructor(
    @InjectModel(ManualAdjustment.name) private readonly manualAdjustmentModel: Model<ManualAdjustmentDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
  ) {}

  async findAll(tenantId: string): Promise<ManualAdjustment[]> {
    return this.manualAdjustmentModel
      .find({ tenantId: new Types.ObjectId(tenantId), isDeleted: false })
      .sort({ date: -1, createdAt: -1 })
      .lean();
  }

  async getBalance(tenantId: string): Promise<number> {
    const tenantObjectId = new Types.ObjectId(tenantId);

    const [payments, paidExpenses, adjustments] = await Promise.all([
      this.paymentModel.find({ tenantId: tenantObjectId, isDeleted: false }).lean(),
      this.expenseModel.find({ tenantId: tenantObjectId, isDeleted: false, status: 'Paid' }).lean(),
      this.manualAdjustmentModel.find({ tenantId: tenantObjectId, isDeleted: false }).lean(),
    ]);

    const inflow = (payments || []).reduce((sum, p: any) => sum + Number(p?.amount || p?.amountPaid || 0), 0);
    const outflow = (paidExpenses || []).reduce((sum, e: any) => sum + Number(e?.amount || e?.paidAmount || 0), 0);

    const netAdjustments = (adjustments || []).reduce((sum, a: any) => {
      const amt = Number(a?.amount || 0);
      return sum + (a?.type === 'credit' ? amt : -amt);
    }, 0);

    return inflow - outflow + netAdjustments;
  }

  async create(tenantId: string, dto: CreateManualAdjustmentDto, userId?: string): Promise<{ adjustment: ManualAdjustment; balance: number }> {
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const currentBalance = await this.getBalance(tenantId);
    if (dto.type === 'debit' && currentBalance - amount < 0) {
      throw new BadRequestException('Debit would make balance negative');
    }

    const createdByObjectId = userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined;

    const adjustment = new this.manualAdjustmentModel({
      tenantId: new Types.ObjectId(tenantId),
      type: dto.type,
      amount,
      reason: dto.reason,
      reference: dto.reference,
      date: new Date(dto.date),
      createdBy: createdByObjectId,
      isDeleted: false,
    });

    const saved = await adjustment.save();
    const balance = await this.getBalance(tenantId);

    return { adjustment: saved.toObject(), balance };
  }
}
