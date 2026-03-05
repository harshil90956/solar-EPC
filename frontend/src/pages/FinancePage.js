// Solar OS – EPC Edition — FinancePage.js  (Kanban + Table)

import React, { useState, useMemo, useRef, useEffect } from 'react';

import {

  DollarSign, TrendingUp, TrendingDown,

  CheckCircle, Clock, Zap, FileText, Plus, IndianRupee,
  LayoutGrid, List, Calendar, AlertCircle, RefreshCw,
  Edit, Download, Trash2, Loader2, X,
} from 'lucide-react';

import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

import { financeApi } from '../lib/financeApi';

import { api } from '../lib/apiClient';

import { StatusBadge } from '../components/ui/Badge';

import { Button } from '../components/ui/Button';

import { Modal } from '../components/ui/Modal';

import { Input, FormField, Select } from '../components/ui/Input';

import { toast } from '../components/ui/Toast';

import { KPICard } from '../components/ui/KPICard';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';

import DataTable from '../components/ui/DataTable';

import { CURRENCY, APP_CONFIG } from '../config/app.config';

import { useSettings } from '../context/SettingsContext';

import { usePermissions } from '../hooks/usePermissions';

import { format, subMonths } from 'date-fns';




const fmt = CURRENCY.format;



/* ── Invoice stage definitions ──────────────────────────────────────────────── */

const INV_STAGES = [

  { id: 'Draft', label: 'Draft', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },

  { id: 'Pending', label: 'Sent', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },

  { id: 'Partial', label: 'Partial', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },

  { id: 'Paid', label: 'Paid', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },

  { id: 'Overdue', label: 'Overdue', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },

];



/* ── Invoice card ────────────────────────────────────────────────────────────── */

const InvCard = ({ inv, onDragStart, onClick }) => {

  const balancePct = inv.amount > 0 ? Math.round((inv.paid / inv.amount) * 100) : 0;

  const isOverdue = inv.status === 'Overdue';

  const displayId = inv.invoiceNumber || inv.id;

  return (

    <div

      draggable

      onDragStart={() => onDragStart(inv._id || inv.id)}

      onClick={() => onClick(inv)}

      className={`glass-card p-3 cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all space-y-2 ${isOverdue ? 'border-red-500/40' : ''}`}

    >

      <div className="flex items-center justify-between gap-2">

        <span className="text-[10px] font-mono text-[var(--accent-light)]">{displayId}</span>

        <StatusBadge domain="invoice" value={inv.status} />

      </div>

      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{inv.customerName}</p>

      <div className="grid grid-cols-2 gap-1 text-[10px]">

        <div className="glass-card p-1.5 text-center">

          <p className="text-[var(--text-muted)]">Total</p>

          <p className="font-bold text-[var(--text-primary)]">{fmt(inv.amount)}</p>

        </div>

        <div className="glass-card p-1.5 text-center">

          <p className="text-[var(--text-muted)]">Balance</p>

          <p className={`font-bold ${inv.balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(inv.balance)}</p>

        </div>

      </div>

      <div>

        <div className="flex justify-between text-[9px] text-[var(--text-muted)] mb-0.5">

          <span>Collected</span><span>{balancePct}%</span>

        </div>

        <div className="h-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden">

          <div className={`h-full rounded-full ${balancePct === 100 ? 'bg-emerald-400' : 'bg-[var(--accent)]'}`}

            style={{ width: `${balancePct}%` }} />

        </div>

      </div>

      <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]">

        <Calendar size={9} /><span>Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</span>

        {isOverdue && <AlertCircle size={9} className="text-red-400 ml-auto" />}

      </div>

    </div>

  );

};



/* ── Kanban board ────────────────────────────────────────────────────────────── */

const InvKanbanBoard = ({ invoices, onStageChange, onCardClick }) => {

  const draggingId = useRef(null);

  const [dragOver, setDragOver] = useState(null);

  return (

    <div className="overflow-x-auto pb-3">

      <div className="flex gap-3 min-w-max">

        {INV_STAGES.map(stage => {

          const cards = invoices.filter(i => i.status === stage.id);

          const colAmt = cards.reduce((s, i) => s + i.amount, 0);

          return (

            <div key={stage.id}

              className={`flex flex-col w-60 rounded-xl border transition-colors ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}

              onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}

              onDragLeave={() => setDragOver(null)}

              onDrop={() => { if (draggingId.current) onStageChange(draggingId.current, stage.id); draggingId.current = null; setDragOver(null); }}

            >

              <div className="p-2.5 border-b border-[var(--border-base)] flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />

                  <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>

                </div>

                <div className="flex items-center gap-1.5">

                  {colAmt > 0 && <span className="text-[10px] text-[var(--text-muted)]">{fmt(colAmt)}</span>}

                  <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"

                    style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>

                </div>

              </div>

              <div className="flex flex-col gap-2 p-2 flex-1 min-h-[120px]">

                {cards.map(inv => (

                  <InvCard key={inv._id || inv.id} inv={inv}

                    onDragStart={id => { draggingId.current = id; }}

                    onClick={onCardClick}

                  />

                ))}

                {cards.length === 0 && (

                  <div className="flex-1 flex items-center justify-center">

                    <p className="text-[11px] text-[var(--text-faint)]">Drop here</p>

                  </div>

                )}

              </div>

            </div>

          );

        })}

      </div>

    </div>

  );

};



/* ── Table columns ──────────────────────────────────────────────────────────── */

