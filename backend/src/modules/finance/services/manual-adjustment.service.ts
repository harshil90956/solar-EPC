import { BadRequestException, Injectable } from '@nestjs/common';
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

  /**
   * Resolves tenantId to a valid ObjectId.
   * If the string is already a valid ObjectId, uses it directly.
   * Otherwise treats it as a tenant code and looks up the tenant by code.
   */
  private async resolveTenantObjectId(tenantId: string): Promise<Types.ObjectId> {
    if (Types.ObjectId.isValid(tenantId)) {
      return new Types.ObjectId(tenantId);
    }
    // Treat as tenant code
    const tenant = await this.tenantModel.findOne({ code: tenantId }).lean();
    if (!tenant) {
      throw new BadRequestException(`Tenant not found for code: ${tenantId}`);
    }
    return (tenant as any)._id as Types.ObjectId;
  }

  async findAll(tenantId: string): Promise<ManualAdjustment[]> {
    const tid = this.toObjectId(tenantId);
    const query: any = { isDeleted: false };
    if (tid) {
      query.tenantId = tid;
    }
    return this.manualAdjustmentModel
      .find(query)
      .sort({ date: -1, createdAt: -1 })
      .lean();
  }

  async getBalance(tenantId: string): Promise<number> {
    console.log('=== getBalance START === tenantId:', tenantId);
    
    const tid = this.toObjectId(tenantId);
    console.log('=== getBalance STEP 1 tid:', tid?.toString());

    // Invoice query - flexible for legacy data
    const invoiceQuery: any = { 
      $or: [
        { isDeleted: false },
        { isDeleted: { $exists: false } }
      ]
    };
    console.log('=== getBalance STEP 2 invoiceQuery:', JSON.stringify(invoiceQuery));
    
    // Expense query
    const expenseQuery: any = { 
      isDeleted: false, 
      status: 'Paid', 
      category: 'Vendor Payment' 
    };
    console.log('=== getBalance STEP 3 expenseQuery:', JSON.stringify(expenseQuery));
    
    // Adjustment query
    const adjustmentQuery: any = { 
      $or: [
        { isDeleted: false },
        { isDeleted: { $exists: false } }
      ]
    };
    console.log('=== getBalance STEP 4 adjustmentQuery:', JSON.stringify(adjustmentQuery));

    if (tid) {
      console.log('=== getBalance STEP 5 tid exists, adding to queries');
      // For tenant filtering, also check $or for tenantId
      invoiceQuery.$and = [
        { $or: [{ tenantId: tid }, { tenantId: { $exists: false } }] }
      ];
      expenseQuery.$or = [{ tenantId: tid }, { tenantId: { $exists: false } }];
      adjustmentQuery.$and = [
        { $or: [{ tenantId: tid }, { tenantId: { $exists: false } }] }
      ];
    }
    console.log('=== getBalance STEP 6 after tenant filter');

    console.log('=== getBalance STEP 7 about to query DB');
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
      lf: dto.lf,
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
        lf: dto.lf,
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
