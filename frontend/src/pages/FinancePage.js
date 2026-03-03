// Solar OS – EPC Edition — FinancePage.js  (Kanban + Table)
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown,
  CheckCircle, Clock, Zap, FileText, Plus, IndianRupee,
  LayoutGrid, List, Calendar, AlertCircle, Loader2,
} from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { financeApi } from '../lib/financeApi';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select } from '../components/ui/Input';
import { KPICard } from '../components/ui/KPICard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import DataTable from '../components/ui/DataTable';
import { CURRENCY, APP_CONFIG } from '../config/app.config';
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

  // Get permissions hook at component level
  const { can } = usePermissions();

  // Guard functions for permission checks
  const guardCreate = () => {
    if (!can('finance', 'create')) {
      toast.error('Permission denied: Cannot create invoices');
      return false;
    }
    return true;
  };

  const guardApprove = () => {
    if (!can('finance', 'approve')) {
      toast.error('Permission denied: Cannot approve payments');
      return false;
    }
    return true;
  };

  const guardDelete = () => {
    if (!can('finance', 'delete')) {
      toast.error('Permission denied: Cannot delete invoices');
      return false;
    }
    return true;
  };

  const guardUpdate = () => {
    if (!can('finance', 'update')) {
      toast.error('Permission denied: Cannot update invoices');
      return false;
    }
    return true;
  };

  const guardView = () => {
    if (!can('finance', 'view')) {
      toast.error('Permission denied: Cannot view invoices');
      return false;
    }
    return true;
  };

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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

    let mounted = true;
    (async () => {
      try {
        // Fetch project details from main projects endpoint
        const projectRes = await financeApi.getProject(newInvoice.projectId);
        if (!mounted) return;

        const projectStatus = projectRes?.status || projectRes?.data?.status || '';
        const customerName = projectRes?.customerName || projectRes?.data?.customerName || '';
        setProjectStatus(projectStatus);
        setNewInvoice(prev => ({ ...prev, customerName }));

        // If status is undefined or empty, disable payment terms
        if (!projectStatus) {
          setAllowedPaymentTerms([]);
          setCanCreateInvoice(false);
          console.error('Project status is undefined for project:', newInvoice.projectId);
          return;
        }

        // Define allowed payment terms based on project status
        const paymentTermsByStatus = {
          'Survey': [],
          'Design': ['Net 30', 'Net 60'],
          'Quotation': [],
          'Procurement': ['30% Advance'],
          'Installation': ['50% on Delivery'],
          'Commission': ['Net 30', 'Net 60'],
          'On Hold': [],
        };

        const allowedTerms = paymentTermsByStatus[projectStatus] || [];
        setAllowedPaymentTerms(allowedTerms);
        setCanCreateInvoice(allowedTerms.length > 0);

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

  const filteredInvoices = useMemo(() =>
    invoices.filter(inv =>
      (invStatus === 'All' || inv.status === invStatus) &&
      inv.customerName?.toLowerCase().includes(invSearch.toLowerCase())
    ), [invoices, invSearch, invStatus]);

  const paginatedInvoices = filteredInvoices.slice((page - 1) * pageSize, page * pageSize);

  const totalRevenue = invoices.reduce((a, i) => a + (i.amount || 0), 0);
  const totalCollected = invoices.reduce((a, i) => a + (i.paid || 0), 0);
  const totalBalance = invoices.reduce((a, i) => a + (i.balance || 0), 0);

  const INV_ACTIONS = [
    { label: 'View Invoice', icon: FileText, onClick: row => setSelected(row) },
    { label: 'Record Payment', icon: CheckCircle, onClick: (row) => { if (guardApprove()) console.log('Record Payment', row); } },
    { label: 'Send Reminder', icon: Clock, onClick: () => { } },
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
      <div className="page-header">
        <div>
          <h1 className="heading-page">Finance</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Revenue · receivables · payables · cash flow · invoices</p>
        </div>
        <CanCreate module="finance">
          <Button onClick={() => { if (guardCreate()) setShowInvoice(true); }}><Plus size={13} /> New Invoice</Button>
        </CanCreate>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard 
          label="Total Revenue" 
          value={fmt(revenueCurrent)} 
          sub="Total Invoiced" 
          icon={TrendingUp} 
          accentColor="#22c55e" 
          trend={`${invoices.length} invoices`} 
          trendUp 
        />
        <KPICard 
          label="Cash Position" 
          value={fmt(cashPosition)} 
          sub="Collected - Payables" 
          icon={IndianRupee} 
          accentColor="#3b82f6" 
          trend={`${Math.round((dashboardStats?.collectionRate || 0))}% collection rate`} 
          trendUp 
        />
        <KPICard 
          label="Receivables" 
          value={fmt(receivables)} 
          sub="Outstanding" 
          icon={Clock} 
          accentColor="#f59e0b" 
          trend={`${dashboardStats?.overdueCount || 0} overdue`} 
          trendUp={false} 
        />
        <KPICard 
          label="Payables" 
          value={fmt(payablesTotal)} 
          sub="Due to vendors" 
          icon={TrendingDown} 
          accentColor="#ef4444" 
          trend={`${payables.length} items`} 
          trendUp={false} 
        />
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
            <Button variant="ghost" onClick={() => { setShowInvoice(false); setError(null); }} disabled={submitting}>Cancel</Button>
            <Button onClick={handleCreateInvoice} disabled={submitting}>
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {submitting ? ' Creating...' : ' Create Invoice'}
            </Button>
          </div>
        }>
        <div className="space-y-3">
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
    </div>
  );
};

export default FinancePage;
