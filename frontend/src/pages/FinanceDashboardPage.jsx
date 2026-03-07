import React, { useState, useEffect } from 'react';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { financeApi } from '../lib/financeApi';
import { api } from '../lib/apiClient';
import FinanceDashboard from '../components/finance/FinanceDashboard';

const FinanceDashboardPage = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [dashboardStats, setDashboardStats] = useState({});
  const [payables, setPayables] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [manualAdjustments, setManualAdjustments] = useState([]);
  const [manualBalance, setManualBalance] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [cashFlow, setCashFlow] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        invoicesRes,
        paymentsRes,
        vendorExpensesRes,
        statsRes,
        vendorsRes,
        posRes,
        manualAdjustmentsRes,
        manualBalanceRes,
      ] = await Promise.all([
        financeApi.getInvoices(),
        financeApi.getPayments(),
        financeApi.getExpenses(undefined, 'Vendor Payment'),
        financeApi.getDashboardStats(),
        api.get('/procurement/vendors'),
        api.get('/procurement/purchase-orders'),
        financeApi.getManualAdjustments(),
        financeApi.getManualAdjustmentBalance(),
      ]);

      setInvoices(invoicesRes || []);
      const payments = paymentsRes || [];
      setPayments(payments);
      const vendorExpenses = vendorExpensesRes || [];
      setDashboardStats(statsRes);
      setManualAdjustments(manualAdjustmentsRes || []);
      setManualBalance(manualBalanceRes?.balance || 0);

      // Calculate payables and charts
      const vendors = Array.isArray(vendorsRes) ? vendorsRes : (vendorsRes?.data || []);
      const purchaseOrders = Array.isArray(posRes) ? posRes : (posRes?.data || []);

      const safeDate = (d) => {
        if (!d) return null;
        if (d instanceof Date) return Number.isNaN(d.getTime()) ? null : d;
        const dt = new Date(d);
        return Number.isNaN(dt.getTime()) ? null : dt;
      };

      const getMonthKey = (dt) => {
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
      };

      const getMonthLabel = (dt) => dt.toLocaleString('en-IN', { month: 'short' });

      const buildLastNMonths = (n) => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const months = [];
        for (let i = n - 1; i >= 0; i -= 1) {
          const d = new Date(start.getFullYear(), start.getMonth() - i, 1);
          months.push({
            key: getMonthKey(d),
            month: getMonthLabel(d),
            start: new Date(d.getFullYear(), d.getMonth(), 1),
            end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
          });
        }
        return months;
      };

      const months = buildLastNMonths(6);
      const allowedInvoiceStatuses = new Set(['Paid', 'Partial', 'Pending']);

      const invoiceCreatedAt = (inv) => safeDate(inv?.invoiceDate) || safeDate(inv?.createdAt);
      const paymentDate = (p) => safeDate(p?.paymentDate) || safeDate(p?.createdAt);
      const expenseCreatedAt = (exp) => safeDate(exp?.createdAt) || safeDate(exp?.expenseDate);
      const expensePaidAt = (exp) => safeDate(exp?.expenseDate) || safeDate(exp?.updatedAt) || safeDate(exp?.createdAt);

      const invoicesForCharts = (invoicesRes || []).filter(inv => allowedInvoiceStatuses.has(inv?.status));

      const revenueCostSeries = months.map((m) => {
        const revenue = invoicesForCharts.reduce((sum, inv) => {
          const dt = invoiceCreatedAt(inv);
          if (!dt || dt < m.start || dt >= m.end) return sum;
          return sum + Number(inv?.amount || inv?.invoiceAmount || 0);
        }, 0);

        const cost = (vendorExpenses || []).reduce((sum, exp) => {
          const dt = expenseCreatedAt(exp);
          if (!dt || dt < m.start || dt >= m.end) return sum;
          return sum + Number(exp?.amount || exp?.payableAmount || 0);
        }, 0);

        return { month: m.month, revenue, cost };
      });

      const cashFlowSeries = months.map((m) => {
        // Inflow: Use invoices.paid instead of payments (like backend getBalance)
        const inflow = (invoices || []).reduce((sum, inv) => {
          // For paid invoices, use invoiceDate if paidDate is missing
          let dt = safeDate(inv?.paidDate);
          if (!dt && inv?.status === 'Paid') {
            dt = safeDate(inv?.invoiceDate) || safeDate(inv?.updatedAt) || safeDate(inv?.createdAt);
          }
          if (!dt || dt < m.start || dt >= m.end) return sum;
          // Use paid amount (or amount if status is Paid)
          const paid = Number(inv?.paid || 0);
          const amount = Number(inv?.amount || 0);
          const effectivePaid = (paid === 0 && inv?.status === 'Paid') ? amount : paid;
          return sum + effectivePaid;
        }, 0);

        const outflow = (vendorExpenses || []).reduce((sum, exp) => {
          if (String(exp?.status || '').toLowerCase() !== 'paid') return sum;
          const dt = expensePaidAt(exp);
          if (!dt || dt < m.start || dt >= m.end) return sum;
          return sum + Number(exp?.amount || exp?.paidAmount || 0);
        }, 0);

        return { month: m.month, inflow, outflow };
      });

      console.log('CashFlow debug:', { 
        months: months.map(m => ({ month: m.month, start: m.start.toISOString(), end: m.end.toISOString() })),
        invoicesCount: invoices?.length || 0,
        paidInvoices: invoices?.filter(inv => inv?.status === 'Paid').map(inv => ({ 
          status: inv.status, 
          amount: inv.amount, 
          paid: inv.paid,
          invoiceDate: inv.invoiceDate,
          paidDate: inv.paidDate 
        })),
        cashFlowSeries 
      });

      setMonthlyRevenue(revenueCostSeries);
      setCashFlow(cashFlowSeries);

      // Calculate payables
      const computePaymentStatus = (po) => {
        const total = Number(po?.totalAmount || 0);
        const paid = Number(po?.amountPaid || 0);
        const raw = po?.paymentStatus;
        if (raw) return raw;
        if (paid <= 0) return 'Unpaid';
        if (paid >= total) return 'Paid';
        return 'Partially Paid';
      };

      const vendorRows = (vendors || [])
        .map((v) => {
          const vendorObjectId = v?._id;
          if (!vendorObjectId) return null;

          const vendorPos = (purchaseOrders || []).filter((po) => {
            const poVendorId = (po?.vendorId && typeof po.vendorId === 'object') ? po.vendorId?._id : po?.vendorId;
            return String(poVendorId) === String(vendorObjectId);
          });

          const payablePos = vendorPos.filter((po) => {
            const status = computePaymentStatus(po);
            return status === 'Unpaid' || status === 'Partially Paid';
          });

          const totals = payablePos.reduce(
            (acc, po) => {
              const total = Number(po?.totalAmount || 0);
              const paid = Number(po?.amountPaid || 0);
              acc.totalPurchaseOrders += 1;
              acc.totalPayableAmount += total;
              acc.amountPaid += paid;
              acc.outstandingAmount += Math.max(0, total - paid);
              if (po?.orderedDate) {
                if (!acc.lastPurchaseOrderDate || String(po.orderedDate) > String(acc.lastPurchaseOrderDate)) {
                  acc.lastPurchaseOrderDate = po.orderedDate;
                }
              }
              return acc;
            },
            {
              vendorName: v?.name || v?.vendorName || '—',
              vendorId: v?.id || v?._id,
              vendorObjectId,
              totalPurchaseOrders: 0,
              totalPayableAmount: 0,
              amountPaid: 0,
              outstandingAmount: 0,
              lastPurchaseOrderDate: '',
            }
          );

          if (totals.outstandingAmount <= 0) return null;
          return totals;
        })
        .filter(Boolean)
        .sort((a, b) => (String(b.lastPurchaseOrderDate || '')).localeCompare(String(a.lastPurchaseOrderDate || '')));

      setPayables(vendorRows.filter(Boolean));

    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-muted)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-96">
        <div className="glass-card p-6 text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={fetchDashboardData}>Retry</Button>
            <Button variant="outline" onClick={() => onNavigate('finance')}>
              <ArrowLeft size={16} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 p-4 md:p-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => onNavigate('finance')} className="gap-2">
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="heading-page flex items-center gap-2">
              <BarChart3 size={24} className="text-[var(--accent)]" />
              Finance Dashboard
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Complete overview of your financial operations
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <FinanceDashboard
        isOpen={true}
        onClose={() => onNavigate('finance')}
        dashboardStats={dashboardStats}
        payables={payables}
        invoices={invoices}
        payments={payments}
        manualAdjustments={manualAdjustments}
        monthlyRevenue={monthlyRevenue}
        cashFlow={cashFlow}
        manualBalance={manualBalance}
        onInvoicesClick={() => onNavigate('finance')}
        onStatusClick={() => onNavigate('finance')}
      />
    </div>
  );
};

export default FinanceDashboardPage;
