import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FinancePayment, FinancePaymentDocument } from '../schemas/finance-payment.schema';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { Expense, ExpenseDocument } from '../schemas/expense.schema';
import { RecordPaymentDto } from '../dto/record-payment.dto';

@Injectable()
export class FinancePaymentService {
  constructor(
    @InjectModel(FinancePayment.name) private readonly financePaymentModel: Model<FinancePaymentDocument>,
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
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

  async initiatePayment(tenantId: string, dto: RecordPaymentDto, userId?: string): Promise<FinancePayment> {
    const paymentNumber = await this.generatePaymentNumber(tenantId);

    let invoiceId: Types.ObjectId | undefined;
    let vendorId: Types.ObjectId | undefined;

    if (dto.referenceType === 'Invoice') {
      invoiceId = new Types.ObjectId(dto.referenceId);
    } else {
      vendorId = new Types.ObjectId(dto.referenceId);
    }

    const methodDetails: any = {};
    if (dto.paymentMethod === 'UPI') {
      methodDetails.upiRequestId = `UPI-${Date.now()}`;
    }

    const financePayment = new this.financePaymentModel({
      tenantId: this.toObjectId(tenantId),
      paymentNumber,
      paymentType: dto.paymentType,
      referenceType: dto.referenceType,
      referenceId: new Types.ObjectId(dto.referenceId),
      invoiceId,
      vendorId,
      amount: dto.amount,
      status: 'Initiated',
      initiatedAt: new Date(),
      paymentMethod: dto.paymentMethod,
      paymentDate: new Date(dto.paymentDate),
      methodDetails,
      notes: dto.notes,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      isDeleted: false,
    });

    const saved = await financePayment.save();
    return saved.toObject();
  }

  async verifyPayment(
    tenantId: string,
    id: string,
    payload: {
      bankName?: string;
      accountNumber?: string;
      transactionReference?: string;
      transferDate?: string;
      upiId?: string;
      chequeNumber?: string;
      chequeDate?: string;
      description?: string;
    },
  ): Promise<FinancePayment> {
    const existing = await this.findById(tenantId, id);

    if (existing.status === 'Completed') {
      return existing;
    }

    if (existing.paymentMethod === 'Bank Transfer') {
      if (!payload.bankName || !payload.transactionReference || !payload.transferDate) {
        throw new BadRequestException('bankName, transactionReference and transferDate are required');
      }
      if (!/^[A-Za-z0-9\-_/]{6,}$/.test(payload.transactionReference)) {
        throw new BadRequestException('Invalid transaction reference format');
      }
      const updated = await this.financePaymentModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        {
          $set: {
            status: 'Processing',
            processingAt: new Date(),
            methodDetails: {
              ...(existing.methodDetails || {}),
              bankName: payload.bankName,
              accountNumber: payload.accountNumber,
              transactionReference: payload.transactionReference,
              transferDate: payload.transferDate ? new Date(payload.transferDate) : undefined,
            },
          },
        },
        { new: true },
      ).lean();
      if (!updated) throw new NotFoundException('Payment not found');
      return updated;
    }

    if (existing.paymentMethod === 'Cheque') {
      if (!payload.chequeNumber || !payload.bankName || !payload.chequeDate) {
        throw new BadRequestException('chequeNumber, bankName and chequeDate are required');
      }
      const updated = await this.financePaymentModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        {
          $set: {
            status: 'Processing',
            processingAt: new Date(),
            methodDetails: {
              ...(existing.methodDetails || {}),
              chequeNumber: payload.chequeNumber,
              bankName: payload.bankName,
              chequeDate: payload.chequeDate ? new Date(payload.chequeDate) : undefined,
            },
          },
        },
        { new: true },
      ).lean();
      if (!updated) throw new NotFoundException('Payment not found');
      return updated;
    }

