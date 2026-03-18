import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';
import { DashboardCacheService } from './services/dashboard-cache.service';
import { DashboardCache, DashboardCacheSchema } from './schemas/dashboard-cache.schema';
import { Lead, LeadSchema } from '../leads/schemas/lead.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Invoice, InvoiceSchema } from '../finance/schemas/invoice.schema';
import { Expense, ExpenseSchema } from '../finance/schemas/expense.schema';
import { Inventory, InventorySchema } from '../inventory/schemas/inventory.schema';
import { Installation, InstallationSchema } from '../installation/schemas/installation.schema';
import { PurchaseOrder, PurchaseOrderSchema } from '../procurement/schemas/purchase-order.schema';
import { Estimate, EstimateSchema } from '../estimates/schemas/estimate.schema';
import { Employee, EmployeeSchema } from '../hrm/schemas/employee.schema';
import { Attendance, AttendanceSchema } from '../hrm/schemas/attendance.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DashboardCache.name, schema: DashboardCacheSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Inventory.name, schema: InventorySchema },
      { name: Installation.name, schema: InstallationSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Estimate.name, schema: EstimateSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Attendance.name, schema: AttendanceSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardCacheService],
  exports: [DashboardService, DashboardCacheService],
})
export class DashboardModule {}
