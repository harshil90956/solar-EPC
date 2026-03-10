import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsModule } from '../settings/settings.module';
import { FinanceController } from './controllers/finance.controller';

import { InvoiceService, PaymentService, ExpenseService, TransactionService, FinancePaymentService, ManualAdjustmentService, AdjustmentCategoryService, JournalEntryService } from './services';

import { Invoice, InvoiceSchema, Payment, PaymentSchema, Expense, ExpenseSchema, Transaction, TransactionSchema, Project, ProjectSchema, ReminderLog, ReminderLogSchema, Activity, ActivitySchema, FinancePayment, FinancePaymentSchema, ManualAdjustment, ManualAdjustmentSchema, AdjustmentCategory, AdjustmentCategorySchema, JournalEntry, JournalEntrySchema } from './schemas';



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
      { name: ManualAdjustment.name, schema: ManualAdjustmentSchema },
      { name: AdjustmentCategory.name, schema: AdjustmentCategorySchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },

    ]),
    SettingsModule,
  ],
  controllers: [FinanceController],

  providers: [InvoiceService, PaymentService, FinancePaymentService, ExpenseService, TransactionService, ManualAdjustmentService, AdjustmentCategoryService, JournalEntryService],

  exports: [InvoiceService, PaymentService, FinancePaymentService, ExpenseService, TransactionService, ManualAdjustmentService, AdjustmentCategoryService, JournalEntryService],

})
export class FinanceModule {}
