import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DashboardCacheService } from './dashboard-cache.service';
import { Lead } from '../../leads/schemas/lead.schema';
import { Project } from '../../projects/schemas/project.schema';
import { Invoice } from '../../finance/schemas/invoice.schema';
import { Expense } from '../../finance/schemas/expense.schema';
import { Inventory } from '../../inventory/schemas/inventory.schema';
import { Installation } from '../../installation/schemas/installation.schema';
import { PurchaseOrder } from '../../procurement/schemas/purchase-order.schema';
import { Estimate } from '../../estimates/schemas/estimate.schema';
import { Employee } from '../../hrm/schemas/employee.schema';
import { Attendance } from '../../hrm/schemas/attendance.schema';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(Lead.name) private leadModel: Model<Lead>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel(Expense.name) private expenseModel: Model<Expense>,
    @InjectModel(Inventory.name) private inventoryModel: Model<Inventory>,
    @InjectModel(Installation.name) private installationModel: Model<Installation>,
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrder>,
    @InjectModel(Estimate.name) private estimateModel: Model<Estimate>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    @InjectModel(Attendance.name) private attendanceModel: Model<Attendance>,
    private cacheService: DashboardCacheService,
  ) {}

  async getOverview(tenantId: string, user?: any) {
    const cacheKey = 'overview';
    const cached = await this.cacheService.getCachedData(tenantId, cacheKey);
    if (cached) return cached;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const tid = new Types.ObjectId(tenantId);
    const isSuperAdmin = user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin';
    const baseQuery = isSuperAdmin ? {} : { tenantId: tid };

    const [
      totalLeads,
      newLeads30d,
      totalProjects,
      projectsByStatus,
      activeProjects,
      completedProjects,
      totalRevenue,
      revenue30d,
      outstandingAmount,
      totalExpenses,
      expenses30d,
      inventoryValue,
      lowStockItems,
      activeInstallations,
      completedInstallations30d,
      pendingInstallations,
      totalEmployees,
      presentToday,
      pendingPOs,
      totalEstimates,
      estimatesPending,
    ] = await Promise.all([
      this.leadModel.countDocuments({ ...baseQuery, isDeleted: { $ne: true } }),
      this.leadModel.countDocuments({ ...baseQuery, isDeleted: { $ne: true }, createdAt: { $gte: thirtyDaysAgo } }),
      this.projectModel.countDocuments({ ...baseQuery, isDeleted: { $ne: true } }),
      this.projectModel.aggregate([{ $match: { ...baseQuery, isDeleted: { $ne: true } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      this.projectModel.countDocuments({ ...baseQuery, isDeleted: { $ne: true }, status: { $in: ['Survey', 'Design', 'Quotation', 'Procurement', 'Installation'] } }),
      this.projectModel.countDocuments({ ...baseQuery, isDeleted: { $ne: true }, status: 'Commissioned' }),
      this.invoiceModel.aggregate([{ $match: { ...baseQuery, isDeleted: { $ne: true }, status: 'Paid' } }, { $group: { _id: null, total: { $sum: '$paid' } } }]),
      this.invoiceModel.aggregate([{ $match: { ...baseQuery, isDeleted: { $ne: true }, status: 'Paid', paidDate: { $gte: thirtyDaysAgo } } }, { $group: { _id: null, total: { $sum: '$paid' } } }]),
      this.invoiceModel.aggregate([{ $match: { ...baseQuery, isDeleted: { $ne: true }, status: { $in: ['Pending', 'Partial', 'Overdue'] } } }, { $group: { _id: null, total: { $sum: '$balance' } } }]),
      this.expenseModel.aggregate([{ $match: { ...baseQuery, isDeleted: { $ne: true } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      this.expenseModel.aggregate([{ $match: { ...baseQuery, isDeleted: { $ne: true }, date: { $gte: thirtyDaysAgo } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      this.inventoryModel.aggregate([{ $match: { ...baseQuery, isDeleted: { $ne: true } } }, { $group: { _id: null, value: { $sum: { $multiply: ['$stock', '$rate'] } } } }]),
      this.inventoryModel.countDocuments({ ...baseQuery, isDeleted: { $ne: true }, status: 'Low Stock' }),
      this.installationModel.countDocuments({ ...baseQuery, isDeleted: { $ne: true }, status: { $in: ['Pending', 'In Progress'] } }),
      this.installationModel.countDocuments({ ...baseQuery, isDeleted: { $ne: true }, status: 'Completed', updatedAt: { $gte: thirtyDaysAgo } }),
      this.installationModel.countDocuments({ ...baseQuery, isDeleted: { $ne: true }, status: 'Pending Assign' }),
      this.employeeModel.countDocuments({ ...baseQuery, isDeleted: { $ne: true }, status: 'active' }),
      this.attendanceModel.countDocuments({ ...baseQuery, date: { $gte: new Date(now.setHours(0,0,0,0)) }, status: 'Present' }),
      this.poModel.countDocuments({ ...baseQuery, isActive: true, status: { $in: ['Draft', 'Ordered'] } }),
      this.estimateModel.countDocuments({ ...baseQuery, isDeleted: { $ne: true } }),
      this.estimateModel.countDocuments({ ...baseQuery, isDeleted: { $ne: true }, status: { $in: ['draft', 'sent'] } }),
    ]);

    const revenue = totalRevenue[0]?.total || 0;
    const expenses = totalExpenses[0]?.total || 0;
    const profit = revenue - expenses;
    const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;

    const result = {
      summary: {
        totalLeads,
        newLeads30d,
        totalProjects,
        activeProjects,
        completedProjects,
        totalRevenue: revenue,
        revenue30d: revenue30d[0]?.total || 0,
        outstandingAmount: outstandingAmount[0]?.total || 0,
        totalExpenses: expenses,
        expenses30d: expenses30d[0]?.total || 0,
        profit,
        profitMargin: `${profitMargin}%`,
        inventoryValue: inventoryValue[0]?.value || 0,
        lowStockItems,
        activeInstallations,
        completedInstallations30d,
        pendingInstallations,
        totalEmployees,
        presentToday,
        pendingPOs,
        totalEstimates,
        estimatesPending,
      },
      projectsByStatus: projectsByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      generatedAt: new Date().toISOString(),
    };

    await this.cacheService.setCachedData(tenantId, cacheKey, result, 5);
    return result;
  }

  async getSalesPipeline(tenantId: string, user?: any) {
    const tid = new Types.ObjectId(tenantId);
    const isSuperAdmin = user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin';
    const baseQuery = isSuperAdmin ? {} : { tenantId: tid };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      leadsByStatus,
      estimatesByStatus,
      conversionStats,
      monthlyTrend,
    ] = await Promise.all([
      this.leadModel.aggregate([
        { $match: { ...baseQuery, isDeleted: { $ne: true } } },
        { $group: { _id: '$statusKey', count: { $sum: 1 } } },
      ]),
      this.estimateModel.aggregate([
        { $match: { ...baseQuery, isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.getConversionStats(baseQuery),
      this.getMonthlyTrend(baseQuery),
    ]);

    return {
      leadsByStatus: leadsByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      estimatesByStatus: estimatesByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      conversionStats,
      monthlyTrend,
    };
  }

  private async getConversionStats(baseQuery: any) {
    const totalLeads = await this.leadModel.countDocuments({ ...baseQuery, isDeleted: { $ne: true } });
    const qualifiedLeads = await this.leadModel.countDocuments({ ...baseQuery, isDeleted: { $ne: true }, statusKey: { $in: ['qualified', 'proposal', 'negotiation'] } });
    const convertedToProject = await this.projectModel.countDocuments({ ...baseQuery, isDeleted: { $ne: true } });

    return {
      leadToQualified: totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : 0,
      qualifiedToProject: qualifiedLeads > 0 ? ((convertedToProject / qualifiedLeads) * 100).toFixed(1) : 0,
      overallConversion: totalLeads > 0 ? ((convertedToProject / totalLeads) * 100).toFixed(1) : 0,
    };
  }

  private async getMonthlyTrend(baseQuery: any) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await this.leadModel.aggregate([
      { $match: { ...baseQuery, isDeleted: { $ne: true }, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          leads: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    return monthlyData.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      leads: item.leads,
    }));
  }

  async getFinancialMetrics(tenantId: string, user?: any) {
    const tid = new Types.ObjectId(tenantId);
    const isSuperAdmin = user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin';
    const baseQuery = isSuperAdmin ? {} : { tenantId: tid };

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

    const [
      revenueByMonth,
      expensesByMonth,
      invoiceStatus,
      topCustomers,
      overdueInvoices,
    ] = await Promise.all([
      this.invoiceModel.aggregate([
        { $match: { ...baseQuery, isDeleted: { $ne: true }, status: 'Paid', paidDate: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$paidDate' }, month: { $month: '$paidDate' } },
            amount: { $sum: '$paid' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      this.expenseModel.aggregate([
        { $match: { ...baseQuery, isDeleted: { $ne: true }, date: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$date' }, month: { $month: '$date' } },
            amount: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { ...baseQuery, isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { ...baseQuery, isDeleted: { $ne: true }, status: 'Paid' } },
        { $group: { _id: '$customerName', total: { $sum: '$paid' } } },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ]),
      this.invoiceModel.find({
        ...baseQuery,
        isDeleted: { $ne: true },
        status: 'Overdue',
      }).sort({ dueDate: 1 }).limit(5).select('invoiceNumber customerName balance dueDate'),
    ]);

    return {
      revenueByMonth: revenueByMonth.map(item => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        amount: item.amount,
      })),
      expensesByMonth: expensesByMonth.map(item => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        amount: item.amount,
      })),
      invoiceStatus,
      topCustomers,
      overdueInvoices,
    };
  }

  async getProjectMetrics(tenantId: string, user?: any) {
    const tid = new Types.ObjectId(tenantId);
    const isSuperAdmin = user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin';
    const baseQuery = isSuperAdmin ? {} : { tenantId: tid };

    const [
      projectsByStage,
      delayedProjects,
      recentProjects,
      installationProgress,
    ] = await Promise.all([
      this.projectModel.aggregate([
        { $match: { ...baseQuery, isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$value' } } },
      ]),
      this.projectModel.find({
        ...baseQuery,
        isDeleted: { $ne: true },
        status: { $in: ['Installation', 'Commissioned'] },
        $expr: { $gt: [{ $toDate: '$estEndDate' }, new Date()] },
      }).sort({ estEndDate: 1 }).limit(5).select('projectId customerName status progress estEndDate'),
      this.projectModel.find({
        ...baseQuery,
        isDeleted: { $ne: true },
      }).sort({ createdAt: -1 }).limit(5).select('projectId customerName status progress value'),
      this.installationModel.aggregate([
        { $match: { ...baseQuery, isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 }, avgProgress: { $avg: '$progress' } } },
      ]),
    ]);

    return {
      projectsByStage,
      delayedProjects,
      recentProjects,
      installationProgress,
    };
  }

  async getInventoryAlerts(tenantId: string, user?: any) {
    const tid = new Types.ObjectId(tenantId);
    const isSuperAdmin = user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin';
    const baseQuery = isSuperAdmin ? {} : { tenantId: tid };

    const [
      lowStockItems,
      outOfStockItems,
      inventoryByCategory,
      reservedInventory,
    ] = await Promise.all([
      this.inventoryModel.find({
        ...baseQuery,
        isDeleted: { $ne: true },
        status: 'Low Stock',
      }).sort({ stock: 1 }).limit(10).select('itemId name stock minStock reserved category'),
      this.inventoryModel.find({
        ...baseQuery,
        isDeleted: { $ne: true },
        status: 'Out of Stock',
      }).select('itemId name category'),
      this.inventoryModel.aggregate([
        { $match: { ...baseQuery, isDeleted: { $ne: true } } },
        { $group: { _id: '$category', count: { $sum: 1 }, value: { $sum: { $multiply: ['$stock', '$rate'] } } } },
      ]),
      this.inventoryModel.aggregate([
        { $match: { ...baseQuery, isDeleted: { $ne: true }, reserved: { $gt: 0 } } },
        { $group: { _id: null, totalReserved: { $sum: '$reserved' }, count: { $sum: 1 } } },
      ]),
    ]);

    return {
      lowStockItems,
      outOfStockItems,
      inventoryByCategory,
      reservedCount: reservedInventory[0]?.count || 0,
      totalReserved: reservedInventory[0]?.totalReserved || 0,
    };
  }

  async getTeamPerformance(tenantId: string, user?: any) {
    const tid = new Types.ObjectId(tenantId);
    const isSuperAdmin = user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin';
    const baseQuery = isSuperAdmin ? {} : { tenantId: tid };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      attendanceToday,
      installationByTechnician,
      leadsByOwner,
      employeeStats,
    ] = await Promise.all([
      this.attendanceModel.aggregate([
        { $match: { ...baseQuery, date: { $gte: today } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.installationModel.aggregate([
        { $match: { ...baseQuery, isDeleted: { $ne: true }, status: 'Completed' } },
        { $group: { _id: '$technicianName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      this.leadModel.aggregate([
        { $match: { ...baseQuery, isDeleted: { $ne: true }, assignedTo: { $exists: true } } },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $project: { _id: 1, count: 1, name: { $arrayElemAt: ['$user.name', 0] } } },
        { $limit: 5 },
      ]),
      this.employeeModel.aggregate([
        { $match: { ...baseQuery, isDeleted: { $ne: true } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      attendanceToday: attendanceToday.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      installationByTechnician,
      leadsByOwner,
      employeeStats,
    };
  }

  async getIntelligentInsights(tenantId: string, user?: any) {
    const tid = new Types.ObjectId(tenantId);
    const isSuperAdmin = user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin';
    const baseQuery = isSuperAdmin ? {} : { tenantId: tid };

    const insights = [];

    // Check for overdue invoices
    const overdueCount = await this.invoiceModel.countDocuments({
      ...baseQuery,
      isDeleted: { $ne: true },
      status: 'Overdue',
    });
    if (overdueCount > 0) {
      insights.push({
        type: 'warning',
        severity: 'high',
        message: `${overdueCount} invoice(s) are overdue. Follow up for payment collection.`,
        module: 'finance',
        action: 'View Invoices',
      });
    }

    // Check for low stock
    const lowStockCount = await this.inventoryModel.countDocuments({
      ...baseQuery,
      isDeleted: { $ne: true },
      status: 'Low Stock',
    });
    if (lowStockCount > 0) {
      insights.push({
        type: 'alert',
        severity: 'high',
        message: `${lowStockCount} items are running low on stock. Review procurement needs.`,
        module: 'inventory',
        action: 'View Inventory',
      });
    }

    // Check for pending installations
    const pendingInstallations = await this.installationModel.countDocuments({
      ...baseQuery,
      isDeleted: { $ne: true },
      status: 'Pending Assign',
    });
    if (pendingInstallations > 0) {
      insights.push({
        type: 'info',
        severity: 'medium',
        message: `${pendingInstallations} installation(s) need technician assignment.`,
        module: 'installation',
        action: 'Assign Technicians',
      });
    }

    // Check for pending purchase orders
    const pendingPOs = await this.poModel.countDocuments({
      ...baseQuery,
      isActive: true,
      status: { $in: ['Draft', 'Ordered'] },
    });
    if (pendingPOs > 0) {
      insights.push({
        type: 'info',
        severity: 'medium',
        message: `${pendingPOs} purchase order(s) are pending. Track delivery status.`,
        module: 'procurement',
        action: 'View POs',
      });
    }

    // Compare revenue with last month
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonthRevenue, lastMonthRevenue] = await Promise.all([
      this.invoiceModel.aggregate([
        { $match: { ...baseQuery, isDeleted: { $ne: true }, status: 'Paid', paidDate: { $gte: thisMonth } } },
        { $group: { _id: null, total: { $sum: '$paid' } } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { ...baseQuery, isDeleted: { $ne: true }, status: 'Paid', paidDate: { $gte: lastMonth, $lte: lastMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$paid' } } },
      ]),
    ]);

    const current = thisMonthRevenue[0]?.total || 0;
    const previous = lastMonthRevenue[0]?.total || 0;

    if (previous > 0) {
      const change = ((current - previous) / previous) * 100;
      if (change > 10) {
        insights.push({
          type: 'success',
          severity: 'low',
          message: `Revenue increased by ${change.toFixed(1)}% compared to last month!`,
          module: 'finance',
          action: 'View Report',
        });
      } else if (change < -10) {
        insights.push({
          type: 'warning',
          severity: 'medium',
          message: `Revenue decreased by ${Math.abs(change).toFixed(1)}% compared to last month.`,
          module: 'finance',
          action: 'View Report',
        });
      }
    }

    return insights;
  }

  async getRecentActivities(tenantId: string, limit = 10, user?: any) {
    const tid = new Types.ObjectId(tenantId);
    const isSuperAdmin = user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin';
    const baseQuery = isSuperAdmin ? {} : { tenantId: tid };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      recentLeads,
      recentProjects,
      recentInvoices,
      recentInstallations,
    ] = await Promise.all([
      this.leadModel.find({
        ...baseQuery,
        isDeleted: { $ne: true },
        createdAt: { $gte: thirtyDaysAgo },
      }).sort({ createdAt: -1 }).limit(limit).select('leadId name statusKey createdAt'),
      this.projectModel.find({
        ...baseQuery,
        isDeleted: { $ne: true },
        createdAt: { $gte: thirtyDaysAgo },
      }).sort({ createdAt: -1 }).limit(limit).select('projectId customerName status createdAt'),
      this.invoiceModel.find({
        ...baseQuery,
        isDeleted: { $ne: true },
        createdAt: { $gte: thirtyDaysAgo },
      }).sort({ createdAt: -1 }).limit(limit).select('invoiceNumber customerName status amount createdAt'),
      this.installationModel.find({
        ...baseQuery,
        isDeleted: { $ne: true },
        updatedAt: { $gte: thirtyDaysAgo },
        status: 'Completed',
      }).sort({ updatedAt: -1 }).limit(limit).select('installationId customerName status completedAt'),
    ]);

    const activities = [
      ...recentLeads.map(l => ({ type: 'lead', title: `New Lead: ${l.name}`, status: l.statusKey, date: (l as any).createdAt || l.created, id: l.leadId })),
      ...recentProjects.map(p => ({ type: 'project', title: `Project Created: ${p.customerName}`, status: p.status, date: (p as any).createdAt || (p as any).createdBy || new Date(), id: p.projectId })),
      ...recentInvoices.map(i => ({ type: 'invoice', title: `Invoice ${i.invoiceNumber}`, status: i.status, amount: i.amount, date: (i as any).createdAt || (i as any).createdBy || new Date(), })),
      ...recentInstallations.map(i => ({ type: 'installation', title: `Installation Completed: ${i.customerName}`, status: i.status, date: (i as any).completedAt || (i as any).updatedAt || new Date(), id: i.installationId })),
    ];

    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);
  }
}
