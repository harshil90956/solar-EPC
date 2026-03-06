import {

  BadRequestException,

  Body,

  Controller,

  Delete,

  Get,

  Param,

  Patch,

  Post,

  Query,

  Req,

  UseGuards,

} from '@nestjs/common';

import type { FastifyRequest } from 'fastify';

import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';

import { InvoiceService } from '../services/invoice.service';

import { PaymentService } from '../services/payment.service';

import { FinancePaymentService } from '../services/finance-payment.service';

import { ExpenseService } from '../services/expense.service';

import { TransactionService } from '../services/transaction.service';

import { ManualAdjustmentService } from '../services/manual-adjustment.service';

import { CreateInvoiceDto, UpdateInvoiceDto, RecordPaymentDto as InvoiceRecordPaymentDto } from '../dto/invoice.dto';

import { RecordPaymentDto } from '../dto/record-payment.dto';

import { CreatePaymentDto, UpdatePaymentDto } from '../dto/payment.dto';

import { CreateExpenseDto, UpdateExpenseDto } from '../dto/expense.dto';

import { CreateTransactionDto, UpdateTransactionDto } from '../dto/transaction.dto';

import { CreateManualAdjustmentDto } from '../dto/manual-adjustment.dto';

import { InvoiceStatus } from '../schemas/invoice.schema';



interface RequestWithUser extends FastifyRequest {

  user?: {

    tenantId?: string;

    [key: string]: unknown;

  };

}



function getTenantId(req: RequestWithUser): string {

  const tenantId =
    req.user?.tenantId ||
    (req.headers as any)?.['x-tenant-id'] ||
    (req.headers as any)?.['tenant-id'];

  if (!tenantId || typeof tenantId !== 'string') {

    throw new BadRequestException('Tenant ID not found');

  }

  return tenantId;

}



@UseGuards(JwtAuthGuard)

@Controller('finance')

export class FinanceController {

  constructor(

    private readonly invoiceService: InvoiceService,

    private readonly paymentService: PaymentService,

    private readonly financePaymentService: FinancePaymentService,

    private readonly expenseService: ExpenseService,

    private readonly transactionService: TransactionService,

    private readonly manualAdjustmentService: ManualAdjustmentService,

  ) {}



  @Get('customers')

  async getCustomers(@Req() req: RequestWithUser) {

    const tenantId = getTenantId(req);

    return this.invoiceService.getCustomerNamesFromProjects(tenantId);

  }



  @Get('projects')

  async getProjects(@Req() req: RequestWithUser) {

    const tenantId = getTenantId(req);

    return this.invoiceService.getAllProjects(tenantId);

  }



  @Get('projects/:id')

  async getProject(@Req() req: RequestWithUser, @Param('id') id: string) {

    const tenantId = getTenantId(req);

    return this.invoiceService.getProjectById(tenantId, id);

  }



  @Get('allowed-payment-terms')

  async getAllowedPaymentTerms(@Query('projectStatus') projectStatus: string) {

    const allowedTerms = this.invoiceService.getAllowedPaymentTerms(projectStatus);

    return {

      projectStatus,

      allowedTerms,

      canCreateInvoice: allowedTerms.length > 0,

    };

  }



  // Invoice endpoints

  @Get('invoices')

  async getInvoices(@Req() req: RequestWithUser, @Query('status') status?: string) {

    const tenantId = getTenantId(req);

    return this.invoiceService.findAll(tenantId, status);

  }



  @Get('invoices/:id')

  async getInvoice(@Req() req: RequestWithUser, @Param('id') id: string) {

    const tenantId = getTenantId(req);

    return this.invoiceService.findById(tenantId, id);

  }



  @Post('invoices')

  async createInvoice(@Req() req: RequestWithUser, @Body() dto: CreateInvoiceDto) {

    const tenantId = getTenantId(req);

    return this.invoiceService.create(tenantId, dto);

  }



  @Patch('invoices/:id')

  async updateInvoice(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateInvoiceDto) {

    const tenantId = getTenantId(req);

    return this.invoiceService.update(tenantId, id, dto);

  }



