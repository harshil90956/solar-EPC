import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ManualAdjustment, ManualAdjustmentDocument } from '../schemas/manual-adjustment.schema';
import { JournalEntry, JournalEntryDocument } from '../schemas/journal-entry.schema';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import { Expense, ExpenseDocument } from '../schemas/expense.schema';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { CreateManualAdjustmentDto } from '../dto/manual-adjustment.dto';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';

@Injectable()
export class ManualAdjustmentService {
  constructor(
    @InjectModel(ManualAdjustment.name) private readonly manualAdjustmentModel: Model<ManualAdjustmentDocument>,
    @InjectModel(JournalEntry.name) private readonly journalEntryModel: Model<JournalEntryDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  /**
   * Resolves tenantId to a valid ObjectId.
   * If the string is already a valid ObjectId, uses it directly.
   * Otherwise treats it as a tenant code or slug and looks up the tenant.
   */
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

  async findAll(tenantId: string): Promise<ManualAdjustment[]> {
    const tid = await this.resolveTenantObjectId(tenantId);
    return this.manualAdjustmentModel
      .find({ tenantId: tid, isDeleted: false })
      .sort({ date: -1, createdAt: -1 })
      .lean();
  }

  async getBalance(tenantId: string): Promise<number> {
    const tid = await this.resolveTenantObjectId(tenantId);
    console.log('=== getBalance START === tid:', tid.toString());
    
    // Invoice query
    const invoiceQuery = { 
      tenantId: tid,
      isDeleted: false
    };
    
    // Expense query
    const expenseQuery = { 
      tenantId: tid,
      isDeleted: false, 
      status: 'Paid', 
      category: 'Vendor Payment' 
    };
    
    // Adjustment query
    const adjustmentQuery = { 
      tenantId: tid,
      isDeleted: false
    };

    console.log('=== getBalance querying DB');
    const [invoices, paidExpenses, adjustments] = await Promise.all([
      this.invoiceModel.find(invoiceQuery).lean(),
      this.expenseModel.find(expenseQuery).lean(),
      this.manualAdjustmentModel.find(adjustmentQuery).lean(),
    ]);

    console.log('=== getBalance STEP 8 DB queries done');

    // Debug: Check first few invoices
    console.log('=== First 3 invoices paid values:');
    (invoices || []).slice(0, 3).forEach((inv, i) => {
      console.log(`  Invoice ${i}: paid=${inv?.paid}, amount=${inv?.amount}, status=${inv?.status}`);
    });

    // Debug logging
    console.log('getBalance debug:', {
      tenantId,
      tid: tid?.toString(),
      invoiceCount: invoices?.length || 0,
      paidExpensesCount: paidExpenses?.length || 0,
      adjustmentsCount: adjustments?.length || 0,
    });

    // Inflow: Total collected from invoices (paid field, or amount if status is Paid)
    const inflow = (invoices || []).reduce((sum, inv: any) => {
      const paid = Number(inv?.paid || 0);
      const amount = Number(inv?.amount || 0);
      // If paid is 0 but status is Paid, use the full amount
      const effectivePaid = (paid === 0 && inv?.status === 'Paid') ? amount : paid;
      return sum + effectivePaid;
    }, 0);
    console.log('=== getBalance STEP 9 inflow:', inflow);
    
    // Outflow: Total vendor payments made
    const outflow = (paidExpenses || []).reduce((sum, e: any) => sum + Number(e?.amount || e?.paidAmount || 0), 0);
    console.log('=== getBalance STEP 10 outflow:', outflow);

    // Net adjustments: Credit - Debit
    const netAdjustments = (adjustments || []).reduce((sum, a: any) => {
      const amt = Number(a?.amount || 0);
      return sum + (a?.type === 'credit' ? amt : -amt);
    }, 0);
    console.log('=== getBalance STEP 11 netAdjustments:', netAdjustments);

    const total = inflow - outflow + netAdjustments;
    console.log('=== getBalance STEP 12 TOTAL:', total);
    console.log('getBalance result:', { inflow, outflow, netAdjustments, total });

    return total;
  }

  async create(tenantId: string, dto: CreateManualAdjustmentDto, userId?: string): Promise<{ adjustment: ManualAdjustment; balance: number; journalEntry?: JournalEntry }> {
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (!tenantId) {
      throw new BadRequestException('Invalid or missing tenantId');
    }
    const tenantObjectId = await this.resolveTenantObjectId(tenantId);

    const currentBalance = await this.getBalance(tenantId);
    if (dto.type === 'debit' && currentBalance - amount < 0) {
      throw new BadRequestException('Debit would make balance negative');
    }

    const createdByObjectId = userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined;

    const adjustment = new this.manualAdjustmentModel({
      tenantId: tenantObjectId,
      type: dto.type,
      category: dto.category,
      amount,
      reason: dto.reason,
      reference: dto.reference,
      date: new Date(dto.date),
      createdBy: createdByObjectId,
      isDeleted: false,
    });

    const saved = await adjustment.save();
    const balance = await this.getBalance(tenantId);

    // Create journal entry for this adjustment
    let journalEntry: JournalEntry | undefined;
    try {
      const journalEntryId = `JE-${Date.now().toString(36).toUpperCase()}`;
      const lines = [];
      let narration = '';

      if (dto.type === 'debit') {
        // Debit adjustment: Category debited, Cash/Bank credited
        lines.push({
          accountName: dto.category,
          debitAmount: amount,
          creditAmount: 0,
        });
        lines.push({
          accountName: 'Cash/Bank A/c',
          debitAmount: 0,
          creditAmount: amount,
        });
        narration = `Debit adjustment: ${dto.reason || dto.category}`;
      } else {
        // Credit adjustment: Cash/Bank debited, Category credited
        lines.push({
          accountName: 'Cash/Bank A/c',
          debitAmount: amount,
          creditAmount: 0,
        });
        lines.push({
          accountName: dto.category,
          debitAmount: 0,
          creditAmount: amount,
        });
        narration = `Credit adjustment: ${dto.reason || dto.category}`;
      }

      const journalEntryDoc = new this.journalEntryModel({
        tenantId: tenantObjectId,
        journalEntryId,
        date: new Date(dto.date),
        narration,
        reference: dto.reference,
        lines,
        totalDebit: amount,
        totalCredit: amount,
        relatedAdjustmentId: saved._id,
        createdBy: createdByObjectId,
        isDeleted: false,
      });

      const savedJournal = await journalEntryDoc.save();
      journalEntry = savedJournal.toObject();
    } catch (jeErr) {
      console.error('Failed to create journal entry for adjustment:', jeErr);
      // Don't fail the adjustment if journal entry creation fails
    }

    return { adjustment: saved.toObject(), balance, journalEntry };
  }
}
