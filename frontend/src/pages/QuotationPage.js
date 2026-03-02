// Solar OS – EPC Edition — QuotationPage.js
import React, { useState, useMemo, useRef } from 'react';
import {
  Plus, FileText, Send, CheckCircle, DollarSign,
  TrendingUp, Zap, AlertTriangle, ShieldCheck,
  BarChart2, Download, Percent, LayoutGrid, List,
} from 'lucide-react';
import { QUOTATIONS } from '../data/mockData';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import { KPICard } from '../components/ui/KPICard';
import { Progress } from '../components/ui/Progress';
import DataTable from '../components/ui/DataTable';
import { CURRENCY, APP_CONFIG } from '../config/app.config';

const fmt = CURRENCY.format;

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_MARGIN_PCT = 20;   // Hard floor — below this requires MD approval
const TARGET_MARGIN_PCT = 25;  // Company target margin

// ── Extended quotation data ───────────────────────────────────────────────────
const QUOTATIONS_EXT = QUOTATIONS.map(q => ({
  ...q,
  // Margin engine fields
  preSubsidyPrice: q.totalPrice,
  subsidyAmt: q.totalPrice > 400000 ? 0 : Math.round(q.costPrice * 0.30),
  emiAvailable: true,
  emiMonths: 36,
  emiRate: 8.5,
  // Approval workflow
  discountApprovalRequired: q.discount > 3,
  discountApprovedBy: q.discount > 3 ? (q.status === 'Approved' ? 'Neha Gupta (PM)' : null) : 'Auto',
  // Competitor intel
  competitorQuote: Math.round(q.totalPrice * 0.97),
  conversionProb: q.status === 'Approved' ? 95 : q.status === 'Sent' ? 62 : 35,
  // Invoice linkage
  paymentTerms: '40-40-20',  // 40% advance, 40% on installation, 20% on commissioning
}));

// ── Margin engine helper ──────────────────────────────────────────────────────
const marginColor = m =>
  m < MIN_MARGIN_PCT ? 'text-red-400' :
    m < TARGET_MARGIN_PCT ? 'text-amber-400' :
      'text-emerald-400';

const marginBg = m =>
  m < MIN_MARGIN_PCT ? 'from-red-500 to-rose-400' :
    m < TARGET_MARGIN_PCT ? 'from-amber-500 to-orange-400' :
      'from-emerald-500 to-teal-400';

