import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument, InvoiceStatus } from '../schemas/invoice.schema';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import { Project, ProjectDocument } from '../schemas/project.schema';
import { ReminderLog, ReminderLogDocument, ReminderType } from '../schemas/reminder-log.schema';
import { Activity, ActivityDocument, ActivityAction } from '../schemas/activity.schema';
import { CreateInvoiceDto, UpdateInvoiceDto, RecordPaymentDto } from '../dto/invoice.dto';
import { CreatePaymentDto, UpdatePaymentDto } from '../dto/payment.dto';

// Payment term to project status mapping
const PAYMENT_TERM_STATUS_MAP: Record<string, string[]> = {
  '30% Advance': ['Procurement'],
  '50% on Delivery': ['Installation'],
  'Net 30': ['Design', 'Commission'],
  'Net 60': ['Design', 'Commission'],
};

// Reverse mapping: status -> allowed payment terms
const STATUS_PAYMENT_TERMS_MAP: Record<string, string[]> = {
  'Survey': [],
  'Design': ['Net 30', 'Net 60'],
  'Quotation': [],
  'Procurement': ['30% Advance'],
  'Installation': ['50% on Delivery'],
  'Commission': ['Net 30', 'Net 60'],
  'Commissioned': ['Net 30', 'Net 60'],
  'On Hold': [],
};

@Injectable()
export class InvoiceService {
  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(ReminderLog.name) private readonly reminderLogModel: Model<ReminderLogDocument>,
    @InjectModel(Activity.name) private readonly activityModel: Model<ActivityDocument>,
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

  getAllowedPaymentTerms(projectStatus: string): string[] {
    return STATUS_PAYMENT_TERMS_MAP[projectStatus] || [];
  }

