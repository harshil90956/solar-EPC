// Solar OS – EPC Edition — FinancePage.js  (Kanban + Table)
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown,
  CheckCircle, Clock, Zap, FileText, Plus, IndianRupee,
  LayoutGrid, List, Calendar, AlertCircle, RefreshCw,
} from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { financeApi } from '../lib/financeApi';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import DataTable from '../components/ui/DataTable';
import { CURRENCY, APP_CONFIG } from '../config/app.config';
import { useSettings } from '../context/SettingsContext';
import { usePermissions } from '../hooks/usePermissions';
import { useAuditLog } from '../hooks/useAuditLog';
import CanAccess, { CanCreate } from '../components/CanAccess';
import { toast } from '../components/ui/Toast';


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

  const [view, setView] = useState('kanban');
  const [invSearch, setInvSearch] = useState('');
  const [invStatus, setInvStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showInvoice, setShowInvoice] = useState(false);
  const [selected, setSelected] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [cashFlow, setCashFlow] = useState([]);
  const [payables, setPayables] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allowedPaymentTerms, setAllowedPaymentTerms] = useState([]);
  const [canCreateInvoice, setCanCreateInvoice] = useState(true);
  const [projectStatus, setProjectStatus] = useState('');
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
  const [savingEditInvoice, setSavingEditInvoice] = useState(false);

  // Delete confirmation modal state
  const [showDeleteInvoice, setShowDeleteInvoice] = useState(false);
  const [deleteInvoiceTarget, setDeleteInvoiceTarget] = useState(null);
  const [deletingInvoice, setDeletingInvoice] = useState(false);

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

  // Fetch data on mount
  useEffect(() => {
    if (!isActionEnabled('finance', 'view')) {
      setLoading(false);
      setError('This action is disabled from module settings.');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!isActionEnabled('finance', 'view')) {
      setLoading(false);
      setError('This action is disabled from module settings.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      
      const [invoicesRes, statsRes, revenueRes, cashFlowRes, payablesRes] = await Promise.all([
        financeApi.getInvoices(),
        financeApi.getDashboardStats(),
        financeApi.getMonthlyRevenue(6),
        financeApi.getCashFlow(6),
        financeApi.getPayablesSummary(),
      ]);
      
      setInvoices(invoicesRes || []);
      setDashboardStats(statsRes);
      setMonthlyRevenue(revenueRes || []);
      setCashFlow(cashFlowRes || []);
      setPayables(payablesRes?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  const canFinance = (actionId) => isActionEnabled('finance', actionId);

  const canEditInvoice = (inv) => canFinance('edit') && inv?.status !== 'Paid';
  const canDeleteInvoice = (inv) => canFinance('delete') && inv?.status !== 'Paid';

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

  const [invoices, setInvoices] = useState(INVOICES);
  const [showInvoice, setShowInvoice] = useState(false);
  const [selected, setSelected] = useState(null);
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

    return () => {
      mounted = false;
    };
  }, [showInvoice]);

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

  // Fetch project status and allowed payment terms when project is selected
  useEffect(() => {
    if (!newInvoice.projectId) {
      setAllowedPaymentTerms([]);
      setCanCreateInvoice(true);
      setProjectStatus('');
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
        console.log('Project API response:', projectRes);
        console.log('Extracted project status:', projectStatus);
        console.log('Extracted customer name:', customerName);
        if (!projectStatus) {
          console.error('Project status is empty/undefined. Full response:', projectRes);
        }
        setProjectStatus(projectStatus);
        setNewInvoice(prev => ({ ...prev, customerName }));

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
      }
    })();

    return () => {
      mounted = false;
    };
  }, [newInvoice.projectId]);

  const handleStageChange = async (id, newStage) => {
    try {
      await financeApi.updateInvoiceStatus(id, newStage);
      setInvoices(prev => prev.map(i => (i._id === id || i.id === id) ? { ...i, status: newStage } : i));
    } catch (err) {
      setError(err.message || 'Failed to update invoice status');
    }
  };

  const handleCreateInvoice = async () => {
    // Validation
    if (!newInvoice.invoiceNumber.trim()) {
      setError('Invoice Number is required');
      return;
    }
    if (!newInvoice.amount || parseFloat(newInvoice.amount) <= 0) {
      setError('Valid Invoice Amount is required');
      return;
    }
    if (!newInvoice.invoiceDate) {
      setError('Invoice Date is required');
      return;
    }
    if (!newInvoice.dueDate) {
      setError('Due Date is required');
      return;
    }
    if (!newInvoice.projectId) {
      setError('Project is required');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Format data for API - only send fields that are in CreateInvoiceDto
      const invoiceData = {
        invoiceNumber: newInvoice.invoiceNumber.trim(),
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
        setReminderSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to send reminder');
    } finally {
      setSendingReminder(false);
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

  const canShowSendReminder = (inv) => {
    const status = inv?.status;
    const outstanding =
      Number(inv?.balance ?? inv?.balanceDue ?? (Number(inv?.amount || 0) - Number(inv?.paid || 0)));
    return ['Pending', 'Partial', 'Overdue'].includes(status) && outstanding > 0;
  };

  // Filter data based on date range
  const filteredRevenueData = useMemo(() => {
    return MONTHLY_REVENUE.filter(item => {
      const itemDate = new Date(item.month + ' 01, ' + selectedYear);
      return itemDate >= new Date(dateRange.start) && itemDate <= new Date(dateRange.end);
    });
  }, [dateRange, selectedYear]);

  const filteredCashFlowData = useMemo(() => {
    return CASH_FLOW.filter(item => {
      const itemDate = new Date(item.month + ' 01, ' + selectedYear);
      return itemDate >= new Date(dateRange.start) && itemDate <= new Date(dateRange.end);
    });
  }, [dateRange, selectedYear]);
  const INV_ACTIONS = [
    ...(canFinance('view') ? [{ label: 'View Invoice', icon: FileText, onClick: row => setSelected(row) }] : []),
    ...(canFinance('edit') ? [{
      label: 'Edit',
      icon: Edit,
      show: (row) => row?.status !== 'Paid',
      onClick: (row) => openEditInvoice(row),
    }] : []),
    ...(canFinance('export') ? [{
      label: 'Export',
      icon: Download,
      onClick: (row) => exportInvoiceCsv(row),
    }] : []),
    { label: 'Record Payment', icon: CheckCircle, onClick: () => { } },
    { 
      label: 'Timeline', 
      icon: Clock, 
      onClick: (row) => {
        setTimelineInvoice(row);
        setShowTimeline(true);
        fetchTimeline(row._id || row.id);
      },
    },
    ...(canFinance('delete') ? [{
      label: 'Delete',
      icon: Trash2,
      show: (row) => row?.status !== 'Paid',
      onClick: (row) => openDeleteInvoice(row),
    }] : []),
    {
      label: 'Send Reminder',
      icon: Clock,
      show: (row) => canShowSendReminder(row),
      onClick: (row) => {
        setSelectedReminderInvoice(row);
        setReminderForm({
          reminderType: row.status === 'Overdue' ? 'Overdue' : 'Gentle',
          customerEmail: '',
          messageBody: '',
        });
        setReminderSuccess(false);
        setShowReminderModal(true);
      },
    },
  ];

  // Calculate KPI values from real data
  const revenueCurrent = dashboardStats?.totalRevenue || 0;
  const cashPosition = (dashboardStats?.totalCollected || 0) - (dashboardStats?.totalPayables || 0);
  const receivables = dashboardStats?.totalOutstanding || 0;
  const payablesTotal = payables.reduce((sum, p) => sum + (p.amount || 0), 0);

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
      <PageHeader
        title="Finance"
        subtitle="Revenue · receivables · payables · cash flow · invoices"
        actions={[
          { type: 'button', label: 'New Invoice', icon: Plus, variant: 'primary', onClick: () => { if (guardCreate()) setShowInvoice(true); } }
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total Revenue" value={fmt(KPI_STATS.revenue.current)} sub={`Target ${fmt(KPI_STATS.revenue.target)}`} icon={TrendingUp} accentColor="#22c55e" trend={`+${KPI_STATS.revenue.growth}% YoY`} trendUp />
        <KPICard label="Cash Position" value={fmt(KPI_STATS.cashPosition)} sub="Current balance" icon={IndianRupee} accentColor="#3b82f6" trend="+8% vs last mo" trendUp />
        <KPICard label="Receivables" value={fmt(KPI_STATS.receivables)} sub="Outstanding" icon={Clock} accentColor="#f59e0b" trend="+5% vs last mo" trendUp={false} />
        <KPICard label="Payables" value={fmt(KPI_STATS.payables)} sub="Due in 30 days" icon={TrendingDown} accentColor="#ef4444" trend="+3% vs last mo" trendUp={false} />
      </div>

      {/* Date Filters */}
      <div className="glass-card p-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">Date Range:</span>
            <Input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="h-7 text-xs w-32"
            />
            <span className="text-xs text-[var(--text-muted)]">to</span>
            <Input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="h-7 text-xs w-32"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Year:</span>
            <Select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="h-7 text-xs w-24"
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Month:</span>
            <Select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="h-7 text-xs w-28"
            >
              {[
                { value: 1, label: 'January' },
                { value: 2, label: 'February' },
                { value: 3, label: 'March' },
                { value: 4, label: 'April' },
                { value: 5, label: 'May' },
                { value: 6, label: 'June' },
                { value: 7, label: 'July' },
                { value: 8, label: 'August' },
                { value: 9, label: 'September' },
                { value: 10, label: 'October' },
                { value: 11, label: 'November' },
                { value: 12, label: 'December' },
              ].map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateRange({
                  start: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
                  end: format(new Date(), 'yyyy-MM-dd')
                });
                setSelectedYear(new Date().getFullYear());
                setSelectedMonth(new Date().getMonth() + 1);
              }}
            >
              <RefreshCw size={12} /> Reset
            </Button>
          </div>
        </div>
      </div>
      {/* AI Banner */}
      <div className="ai-banner">
        <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="text-[var(--accent-light)] font-semibold">AI Insight:</span>{' '}
          INV002 (Ramesh Joshi — ₹1.4L balance) due Mar 24. Recommend payment follow-up now. INV003 (Suresh Bhatt — ₹8.4L) at risk.
        </p>
      </div>

      {/* Charts — table view only */}
      {view === 'table' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-400" /> Revenue vs Cost (6M)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={filteredRevenueData} barSize={14} barGap={3}>
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
              <AreaChart data={filteredCashFlowData}>
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
      )
      }

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Invoiced', value: fmt(totalRevenue), color: 'text-[var(--text-primary)]' },
          { label: 'Collected', value: fmt(totalCollected), color: 'text-emerald-400' },
          { label: 'Outstanding', value: fmt(totalBalance), color: 'text-amber-400' },
          { label: 'Collection Rate', value: `${totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0}%`, color: 'text-cyan-400' },
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
                  className={`filter-chip ${invStatus === s ? 'filter-chip-active' : ''}`}>{s}</button>
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
                rowActions={INV_ACTIONS}
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
              payables.map(p => (
                <div key={p._id || p.expenseNumber} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-muted)]">
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{p.vendorName}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">Due: {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '—'} • {p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400">{fmt(p.amount)}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{p.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Invoice Modal */}
      <Modal open={showInvoice} onClose={() => { setShowInvoice(false); setError(null); }} title="Create Invoice"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowInvoice(false)}>Cancel</Button>
            <CanCreate module="finance">
              <Button onClick={() => { if (guardCreate()) { console.log('Create Invoice'); setShowInvoice(false); } }}><Plus size={13} /> Create Invoice</Button>
            </CanCreate>
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
                onChange={e => setNewInvoice({...newInvoice, invoiceNumber: e.target.value})}
                placeholder="INV-001" 
              />
            </FormField>
            <FormField label="Project">
              <Select
                value={newInvoice.projectId}
                onChange={e => setNewInvoice({ ...newInvoice, projectId: e.target.value })}
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>{p.name || p.customerName}</option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Invoice Amount (₹)">
              <Input 
                type="number" 
                value={newInvoice.amount}
                onChange={e => setNewInvoice({...newInvoice, amount: e.target.value})}
                placeholder="280000" 
              />
            </FormField>
            <FormField label="Invoice Date">
              <Input 
                type="date" 
                value={newInvoice.invoiceDate}
                onChange={e => setNewInvoice({...newInvoice, invoiceDate: e.target.value})}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Due Date">
              <Input 
                type="date" 
                value={newInvoice.dueDate}
                onChange={e => setNewInvoice({...newInvoice, dueDate: e.target.value})}
              />
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
              <CanAccess module="finance" action="approve">
                <Button onClick={() => { if (guardApprove()) console.log('Record Payment'); }}><CheckCircle size={13} /> Record Payment</Button>
              </CanAccess>
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

            <FormField label="Description (Optional)">
              <Input
                value={editInvoice.description}
                onChange={e => setEditInvoice({ ...editInvoice, description: e.target.value })}
                placeholder="Description"
                disabled={savingEditInvoice}
              />
            </FormField>
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
    </div>
  );
};

export default FinancePage;