  @Delete('invoices/:id')

  async deleteInvoice(@Req() req: RequestWithUser, @Param('id') id: string) {

    const tenantId = getTenantId(req);

    await this.invoiceService.delete(tenantId, id);

    return { success: true };

  }



  @Patch('invoices/:id/status')

  async updateInvoiceStatus(

    @Req() req: RequestWithUser,

    @Param('id') id: string,

    @Body('status') status: InvoiceStatus,

  ) {

    const tenantId = getTenantId(req);

    return this.invoiceService.updateStatus(tenantId, id, status);

  }



  @Post('invoices/record-payment')

  async recordPayment(@Req() req: RequestWithUser, @Body() dto: InvoiceRecordPaymentDto) {

    const tenantId = getTenantId(req);

    return this.invoiceService.recordPayment(tenantId, dto);

  }



  @Post('invoices/:id/send-reminder')

  async sendInvoiceReminder(

    @Req() req: RequestWithUser,

    @Param('id') id: string,

    @Body('reminderType') reminderType: 'Gentle' | 'Due Today' | 'Overdue',

    @Body('customerEmail') customerEmail: string,

    @Body('messageBody') messageBody?: string,

  ) {

    const tenantId = getTenantId(req);

    return this.invoiceService.sendReminder(tenantId, id, reminderType, customerEmail, messageBody || '');

  }



  @Get('invoices/:id/timeline')

  async getInvoiceTimeline(@Req() req: RequestWithUser, @Param('id') id: string) {

    const tenantId = getTenantId(req);

    return this.invoiceService.getTimeline(tenantId, id);

  }



  // Payment endpoints

  @Get('payments')

  async getPayments(@Req() req: RequestWithUser, @Query('invoiceId') invoiceId?: string) {

    const tenantId = getTenantId(req);

    return this.paymentService.findAll(tenantId, invoiceId);

  }



  @Get('payments/:id')

  async getPayment(@Req() req: RequestWithUser, @Param('id') id: string) {

    const tenantId = getTenantId(req);

    return this.paymentService.findById(tenantId, id);

  }



  @Post('payments')

  async createPayment(@Req() req: RequestWithUser, @Body() dto: CreatePaymentDto) {

    const tenantId = getTenantId(req);

    return this.paymentService.create(tenantId, dto);

  }



  @Patch('payments/:id')

  async updatePayment(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdatePaymentDto) {

    const tenantId = getTenantId(req);

    return this.paymentService.update(tenantId, id, dto);

  }



  @Delete('payments/:id')

  async deletePayment(@Req() req: RequestWithUser, @Param('id') id: string) {

    const tenantId = getTenantId(req);

    await this.paymentService.delete(tenantId, id);

    return { success: true };

  }



  // Independent Payment Recording (Customer & Vendor) - lifecycle

  @Post('payments/initiate')

  async initiateIndependentPayment(@Req() req: RequestWithUser, @Body() dto: RecordPaymentDto) {

    const tenantId = getTenantId(req);

    const userId = (req as any).user?.userId;

    return this.financePaymentService.initiatePayment(tenantId, dto, userId);

  }



  // Backward-compatible alias

  @Post('payments/record')

  async recordIndependentPayment(@Req() req: RequestWithUser, @Body() dto: RecordPaymentDto) {

    const tenantId = getTenantId(req);

    const userId = (req as any).user?.userId;

    return this.financePaymentService.initiatePayment(tenantId, dto, userId);

  }



  @Post('payments/:id/verify')

  async verifyIndependentPayment(

    @Req() req: RequestWithUser,

    @Param('id') id: string,

    @Body() payload: any,

  ) {

    const tenantId = getTenantId(req);

    return this.financePaymentService.verifyPayment(tenantId, id, payload || {});

  }



  @Post('payments/:id/complete')

  async completeIndependentPayment(

    @Req() req: RequestWithUser,

    @Param('id') id: string,

    @Body() payload: any,

  ) {

    const tenantId = getTenantId(req);

    const userId = (req as any).user?.userId;

    return this.financePaymentService.completePayment(tenantId, id, payload || {}, userId);

  }