// ── EMI calculator ─────────────────────────────────────────────────────────────
const calcEMI = (principal, months, ratePA) => {
  const r = ratePA / 100 / 12;
  return Math.round((principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
};

// ── Table columns ─────────────────────────────────────────────────────────────
const COLUMNS = [
  {
    key: 'id', header: 'Quote ID',
    render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span>,
  },
  {
    key: 'customerName', header: 'Customer', sortable: true,
    render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span>,
  },
  {
    key: 'systemSize', header: 'Size', sortable: true,
    render: v => <span className="text-xs font-bold text-[var(--text-primary)]">{v} kW</span>,
  },
  {
    key: 'totalPrice', header: 'Quote Price', sortable: true,
    render: v => <span className="text-xs font-bold text-[var(--text-primary)]">{fmt(v)}</span>,
  },
  {
    key: 'costPrice', header: 'Cost',
    render: v => <span className="text-xs text-[var(--text-muted)]">{fmt(v)}</span>,
  },
  {
    key: 'margin', header: 'Margin %', sortable: true,
    render: (v, row) => (
      <div className="flex items-center gap-2 min-w-[80px]">
        <span className={`text-xs font-bold ${marginColor(v)}`}>{v}%</span>
        <div className="flex-1">
          <Progress value={v} colorClass={marginBg(v)} />
        </div>
      </div>
    ),
  },
  {
    key: 'discount', header: 'Disc %',
    render: (v, row) => (
      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--text-muted)]">{v}%</span>
        {row.discountApprovalRequired && !row.discountApprovedBy && (
          <AlertTriangle size={10} className="text-amber-400" title="Discount approval pending" />
        )}
      </div>
    ),
  },
  {
    key: 'status', header: 'Status',
    render: v => <StatusBadge domain="quotation" value={v} />,
  },
  {
    key: 'validTill', header: 'Valid Till',
    render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span>,
  },
  {
    key: 'conversionProb', header: 'Win %',
    render: v => (
      <span className={`text-xs font-bold ${v >= 60 ? 'text-emerald-400' : v >= 40 ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
        {v}%
      </span>
    ),
  },
];

// ── Quotation stage defs ──────────────────────────────────────────────────────
const QUOTE_STAGES = [
  { id: 'Draft', label: 'Draft', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  { id: 'Sent', label: 'Sent', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { id: 'Approved', label: 'Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { id: 'Rejected', label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  { id: 'Expired', label: 'Expired', color: '#475569', bg: 'rgba(71,85,105,0.10)' },
];

// ── Quotation card ─────────────────────────────────────────────────────────────
const QuoteCard = ({ quote, onDragStart, onClick }) => (
  <div
    draggable
    onDragStart={() => onDragStart(quote.id)}
    onClick={() => onClick(quote)}
    className={`glass-card p-3 cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all space-y-2 ${quote.margin < MIN_MARGIN_PCT ? 'border-l-2 border-l-red-500' : ''}`}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-mono text-[var(--accent-light)]">{quote.id}</span>
      <StatusBadge domain="quotation" value={quote.status} />
    </div>
    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{quote.customerName}</p>
    <div className="grid grid-cols-3 gap-1 text-[10px]">
      <div className="glass-card p-1 text-center">
        <p className="text-[var(--text-muted)]">Size</p>
        <p className="font-bold text-[var(--solar)]">{quote.systemSize}kW</p>
      </div>
      <div className="glass-card p-1 text-center">
        <p className="text-[var(--text-muted)]">Value</p>
        <p className="font-bold text-[var(--text-primary)]">{fmt(quote.totalPrice)}</p>
      </div>
      <div className="glass-card p-1 text-center">
        <p className="text-[var(--text-muted)]">Margin</p>
        <p className={`font-bold ${marginColor(quote.margin)}`}>{quote.margin}%</p>
      </div>
    </div>
    <div>
      <div className="flex justify-between text-[9px] text-[var(--text-muted)] mb-0.5">
        <span>Margin</span>
        <span className={marginColor(quote.margin)}>{quote.margin}% {quote.margin < MIN_MARGIN_PCT ? '⚠' : ''}</span>
      </div>
      <div className="h-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${marginBg(quote.margin)}`}
          style={{ width: `${Math.min(quote.margin * 2.5, 100)}%` }} />
      </div>
    </div>
    <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]">
      <span>Win: <span className={`font-bold ${quote.conversionProb >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>{quote.conversionProb}%</span></span>
      {quote.validTill && <span className="ml-auto">Valid: {quote.validTill}</span>}
    </div>
  </div>
);

// ── Quotation Kanban board ─────────────────────────────────────────────────────
const QuoteKanbanBoard = ({ quotes, onStageChange, onCardClick }) => {
  const draggingId = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex gap-3 min-w-max">
        {QUOTE_STAGES.map(stage => {
          const cards = quotes.filter(q => q.status === stage.id);
          const stageValue = cards.reduce((a, q) => a + q.totalPrice, 0);
          return (
            <div key={stage.id}
              className={`flex flex-col w-64 rounded-xl border transition-colors ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => { if (draggingId.current) onStageChange(draggingId.current, stage.id); draggingId.current = null; setDragOver(null); }}
            >
              <div className="flex items-center justify-between p-3 border-b border-[var(--border-base)]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {stageValue > 0 && <span className="text-[9px] font-semibold text-[var(--text-muted)]">{fmt(stageValue)}</span>}
                  <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 p-2 flex-1 min-h-[120px]">
                {cards.map(q => (
                  <QuoteCard key={q.id} quote={q}
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

// ── Component ─────────────────────────────────────────────────────────────────
const QuotationPage = () => {
  const [quotations, setQuotations] = useState(QUOTATIONS_EXT);
  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');
  const [statusFilter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); // details | margin | emi | approval

  // Live margin engine state for new quote modal
  const [mqPrice, setMqPrice] = useState('');
  const [mqCost, setMqCost] = useState('');
  const [mqDisc, setMqDisc] = useState('0');

  const STATUS_FILTERS = ['All', 'Draft', 'Sent', 'Approved', 'Rejected', 'Expired'];

  const handleStageChange = (id, newStage) =>
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, status: newStage } : q));

  const filtered = useMemo(() => quotations.filter(q =>
    (statusFilter === 'All' || q.status === statusFilter) &&
    q.customerName.toLowerCase().includes(search.toLowerCase())
  ), [quotations, search, statusFilter]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalValue = quotations.reduce((a, q) => a + q.totalPrice, 0);
  const approvedValue = quotations.filter(q => q.status === 'Approved').reduce((a, q) => a + q.totalPrice, 0);
  const avgMargin = quotations.reduce((a, q) => a + q.margin, 0) / quotations.length;
  const pendingApproval = quotations.filter(q => q.discountApprovalRequired && !q.discountApprovedBy).length;
  const belowMinMargin = quotations.filter(q => q.margin < MIN_MARGIN_PCT).length;

  // Live margin calculation for new quote
  const liveMargin = useMemo(() => {
    const p = parseFloat(mqPrice) || 0;
    const c = parseFloat(mqCost) || 0;
    const d = parseFloat(mqDisc) || 0;
    if (!p || !c) return null;
    const effPrice = p * (1 - d / 100);
    return { effPrice, margin: ((effPrice - c) / effPrice * 100).toFixed(1) };
  }, [mqPrice, mqCost, mqDisc]);

  const ROW_ACTIONS = [
    { label: 'View Quote', icon: FileText, onClick: row => { setSelected(row); setActiveTab('details'); } },
    { label: 'Margin Analysis', icon: BarChart2, onClick: row => { setSelected(row); setActiveTab('margin'); } },
    { label: 'EMI / Finance', icon: Percent, onClick: row => { setSelected(row); setActiveTab('emi'); } },
    { label: 'Approval Workflow', icon: ShieldCheck, onClick: row => { setSelected(row); setActiveTab('approval'); } },
    { label: 'Send to Customer', icon: Send, onClick: () => { } },
    { label: 'Convert to Project', icon: CheckCircle, onClick: () => { } },
  ];

  return (
    <div className="animate-fade-in space-y-5">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="heading-page">Quotation Management</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Proposals · margin engine · discount approval · subsidy / EMI · PDF send · conversion tracking
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={13} /> New Quote</Button>
      </div>

      {/* ── Primary KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Total Quotes" value={quotations.length}
          sub={`Pipeline: ${fmt(totalValue)}`} icon={FileText}
          accentColor="var(--primary)"
        />
        <KPICard
          label="Approved Value" value={fmt(approvedValue)}
          sub={`${QUOTATIONS_EXT.filter(q => q.status === 'Approved').length} quotes approved`} icon={CheckCircle} accentColor="#22c55e"
        />
        <KPICard
          label="Avg Gross Margin" value={`${avgMargin.toFixed(1)}%`}
          sub={`Target ${TARGET_MARGIN_PCT}% · Floor ${MIN_MARGIN_PCT}%`}
          icon={TrendingUp} accentColor="#3b82f6"
          trend={avgMargin >= TARGET_MARGIN_PCT ? 'On target' : 'Below target'} trendUp={avgMargin >= TARGET_MARGIN_PCT}
        />
        <KPICard
          label="Pending Approval" value={pendingApproval}
          sub={`${belowMinMargin} quotes below ${MIN_MARGIN_PCT}% floor`}
          icon={AlertTriangle} accentColor="#f59e0b"
        />
      </div>

      {/* ── Pipeline Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Margin health */}
        <div className="glass-card p-4 lg:col-span-2">
          <p className="heading-section mb-3">Margin Health — Quote Pipeline</p>
          <div className="space-y-3">
            {quotations.map(q => (
              <div key={q.id} className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-[var(--accent-light)] w-10 shrink-0">{q.id}</span>
                <span className="text-xs text-[var(--text-muted)] w-36 truncate shrink-0">{q.customerName}</span>
                <span className="text-xs font-bold text-[var(--text-primary)] w-16 shrink-0">{fmt(q.totalPrice)}</span>
                <div className="flex-1">
                  <Progress value={q.margin} colorClass={marginBg(q.margin)} />
                </div>
                <span className={`text-xs font-bold w-10 text-right shrink-0 ${marginColor(q.margin)}`}>{q.margin}%</span>
                {q.margin < MIN_MARGIN_PCT && (
                  <AlertTriangle size={11} className="text-red-400 shrink-0" title="Below minimum margin" />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-4 pt-3 border-t border-[var(--border-base)] text-[11px] text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> ≥{TARGET_MARGIN_PCT}% Target</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> {MIN_MARGIN_PCT}–{TARGET_MARGIN_PCT}% Acceptable</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-400" /> &lt;{MIN_MARGIN_PCT}% — Needs Approval</div>
          </div>
        </div>

        {/* Conversion funnel */}
        <div className="glass-card p-4">            <p className="heading-section mb-3">Conversion Tracking</p>
          <div className="space-y-2.5">
            {[
              { label: 'Total Quoted', count: quotations.length, value: totalValue, color: 'bg-[var(--primary)]/40' },
              { label: 'Sent', count: quotations.filter(q => q.status === 'Sent').length, value: quotations.filter(q => q.status === 'Sent').reduce((a, q) => a + q.totalPrice, 0), color: 'bg-[var(--primary-light)]/40' },
              { label: 'Approved', count: quotations.filter(q => q.status === 'Approved').length, value: approvedValue, color: 'bg-emerald-500/40' },
              { label: 'Rejected/Expired', count: quotations.filter(q => ['Rejected', 'Expired'].includes(q.status)).length, value: 0, color: 'bg-red-500/30' },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${r.color.replace('/40', '').replace('/30', '')}`} />
                <span className="text-xs text-[var(--text-muted)] flex-1">{r.label}</span>
                <span className="text-xs font-bold text-[var(--text-primary)]">{r.count}</span>
                {r.value > 0 && <span className="text-[10px] text-[var(--text-faint)]">{fmt(r.value)}</span>}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border-base)]">
            <div className="flex justify-between text-[11px]">
              <span className="text-[var(--text-muted)]">Win Rate</span>
              <span className="font-bold text-emerald-400">
                {Math.round(quotations.filter(q => q.status === 'Approved').length / quotations.length * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Pricing Banner ── */}
      <div className="ai-banner">
        <div className="w-8 h-8 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center shrink-0">
          <Zap size={14} className="text-[var(--primary-light)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[var(--primary-light)] mb-0.5">AI Pricing Intelligence</p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            <strong className="text-[var(--text-secondary)]">Q002 (Sunita Malhotra)</strong> — competitor pricing 3% lower in Surat; 2% strategic discount keeps margin at 23% (above floor). Recommend immediate follow-up.&nbsp;
            <strong className="text-[var(--text-secondary)]">Q003 (Deepika Shah)</strong> — Vadodara region high competition; 62% win probability, valid for 25 more days.&nbsp;
            <strong className="text-[var(--text-secondary)]">Q004 (Nilesh Parekh)</strong> — design approved, quote pending; 150 kW at ₹8.4L is strong pipeline value.
          </p>
        </div>
      </div>

      {/* ── Discount Approval Alerts ── */}
      {pendingApproval > 0 && (
        <div className="flex gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-400 mb-0.5">Discount Approval Required</p>
            <p className="text-xs text-[var(--text-muted)]">
              {pendingApproval} quote(s) have discounts &gt;3% pending manager approval. Quotes cannot be sent to customers until approved.
            </p>
          </div>
        </div>
      )}

      {/* ── Filter + View Toggle ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-[var(--text-muted)] mr-1">Status:</span>
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => { setFilter(s); setPage(1); }}
            className={`filter-chip ${statusFilter === s ? 'filter-chip-active' : ''}`}>{s}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <Input placeholder="Search quotes..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="h-8 text-xs w-44" />
          <div className="view-toggle-pill">
            <button onClick={() => setView('kanban')} className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`} title="Kanban view"><LayoutGrid size={13} /></button>
            <button onClick={() => setView('table')} className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`} title="Table view"><List size={13} /></button>
          </div>
        </div>
      </div>

      {view === 'kanban' ? (
        <QuoteKanbanBoard quotes={filtered} onStageChange={handleStageChange} onCardClick={q => { setSelected(q); setActiveTab('details'); }} />
      ) : (
        <DataTable
          columns={COLUMNS} data={paginated} total={filtered.length}
          page={page} pageSize={pageSize}
          onPageChange={setPage} onPageSizeChange={s => { setPageSize(s); setPage(1); }}
          search={search} onSearch={v => { setSearch(v); setPage(1); }}
          rowActions={ROW_ACTIONS}
        />
      )}

      {/* ══════════════════════════════════════════════
          NEW QUOTATION MODAL — with live margin engine
      ══════════════════════════════════════════════ */}
      <Modal
        open={showAdd} onClose={() => setShowAdd(false)}
        title="New Quotation" description="Live margin engine enforces minimum 20% gross margin"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="outline">Save Draft</Button>
            <Button
              disabled={liveMargin && parseFloat(liveMargin.margin) < MIN_MARGIN_PCT}
              title={liveMargin && parseFloat(liveMargin.margin) < MIN_MARGIN_PCT ? `Margin below ${MIN_MARGIN_PCT}% — approval required` : ''}
            >
              Save &amp; Send
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Customer">
            <Select>
              <option value="">Select customer / lead…</option>
              <option>Ramesh Joshi (L001)</option>
              <option>Sunita Malhotra (L002)</option>
              <option>Deepika Shah (L004)</option>
              <option>Nilesh Parekh (L007)</option>
            </Select>
          </FormField>
          <FormField label="Design Reference">
            <Select>
              <option value="">Link to design…</option>
              <option>D001 — Joshi 50kW (Approved)</option>
              <option>D002 — Malhotra 100kW (Draft)</option>
              <option>D003 — Parekh 150kW (In Review)</option>
            </Select>
          </FormField>
          <FormField label="System Size (kW)">
            <Input type="number" placeholder="50" />
          </FormField>
          <FormField label="Payment Terms">
            <Select>
              <option>40-40-20 (Advance/Install/Commission)</option>
              <option>50-30-20</option>
              <option>30-40-30</option>
              <option>100% Advance</option>
            </Select>
          </FormField>

          {/* Live margin engine */}
          <div className="col-span-2 p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-base)]">
            <p className="text-[11px] font-bold text-[var(--text-primary)] mb-3">Live Margin Engine</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <FormField label="Quote Price (₹)">
                <Input type="number" placeholder="280000" value={mqPrice} onChange={e => setMqPrice(e.target.value)} />
              </FormField>
              <FormField label="Cost Price (₹)">
                <Input type="number" placeholder="210000" value={mqCost} onChange={e => setMqCost(e.target.value)} />
              </FormField>
              <FormField label="Discount (%)">
                <Input type="number" placeholder="0" min="0" max="15" value={mqDisc} onChange={e => setMqDisc(e.target.value)} />
              </FormField>
            </div>
            {liveMargin && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Effective Price after discount</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">{fmt(liveMargin.effPrice)}</span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[var(--text-muted)]">Gross Margin</span>
                  <span className={`text-sm font-extrabold ${marginColor(parseFloat(liveMargin.margin))}`}>
                    {liveMargin.margin}%
                  </span>
                </div>
                <Progress value={parseFloat(liveMargin.margin)} colorClass={marginBg(parseFloat(liveMargin.margin))} />
                {parseFloat(liveMargin.margin) < MIN_MARGIN_PCT && (
                  <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle size={12} className="text-red-400 shrink-0" />
                    <p className="text-[11px] text-red-400 font-medium">
                      Below {MIN_MARGIN_PCT}% floor — MD approval required before sending to customer.
                    </p>
                  </div>
                )}
                {parseFloat(mqDisc) > 3 && parseFloat(liveMargin.margin) >= MIN_MARGIN_PCT && (
                  <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <ShieldCheck size={12} className="text-amber-400 shrink-0" />
                    <p className="text-[11px] text-amber-400 font-medium">
                      Discount &gt;3% — Sales Manager approval required before sending.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subsidy */}
          <FormField label="Subsidy Type">
            <Select>
              <option>No Subsidy</option>
              <option>PM-KUSUM 40%</option>
              <option>State Scheme 30%</option>
              <option>DISCOM Net Metering 20%</option>
            </Select>
          </FormField>
          <FormField label="Subsidy Amount (₹)">
            <Input type="number" placeholder="0" />
          </FormField>

          {/* EMI */}
          <FormField label="EMI Tenure (months)">
            <Select>
              <option>12</option>
              <option>24</option>
              <option>36</option>
              <option>48</option>
              <option>60</option>
            </Select>
          </FormField>
          <FormField label="Finance Rate (% p.a.)">
            <Input type="number" placeholder="8.5" />
          </FormField>

          <FormField label="Valid Till">
            <Input type="date" />
          </FormField>
          <FormField label="Prepared By">
            <Select>
              <option>Ravi Sharma (Sales)</option>
              <option>Neha Gupta (PM)</option>
            </Select>
          </FormField>
          <FormField label="Notes / Special Terms" className="col-span-2">
            <Textarea rows={2} placeholder="Include subsidy deduction conditions, O&M terms, warranty clauses…" />
          </FormField>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════
          QUOTATION DETAIL MODAL (4 tabs)
      ══════════════════════════════════════════════ */}
      <Modal
        open={!!selected} onClose={() => setSelected(null)}
        title={selected ? `Quote ${selected.id} — ${selected.customerName}` : ''}
        description={selected ? `${selected.systemSize} kW · ${fmt(selected.totalPrice)} · ${selected.status}` : ''}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
            <Button variant="outline"><Download size={13} /> Export PDF</Button>
            {selected?.status !== 'Approved' && selected?.status !== 'Rejected' && (
              <Button variant="outline"><Send size={13} /> Send to Customer</Button>
            )}
            {selected?.status === 'Approved' && (
              <Button><CheckCircle size={13} /> Convert to Project</Button>
            )}
          </>
        }
      >
        {selected && (() => {
          const emiPrincipal = Math.round(selected.totalPrice * 0.6); // 60% financed
          const emi = calcEMI(emiPrincipal, selected.emiMonths, selected.emiRate);
          const totalEmiCost = emi * selected.emiMonths;
          const totalInterest = totalEmiCost - emiPrincipal;
          return (
            <div className="space-y-4">
              {/* Tab bar */}
              <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-base)]">
                {[
                  { id: 'details', label: 'Quote Details', icon: FileText },
                  { id: 'margin', label: 'Margin Analysis', icon: BarChart2 },
                  { id: 'emi', label: 'EMI / Finance', icon: Percent },
                  { id: 'approval', label: 'Approvals', icon: ShieldCheck },
                ].map(({ id, label, icon: Ic }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === id
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                  >
                    <Ic size={11} /> {label}
                  </button>
                ))}
              </div>

              {/* DETAILS TAB */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { l: 'Status', v: <StatusBadge domain="quotation" value={selected.status} /> },
                      { l: 'System Size', v: `${selected.systemSize} kW` },
                      { l: 'Quote Price', v: fmt(selected.totalPrice) },
                      { l: 'Cost Price', v: fmt(selected.costPrice) },
                      { l: 'Gross Margin', v: `${selected.margin}%` },
                      { l: 'Discount', v: `${selected.discount}%` },
                      { l: 'Payment Terms', v: selected.paymentTerms },
                      { l: 'Valid Till', v: selected.validTill },
                      { l: 'Sent Date', v: selected.sentDate ?? '—' },
                      { l: 'Approved Date', v: selected.approvedDate ?? '—' },
                      { l: 'Design Ref', v: selected.designId ?? '—' },
                      { l: 'Conv. Prob.', v: `${selected.conversionProb}%` },
                    ].map(f => (
                      <div key={f.l} className="p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-base)]">
                        <p className="label-muted mb-1">{f.l}</p>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">{f.v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Payment schedule */}
                  <div className="p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-base)]">
                    <p className="text-[11px] font-bold text-[var(--text-primary)] mb-2">Payment Schedule ({selected.paymentTerms})</p>
                    <div className="space-y-1.5">
                      {[
                        { milestone: 'Advance (40%)', amount: selected.totalPrice * 0.4, note: 'On PO signing' },
                        { milestone: 'Installation Complete (40%)', amount: selected.totalPrice * 0.4, note: 'On installation sign-off' },
                        { milestone: 'Commissioning (20%)', amount: selected.totalPrice * 0.2, note: 'On DISCOM approval' },
                      ].map(row => (
                        <div key={row.milestone} className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-muted)]">{row.milestone}</span>
                          <span className="text-[var(--text-faint)] text-[10px]">{row.note}</span>
                          <span className="font-bold text-[var(--text-primary)]">{fmt(row.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MARGIN TAB */}
              {activeTab === 'margin' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { l: 'Quote Price', v: fmt(selected.totalPrice), color: 'text-[var(--text-primary)]' },
                      { l: 'Cost Price', v: fmt(selected.costPrice), color: 'text-[var(--text-muted)]' },
                      { l: 'Gross Profit', v: fmt(selected.totalPrice - selected.costPrice), color: 'text-emerald-400' },
                      { l: 'Gross Margin %', v: `${selected.margin}%`, color: marginColor(selected.margin) },
                      { l: 'Discount Applied', v: `${selected.discount}% (${fmt(selected.totalPrice * selected.discount / 100)})`, color: 'text-amber-400' },
                      { l: 'Competitor Quote', v: fmt(selected.competitorQuote), color: 'text-[var(--text-muted)]' },
                      { l: 'Price Advantage', v: selected.totalPrice <= selected.competitorQuote ? `−${fmt(selected.competitorQuote - selected.totalPrice)} vs market` : `+${fmt(selected.totalPrice - selected.competitorQuote)} above market`, color: selected.totalPrice <= selected.competitorQuote ? 'text-emerald-400' : 'text-red-400' },
                      { l: 'Min Margin Floor', v: `${MIN_MARGIN_PCT}%`, color: 'text-[var(--text-muted)]' },
                    ].map(f => (
                      <div key={f.l} className="p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-base)]">
                        <p className="label-muted mb-1">{f.l}</p>
                        <p className={`text-xs font-bold ${f.color}`}>{f.v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-base)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-[var(--text-muted)]">Margin vs Target ({TARGET_MARGIN_PCT}%)</span>
                      <span className={`text-sm font-extrabold ${marginColor(selected.margin)}`}>{selected.margin}%</span>
                    </div>
                    <Progress value={selected.margin} colorClass={marginBg(selected.margin)} />
                    <div className="flex justify-between text-[10px] text-[var(--text-faint)] mt-1">
                      <span>0%</span>
                      <span className="text-red-400">{MIN_MARGIN_PCT}% floor</span>
                      <span className="text-emerald-400">{TARGET_MARGIN_PCT}% target</span>
                      <span>40%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* EMI TAB */}
              {activeTab === 'emi' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { l: 'Total Quote Value', v: fmt(selected.totalPrice), color: 'text-[var(--text-primary)]' },
                      { l: 'Down Payment (40%)', v: fmt(selected.totalPrice * 0.4), color: 'text-amber-400' },
                      { l: 'Financed Amount (60%)', v: fmt(emiPrincipal), color: 'text-[var(--primary-light)]' },
                      { l: 'EMI Tenure', v: `${selected.emiMonths} months`, color: 'text-[var(--text-muted)]' },
                      { l: 'Finance Rate', v: `${selected.emiRate}% p.a.`, color: 'text-[var(--text-muted)]' },
                      { l: 'Monthly EMI', v: fmt(emi), color: 'text-emerald-400' },
                      { l: 'Total Interest Cost', v: fmt(totalInterest), color: 'text-amber-400' },
                      { l: 'Total Cost (EMI)', v: fmt(totalEmiCost + selected.totalPrice * 0.4), color: 'text-[var(--text-primary)]' },
                    ].map(f => (
                      <div key={f.l} className="p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-base)]">
                        <p className="label-muted mb-1">{f.l}</p>
                        <p className={`text-xs font-bold ${f.color}`}>{f.v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 p-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/15">
                    <DollarSign size={14} className="text-[var(--primary-light)] shrink-0 mt-0.5" />
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Monthly EMI of <strong className="text-emerald-400">{fmt(emi)}</strong> over {selected.emiMonths} months at {selected.emiRate}% p.a. Finance through partner NBFCs — SBI, HDFC, Tata Capital.
                      Include EMI option in customer proposal to improve conversion.
                    </p>
                  </div>

                  {/* Subsidy section */}
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                    <p className="text-[11px] font-bold text-amber-400 mb-2">Subsidy Deduction</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">Quote Price</span><span className="font-semibold">{fmt(selected.preSubsidyPrice)}</span></div>
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">Govt Subsidy</span><span className="font-semibold text-amber-400">− {fmt(selected.subsidyAmt)}</span></div>
                      <div className="flex justify-between border-t border-amber-500/20 pt-1.5"><span className="font-bold text-[var(--text-primary)]">Net to Customer</span><span className="font-extrabold text-emerald-400">{fmt(selected.preSubsidyPrice - selected.subsidyAmt)}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* APPROVAL TAB */}
              {activeTab === 'approval' && (
                <div className="space-y-4">
                  {/* Discount approval */}
                  <div className="p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-base)]">
                    <p className="text-[11px] font-bold text-[var(--text-primary)] mb-3">Discount Approval Workflow</p>
                    <div className="space-y-2.5">
                      {[
                        { level: '0–3% Discount', approver: 'Auto-approved', status: selected.discount <= 3 ? 'approved' : 'na' },
                        { level: '3–7% Discount', approver: 'Sales Manager approval', status: selected.discount > 3 && selected.discount <= 7 ? (selected.discountApprovedBy ? 'approved' : 'pending') : selected.discount <= 3 ? 'na' : 'na' },
                        { level: '7–15% Discount', approver: 'VP Sales approval', status: selected.discount > 7 && selected.discount <= 15 ? 'pending' : 'na' },
                        { level: '&gt;15% or &lt;20% Margin', approver: 'MD / Director approval', status: selected.margin < MIN_MARGIN_PCT ? 'pending' : 'na' },
                      ].map(row => (
                        <div key={row.level} className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-[var(--text-primary)]" dangerouslySetInnerHTML={{ __html: row.level }} />
                            <p className="text-[10px] text-[var(--text-muted)]">{row.approver}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${row.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            row.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                              'bg-[var(--bg-elevated)] border-[var(--border-muted)] text-[var(--text-faint)]'
                            }`}>
                            {row.status === 'approved' ? '✓ Approved' : row.status === 'pending' ? '⏳ Pending' : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Approval trail */}
                  <div className="p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-base)]">
                    <p className="text-[11px] font-bold text-[var(--text-primary)] mb-2">Approval Trail</p>
                    <div className="space-y-2">
                      {[
                        { event: 'Quote created', by: 'Ravi Sharma', time: selected.sentDate ?? '2026-02-25', done: true },
                        { event: 'Discount auto-approved', by: 'System', time: selected.sentDate ?? '2026-02-25', done: selected.discount <= 3 },
                        { event: 'Sent to customer', by: 'Ravi Sharma', time: selected.sentDate ?? '—', done: !!selected.sentDate },
                        { event: 'Customer approved', by: selected.customerName, time: selected.approvedDate ?? '—', done: !!selected.approvedDate },
                      ].map(e => (
                        <div key={e.event} className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${e.done ? 'bg-emerald-500/20 border-emerald-500' : 'bg-[var(--bg-overlay)] border-[var(--border-base)]'}`}>
                            {e.done && <CheckCircle size={10} className="text-emerald-400" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-[var(--text-primary)]">{e.event}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">{e.by} · {e.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Min margin warning */}
                  {selected.margin < MIN_MARGIN_PCT && (
                    <div className="flex gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                      <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold text-red-400 mb-0.5">
                          Below Minimum Margin — MD Approval Required
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Quote margin {selected.margin}% is below the {MIN_MARGIN_PCT}% company floor. This quote cannot be sent to the customer without written MD approval. Raise exception via escalation workflow.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default QuotationPage;
