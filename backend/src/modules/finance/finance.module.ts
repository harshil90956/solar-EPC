import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { FinanceController } from './controllers/finance.controller';

import { InvoiceService, PaymentService, ExpenseService, TransactionService, FinancePaymentService } from './services';

import { Invoice, InvoiceSchema, Payment, PaymentSchema, Expense, ExpenseSchema, Transaction, TransactionSchema, Project, ProjectSchema, ReminderLog, ReminderLogSchema, Activity, ActivitySchema, FinancePayment, FinancePaymentSchema } from './schemas';



@Module({

  imports: [

    MongooseModule.forFeature([

      { name: Invoice.name, schema: InvoiceSchema },

      { name: Payment.name, schema: PaymentSchema },

      { name: FinancePayment.name, schema: FinancePaymentSchema },

      { name: Expense.name, schema: ExpenseSchema },

      { name: Transaction.name, schema: TransactionSchema },

      { name: Project.name, schema: ProjectSchema },

      { name: ReminderLog.name, schema: ReminderLogSchema },

      { name: Activity.name, schema: ActivitySchema },

    ]),

  ],

  controllers: [FinanceController],

  providers: [InvoiceService, PaymentService, FinancePaymentService, ExpenseService, TransactionService],

  exports: [InvoiceService, PaymentService, FinancePaymentService, ExpenseService, TransactionService],

})

export class FinanceModule {}