    if (existing.paymentMethod === 'UPI') {
      if (!payload.upiId) {
        throw new BadRequestException('upiId is required');
      }
      const interim = await this.financePaymentModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        {
          $set: {
            methodDetails: {
              ...(existing.methodDetails || {}),
              upiId: payload.upiId,
            },
          },
        },
        { new: true },
      ).lean();
      if (!interim) throw new NotFoundException('Payment not found');
      return this.completePayment(tenantId, id, { cashConfirmed: true });
    }

    if (existing.paymentMethod === 'Other') {
      if (!payload.description) {
        throw new BadRequestException('description is required');
      }
      const updated = await this.financePaymentModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
        {
          $set: {
            methodDetails: {
              ...(existing.methodDetails || {}),
              description: payload.description,
            },
          },
        },
        { new: true },
      ).lean();
      if (!updated) throw new NotFoundException('Payment not found');
      return updated;
    }

    if (existing.paymentMethod === 'Cash') {
      return existing;
    }

    return existing;
  }

  async completePayment(
    tenantId: string,
    id: string,
    payload?: { cashConfirmed?: boolean },
    userId?: string,
  ): Promise<FinancePayment> {
    const existing = await this.findById(tenantId, id);
    if (existing.status === 'Completed') return existing;

    if (existing.paymentMethod === 'Cash') {
      if (!payload?.cashConfirmed) {
        throw new BadRequestException('Cash confirmation required');
      }
    }

    if (existing.paymentMethod === 'Bank Transfer') {
      if (existing.status !== 'Processing') {
        throw new BadRequestException('Bank transfer must be verified first');
      }
    }

    if (existing.paymentMethod === 'Cheque') {
      if (existing.status !== 'Processing') {
        throw new BadRequestException('Cheque must be in processing before clearance');
      }
    }

    const updated = await this.financePaymentModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
      {
        $set: {
          status: 'Completed',
          completedAt: new Date(),
          methodDetails: {
            ...(existing.methodDetails || {}),
            ...(existing.paymentMethod === 'Cash' ? { cashConfirmed: true } : {}),
          },
        },
      },
      { new: true },
    ).lean();

    if (!updated) throw new NotFoundException('Payment not found');

    if (updated.paymentType === 'Customer Payment' && updated.referenceType === 'Invoice' && updated.invoiceId) {
      await this.updateInvoicePayment(tenantId, String(updated.invoiceId), updated.amount);
    }

    if (updated.paymentType === 'Vendor Payment' && updated.referenceType === 'Vendor' && updated.vendorId) {
      await this.createVendorExpense(
        tenantId,
        {
          paymentType: updated.paymentType as any,
          referenceType: updated.referenceType as any,
          referenceId: String(updated.vendorId),
          amount: updated.amount,
          paymentDate: updated.paymentDate.toISOString(),
          paymentMethod: updated.paymentMethod as any,
          notes: updated.notes,
        },
        updated.paymentNumber,
        userId,
      );
    }

    return updated;
  }

  async updateInvoicePayment(tenantId: string, invoiceId: string, paymentAmount: number): Promise<void> {
    const invoice = await this.invoiceModel.findOne({
      _id: new Types.ObjectId(invoiceId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Calculate new amounts
    const currentPaid = invoice.paid || 0;
    const newPaid = currentPaid + paymentAmount;
    const amount = invoice.amount;
    const newBalance = amount - newPaid;

    // Determine new status
    let newStatus = invoice.status;
    if (newPaid >= amount) {
      newStatus = 'Paid';
    } else if (newPaid > 0) {
      newStatus = 'Partial';
    }

    // Update the invoice
    await this.invoiceModel.findOneAndUpdate(
      { _id: new Types.ObjectId(invoiceId), tenantId: new Types.ObjectId(tenantId) },
      {
        $set: {
          paid: newPaid,
          balance: newBalance,
          status: newStatus,
          paidDate: newPaid >= amount ? new Date() : invoice.paidDate,
        },
      },
    );
  }

  async createVendorExpense(tenantId: string, dto: RecordPaymentDto, paymentNumber: string, userId?: string): Promise<void> {
    // Create an expense entry for the vendor payment
    const expense = new this.expenseModel({
      tenantId: new Types.ObjectId(tenantId),
      category: 'Vendor Payment',
      amount: dto.amount,
      expenseDate: new Date(dto.paymentDate),
      description: dto.notes || `Vendor payment - ${paymentNumber}`,
      vendor: dto.referenceId,
      status: 'Paid',
      paymentMethod: dto.paymentMethod,
      referenceNumber: paymentNumber,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      isDeleted: false,
    });

    await expense.save();
  }

  async generatePaymentNumber(tenantId: string): Promise<string> {
    const prefix = 'PAY-';
    const currentYear = new Date().getFullYear();
    
    // Find the last payment for this tenant in the current year
    const lastPayment = await this.financePaymentModel
      .findOne({ 
        tenantId: new Types.ObjectId(tenantId),
        paymentNumber: { $regex: `^${prefix}${currentYear}-` },
      })
      .sort({ paymentNumber: -1 })
      .lean();

    let sequence = 1;
    if (lastPayment) {
      const match = lastPayment.paymentNumber.match(/-(\d+)$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${currentYear}-${String(sequence).padStart(5, '0')}`;
  }

  async findAll(tenantId: string, filters?: { paymentType?: string; referenceId?: string }): Promise<FinancePayment[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
    
    if (filters?.paymentType) {
      query.paymentType = filters.paymentType;
    }
    
    if (filters?.referenceId) {
      query.referenceId = new Types.ObjectId(filters.referenceId);
    }

    return this.financePaymentModel
      .find(query)
      .sort({ paymentDate: -1 })
      .lean();
  }

  async findById(tenantId: string, id: string): Promise<FinancePayment> {
    const payment = await this.financePaymentModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).lean();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const result = await this.financePaymentModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
      { $set: { isDeleted: true } },
    );

    if (!result) {
      throw new NotFoundException('Payment not found');
    }
  }
}
