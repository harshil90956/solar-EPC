import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinanceController } from './controllers/finance.controller';
import { InvoiceService, PaymentService, ExpenseService, TransactionService } from './services';
import { Invoice, InvoiceSchema, Payment, PaymentSchema, Expense, ExpenseSchema, Transaction, TransactionSchema, Project, ProjectSchema, ReminderLog, ReminderLogSchema, Activity, ActivitySchema } from './schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: ReminderLog.name, schema: ReminderLogSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
  ],
  controllers: [FinanceController],
  providers: [InvoiceService, PaymentService, ExpenseService, TransactionService],
  exports: [InvoiceService, PaymentService, ExpenseService, TransactionService],
})
export class FinanceModule {}