const INVOICE_COLUMNS = [

  { key: 'invoiceNumber', header: 'Invoice #', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },

  { key: 'customerName', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },

  { key: 'amount', header: 'Invoice Amt', sortable: true, render: v => <span className="text-xs font-bold text-[var(--text-primary)]">{fmt(v)}</span> },

  { key: 'paid', header: 'Paid', render: v => <span className="text-xs text-emerald-400 font-bold">{fmt(v)}</span> },

  { key: 'balance', header: 'Balance', render: v => <span className={`text-xs font-bold ${v > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(v)}</span> },

  { key: 'status', header: 'Status', render: v => <StatusBadge domain="invoice" value={v} /> },

  { key: 'invoiceDate', header: 'Date', render: v => <span className="text-xs text-[var(--text-muted)]">{v ? new Date(v).toLocaleDateString() : '—'}</span> },

  { key: 'dueDate', header: 'Due Date', render: v => <span className="text-xs text-[var(--text-muted)]">{v ? new Date(v).toLocaleDateString() : '—'}</span> },

  { key: 'paidDate', header: 'Paid On', render: v => <span className="text-xs text-[var(--text-muted)]">{v ? new Date(v).toLocaleDateString() : '—'}</span> },

];



const CustomTooltip = ({ active, payload, label }) => {

  if (!active || !payload?.length) return null;

  return (

    <div className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg px-3 py-2 shadow-xl text-xs">

      <p className="text-[var(--text-muted)] mb-1">{label}</p>

      {payload.map((p, i) => <p key={i} style={{ color: p.color }} className="my-0.5">{p.name}: {fmt(p.value)}</p>)}

    </div>

  );

};



const INV_STATUS_FILTERS = ['All', 'Draft', 'Pending', 'Partial', 'Paid', 'Overdue'];



/* ══════════════════════════════════════════════════════════════════════════════

  PAGE

══════════════════════════════════════════════════════════════════════════════ */

const FinancePage = () => {
  const { isActionEnabled } = useSettings();
  const { can } = usePermissions();

  const [view, setView] = useState('kanban');

  const [invSearch, setInvSearch] = useState('');

  const [invStatus, setInvStatus] = useState('All');

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showInvoice, setShowInvoice] = useState(false);

  const [selected, setSelected] = useState(null);

  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const [invoices, setInvoices] = useState([]);

  const [payments, setPayments] = useState([]);

  const [dashboardStats, setDashboardStats] = useState(null);

  const [monthlyRevenue, setMonthlyRevenue] = useState([]);

  const [cashFlow, setCashFlow] = useState([]);

  const [payables, setPayables] = useState([]);

  const [projects, setProjects] = useState([]);

  const [allowedPaymentTerms, setAllowedPaymentTerms] = useState([]);

  const [canCreateInvoice, setCanCreateInvoice] = useState(true);

  const [projectStatus, setProjectStatus] = useState('');

  const [selectedProjectContractValue, setSelectedProjectContractValue] = useState(null);

  const latestProjectIdRef = useRef('');



  // Reminder modal state

  const [showReminderModal, setShowReminderModal] = useState(false);

  const [selectedReminderInvoice, setSelectedReminderInvoice] = useState(null);

  const [reminderForm, setReminderForm] = useState({

    reminderType: 'Gentle',

    customerEmail: '',

    messageBody: '',

  });

  const [sendingReminder, setSendingReminder] = useState(false);

  const [reminderSuccess, setReminderSuccess] = useState(false);



  // Timeline drawer state

  const [showTimeline, setShowTimeline] = useState(false);

  const [timelineInvoice, setTimelineInvoice] = useState(null);

  const [timelineData, setTimelineData] = useState([]);

  const [loadingTimeline, setLoadingTimeline] = useState(false);



  // Edit invoice modal state

  const [showEditInvoice, setShowEditInvoice] = useState(false);

  const [editInvoiceTarget, setEditInvoiceTarget] = useState(null);

  const [editInvoice, setEditInvoice] = useState({

    invoiceNumber: '',

    customerName: '',

    amount: '',

    invoiceDate: '',

    dueDate: '',

    paymentTerms: '',

    description: '',

  });

  const [newInvoiceErrors, setNewInvoiceErrors] = useState({});

  const [savingEditInvoice, setSavingEditInvoice] = useState(false);



  // Delete confirmation modal state

  const [showDeleteInvoice, setShowDeleteInvoice] = useState(false);

  const [deleteInvoiceTarget, setDeleteInvoiceTarget] = useState(null);

  const [deletingInvoice, setDeletingInvoice] = useState(false);



  // Assign invoice modal state

  const [showAssignInvoice, setShowAssignInvoice] = useState(false);

  const [assignInvoiceTarget, setAssignInvoiceTarget] = useState(null);

  const [assignToUser, setAssignToUser] = useState('');



  // Form state for new invoice

  const [newInvoice, setNewInvoice] = useState({

    invoiceNumber: '',

    projectId: '',

    customerName: '',

    amount: '',

    invoiceDate: '',

    dueDate: '',

    paymentTerms: '',

    description: '',

  });



  // Record Payment modal state

  const [showRecordPayment, setShowRecordPayment] = useState(false);

  const [recordPayment, setRecordPayment] = useState({

    paymentType: 'Customer Payment',

    referenceType: 'Invoice',

    referenceId: '',

    amount: '',

    maxAmount: 0,

    paymentDate: new Date().toISOString().slice(0, 10),

    paymentMethod: 'Bank Transfer',

    notes: '',

  });

  const [recordPaymentErrors, setRecordPaymentErrors] = useState({});

  const [submittingPayment, setSubmittingPayment] = useState(false);



  // Fetch data on mount

  useEffect(() => {

    fetchData();

  }, []);



  const fetchData = async () => {

    try {

      if (!canViewFinance) {

        setLoading(false);

        setError('This action is disabled from module settings.');

        return;

      }

      setLoading(true);

      setError(null);

      

      const [
        invoicesRes,
        paymentsRes,
        vendorExpensesRes,
        statsRes,
        vendorsRes,
        posRes,
      ] = await Promise.all([

        financeApi.getInvoices(),

        financeApi.getPayments(),

        financeApi.getExpenses(undefined, 'Vendor Payment'),

        financeApi.getDashboardStats(),

        api.get('/procurement/vendors'),

        api.get('/procurement/purchase-orders'),

      ]);

      

      setInvoices(invoicesRes || []);

      const payments = paymentsRes || [];

      setPayments(payments);

      const vendorExpenses = vendorExpensesRes || [];

      setDashboardStats(statsRes);

      // Vendor Payables (from Procurement Purchase Orders)
      const vendors = Array.isArray(vendorsRes)
        ? vendorsRes
        : (vendorsRes?.data || []);
      const purchaseOrders = Array.isArray(posRes)
        ? posRes
        : (posRes?.data || []);

      const safeDate = (d) => {
        if (!d) return null;
        if (d instanceof Date) {
          return Number.isNaN(d.getTime()) ? null : d;
        }
        if (typeof d === 'string') {
          const m = d.trim().match(/^([0-3]\d)[-\/](0\d|1[0-2])[-\/](\d{4})$/);
          if (m) {
            const day = Number(m[1]);
            const month = Number(m[2]);
            const year = Number(m[3]);
            const dt = new Date(year, month - 1, day);
            return Number.isNaN(dt.getTime()) ? null : dt;
          }
        }
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
        const inflow = (payments || []).reduce((sum, p) => {
          const dt = paymentDate(p);
          if (!dt || dt < m.start || dt >= m.end) return sum;
          return sum + Number(p?.amount || p?.amountPaid || 0);
        }, 0);

        const outflow = (vendorExpenses || []).reduce((sum, exp) => {
          if (String(exp?.status || '').toLowerCase() !== 'paid') return sum;
          const dt = expensePaidAt(exp);
          if (!dt || dt < m.start || dt >= m.end) return sum;
          return sum + Number(exp?.amount || exp?.paidAmount || 0);
        }, 0);

        return { month: m.month, inflow, outflow };
      });

      setMonthlyRevenue(revenueCostSeries);

      setCashFlow(cashFlowSeries);

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

      setError(err.message || 'Failed to load finance data');

    } finally {

      setLoading(false);

    }

  };

  const guardCreate = () => {
    if (!can('finance', 'create')) {
      toast.error('Permission denied: Cannot create invoices');
      return false;
    }
    return true;
  };

  const guardApprove = () => {
    if (!can('finance', 'approve')) {
      toast.error('Permission denied: Cannot approve/record payments');
      return false;
    }
    return true;
  };

  const canFinance = (actionId) => isActionEnabled('finance', actionId);

  const canViewFinance = canFinance('view');

  const financePermissions = {
    edit: canFinance('edit'),
    delete: canFinance('delete'),
    export: canFinance('export'),
    assign: canFinance('assign'),
  };

  const canEditInvoice = (inv) => canFinance('edit') && inv?.status !== 'Paid';

  const canDeleteInvoice = (inv) => canFinance('delete') && inv?.status !== 'Paid';

  const canAssignInvoice = (inv) => canFinance('assign') && ['Draft', 'Pending', 'Partial', 'Overdue'].includes(inv?.status);



  const toDateInputValue = (d) => {

    if (!d) return '';

    const dt = new Date(d);

    if (Number.isNaN(dt.getTime())) return '';

    return dt.toISOString().slice(0, 10);

  };



  const openEditInvoice = (row) => {

    if (!canEditInvoice(row)) return;

    setEditInvoiceTarget(row);

    setEditInvoice({

      invoiceNumber: row?.invoiceNumber || '',

      customerName: row?.customerName || '',

      amount: String(row?.amount ?? ''),

      invoiceDate: toDateInputValue(row?.invoiceDate),

      dueDate: toDateInputValue(row?.dueDate),

      paymentTerms: row?.paymentTerms || '',

      description: row?.description || '',

    });

    setError(null);

    setShowEditInvoice(true);

  };



  const handleSaveEditInvoice = async () => {

    if (!editInvoiceTarget) return;

    if (!editInvoice.invoiceNumber.trim()) {

      setError('Invoice Number is required');

      return;

    }

    if (!editInvoice.customerName.trim()) {

      setError('Customer Name is required');

      return;

    }

    if (!editInvoice.amount || parseFloat(editInvoice.amount) <= 0) {

      setError('Valid Invoice Amount is required');

      return;

    }

    if (!editInvoice.invoiceDate) {

      setError('Invoice Date is required');

      return;

    }

    if (!editInvoice.dueDate) {

      setError('Due Date is required');

      return;

    }



    const invoiceId = editInvoiceTarget?._id || editInvoiceTarget?.id;

    if (!invoiceId) return;



    try {

      setSavingEditInvoice(true);

      setError(null);



      const dto = {

        invoiceNumber: editInvoice.invoiceNumber.trim(),

        customerName: editInvoice.customerName.trim(),

        amount: parseFloat(editInvoice.amount),

        invoiceDate: editInvoice.invoiceDate,

        dueDate: editInvoice.dueDate,

        ...(editInvoice.paymentTerms ? { paymentTerms: editInvoice.paymentTerms } : {}),

        ...(editInvoice.description ? { description: editInvoice.description } : {}),

      };



      await financeApi.updateInvoice(invoiceId, dto);

      setShowEditInvoice(false);

      setEditInvoiceTarget(null);

      await fetchData();

    } catch (err) {

      setError(err.message || 'Failed to update invoice');

    } finally {

      setSavingEditInvoice(false);

    }

  };



  const openDeleteInvoice = (row) => {

    if (!canDeleteInvoice(row)) return;

    setDeleteInvoiceTarget(row);

    setError(null);

    setShowDeleteInvoice(true);

  };



  const openAssignInvoice = (row) => {

    if (!canAssignInvoice(row)) return;

    setAssignInvoiceTarget(row);

    setAssignToUser('');

    setError(null);

    setShowAssignInvoice(true);

  };



  const handleSaveAssignInvoice = async () => {

    if (!assignInvoiceTarget) return;

    if (!assignToUser) {

      setError('Please select a user.');

      return;

    }

    setError('Assign is not available for invoices yet.');

    setShowAssignInvoice(false);

    setAssignInvoiceTarget(null);

    setAssignToUser('');

  };



  const handleConfirmDeleteInvoice = async () => {

    if (!deleteInvoiceTarget) return;

    const invoiceId = deleteInvoiceTarget?._id || deleteInvoiceTarget?.id;

    if (!invoiceId) return;



    try {

      setDeletingInvoice(true);

      setError(null);

      await financeApi.deleteInvoice(invoiceId);

      setShowDeleteInvoice(false);

      setDeleteInvoiceTarget(null);

      await fetchData();

    } catch (err) {

      setError(err.message || 'Failed to delete invoice');

    } finally {

      setDeletingInvoice(false);

    }

  };

  // Generate next invoice number based on existing invoices
  const getNextInvoiceNumber = () => {
    const prefix = 'INV-';
    const numbers = invoices
      .map(inv => inv.invoiceNumber)
      .filter(num => num && num.startsWith(prefix))
      .map(num => {
        const match = num.match(/INV-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
  };



  const exportAllInvoicesCsv = () => {

    if (!canFinance('export')) return;

    const safe = (v) => {

      const s = v == null ? '' : String(v);

      const needsQuotes = /[\n\r,"]/g.test(s);

      const escaped = s.replace(/"/g, '""');

      return needsQuotes ? `"${escaped}"` : escaped;

    };

    const header = [

      'Invoice #',

      'Customer',

      'Amount',

      'Paid',

      'Balance',

      'Status',

      'Invoice Date',

      'Due Date',

      'Paid On',

    ].map(safe).join(',');

    const rows = (invoices || []).map((row) => {

      const cols = [

        row?.invoiceNumber || row?.id || '',

        row?.customerName || '',

        row?.amount ?? '',

        row?.paid ?? '',

        row?.balance ?? '',

        row?.status || '',

        row?.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString() : '',

        row?.dueDate ? new Date(row.dueDate).toLocaleDateString() : '',

        row?.paidDate ? new Date(row.paidDate).toLocaleDateString() : '',

      ];

      return cols.map(safe).join(',');

    });

    const csv = [header, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download = `invoices.csv`;

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(url);

  };



  useEffect(() => {

    if (!showInvoice) return;

    let mounted = true;

    (async () => {

      try {

        const [customersRes, projectsRes] = await Promise.all([

          financeApi.getCustomers(),

          financeApi.getProjects ? financeApi.getProjects() : Promise.resolve([]),

        ]);

        if (!mounted) return;

        setCustomers(Array.isArray(customersRes) ? customersRes : []);

        setProjects(Array.isArray(projectsRes) ? projectsRes : []);

      } catch {

        if (!mounted) return;

        setCustomers([]);

        setProjects([]);

      }

    })();



    // Pre-fill invoice number when modal opens

    setNewInvoice(prev => ({

      ...prev,

      invoiceNumber: getNextInvoiceNumber(),

    }));



    return () => {

      mounted = false;

    };

  }, [showInvoice]);



  // Fetch project status and allowed payment terms when project is selected

  useEffect(() => {

    if (!newInvoice.projectId) {

      setAllowedPaymentTerms([]);

      setCanCreateInvoice(true);

      setProjectStatus('');

      setSelectedProjectContractValue(null);

      return;

    }



    // Reset state immediately to avoid showing stale terms/status from previous project

    latestProjectIdRef.current = newInvoice.projectId;

    setProjectStatus('');

    setAllowedPaymentTerms([]);

    setCanCreateInvoice(false);

    setNewInvoice((prev) => ({ ...prev, paymentTerms: '' }));



    let mounted = true;

    (async () => {

      try {

        const requestedProjectId = newInvoice.projectId;



        // Fetch project details from main projects endpoint

        const projectRes = await financeApi.getProject(requestedProjectId);

        if (!mounted) return;

        if (latestProjectIdRef.current !== requestedProjectId) return;



        const projectStatus = projectRes?.status || projectRes?.data?.status || projectRes?.project?.status || '';

        const customerName = projectRes?.customerName || projectRes?.data?.customerName || projectRes?.project?.customerName || '';

        // Get contract value from projects list (already loaded)
        const selectedProject = projects.find(p => (p._id || p.id) === requestedProjectId);
        const contractValueFromList = selectedProject?.value ?? selectedProject?.contractValue ?? selectedProject?.contractAmount;
        const contractValueRaw =
          contractValueFromList ??
          projectRes?.value ??
          projectRes?.data?.value ??
          projectRes?.project?.value ??
          projectRes?.contractValue ??
          projectRes?.data?.contractValue ??
          projectRes?.project?.contractValue ??
          projectRes?.contractAmount ??
          projectRes?.data?.contractAmount ??
          projectRes?.project?.contractAmount;
        const contractValue = Number(contractValueRaw);

        if (!projectStatus) {

          console.error('Project status is empty/undefined. Full response:', projectRes);

        }

        setProjectStatus(projectStatus);

        setNewInvoice(prev => ({ ...prev, customerName }));

        if (!Number.isNaN(contractValue) && contractValue > 0) {
          setSelectedProjectContractValue(contractValue);
          setNewInvoice(prev => ({ ...prev, amount: String(contractValue) }));
          setNewInvoiceErrors(prev => ({ ...prev, amount: undefined }));
        } else {
          setSelectedProjectContractValue(null);
        }



        // If status is undefined or empty, disable payment terms

        if (!projectStatus) {

          setAllowedPaymentTerms([]);

          setCanCreateInvoice(false);

          console.error('Project status is undefined for project:', newInvoice.projectId);

          return;

        }



        // Fetch allowed payment terms from backend API

        console.log('Fetching allowed terms for status:', projectStatus);

        const termsRes = await financeApi.getAllowedPaymentTerms(projectStatus);

        console.log('Allowed terms response:', termsRes);

        if (!mounted) return;

        if (latestProjectIdRef.current !== requestedProjectId) return;



        const allowedTerms = termsRes?.allowedTerms || [];

        setAllowedPaymentTerms(allowedTerms);

        setCanCreateInvoice(termsRes?.canCreateInvoice || allowedTerms.length > 0);



        // Clear payment term if not in allowed list

        if (!allowedTerms.includes(newInvoice.paymentTerms)) {

          setNewInvoice(prev => ({ ...prev, paymentTerms: '' }));

        }

      } catch (err) {

        console.error('Failed to fetch project status:', err);

        if (!mounted) return;

        setAllowedPaymentTerms([]);

        setCanCreateInvoice(false);

        setProjectStatus('');

        setSelectedProjectContractValue(null);

      }

    })();



    return () => {

      mounted = false;

    };

  }, [newInvoice.projectId]);



  const handleStageChange = async (id, newStage) => {

    const existing = (invoices || []).find(i => String(i._id || i.id) === String(id));
    const previousStatus = existing?.status;

    if (previousStatus && previousStatus !== newStage) {
      const order = {
        Draft: 0,
        Pending: 1,
        Partial: 2,
        Paid: 3,
        Overdue: 4,
      };

      const isBackward = order[newStage] < order[previousStatus];
      if (isBackward) {
        toast.error('Invoice status cannot be moved backward.');
        return;
      }

      const allowedTransitions = new Set([
        'Draft->Pending',
        'Pending->Partial',
        'Partial->Paid',
        'Pending->Overdue',
        'Partial->Overdue',
      ]);

      const key = `${previousStatus}->${newStage}`;
      if (!allowedTransitions.has(key)) {
        toast.error('Invalid invoice status transition');
        return;
      }
    }

    try {

      await financeApi.updateInvoiceStatus(id, newStage);

      setInvoices(prev => prev.map(i => (i._id === id || i.id === id) ? { ...i, status: newStage } : i));

    } catch (err) {

      setError(err.message || 'Failed to update invoice status');

    }

  };



  const handleCreateInvoice = async () => {

    // Validation

    const nextErrors = {};
    if (!newInvoice.invoiceNumber.trim()) nextErrors.invoiceNumber = 'Invoice Number is required';
    if (!newInvoice.projectId) nextErrors.projectId = 'Project is required';
    if (!newInvoice.amount || parseFloat(newInvoice.amount) <= 0) nextErrors.amount = 'Valid Invoice Amount is required';
    if (!newInvoice.invoiceDate) nextErrors.invoiceDate = 'Invoice Date is required';
    if (!newInvoice.dueDate) nextErrors.dueDate = 'Due Date is required';

    if (
      newInvoice.projectId &&
      selectedProjectContractValue !== null &&
      !Number.isNaN(Number(newInvoice.amount)) &&
      Number(newInvoice.amount) > Number(selectedProjectContractValue)
    ) {
      nextErrors.amount = 'Invoice amount cannot exceed the project contract value';
    }

    if (newInvoice.invoiceDate && newInvoice.dueDate && String(newInvoice.dueDate) < String(newInvoice.invoiceDate)) {
      nextErrors.dueDate = 'Due Date must be on/after Invoice Date';
    }

    if (Object.keys(nextErrors).length > 0) {
      setNewInvoiceErrors(nextErrors);
      return;
    }

    const invoiceNumberTrimmed = newInvoice.invoiceNumber.trim();

    const invoiceNumberExists = (invoices || []).some(

      (inv) => String(inv?.invoiceNumber || '').trim().toLowerCase() === invoiceNumberTrimmed.toLowerCase()

    );

    if (invoiceNumberExists) {

      setNewInvoiceErrors(prev => ({ ...prev, invoiceNumber: 'Invoice Number already exists' }));

      return;

    }

    

    try {

      setSubmitting(true);

      setError(null);

      setNewInvoiceErrors({});

      

      // Format data for API - only send fields that are in CreateInvoiceDto

      const invoiceData = {

        invoiceNumber: invoiceNumberTrimmed,

        projectId: newInvoice.projectId || undefined,

        projectStatus: projectStatus || undefined,

        customerName: newInvoice.customerName.trim(),

        amount: parseFloat(newInvoice.amount),

        invoiceDate: newInvoice.invoiceDate,

        dueDate: newInvoice.dueDate,

        ...(newInvoice.paymentTerms && { paymentTerms: newInvoice.paymentTerms }),

        ...(newInvoice.description && { description: newInvoice.description }),

      };

      await financeApi.createInvoice(invoiceData);

      

      setShowInvoice(false);

      setNewInvoice({

        invoiceNumber: getNextInvoiceNumber(),

        projectId: '',

        customerName: '',

        amount: '',

        invoiceDate: '',

        dueDate: '',

        paymentTerms: '',

        description: '',

      });

      setNewInvoiceErrors({});

      // Reset allowed payment terms and project status

      setAllowedPaymentTerms([]);

      setCanCreateInvoice(true);

      setProjectStatus('');

      

      // Refresh data to show new invoice

      await fetchData();

    } catch (err) {

      setError(err.message || 'Failed to create invoice');

    } finally {

      setSubmitting(false);

    }

  };



  const handleSendReminder = async () => {

    if (!selectedReminderInvoice) return;



    // Validation

    if (!reminderForm.customerEmail.trim()) {

      setError('Customer email is required');

      return;

    }



    try {

      setSendingReminder(true);

      setError(null);



      await financeApi.sendInvoiceReminder(selectedReminderInvoice._id || selectedReminderInvoice.id, {

        reminderType: reminderForm.reminderType,

        customerEmail: reminderForm.customerEmail.trim(),

        messageBody: reminderForm.messageBody,

      });



      setReminderSuccess(true);

      

      // Close modal after 2 seconds

      setTimeout(() => {

        setShowReminderModal(false);

        setSelectedReminderInvoice(null);

        setReminderForm({ reminderType: 'Gentle', customerEmail: '', messageBody: '' });

              }, 2000);

            } catch (err) {

              setError(err.message || 'Failed to send reminder');

            } finally {

              setSendingReminder(false);

            }

          };



  const clampAmount = (val, max) => {
    const num = Number(val);
    if (Number.isNaN(num) || num <= 0) return '';
    if (typeof max === 'number' && max > 0) return String(Math.min(num, max));
    return String(num);
  };



  const handleRecordPayment = async () => {

    // Validation

    const nextErrors = {};

    if (!recordPayment.referenceId) nextErrors.referenceId = recordPayment.paymentType === 'Customer Payment' ? 'Invoice is required' : 'Vendor is required';

    const maxAmount = Number(recordPayment.maxAmount || 0);
    const amountNum = Number(recordPayment.amount);
    if (!recordPayment.amount || Number.isNaN(amountNum) || amountNum <= 0) nextErrors.amount = 'Valid amount greater than 0 is required';
    if (maxAmount > 0 && amountNum > maxAmount) nextErrors.amount = `Amount cannot exceed ₹${maxAmount}`;
    if (!recordPayment.paymentDate) nextErrors.paymentDate = 'Payment date is required';
    if (!recordPayment.paymentMethod) nextErrors.paymentMethod = 'Payment method is required';

    if (Object.keys(nextErrors).length > 0) {

      setRecordPaymentErrors(nextErrors);

      return;

    }



    try {

      setSubmittingPayment(true);

      setError(null);

      setRecordPaymentErrors({});



      const paymentData = {
        paymentType: recordPayment.paymentType,
        referenceType: recordPayment.referenceType,
        referenceId: recordPayment.referenceId,
        amount: parseFloat(recordPayment.amount),
        paymentDate: recordPayment.paymentDate,
        paymentMethod: recordPayment.paymentMethod,
        notes: recordPayment.notes?.trim() || undefined,
      };

      await financeApi.initiateFinancePayment(paymentData);

      setShowRecordPayment(false);

      setRecordPayment({
        paymentType: 'Customer Payment',
        referenceType: 'Invoice',
        referenceId: '',
        amount: '',
        maxAmount: 0,
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentMethod: 'Bank Transfer',
        notes: '',
      });

      // Refresh data
      await fetchData();



    } catch (err) {

      setError(err.message || 'Failed to record payment');

    } finally {

      setSubmittingPayment(false);

    }

  };



  const fetchTimeline = async (invoiceId) => {

    try {

      setLoadingTimeline(true);

      const data = await financeApi.getInvoiceTimeline(invoiceId);

      setTimelineData(Array.isArray(data) ? data : []);

    } catch (err) {

      console.error('Failed to fetch timeline:', err);

      setTimelineData([]);

    } finally {

      setLoadingTimeline(false);

    }

  };



  const filteredInvoices = useMemo(() =>

    invoices.filter(inv =>

      (invStatus === 'All' || inv.status === invStatus) &&

      inv.customerName?.toLowerCase().includes(invSearch.toLowerCase())

    ), [invoices, invSearch, invStatus]);



  const paginatedInvoices = filteredInvoices.slice((page - 1) * pageSize, page * pageSize);



  const totalRevenue = invoices.reduce((a, i) => a + (i.amount || 0), 0);

  const totalCollected = invoices.reduce((a, i) => a + (i.paid || 0), 0);

  const totalBalance = invoices.reduce((a, i) => a + (i.balance || 0), 0);

  const safeDateForSummary = (d) => {
    if (!d) return null;
    if (d instanceof Date) {
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof d === 'string') {
      const m = d.trim().match(/^([0-3]\d)[-\/](0\d|1[0-2])[-\/](\d{4})$/);
      if (m) {
        const day = Number(m[1]);
        const month = Number(m[2]);
        const year = Number(m[3]);
        const dt = new Date(year, month - 1, day);
        return Number.isNaN(dt.getTime()) ? null : dt;
      }
    }
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  // Filter data based on date range
  const filteredRevenueData = useMemo(() => {
    return (monthlyRevenue || []).filter(item => {
      const itemDate = new Date(item.month + ' 01, ' + selectedYear);
      return itemDate >= new Date(dateRange.start) && itemDate <= new Date(dateRange.end);
    });
  }, [dateRange, selectedYear]);

  const filteredCashFlowData = useMemo(() => {
    return (cashFlow || []).filter(item => {
      const itemDate = new Date(item.month + ' 01, ' + selectedYear);
      return itemDate >= new Date(dateRange.start) && itemDate <= new Date(dateRange.end);
    });
  }, [dateRange, selectedYear]);

  const exportInvoiceCsv = (row) => {
    const r = row || {};
    const headers = ['Invoice Number', 'Customer', 'Status', 'Amount', 'Paid', 'Balance', 'Invoice Date', 'Due Date'];
    const values = [
      r.invoiceNumber || r.id || '',
      r.customerName || '',
      r.status || '',
      r.amount ?? '',
      r.paid ?? '',
      r.balance ?? '',
      r.invoiceDate || '',
      r.dueDate || '',
    ];
    const csv = `${headers.join(',')}\n${values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${r.invoiceNumber || r.id || 'export'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const INV_ACTIONS = [

    { label: 'View Invoice', icon: FileText, onClick: row => setSelected(row) },

    ...(canFinance('edit') ? [

      {

        label: 'Edit',

        icon: Edit,

        show: (row) => row?.status !== 'Paid',

        onClick: (row) => openEditInvoice(row),

      },

    ] : []),

    ...(canFinance('export') ? [

      {

        label: 'Export',

        icon: Download,

        onClick: (row) => exportInvoiceCsv(row),

      },

    ] : []),

    ...(canFinance('assign') ? [

      {

        label: 'Assign',

        icon: Zap,

        show: (row) => ['Draft', 'Pending', 'Partial', 'Overdue'].includes(row?.status),

        onClick: (row) => openAssignInvoice(row),

      },

    ] : []),

    ...(canFinance('delete') ? [

      {

        label: 'Delete',

        icon: Trash2,

        danger: true,

        show: (row) => row?.status !== 'Paid',

        onClick: (row) => openDeleteInvoice(row),

      },

    ] : []),

    { label: 'Record Payment', icon: CheckCircle, onClick: () => { } },

    { label: 'Send Reminder', icon: Clock, onClick: () => { } },

  ];

  const filteredRowActions = INV_ACTIONS.filter(action => {

    switch (action.label) {

      case 'Edit':

        return !!financePermissions?.edit;

      case 'Delete':

        return !!financePermissions?.delete;

      case 'Export':

        return !!financePermissions?.export;

      case 'Assign':

        return !!financePermissions?.assign;

      default:

        return true;

    }

  });



  // Calculate KPI values from real data

  const revenueCurrent = dashboardStats?.totalRevenue || 0;

  const cashPosition = (dashboardStats?.totalCollected || 0) - (dashboardStats?.totalPayables || 0);

  const receivables = dashboardStats?.totalOutstanding || 0;

  const payablesTotal = payables.reduce((sum, p) => sum + (p.outstandingAmount || 0), 0);

  const isInCurrentMonth = (dt) => {
    if (!dt) return false;
    const now = new Date();
    return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
  };

  const safeDate = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const currentMonthInvoiced = (invoices || []).reduce((sum, inv) => {
    const dt = safeDate(inv?.invoiceDate) || safeDate(inv?.createdAt);
    if (!isInCurrentMonth(dt)) return sum;
    return sum + Number(inv?.amount || inv?.invoiceAmount || 0);
  }, 0);

  const currentMonthCollected = (payments || []).reduce((sum, p) => {
    const dt = safeDate(p?.paymentDate) || safeDate(p?.createdAt);
    if (!isInCurrentMonth(dt)) return sum;
    return sum + Number(p?.amount || p?.amountPaid || 0);
  }, 0);

  const currentMonthOutstanding = Math.max(0, currentMonthInvoiced - currentMonthCollected);

  const currentMonthCollectionRate = currentMonthInvoiced > 0
    ? Math.round((currentMonthCollected / currentMonthInvoiced) * 100)
    : 0;



  if (!canViewFinance) {

    return (

      <div className="animate-fade-in flex items-center justify-center h-96">

        <div className="glass-card p-6 text-center max-w-md">

          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Error Loading Data</h3>

          <p className="text-sm text-[var(--text-muted)] mb-4">This action is disabled from module settings.</p>

        </div>

      </div>

    );

  }



  if (loading) {

    return (

      <div className="animate-fade-in flex items-center justify-center h-96">

        <div className="flex flex-col items-center gap-3">

          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />

          <p className="text-sm text-[var(--text-muted)]">Loading finance data...</p>

        </div>

      </div>

    );

  }



  if (error) {

    return (

      <div className="animate-fade-in flex items-center justify-center h-96">

        <div className="glass-card p-6 text-center max-w-md">

          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />

          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Error Loading Data</h3>

          <p className="text-sm text-[var(--text-muted)] mb-4">{error}</p>

          <Button onClick={fetchData}><Plus size={13} /> Retry</Button>

        </div>

      </div>

    );

  }



  return (

    <div className="animate-fade-in space-y-5">

      <div className="page-header">

        <div>

          <h1 className="heading-page">Finance</h1>

          <p className="text-xs text-[var(--text-muted)] mt-0.5">Revenue · receivables · payables · cash flow · invoices</p>

        </div>

        <div className="flex items-center gap-2">

          <Button variant="outline" onClick={() => setShowRecordPayment(true)}><IndianRupee size={13} /> Record Payment</Button>

          {financePermissions?.create && (

            <Button onClick={() => setShowInvoice(true)}><Plus size={13} /> New Invoice</Button>

          )}

        </div>

      </div>



      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total Revenue" value={fmt(revenueCurrent)} sub="From invoices" icon={TrendingUp} accentColor="#22c55e" />
        <KPICard label="Cash Position" value={fmt(cashPosition)} sub="Collected - Payables" icon={IndianRupee} accentColor="#3b82f6" />
        <KPICard label="Receivables" value={fmt(receivables)} sub="Outstanding" icon={Clock} accentColor="#f59e0b" />
        <KPICard label="Payables" value={fmt(payablesTotal)} sub="Due" icon={TrendingDown} accentColor="#ef4444" />
      </div>



      {/* Charts — table view only */}

      {view === 'table' && (

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <div className="glass-card p-4">

            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">

              <TrendingUp size={14} className="text-emerald-400" /> Revenue vs Cost (6M)

            </h3>

            <ResponsiveContainer width="100%" height={200}>

              <BarChart data={monthlyRevenue} barSize={14} barGap={3}>

                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />

                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />

                <YAxis tickFormatter={v => `${(v / 100000).toFixed(0)}L`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />

                <Tooltip content={<CustomTooltip />} />

                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />

                <Bar dataKey="revenue" fill="#22c55e" radius={[3, 3, 0, 0]} name="Revenue" />

                <Bar dataKey="cost" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Cost" />

              </BarChart>

            </ResponsiveContainer>

          </div>

          <div className="glass-card p-4">

            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">

              <DollarSign size={14} className="text-cyan-400" /> Cash Flow Trend (6M)

            </h3>

            <ResponsiveContainer width="100%" height={200}>

              <AreaChart data={cashFlow}>

                <defs>

                  <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">

                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />

                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />

                  </linearGradient>

                  <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">

                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />

                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />

                  </linearGradient>

                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />

                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />

                <YAxis tickFormatter={v => `${(v / 100000).toFixed(0)}L`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />

                <Tooltip content={<CustomTooltip />} />

                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />

                <Area type="monotone" dataKey="inflow" stroke="#06b6d4" fill="url(#inflowGrad)" strokeWidth={2} name="Inflow" />

                <Area type="monotone" dataKey="outflow" stroke="#f59e0b" fill="url(#outflowGrad)" strokeWidth={2} name="Outflow" />

              </AreaChart>

            </ResponsiveContainer>

          </div>

        </div>

      )}



      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {[

          { label: 'Total Invoiced', value: fmt(currentMonthInvoiced), color: 'text-[var(--text-primary)]' },

          { label: 'Collected', value: fmt(currentMonthCollected), color: 'text-emerald-400' },

          { label: 'Outstanding', value: fmt(currentMonthOutstanding), color: 'text-amber-400' },

          { label: 'Collection Rate', value: `${currentMonthCollectionRate}%`, color: 'text-cyan-400' },

        ].map(stat => (

          <div key={stat.label} className="glass-card p-3 text-center">

            <p className="text-[11px] text-[var(--text-muted)] mb-1">{stat.label}</p>

            <p className={`text-base font-black ${stat.color}`}>{stat.value}</p>

          </div>

        ))}

      </div>



      <Tabs defaultValue="invoices">

        <TabsList>

          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>

          <TabsTrigger value="payables">Payables Summary</TabsTrigger>

        </TabsList>



        <TabsContent value="invoices">

          <div className="space-y-3">

            <div className="flex flex-wrap gap-2 items-center">

              <span className="text-xs text-[var(--text-muted)] mr-1">Status:</span>

              {INV_STATUS_FILTERS.map(s => (

                <button key={s} onClick={() => { setInvStatus(s); setPage(1); }}

                  className={`filter-chip ${invStatus === s ? 'filter-chip-active' : ''}`}>{s === 'Pending' ? 'Sent' : s}</button>

              ))}

              <div className="flex items-center gap-2 ml-auto">

                <Input placeholder="Search invoices..." value={invSearch}

                  onChange={e => { setInvSearch(e.target.value); setPage(1); }}

                  className="h-8 text-xs w-44" />

                <div className="view-toggle-pill">

                  <button onClick={() => setView('kanban')}

                    className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`}

                    title="Kanban view"><LayoutGrid size={13} /></button>

                  <button onClick={() => setView('table')}

                    className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`}

                    title="Table view"><List size={13} /></button>

                </div>

              </div>

            </div>



            {view === 'kanban' ? (

              <InvKanbanBoard invoices={filteredInvoices} onStageChange={handleStageChange} onCardClick={setSelected} />

            ) : (

              <DataTable

                columns={INVOICE_COLUMNS}

                data={paginatedInvoices}

                total={filteredInvoices.length}

                page={page}

                pageSize={pageSize}

                onPageChange={setPage}

                onPageSizeChange={s => { setPageSize(s); setPage(1); }}

                toolbar={canFinance('export') ? (

                  <Button size="sm" onClick={exportAllInvoicesCsv}>

                    <Download size={12} /> Export

                  </Button>

                ) : null}

                rowActions={filteredRowActions}

                rowKey="_id"

                emptyText="No invoices found."

              />

            )}

          </div>

        </TabsContent>



        <TabsContent value="payables">

          <div className="glass-card p-4 space-y-3">

            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Payables to Vendors</h3>

            {payables.length === 0 ? (

              <p className="text-sm text-[var(--text-muted)] text-center py-8">No pending payables</p>

            ) : (

              <div className="space-y-2">

                <div className="grid grid-cols-7 gap-2 text-[11px] text-[var(--text-muted)] px-2">
                  <div>Vendor</div>
                  <div>Vendor ID</div>
                  <div className="text-right">Total POs</div>
                  <div className="text-right">Total Payable</div>
                  <div className="text-right">Paid</div>
                  <div className="text-right">Outstanding</div>
                  <div className="text-right">Last PO</div>
                </div>

                {payables.map((p) => (
                  <div
                    key={p.vendorObjectId || p.vendorId}
                    className="grid grid-cols-7 gap-2 items-center p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-muted)]"
                  >
                    <div className="text-xs font-semibold text-[var(--text-primary)]">{p.vendorName}</div>
                    <div className="text-xs font-mono text-[var(--accent-light)]">{p.vendorId}</div>
                    <div className="text-xs text-right text-[var(--text-primary)]">{p.totalPurchaseOrders}</div>
                    <div className="text-xs text-right text-[var(--text-primary)]">{fmt(p.totalPayableAmount)}</div>
                    <div className="text-xs text-right text-[var(--text-primary)]">{fmt(p.amountPaid)}</div>
                    <div className="text-xs text-right font-bold text-amber-400">{fmt(p.outstandingAmount)}</div>
                    <div className="text-xs text-right text-[var(--text-muted)]">{p.lastPurchaseOrderDate || '—'}</div>
                  </div>
                ))}

              </div>

            )}

          </div>

        </TabsContent>

      </Tabs>



      {/* New Invoice Modal */}

      <Modal open={showInvoice} onClose={() => { setShowInvoice(false); setError(null); setNewInvoiceErrors({}); }} title="Create Invoice"

        footer={

          <div className="flex gap-2 justify-end">

            <Button variant="ghost" onClick={() => { setShowInvoice(false); setError(null); setNewInvoiceErrors({}); }} disabled={submitting}>Cancel</Button>

            <Button onClick={handleCreateInvoice} disabled={submitting}>

              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}

              {submitting ? ' Creating...' : ' Create Invoice'}

            </Button>

          </div>

        }>

        <div className="space-y-3 pb-20">

          {error && (

            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">

              {error}

            </div>

          )}

          {!canCreateInvoice && newInvoice.projectId && (

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">

              Invoice cannot be generated at this project stage ({projectStatus}).

            </div>

          )}

          <div className="grid grid-cols-2 gap-3">

            <FormField label="Invoice Number">

              <Input 

                value={newInvoice.invoiceNumber}

                onChange={e => {
                  const v = e.target.value;
                  setNewInvoice({ ...newInvoice, invoiceNumber: v });
                  if (newInvoiceErrors.invoiceNumber) setNewInvoiceErrors(prev => ({ ...prev, invoiceNumber: undefined }));
                }}

                placeholder="INV-001" 

              />

              {newInvoiceErrors.invoiceNumber ? (
                <div className="text-[11px] text-red-400 mt-1">{newInvoiceErrors.invoiceNumber}</div>
              ) : null}

            </FormField>

            <FormField label="Project">

              <Select

                value={newInvoice.projectId}

                onChange={e => {
                  const v = e.target.value;
                  setNewInvoice({ ...newInvoice, projectId: v });
                  if (newInvoiceErrors.projectId) setNewInvoiceErrors(prev => ({ ...prev, projectId: undefined }));
                }}

              >

                <option value="">Select Project</option>

                {projects.map((p) => (

                  <option key={p._id || p.id} value={p._id || p.id}>{p.name || p.customerName}</option>

                ))}

              </Select>

              {newInvoiceErrors.projectId ? (
                <div className="text-[11px] text-red-400 mt-1">{newInvoiceErrors.projectId}</div>
              ) : null}

            </FormField>

          </div>

          <div className="grid grid-cols-2 gap-3">

            <FormField label="Invoice Amount (₹)">

              <Input 

                type="number" 

                value={newInvoice.amount}

                onChange={e => {
                  const v = e.target.value;
                  setNewInvoice({ ...newInvoice, amount: v });
                  const num = Number(v);
                  if (
                    newInvoice.projectId &&
                    selectedProjectContractValue !== null &&
                    !Number.isNaN(num) &&
                    num > Number(selectedProjectContractValue)
                  ) {
                    setNewInvoiceErrors(prev => ({ ...prev, amount: 'Invoice amount cannot exceed the project contract value' }));
                  } else if (newInvoiceErrors.amount) {
                    setNewInvoiceErrors(prev => ({ ...prev, amount: undefined }));
                  }
                }}

                placeholder="280000" 

              />

              {newInvoiceErrors.amount ? (
                <div className="text-[11px] text-red-400 mt-1">{newInvoiceErrors.amount}</div>
              ) : null}

            </FormField>

            <FormField label="Invoice Date">

              <Input 

                type="date" 

                value={newInvoice.invoiceDate}

                onChange={e => {
                  const v = e.target.value;
                  setNewInvoice({ ...newInvoice, invoiceDate: v });
                  if (newInvoiceErrors.invoiceDate) setNewInvoiceErrors(prev => ({ ...prev, invoiceDate: undefined }));
                }}

              />

              {newInvoiceErrors.invoiceDate ? (
                <div className="text-[11px] text-red-400 mt-1">{newInvoiceErrors.invoiceDate}</div>
              ) : null}

            </FormField>

          </div>

          <div className="grid grid-cols-2 gap-3">

            <FormField label="Due Date">

              <Input 

                type="date" 

                value={newInvoice.dueDate}

                min={newInvoice.invoiceDate || undefined}

                onChange={e => {
                  const v = e.target.value;
                  setNewInvoice({ ...newInvoice, dueDate: v });
                  if (newInvoiceErrors.dueDate) setNewInvoiceErrors(prev => ({ ...prev, dueDate: undefined }));
                }}

              />

              {newInvoiceErrors.dueDate ? (
                <div className="text-[11px] text-red-400 mt-1">{newInvoiceErrors.dueDate}</div>
              ) : null}

            </FormField>

            <FormField label="Payment Terms">

              <Select 

                value={newInvoice.paymentTerms}

                onChange={e => setNewInvoice({...newInvoice, paymentTerms: e.target.value})}

                disabled={!canCreateInvoice || allowedPaymentTerms.length === 0}

              >

                <option value="">

                  {!canCreateInvoice ? 'Not Available' : allowedPaymentTerms.length === 0 ? 'Select Project First' : 'Select Terms'}

                </option>

                {(allowedPaymentTerms.length > 0 ? allowedPaymentTerms : []).map((term) => (

                  <option key={term} value={term}>{term}</option>

                ))}

              </Select>

            </FormField>

          </div>

        </div>

      </Modal>



      {/* Invoice Detail Modal */}

      {selected && (

        <Modal open={!!selected} onClose={() => setSelected(null)} title={`Invoice — ${selected.invoiceNumber || selected.id}`}

          footer={

            <div className="flex gap-2 justify-end">

              <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>

              <Button><CheckCircle size={13} /> Record Payment</Button>

            </div>

          }>

          <div className="grid grid-cols-2 gap-3 text-xs">

            {[

              ['Invoice #', selected.invoiceNumber || selected.id],

              ['Customer', selected.customerName],

              ['Invoice Amt', fmt(selected.amount)],

              ['Amount Paid', fmt(selected.paid || 0)],

              ['Balance Due', fmt(selected.balance || 0)],

              ['Status', <StatusBadge domain="invoice" value={selected.status} />],

              ['Invoice Date', selected.invoiceDate ? new Date(selected.invoiceDate).toLocaleDateString() : '—'],

              ['Due Date', selected.dueDate ? new Date(selected.dueDate).toLocaleDateString() : '—'],

              ['Paid On', selected.paidDate ? new Date(selected.paidDate).toLocaleDateString() : '—'],

            ].map(([k, v]) => (

              <div key={k} className="glass-card p-2">

                <div className="text-[var(--text-muted)] mb-0.5">{k}</div>

                <div className="font-semibold text-[var(--text-primary)]">{v}</div>

              </div>

            ))}

          </div>

        </Modal>

      )}



      {/* Edit Invoice Modal */}

      {showEditInvoice && editInvoiceTarget && (

        <Modal

          open={showEditInvoice}

          onClose={() => {

            if (savingEditInvoice) return;

            setShowEditInvoice(false);

            setEditInvoiceTarget(null);

            setError(null);

          }}

          title={`Edit Invoice — ${editInvoiceTarget.invoiceNumber || editInvoiceTarget.id}`}

          footer={

            <div className="flex gap-2 justify-end">

              <Button

                variant="ghost"

                onClick={() => {

                  if (savingEditInvoice) return;

                  setShowEditInvoice(false);

                  setEditInvoiceTarget(null);

                  setError(null);

                }}

                disabled={savingEditInvoice}

              >

                Cancel

              </Button>

              <Button onClick={handleSaveEditInvoice} disabled={savingEditInvoice}>

                {savingEditInvoice ? <Loader2 size={13} className="animate-spin" /> : <Edit size={13} />}

                {savingEditInvoice ? ' Saving...' : ' Save Changes'}

              </Button>

            </div>

          }

        >

          <div className="space-y-3 pb-20">

            {error && (

              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">

                {error}

              </div>

            )}



            <div className="grid grid-cols-2 gap-3">

              <FormField label="Invoice Number">

                <Input

                  value={editInvoice.invoiceNumber}

                  onChange={e => setEditInvoice({ ...editInvoice, invoiceNumber: e.target.value })}

                  placeholder="INV-001"

                  disabled={savingEditInvoice}

                />

              </FormField>

              <FormField label="Customer Name">

                <Input

                  value={editInvoice.customerName}

                  onChange={e => setEditInvoice({ ...editInvoice, customerName: e.target.value })}

                  placeholder="Customer"

                  disabled={savingEditInvoice}

                />

              </FormField>

            </div>



            <div className="grid grid-cols-2 gap-3">

              <FormField label="Invoice Amount (₹)">

                <Input

                  type="number"

                  value={editInvoice.amount}

                  onChange={e => setEditInvoice({ ...editInvoice, amount: e.target.value })}

                  placeholder="280000"

                  disabled={savingEditInvoice}

                />

              </FormField>

              <FormField label="Invoice Date">

                <Input

                  type="date"

                  value={editInvoice.invoiceDate}

                  onChange={e => setEditInvoice({ ...editInvoice, invoiceDate: e.target.value })}

                  disabled={savingEditInvoice}

                />

              </FormField>

            </div>



            <div className="grid grid-cols-2 gap-3">

              <FormField label="Due Date">

                <Input

                  type="date"

                  value={editInvoice.dueDate}

                  onChange={e => setEditInvoice({ ...editInvoice, dueDate: e.target.value })}

                  disabled={savingEditInvoice}

                />

              </FormField>

              <FormField label="Payment Terms">

                <Input

                  value={editInvoice.paymentTerms}

                  onChange={e => setEditInvoice({ ...editInvoice, paymentTerms: e.target.value })}

                  placeholder="Net 30"

                  disabled={savingEditInvoice}

                />

              </FormField>

            </div>

          </div>

        </Modal>

      )}



      {/* Delete Invoice Confirmation Modal */}

      {showDeleteInvoice && deleteInvoiceTarget && (

        <Modal

          open={showDeleteInvoice}

          onClose={() => {

            if (deletingInvoice) return;

            setShowDeleteInvoice(false);

            setDeleteInvoiceTarget(null);

            setError(null);

          }}

          title="Delete Invoice"

          footer={

            <div className="flex gap-2 justify-end">

              <Button

                variant="ghost"

                onClick={() => {

                  if (deletingInvoice) return;

                  setShowDeleteInvoice(false);

                  setDeleteInvoiceTarget(null);

                  setError(null);

                }}

                disabled={deletingInvoice}

              >

                Cancel

              </Button>

              <Button onClick={handleConfirmDeleteInvoice} disabled={deletingInvoice}>

                {deletingInvoice ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}

                {deletingInvoice ? ' Deleting...' : ' Delete'}

              </Button>

            </div>

          }

        >

          <div className="space-y-3">

            {error && (

              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">

                {error}

              </div>

            )}

            <div className="glass-card p-3">

              <p className="text-sm text-[var(--text-primary)] font-semibold">Are you sure you want to delete this invoice?</p>

              <p className="text-xs text-[var(--text-muted)] mt-1">{deleteInvoiceTarget.invoiceNumber || deleteInvoiceTarget.id} • {deleteInvoiceTarget.customerName}</p>

              <p className="text-xs text-[var(--text-muted)] mt-2">This cannot be undone.</p>

            </div>

          </div>

        </Modal>

      )}



      {/* Assign Invoice Modal */}

      {showAssignInvoice && assignInvoiceTarget && (

        <Modal

          open={showAssignInvoice}

          onClose={() => {

            setShowAssignInvoice(false);

            setAssignInvoiceTarget(null);

            setAssignToUser('');

          }}

          title={`Assign Invoice — ${assignInvoiceTarget.invoiceNumber || assignInvoiceTarget.id}`}

          footer={

            <div className="flex gap-2 justify-end">

              <Button

                variant="ghost"

                onClick={() => {

                  setShowAssignInvoice(false);

                  setAssignInvoiceTarget(null);

                  setAssignToUser('');

                }}

              >

                Cancel

              </Button>

              <Button onClick={handleSaveAssignInvoice}>

                Save

              </Button>

            </div>

          }

        >

          <div className="space-y-3 pb-8">

            {error && (

              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">

                {error}

              </div>

            )}

            <FormField label="Assign To">

              <Select value={assignToUser} onChange={(e) => setAssignToUser(e.target.value)}>

                <option value="">Select user</option>

              </Select>

            </FormField>

          </div>

        </Modal>

      )}



      {/* Send Reminder Modal */}

      {showReminderModal && selectedReminderInvoice && (

        <Modal 

          open={showReminderModal} 

          onClose={() => { 

            setShowReminderModal(false); 

            setSelectedReminderInvoice(null);

            setReminderForm({ reminderType: 'Gentle', customerEmail: '', messageBody: '' });

            setReminderSuccess(false);

            setError(null);

          }} 

          title={`Send Reminder — ${selectedReminderInvoice.invoiceNumber || selectedReminderInvoice.id}`}

          footer={

            <div className="flex gap-2 justify-end">

              <Button 

                variant="ghost" 

                onClick={() => { 

                  setShowReminderModal(false); 

                  setSelectedReminderInvoice(null);

                  setReminderForm({ reminderType: 'Gentle', customerEmail: '', messageBody: '' });

                  setReminderSuccess(false);

                  setError(null);

                }} 

                disabled={sendingReminder}

              >

                Cancel

              </Button>

              <Button 

                onClick={handleSendReminder} 

                disabled={sendingReminder || reminderSuccess}

              >

                {sendingReminder ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />}

                {sendingReminder ? ' Sending...' : reminderSuccess ? ' Sent!' : ' Send Reminder'}

              </Button>

            </div>

          }

        >

          <div className="space-y-4">

            {error && (

              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">

                {error}

              </div>

            )}

            {reminderSuccess && (

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">

                Reminder sent successfully.

              </div>

            )}

            

            {/* Invoice Info */}

            <div className="grid grid-cols-2 gap-3 text-xs">

              <div className="glass-card p-2">

                <div className="text-[var(--text-muted)] mb-0.5">Invoice #</div>

                <div className="font-semibold text-[var(--text-primary)]">{selectedReminderInvoice.invoiceNumber || selectedReminderInvoice.id}</div>

              </div>

              <div className="glass-card p-2">

                <div className="text-[var(--text-muted)] mb-0.5">Customer</div>

                <div className="font-semibold text-[var(--text-primary)]">{selectedReminderInvoice.customerName}</div>

              </div>

              <div className="glass-card p-2">

                <div className="text-[var(--text-muted)] mb-0.5">Due Amount</div>

                <div className="font-semibold text-red-400">{fmt(selectedReminderInvoice.balance || 0)}</div>

              </div>

              <div className="glass-card p-2">

                <div className="text-[var(--text-muted)] mb-0.5">Due Date</div>

                <div className="font-semibold text-[var(--text-primary)]">{selectedReminderInvoice.dueDate ? new Date(selectedReminderInvoice.dueDate).toLocaleDateString() : '—'}</div>

              </div>

            </div>



            {/* Reminder Type */}

            <FormField label="Reminder Type">

              <Select 

                value={reminderForm.reminderType}

                onChange={e => setReminderForm({...reminderForm, reminderType: e.target.value})}

                disabled={sendingReminder || reminderSuccess}

              >

                <option value="Gentle">Gentle Reminder</option>

                <option value="Due Today">Due Today</option>

                <option value="Overdue">Overdue</option>

              </Select>

            </FormField>



            {/* Customer Email */}

            <FormField label="Customer Email">

              <Input 

                type="email"

                value={reminderForm.customerEmail}

                onChange={e => setReminderForm({...reminderForm, customerEmail: e.target.value})}

                placeholder="customer@example.com"

                disabled={sendingReminder || reminderSuccess}

              />

            </FormField>



            {/* Message Body */}

            <FormField label="Message (Optional)">

              <textarea

                value={reminderForm.messageBody}

                onChange={e => setReminderForm({...reminderForm, messageBody: e.target.value})}

                placeholder="Enter custom message or leave blank for default template..."

                disabled={sendingReminder || reminderSuccess}

                className="w-full h-32 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--border-active)] transition-all duration-150 text-xs px-3 py-2 resize-none"

              />

            </FormField>

          </div>

        </Modal>

      )}



      {/* Timeline Drawer */}

      {showTimeline && timelineInvoice && (

        <div className="fixed inset-0 z-50 flex justify-end">

          <div 

            className="absolute inset-0 bg-black/50" 

            onClick={() => { setShowTimeline(false); setTimelineInvoice(null); setTimelineData([]); }}

          />

          <div className="relative w-full max-w-md bg-[var(--bg-surface)] border-l border-[var(--border-base)] h-full overflow-y-auto animate-slide-in-right">

            <div className="p-4 border-b border-[var(--border-base)] flex items-center justify-between">

              <div>

                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Invoice Timeline</h3>

                <p className="text-xs text-[var(--text-muted)]">{timelineInvoice.invoiceNumber || timelineInvoice.id}</p>

              </div>

              <button 

                onClick={() => { setShowTimeline(false); setTimelineInvoice(null); setTimelineData([]); }}

                className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"

              >

                <X size={16} />

              </button>

            </div>



            <div className="p-4 space-y-4">

              {loadingTimeline ? (

                <div className="flex items-center justify-center py-8">

                  <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />

                </div>

              ) : timelineData.length === 0 ? (

                <div className="text-center py-8">

                  <Clock className="w-12 h-12 text-[var(--text-faint)] mx-auto mb-3" />

                  <p className="text-sm text-[var(--text-muted)]">No timeline activity found.</p>

                </div>

              ) : (

                <div className="space-y-4">

                  {timelineData.map((activity, index) => (

                    <div key={activity.id} className="flex gap-3">

                      <div className="flex flex-col items-center">

                        <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-base)] flex items-center justify-center">

                          {activity.action === 'INVOICE_CREATED' && <FileText size={14} className="text-blue-400" />}

                          {activity.action === 'INVOICE_UPDATED' && <Edit size={14} className="text-amber-400" />}

                          {activity.action === 'STATUS_CHANGED' && <RefreshCw size={14} className="text-purple-400" />}

                          {activity.action === 'PAYMENT_ADDED' && <CheckCircle size={14} className="text-emerald-400" />}

                          {activity.action === 'REMINDER_SENT' && <Clock size={14} className="text-orange-400" />}

                        </div>

                        {index < timelineData.length - 1 && (

                          <div className="w-px flex-1 bg-[var(--border-base)] my-2" />

                        )}

                      </div>

                      <div className="flex-1 pb-4">

                        <div className="glass-card p-3">

                          <div className="flex items-center justify-between mb-2">

                            <span className="text-xs font-semibold text-[var(--text-primary)]">

                              {activity.action.replace(/_/g, ' ')}

                            </span>

                            <span className="text-[10px] text-[var(--text-muted)]">

                              {new Date(activity.createdAt).toLocaleDateString('en-IN', { 

                                day: '2-digit', 

                                month: 'short', 

                                year: 'numeric',

                                hour: '2-digit',

                                minute: '2-digit'

                              })}

                            </span>

                          </div>

                          

                          {activity.metadata && (

                            <div className="space-y-1 text-xs text-[var(--text-muted)]">

                              {activity.action === 'PAYMENT_ADDED' && (

                                <p>{fmt(activity.metadata.paymentAmount || 0)} received via {activity.metadata.paymentMethod}</p>

                              )}

                              {activity.action === 'STATUS_CHANGED' && (

                                <p>{activity.metadata.previousStatus} → {activity.metadata.newStatus}</p>

                              )}

                              {activity.action === 'REMINDER_SENT' && (

                                <p>Reminder sent to {activity.metadata.sentTo}</p>

                              )}

                              {activity.action === 'INVOICE_CREATED' && (

                                <p>Amount: {fmt(activity.metadata.amount || 0)} for {activity.metadata.customerName}</p>

                              )}

                            </div>

                          )}

                          

                          {activity.performedBy && (

                            <p className="text-[10px] text-[var(--text-faint)] mt-2">

                              By: {activity.performedBy.name || 'Unknown'}

                            </p>

                          )}

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              )}

            </div>

          </div>

        </div>

      )}



      {/* Record Payment Modal */}

      <Modal 

        open={showRecordPayment} 

        onClose={() => { 

          if (submittingPayment) return;

          setShowRecordPayment(false); 

          setError(null);

          setRecordPaymentErrors({});

        }}

        title="Record Payment"

        footer={

          <div className="flex gap-2 justify-end">

            <Button 

              variant="ghost" 

              onClick={() => { 

                if (submittingPayment) return;

                setShowRecordPayment(false); 

                setError(null);

                setRecordPaymentErrors({});

              }}

              disabled={submittingPayment}

            >

              Cancel

            </Button>

            <Button 

              onClick={handleRecordPayment}

              disabled={submittingPayment}

            >

              {submittingPayment ? <Loader2 size={13} className="animate-spin" /> : <IndianRupee size={13} />}

              {submittingPayment ? ' Recording...' : ' Record Payment'}

            </Button>

          </div>

        }

      >

        <div className="space-y-4 pb-4">

          {error && (

            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">

              {error}

            </div>

          )}



          <div className="grid grid-cols-2 gap-3">

            <FormField label="Payment Type">

              <Select

                value={recordPayment.paymentType}

                onChange={e => {

                  const newType = e.target.value;

                  setRecordPayment({ 

                    ...recordPayment, 

                    paymentType: newType,

                    referenceType: newType === 'Customer Payment' ? 'Invoice' : 'Vendor',

                    referenceId: '',

                    customerName: '',

                    invoiceNumber: '',

                    vendorName: '',

                    amount: '',

                    maxAmount: 0,

                  });

                  if (recordPaymentErrors.referenceId) setRecordPaymentErrors(prev => ({ ...prev, referenceId: undefined }));

                }}

                disabled={submittingPayment}

              >

                <option value="Customer Payment">Customer Payment</option>

                <option value="Vendor Payment">Vendor Payment</option>

              </Select>

            </FormField>



            <FormField label="Reference Type">

              <Select

                value={recordPayment.referenceType}

                onChange={e => {

                  setRecordPayment({ ...recordPayment, referenceType: e.target.value, referenceId: '', customerName: '', invoiceNumber: '', vendorName: '', amount: '', maxAmount: 0 });

                  if (recordPaymentErrors.referenceId) setRecordPaymentErrors(prev => ({ ...prev, referenceId: undefined }));

                }}

                disabled={submittingPayment}

              >

                {recordPayment.paymentType === 'Customer Payment' ? (

                  <option value="Invoice">Invoice</option>

                ) : (

                  <option value="Vendor">Vendor</option>

                )}

              </Select>

            </FormField>

          </div>



          <FormField label={recordPayment.paymentType === 'Customer Payment' ? 'Select Invoice' : 'Select Vendor'}>

            <Select

              value={recordPayment.referenceId}

              onChange={e => {

                const nextId = e.target.value;

                if (!nextId) {
                  setRecordPayment({ ...recordPayment, referenceId: '', customerName: '', invoiceNumber: '', vendorName: '', amount: '', maxAmount: 0 });
                  if (recordPaymentErrors.referenceId) setRecordPaymentErrors(prev => ({ ...prev, referenceId: undefined }));
                  return;
                }

                if (recordPayment.paymentType === 'Customer Payment') {
                  const inv = (invoices || []).find(i => String(i._id || i.id) === String(nextId));
                  const outstanding = Number(inv?.balance ?? inv?.balanceDue ?? (Number(inv?.amount || 0) - Number(inv?.paid || 0)));
                  const max = Math.max(0, outstanding || 0);
                  setRecordPayment({
                    ...recordPayment,
                    referenceId: nextId,
                    customerName: inv?.customerName || '',
                    invoiceNumber: inv?.invoiceNumber || '',
                    vendorName: '',
                    maxAmount: max,
                    amount: max > 0 ? String(max) : '',
                  });
                } else {
                  const v = (payables || []).find(p => String(p.vendorObjectId || p.vendorId) === String(nextId));
                  const max = Math.max(0, Number(v?.outstandingAmount || 0));
                  setRecordPayment({
                    ...recordPayment,
                    referenceId: nextId,
                    vendorName: v?.vendorName || '',
                    customerName: '',
                    invoiceNumber: '',
                    maxAmount: max,
                    amount: max > 0 ? String(max) : '',
                  });
                }

                if (recordPaymentErrors.referenceId) setRecordPaymentErrors(prev => ({ ...prev, referenceId: undefined }));

              }}

              disabled={submittingPayment}

            >

              <option value="">{recordPayment.paymentType === 'Customer Payment' ? 'Select Invoice' : 'Select Vendor'}</option>

              {recordPayment.paymentType === 'Customer Payment' 

                ? invoices.map(inv => (

                    <option key={inv._id || inv.id} value={inv._id || inv.id}>

                      {inv.invoiceNumber} - {inv.customerName} (₹{inv.amount})

                    </option>

                  ))

                : payables.map(p => (

                    <option key={p.vendorObjectId || p.vendorId} value={p.vendorObjectId || p.vendorId}>

                      {p.vendorName} (Outstanding: ₹{p.outstandingAmount})

                    </option>

                  ))

              }

            </Select>

            {recordPaymentErrors.referenceId && (

              <div className="text-[11px] text-red-400 mt-1">{recordPaymentErrors.referenceId}</div>

            )}

          </FormField>



          <div className="grid grid-cols-2 gap-3">

            <FormField label="Amount (₹)">

              <Input 

                type="number"

                value={recordPayment.amount}

                onChange={e => {

                  const v = clampAmount(e.target.value, Number(recordPayment.maxAmount || 0));
                  setRecordPayment({ ...recordPayment, amount: v });

                  if (recordPaymentErrors.amount) setRecordPaymentErrors(prev => ({ ...prev, amount: undefined }));

                }}

                placeholder="Enter amount"

                max={recordPayment.maxAmount || undefined}

                disabled={submittingPayment}

              />

              {recordPaymentErrors.amount && (

                <div className="text-[11px] text-red-400 mt-1">{recordPaymentErrors.amount}</div>

              )}

            </FormField>



            <FormField label="Payment Date">

              <Input 

                type="date"

                value={recordPayment.paymentDate}

                onChange={e => {

                  setRecordPayment({ ...recordPayment, paymentDate: e.target.value });

                  if (recordPaymentErrors.paymentDate) setRecordPaymentErrors(prev => ({ ...prev, paymentDate: undefined }));

                }}

                disabled={submittingPayment}

              />

              {recordPaymentErrors.paymentDate && (

                <div className="text-[11px] text-red-400 mt-1">{recordPaymentErrors.paymentDate}</div>

              )}

            </FormField>

          </div>



          <FormField label="Payment Method">

            <Select

              value={recordPayment.paymentMethod}

              onChange={e => {

                setRecordPayment({ ...recordPayment, paymentMethod: e.target.value });

                if (recordPaymentErrors.paymentMethod) setRecordPaymentErrors(prev => ({ ...prev, paymentMethod: undefined }));

              }}

              disabled={submittingPayment}

            >

              <option value="Cash">Cash</option>

              <option value="Bank Transfer">Bank Transfer</option>

              <option value="UPI">UPI</option>

              <option value="Cheque">Cheque</option>

              <option value="Other">Other</option>

            </Select>

            {recordPaymentErrors.paymentMethod && (

              <div className="text-[11px] text-red-400 mt-1">{recordPaymentErrors.paymentMethod}</div>

            )}

          </FormField>



          <FormField label="Notes (Optional)">

            <textarea

              value={recordPayment.notes}

              onChange={e => setRecordPayment({ ...recordPayment, notes: e.target.value })}

              placeholder="Enter any additional notes..."

              disabled={submittingPayment}

              className="w-full h-24 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--border-active)] transition-all duration-150 text-xs px-3 py-2 resize-none"

            />

          </FormField>

        </div>

      </Modal>

    </div>

  );

};



export default FinancePage;