  validatePaymentTerm(paymentTerm: string, projectStatus: string): void {
    const allowedTerms = this.getAllowedPaymentTerms(projectStatus);
    if (!allowedTerms.includes(paymentTerm)) {
      throw new BadRequestException(
        `Payment term '${paymentTerm}' is not allowed for project status '${projectStatus}'. Allowed terms: ${allowedTerms.join(', ') || 'None'}`
      );
    }
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
    }).select('_id name customerName status value').sort({ name: 1 }).lean();
  }

  async getProjectById(tenantId: string, id: string): Promise<Project> {
    const project = await this.projectModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      ...this.notDeletedMatch(),
    }).select('_id name customerName status value').lean();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
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
    // Validate payment term against project status
    if (dto.paymentTerms && dto.projectStatus) {
      this.validatePaymentTerm(dto.paymentTerms, dto.projectStatus);
    }

    // Generate milestones based on payment terms
    const milestones = dto.paymentTerms
      ? this.generateMilestones(dto.paymentTerms, dto.amount, new Date(dto.invoiceDate))
      : [];

    const invoice = new this.invoiceModel({
      ...dto,
      tenantId: new Types.ObjectId(tenantId),
      paid: dto.paid || 0,
      balance: dto.amount - (dto.paid || 0),
      status: this.calculateStatus(dto.amount, dto.paid || 0, dto.status ?? 'Draft'),
      invoiceDate: new Date(dto.invoiceDate),
      dueDate: new Date(dto.dueDate),
      paidDate: dto.paidDate ? new Date(dto.paidDate) : undefined,
      paymentIds: [],
      milestones,
    });

    const saved = await invoice.save();
    
    // Log activity
    await this.logActivity(
      tenantId,
      saved._id.toString(),
      'INVOICE_CREATED',
      (dto as any).createdBy || (dto as any).userId || '000000000000000000000000',
      {
        invoiceNumber: dto.invoiceNumber,
        amount: dto.amount,
        customerName: dto.customerName,
        status: this.calculateStatus(dto.amount, dto.paid || 0, dto.status),
      },
    );
    
    return saved.toObject();
  }

  async update(tenantId: string, id: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    const existing = await this.findById(tenantId, id);

    if (existing.status === 'Paid') {
      throw new BadRequestException('Paid invoices cannot be edited');
    }
    
    const amount = dto.amount ?? existing.amount;
    const paid = dto.paid ?? existing.paid;
    const balance = amount - paid;
    const status = dto.status || this.calculateStatus(amount, paid, existing.status);

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

    // Log activity
    await this.logActivity(
      tenantId,
      id,
      'INVOICE_UPDATED',
      (dto as any).updatedBy || (dto as any).userId || '000000000000000000000000',
      {
        invoiceNumber: updated.invoiceNumber,
        changes: Object.keys(dto).filter(k => k !== 'updatedBy' && k !== 'userId'),
        newStatus: status,
      },
    );

    return updated;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const existing = await this.findById(tenantId, id);
    if (existing.status === 'Paid') {
      throw new BadRequestException('Paid invoices cannot be deleted');
    }

    const result = await this.invoiceModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
      { isDeleted: true },
    );

    if (!result) {
      throw new NotFoundException('Invoice not found');
    }
  }

  async updateStatus(tenantId: string, id: string, status: InvoiceStatus, userId?: string): Promise<Invoice> {
    const existing = await this.findById(tenantId, id);
    const previousStatus = existing.status;

    if (previousStatus === status) {
      return existing;
    }

    const order: Record<InvoiceStatus, number> = {
      Draft: 0,
      Pending: 1,
      Partial: 2,
      Paid: 3,
      Overdue: 4,
    };

    const isBackward = order[status] < order[previousStatus];

    const allowedTransitions = new Set<string>([
      'Draft->Pending',
      'Pending->Partial',
      'Partial->Paid',
      'Pending->Overdue',
      'Partial->Overdue',
    ]);

    const transitionKey = `${previousStatus}->${status}`;

    if (isBackward) {
      throw new BadRequestException('Invoice status cannot be moved backward.');
    }

    if (!allowedTransitions.has(transitionKey)) {
      throw new BadRequestException('Invalid invoice status transition');
    }

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

    // Log activity
    await this.logActivity(
      tenantId,
      id,
      'STATUS_CHANGED',
      userId || '000000000000000000000000',
      {
        invoiceNumber: updated.invoiceNumber,
        previousStatus,
        newStatus: status,
      },
    );

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

    // Update milestones based on payment
    const updatedMilestones = this.updateMilestonesForPayment(
      invoice.milestones || [],
      newPaid,
      new Date(dto.paymentDate)
    );

    const updatedInvoice = await this.invoiceModel.findOneAndUpdate(
      { _id: new Types.ObjectId(dto.invoiceId), tenantId: new Types.ObjectId(tenantId) },
      {
        paid: newPaid,
        balance: newBalance,
        status: newStatus,
        paidDate: newStatus === 'Paid' ? new Date(dto.paymentDate) : invoice.paidDate,
        milestones: updatedMilestones,
        $push: { paymentIds: savedPayment._id },
      },
      { new: true },
    ).lean();

    if (!updatedInvoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Log activity
    await this.logActivity(
      tenantId,
      dto.invoiceId,
      'PAYMENT_ADDED',
      (dto as any).createdBy || (dto as any).userId || '000000000000000000000000',
      {
        invoiceNumber: invoice.invoiceNumber,
        paymentAmount: dto.amount,
        paymentMethod: dto.paymentMethod,
        newStatus,
        newPaid,
        newBalance,
      },
    );

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

  private generateMilestones(paymentTerms: string, amount: number, invoiceDate: Date): any[] {
    const milestones: any[] = [];
    const invoiceDateObj = new Date(invoiceDate);

    switch (paymentTerms) {
      case '30% Advance':
        milestones.push({
          label: 'Advance',
          percentage: 30,
          amount: Math.round(amount * 0.30 * 100) / 100,
          dueDate: invoiceDateObj,
          isPaid: false,
        });
        milestones.push({
          label: 'Remaining',
          percentage: 70,
          amount: Math.round(amount * 0.70 * 100) / 100,
          dueDate: invoiceDateObj,
          isPaid: false,
        });
        break;

      case '50% on Delivery':
        milestones.push({
          label: 'On Delivery',
          percentage: 50,
          amount: Math.round(amount * 0.50 * 100) / 100,
          dueDate: invoiceDateObj,
          isPaid: false,
        });
        milestones.push({
          label: 'Remaining',
          percentage: 50,
          amount: Math.round(amount * 0.50 * 100) / 100,
          dueDate: invoiceDateObj,
          isPaid: false,
        });
        break;

      case 'Net 30':
        const net30Due = new Date(invoiceDateObj);
        net30Due.setDate(net30Due.getDate() + 30);
        milestones.push({
          label: 'Full Payment',
          percentage: 100,
          amount: amount,
          dueDate: net30Due,
          isPaid: false,
        });
        break;

      case 'Net 60':
        const net60Due = new Date(invoiceDateObj);
        net60Due.setDate(net60Due.getDate() + 60);
        milestones.push({
          label: 'Full Payment',
          percentage: 100,
          amount: amount,
          dueDate: net60Due,
          isPaid: false,
        });
        break;

      default:
        break;
    }

    return milestones;
  }

  private updateMilestonesForPayment(milestones: any[], totalPaid: number, paymentDate: Date): any[] {
    if (!milestones || milestones.length === 0) {
      return milestones;
    }

    let remainingPayment = totalPaid;
    const updatedMilestones = [...milestones];

    // Sort milestones by amount (ascending) to pay smaller milestones first
    updatedMilestones.sort((a, b) => a.amount - b.amount);

    for (const milestone of updatedMilestones) {
      if (remainingPayment >= milestone.amount && !milestone.isPaid) {
        milestone.isPaid = true;
        milestone.paidDate = paymentDate;
        remainingPayment -= milestone.amount;
      }
    }

    return updatedMilestones;
  }

  async sendReminder(
    tenantId: string,
    invoiceId: string,
    reminderType: ReminderType,
    customerEmail: string,
    messageBody: string,
  ): Promise<{ success: boolean; reminderLog: ReminderLog }> {
    const invoice = await this.findById(tenantId, invoiceId);

    // Validation: Check status
    if (invoice.status === 'Draft' || invoice.status === 'Paid') {
      throw new BadRequestException('Cannot send reminder for paid invoice.');
    }

    // Validation: Check balance
    const balance = Number(invoice.balance ?? (invoice.amount - (invoice.paid || 0)));
    if (balance <= 0) {
      throw new BadRequestException('Cannot send reminder - no outstanding balance.');
    }

    // Validation: Check email
    if (!customerEmail || !customerEmail.trim()) {
      throw new BadRequestException('Customer email is required to send reminder.');
    }

    // Generate email template based on reminder type
    const emailSubject = this.generateReminderSubject(invoice, reminderType);
    const emailBody = messageBody || this.generateDefaultMessage(invoice, reminderType, balance);

    // TODO: Integrate with email service here
    // For now, simulate email sending success
    const emailSent = true;
    const emailError = undefined;

    // Create reminder log
    const reminderLog = new this.reminderLogModel({
      tenantId: new Types.ObjectId(tenantId),
      invoiceId: new Types.ObjectId(invoiceId),
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      customerEmail: customerEmail.trim(),
      reminderType,
      messageBody: emailBody,
      balanceAtSend: balance,
      dueDate: invoice.dueDate,
      sentAt: new Date(),
      emailSent,
      emailError,
    });

    const savedLog = await reminderLog.save();

    // Update invoice with reminder tracking
    const currentCount = invoice.reminderCount || 0;
    await this.invoiceModel.findOneAndUpdate(
      { _id: new Types.ObjectId(invoiceId), tenantId: new Types.ObjectId(tenantId) },
      {
        lastReminderSentAt: new Date(),
        reminderCount: currentCount + 1,
      },
    );

    // Log activity
    await this.logActivity(
      tenantId,
      invoiceId,
      'REMINDER_SENT',
      '000000000000000000000000',
      {
        invoiceNumber: invoice.invoiceNumber,
        reminderType,
        customerEmail: customerEmail.trim(),
        balanceAtSend: balance,
        sentTo: customerEmail.trim(),
      },
    );

    return { success: true, reminderLog: savedLog.toObject() };
  }

  private generateReminderSubject(invoice: Invoice, reminderType: ReminderType): string {
    const subjects: Record<ReminderType, string> = {
      'Gentle': `Friendly Reminder: Invoice ${invoice.invoiceNumber} Payment Due Soon`,
      'Due Today': `URGENT: Invoice ${invoice.invoiceNumber} Payment Due Today`,
      'Overdue': `ACTION REQUIRED: Overdue Invoice ${invoice.invoiceNumber}`,
    };
    return subjects[reminderType];
  }

  private generateDefaultMessage(invoice: Invoice, reminderType: ReminderType, balance: number): string {
    const dueDate = new Date(invoice.dueDate).toLocaleDateString();
    const amount = balance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

    const greetings: Record<ReminderType, string> = {
      'Gentle': `Dear ${invoice.customerName},\n\nWe hope this message finds you well. This is a friendly reminder that payment for your invoice is coming up.`,
      'Due Today': `Dear ${invoice.customerName},\n\nThis is an urgent reminder that your invoice payment is due today.`,
      'Overdue': `Dear ${invoice.customerName},\n\nOur records indicate that payment for the following invoice is now overdue. We kindly request immediate attention to this matter.`,
    };

    return `${greetings[reminderType]}

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Amount Due: ${amount}
- Due Date: ${dueDate}

Please arrange payment at your earliest convenience. If you have already made the payment, please disregard this reminder.

Thank you for your business.

Best regards,
Solar EPC Team`;
  }

  // Activity logging helper
  private async logActivity(
    tenantId: string,
    moduleId: string,
    action: ActivityAction,
    performedBy: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const activity = new this.activityModel({
      tenantId: new Types.ObjectId(tenantId),
      module: 'invoice',
      moduleId: new Types.ObjectId(moduleId),
      action,
      performedBy: new Types.ObjectId(performedBy),
      metadata,
      createdAt: new Date(),
    });
    await activity.save();
  }

  // Get invoice timeline (activities)
  async getTimeline(tenantId: string, invoiceId: string): Promise<any[]> {
    const activities = await this.activityModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        module: 'invoice',
        moduleId: new Types.ObjectId(invoiceId),
      })
      .sort({ createdAt: -1 })
      .populate('performedBy', 'name email')
      .lean();

    return activities.map(activity => ({
      id: activity._id,
      action: activity.action,
      metadata: activity.metadata,
      performedBy: activity.performedBy,
      createdAt: activity.createdAt,
    }));
  }
}