  // Expense endpoints

  @Get('expenses')

  async getExpenses(

    @Req() req: RequestWithUser,

    @Query('status') status?: string,

    @Query('category') category?: string,

  ) {

    const tenantId = getTenantId(req);

    return this.expenseService.findAll(tenantId, status, category);

  }



  @Get('expenses/:id')

  async getExpense(@Req() req: RequestWithUser, @Param('id') id: string) {

    const tenantId = getTenantId(req);

    return this.expenseService.findById(tenantId, id);

  }



  @Post('expenses')

  async createExpense(@Req() req: RequestWithUser, @Body() dto: CreateExpenseDto) {

    const tenantId = getTenantId(req);

    return this.expenseService.create(tenantId, dto);

  }



  @Patch('expenses/:id')

  async updateExpense(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {

    const tenantId = getTenantId(req);

    return this.expenseService.update(tenantId, id, dto);

  }



  @Delete('expenses/:id')

  async deleteExpense(@Req() req: RequestWithUser, @Param('id') id: string) {

    const tenantId = getTenantId(req);

    await this.expenseService.delete(tenantId, id);

    return { success: true };

  }



  @Get('payables-summary')

  async getPayablesSummary(@Req() req: RequestWithUser) {

    const tenantId = getTenantId(req);

    return this.expenseService.getPayablesSummary(tenantId);

  }



  // Transaction endpoints

  @Get('transactions')

  async getTransactions(@Req() req: RequestWithUser, @Query('type') type?: string) {

    const tenantId = getTenantId(req);

    return this.transactionService.findAll(tenantId, type);

  }



  @Get('transactions/:id')

  async getTransaction(@Req() req: RequestWithUser, @Param('id') id: string) {

    const tenantId = getTenantId(req);

    return this.transactionService.findById(tenantId, id);

  }



  @Post('transactions')

  async createTransaction(@Req() req: RequestWithUser, @Body() dto: CreateTransactionDto) {

    const tenantId = getTenantId(req);

    return this.transactionService.create(tenantId, dto);

  }



  @Patch('transactions/:id')

  async updateTransaction(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {

    const tenantId = getTenantId(req);

    return this.transactionService.update(tenantId, id, dto);

  }



  @Delete('transactions/:id')

  async deleteTransaction(@Req() req: RequestWithUser, @Param('id') id: string) {

    const tenantId = getTenantId(req);

    await this.transactionService.delete(tenantId, id);

    return { success: true };

  }



  @Get('cash-flow')

  async getCashFlow(@Req() req: RequestWithUser, @Query('months') months?: string) {

    const tenantId = getTenantId(req);

    return this.transactionService.getCashFlowData(tenantId, months ? parseInt(months, 10) : 6);

  }



  @Get('monthly-revenue')

  async getMonthlyRevenue(@Req() req: RequestWithUser, @Query('months') months?: string) {

    const tenantId = getTenantId(req);

    return this.transactionService.getMonthlyRevenue(tenantId, months ? parseInt(months, 10) : 6);

  }



  // Manual Adjustment endpoints

  @Get('manual-adjustments')

  async getManualAdjustments(@Req() req: RequestWithUser) {

    const tenantId = getTenantId(req);

    return this.manualAdjustmentService.findAll(tenantId);

  }



  @Post('manual-adjustments')

  async createManualAdjustment(@Req() req: RequestWithUser, @Body() dto: CreateManualAdjustmentDto) {

    const tenantId = getTenantId(req);

    const userId = (req as any).user?.userId;

    return this.manualAdjustmentService.create(tenantId, dto, userId);

  }



  @Get('manual-adjustments/balance')

  async getManualAdjustmentBalance(@Req() req: RequestWithUser) {

    const tenantId = getTenantId(req);

    const balance = await this.manualAdjustmentService.getBalance(tenantId);

    return { balance };

  }



  // Dashboard stats

  @Get('dashboard-stats')

  async getDashboardStats(@Req() req: RequestWithUser) {

    const tenantId = getTenantId(req);

    return this.invoiceService.getDashboardStats(tenantId);

  }

}

