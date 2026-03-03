import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument, InvoiceStatus } from '../schemas/invoice.schema';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import { Project, ProjectDocument } from '../schemas/project.schema';
import { CreateInvoiceDto, UpdateInvoiceDto, RecordPaymentDto } from '../dto/invoice.dto';
import { CreatePaymentDto, UpdatePaymentDto } from '../dto/payment.dto';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
  ) {}

  private tenantOrLegacyMatch(tenantId: string) {
    return {
      $or: [
        { tenantId: new Types.ObjectId(tenantId) },
        { tenantId: { $exists: false } },
        { tenantId: null },
      ],
    };
  }

  private notDeletedMatch() {
    return {
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }, { isDeleted: null }],
    };
  }

  async getCustomerNamesFromProjects(tenantId: string): Promise<string[]> {
    const names = await this.projectModel.distinct('customerName', {
      tenantId: new Types.ObjectId(tenantId),
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }, { isDeleted: null }],
      customerName: { $exists: true, $nin: [null, ''] },
    });

    return (names || [])
      .map((n) => String(n).trim())
      .filter((n) => n.length > 0)
      .sort((a, b) => a.localeCompare(b));
  }

  async getAllProjects(tenantId: string): Promise<Project[]> {
    return this.projectModel.find({
      tenantId: new Types.ObjectId(tenantId),
      ...this.notDeletedMatch(),
    }).select('_id name customerName status').sort({ name: 1 }).lean();
  }

  async findAll(tenantId: string, status?: string): Promise<Invoice[]> {
    const query: any = { ...this.tenantOrLegacyMatch(tenantId), ...this.notDeletedMatch() };
    if (status && status !== 'All') {
      query.status = status;
    }
    return this.invoiceModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async findById(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.invoiceModel.findOne({
      _id: new Types.ObjectId(id),
      ...this.tenantOrLegacyMatch(tenantId),
      ...this.notDeletedMatch(),
    }).lean();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async create(tenantId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    const invoice = new this.invoiceModel({
      ...dto,
      tenantId: new Types.ObjectId(tenantId),
      paid: dto.paid || 0,
      balance: dto.amount - (dto.paid || 0),
      status: this.calculateStatus(dto.amount, dto.paid || 0, dto.status),
      invoiceDate: new Date(dto.invoiceDate),
      dueDate: new Date(dto.dueDate),
      paidDate: dto.paidDate ? new Date(dto.paidDate) : undefined,
      paymentIds: [],
    });

    const saved = await invoice.save();
    return saved.toObject();
  }

  async update(tenantId: string, id: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    const existing = await this.findById(tenantId, id);
    
    const amount = dto.amount ?? existing.amount;
    const paid = dto.paid ?? existing.paid;
    const balance = amount - paid;
    
    const status = dto.status ?? this.calculateStatus(amount, paid, existing.status);

    const updated = await this.invoiceModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), ...this.tenantOrLegacyMatch(tenantId) },
      {
        ...dto,
        balance,
        status,
        invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : existing.invoiceDate,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : existing.dueDate,
        paidDate: dto.paidDate ? new Date(dto.paidDate) : existing.paidDate,
      },
      { new: true },
    ).lean();

    if (!updated) {
      throw new NotFoundException('Invoice not found');
    }

    return updated;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const result = await this.invoiceModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
      { isDeleted: true },
    );

    if (!result) {
      throw new NotFoundException('Invoice not found');
    }
  }

  async updateStatus(tenantId: string, id: string, status: InvoiceStatus): Promise<Invoice> {
    const updated = await this.invoiceModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        ...this.tenantOrLegacyMatch(tenantId),
        ...this.notDeletedMatch(),
      },
      { status },
      { new: true },
    ).lean();

    if (!updated) {
      throw new NotFoundException('Invoice not found');
    }

    return updated;
  }

  async recordPayment(tenantId: string, dto: RecordPaymentDto): Promise<{ invoice: Invoice; payment: Payment }> {
    const invoice = await this.findById(tenantId, dto.invoiceId);
    
    const payment = new this.paymentModel({
      paymentNumber: `PAY-${Date.now()}`,
      invoiceId: new Types.ObjectId(dto.invoiceId),
      customerName: invoice.customerName,
      customerId: invoice.customerId,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      paymentDate: new Date(dto.paymentDate),
      referenceNumber: dto.referenceNumber,
      bankName: dto.bankName,
      notes: dto.notes,
      tenantId: new Types.ObjectId(tenantId),
    });

    const savedPayment = await payment.save();

    const newPaid = invoice.paid + dto.amount;
    const newBalance = invoice.amount - newPaid;
    const newStatus = this.calculateStatus(invoice.amount, newPaid, invoice.status);

    const updatedInvoice = await this.invoiceModel.findOneAndUpdate(
      { _id: new Types.ObjectId(dto.invoiceId), tenantId: new Types.ObjectId(tenantId) },
      {
        paid: newPaid,
        balance: newBalance,
        status: newStatus,
        paidDate: newStatus === 'Paid' ? new Date(dto.paymentDate) : invoice.paidDate,
        $push: { paymentIds: savedPayment._id },
      },
      { new: true },
    ).lean();

    if (!updatedInvoice) {
      throw new NotFoundException('Invoice not found');
    }

    return { invoice: updatedInvoice, payment: savedPayment.toObject() };
  }

  async getDashboardStats(tenantId: string): Promise<any> {
    const invoices = await this.invoiceModel.find({
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).lean();

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + inv.paid, 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balance, 0);
    const overdueCount = invoices.filter(inv => inv.status === 'Overdue').length;
    const pendingCount = invoices.filter(inv => inv.status === 'Pending' || inv.status === 'Partial').length;

    return {
      totalRevenue,
      totalCollected,
      totalOutstanding,
      overdueCount,
      pendingCount,
      collectionRate: totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0,
    };
  }

  private calculateStatus(amount: number, paid: number, currentStatus?: string): InvoiceStatus {
    if (paid >= amount) return 'Paid';
    if (paid > 0) return 'Partial';
    if (currentStatus === 'Overdue') return 'Overdue';
    return (currentStatus as InvoiceStatus) || 'Pending';
  }
}
