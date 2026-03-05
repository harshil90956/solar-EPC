// Solar OS – EPC Edition — FinancePage.js  (Kanban + Table)
import React, { useState, useMemo, useRef } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown,
  CheckCircle, Clock, Zap, FileText, Plus, IndianRupee,
  LayoutGrid, List, Calendar, AlertCircle, RefreshCw,
} from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { INVOICES, KPI_STATS, CASH_FLOW, MONTHLY_REVENUE } from '../data/mockData';
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
import { usePermissions } from '../hooks/usePermissions';
import { useAuditLog } from '../hooks/useAuditLog';
import CanAccess, { CanCreate, CanEdit, CanDelete } from '../components/CanAccess';
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
  return (
    <div
      draggable
      onDragStart={() => onDragStart(inv.id)}
      onClick={() => onClick(inv)}
      className={`glass-card p-3 cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all space-y-2 ${isOverdue ? 'border-red-500/40' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-[var(--accent-light)]">{inv.id}</span>
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
        <Calendar size={9} /><span>Due: {inv.dueDate}</span>
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
                  <InvCard key={inv.id} inv={inv}
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
  { key: 'id', header: 'Invoice #', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
  { key: 'customerName', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
  { key: 'amount', header: 'Invoice Amt', sortable: true, render: v => <span className="text-xs font-bold text-[var(--text-primary)]">{fmt(v)}</span> },
  { key: 'paid', header: 'Paid', render: v => <span className="text-xs text-emerald-400 font-bold">{fmt(v)}</span> },
  { key: 'balance', header: 'Balance', render: v => <span className={`text-xs font-bold ${v > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(v)}</span> },
  { key: 'status', header: 'Status', render: v => <StatusBadge domain="invoice" value={v} /> },
  { key: 'invoiceDate', header: 'Date', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'dueDate', header: 'Due Date', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'paidDate', header: 'Paid On', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
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
  const { can } = usePermissions();
  const { logCreate, logUpdate, logDelete, logStatusChange } = useAuditLog('finance');

  // Permission guard helpers
  const guardCreate = () => {
    if (!can('finance', 'create')) {
      toast.error('Permission denied: Cannot create invoices');
      return false;
    }
    return true;
  };

  const guardEdit = () => {
    if (!can('finance', 'edit')) {
      toast.error('Permission denied: Cannot edit invoices');
      return false;
    }
    return true;
  };

  const guardApprove = () => {
    if (!can('finance', 'approve')) {
      toast.error('Permission denied: Cannot record payments');
      return false;
    }
    return true;
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

  const handleStageChange = (id, newStage) => {
    if (!can('finance', 'edit')) {
      toast.error('Permission denied: Cannot change invoice status');
      return;
    }
    const inv = invoices.find(i => i.id === id);
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: newStage } : i));
    logStatusChange(inv, inv.status, newStage);
  };

  const filteredInvoices = useMemo(() =>
    invoices.filter(inv =>
      (invStatus === 'All' || inv.status === invStatus) &&
      inv.customerName.toLowerCase().includes(invSearch.toLowerCase())
    ), [invoices, invSearch, invStatus]);

  const paginatedInvoices = filteredInvoices.slice((page - 1) * pageSize, page * pageSize);

  const totalRevenue = invoices.reduce((a, i) => a + i.amount, 0);
  const totalCollected = invoices.reduce((a, i) => a + i.paid, 0);
  const totalBalance = invoices.reduce((a, i) => a + i.balance, 0);

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
    { label: 'View Invoice', icon: FileText, onClick: row => setSelected(row) },
    { label: 'Record Payment', icon: CheckCircle, onClick: (row) => { if (guardApprove()) console.log('Record Payment', row); } },
    { label: 'Send Reminder', icon: Clock, onClick: () => { } },
  ];

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
          { label: 'Collection Rate', value: `${Math.round((totalCollected / totalRevenue) * 100)}%`, color: 'text-cyan-400' },
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
            {[
              { vendor: 'SMA Energy India', amount: 925000, dueDate: '2026-03-15', status: 'In Transit' },
              { vendor: 'Polycab Wires', amount: 126000, dueDate: '2026-03-20', status: 'Ordered' },
            ].map(p => (
              <div key={p.vendor} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-muted)]">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{p.vendor}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">Due: {p.dueDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-400">{fmt(p.amount)}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{p.status}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Invoice Modal */}
      <Modal open={showInvoice} onClose={() => setShowInvoice(false)} title="Create Invoice"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowInvoice(false)}>Cancel</Button>
            <CanCreate module="finance">
              <Button onClick={() => { if (guardCreate()) { console.log('Create Invoice'); setShowInvoice(false); } }}><Plus size={13} /> Create Invoice</Button>
            </CanCreate>
          </div>
        }>
        <div className="space-y-3">
          <FormField label="Project">
            <Select><option value="">Select Project</option>
              <option>P001 – Joshi Industries</option>
              <option>P002 – Suresh Bhatt</option>
              <option>P004 – Trivedi Foods</option>
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Invoice Amount (₹)"><Input type="number" placeholder="280000" /></FormField>
            <FormField label="Invoice Date"><Input type="date" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Due Date"><Input type="date" /></FormField>
            <FormField label="Payment Terms">
              <Select><option value="">Select Terms</option>
                <option>30% Advance</option><option>50% on Delivery</option>
                <option>Net 30</option><option>Net 60</option>
              </Select>
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Invoice Detail Modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={`Invoice — ${selected.id}`}
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
              ['Invoice #', selected.id],
              ['Customer', selected.customerName],
              ['Invoice Amt', fmt(selected.amount)],
              ['Amount Paid', fmt(selected.paid)],
              ['Balance Due', fmt(selected.balance)],
              ['Status', <StatusBadge domain="invoice" value={selected.status} />],
              ['Invoice Date', selected.invoiceDate],
              ['Due Date', selected.dueDate],
              ['Paid On', selected.paidDate ?? '—'],
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
