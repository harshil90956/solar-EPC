// Solar OS – EPC Edition — CommissioningPage.js
import React, { useState, useMemo, useRef } from 'react';
import { CheckCircle, Cpu, Sun, FileSignature, Award, Zap, Plus, AlertTriangle, LayoutGrid, List } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select } from '../components/ui/Input';
import { KPICard } from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import { APP_CONFIG } from '../config/app.config';

const COMMISSIONED = [
  {
    id: 'CA001', projectId: 'P003', customer: 'Prakash Agarwal', site: 'Ahmedabad Plant',
    systemSize: 80, commissionDate: '2026-01-10', status: 'Active',
    inverterSerial: 'SMA-50K-2025-00142', panelBatch: 'TSP-B2024-LOT-088',
    warrantyPanel: '2035-01-10', warrantyInverter: '2035-01-10', warrantyInstall: '2028-01-10',
    pr: 79.2, expectedPR: 78,
    checklist: [
      { item: 'Insulation Resistance Test', pass: true }, { item: 'Open Circuit Voltage Check', pass: true },
      { item: 'Short Circuit Current Check', pass: true }, { item: 'Grid Synchronisation', pass: true },
      { item: 'Performance Ratio Test', pass: true }, { item: 'Net Meter Test', pass: true },
      { item: 'Customer Handover Sign-off', pass: true },
    ],
  },
  {
    id: 'CA002', projectId: 'P001', customer: 'Ramesh Joshi', site: 'GIDC Ahmedabad',
    systemSize: 50, commissionDate: null, status: 'Pending',
    inverterSerial: null, panelBatch: 'TSP-B2025-LOT-031',
    warrantyPanel: null, warrantyInverter: null, warrantyInstall: null,
    pr: null, expectedPR: 78,
    checklist: [
      { item: 'Insulation Resistance Test', pass: false }, { item: 'Open Circuit Voltage Check', pass: false },
      { item: 'Short Circuit Current Check', pass: false }, { item: 'Grid Synchronisation', pass: false },
      { item: 'Performance Ratio Test', pass: false }, { item: 'Net Meter Test', pass: false },
      { item: 'Customer Handover Sign-off', pass: false },
    ],
  },
  {
    id: 'CA003', projectId: 'P002', customer: 'Suresh Bhatt', site: 'Vapi GIDC',
    systemSize: 150, commissionDate: null, status: 'In Progress',
    inverterSerial: null, panelBatch: 'TSP-B2025-LOT-044',
    warrantyPanel: null, warrantyInverter: null, warrantyInstall: null,
    pr: null, expectedPR: 78,
    checklist: [
      { item: 'Insulation Resistance Test', pass: true }, { item: 'Open Circuit Voltage Check', pass: true },
      { item: 'Short Circuit Current Check', pass: true }, { item: 'Grid Synchronisation', pass: false },
      { item: 'Performance Ratio Test', pass: false }, { item: 'Net Meter Test', pass: false },
      { item: 'Customer Handover Sign-off', pass: false },
    ],
  },
];

const NEUTRAL = 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-muted)]';
const STATUS_MAP = {
  Active: { label: 'Active', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  Pending: { label: 'Pending', color: NEUTRAL },
  'In Progress': { label: 'In Progress', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  Flagged: { label: 'Flagged', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const CommBadge = ({ value }) => {
  const meta = STATUS_MAP[value] ?? { label: value, color: NEUTRAL };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>{meta.label}</span>;
};

// ── Kanban stage defs ─────────────────────────────────────────────────────────
const COMM_STAGES = [
  { id: 'Pending', label: 'Pending', color: 'var(--text-faint)', bg: 'var(--bg-elevated)' },
  { id: 'In Progress', label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { id: 'Active', label: 'Commissioned', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { id: 'Flagged', label: 'Flagged', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

const COLUMNS = [
  { key: 'id', header: 'Certificate ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
  { key: 'projectId', header: 'Project', render: v => <span className="text-xs font-mono text-[var(--text-secondary)]">{v}</span> },
  { key: 'customer', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
  { key: 'site', header: 'Site', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'systemSize', header: 'Size', render: v => <span className="text-xs font-bold text-[var(--solar)]">{v} kW</span> },
  {
    key: 'pr', header: 'PR %', sortable: true, render: (v, row) => v !== null
      ? <span className={`text-xs font-bold ${v >= row.expectedPR ? 'text-emerald-400' : 'text-amber-400'}`}>{v}%</span>
      : <span className="text-xs text-[var(--text-muted)]">—</span>
  },
  { key: 'commissionDate', header: 'Commissioned', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
  { key: 'warrantyPanel', header: 'Panel Warranty', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
  { key: 'status', header: 'Status', render: v => <CommBadge value={v} /> },
];

/* ── Commissioning Kanban Card ── */
const CommCard = ({ sys, onDragStart, onClick }) => {
  const checkDone = sys.checklist.filter(c => c.pass).length;
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-[var(--primary)]/40 transition-all">
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-[10px] font-mono text-[var(--accent-light)]">{sys.id}</span>
        <span className="text-[10px] font-bold text-[var(--solar)]">{sys.systemSize} kW</span>
      </div>
      <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">{sys.customer}</p>
      <p className="text-[10px] text-[var(--text-muted)] mb-2 truncate">{sys.site}</p>
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className="text-[var(--text-faint)]">Checklist</span>
        <span className={checkDone === sys.checklist.length ? 'text-emerald-400' : 'text-amber-400'}>
          {checkDone}/{sys.checklist.length} ✓
        </span>
      </div>
      {sys.pr !== null && (
        <div className="text-[10px] font-bold text-emerald-400">PR: {sys.pr}%</div>
      )}
      {sys.commissionDate && (
        <div className="text-[10px] text-[var(--text-faint)] mt-1">{sys.commissionDate}</div>
      )}
    </div>
  );
};

/* ── Kanban Board ── */
const CommKanbanBoard = ({ systems, onStageChange, onCardClick }) => {
  const draggingId = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex gap-3 min-w-max">
        {COMM_STAGES.map(stage => {
          const cards = systems.filter(s => s.status === stage.id);
          const totalKW = cards.reduce((a, s) => a + s.systemSize, 0);
          return (
            <div key={stage.id}
              className={`flex flex-col w-60 rounded-xl border transition-colors ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => { if (draggingId.current) onStageChange(draggingId.current, stage.id); draggingId.current = null; setDragOver(null); }}>
              <div className="flex items-center justify-between p-3 border-b border-[var(--border-base)]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {totalKW > 0 && <span className="text-[10px] text-[var(--solar)] font-bold">{totalKW}kW</span>}
                  <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 p-2 flex-1 min-h-[160px]">
                {cards.map(s => (
                  <CommCard key={s.id} sys={s}
                    onDragStart={() => { draggingId.current = s.id; }}
                    onClick={() => onCardClick(s)} />
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

/* ── Main Page ── */
const CommissioningPage = () => {
  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');
  const [statusFilter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [systems, setSystems] = useState(COMMISSIONED);

  const handleStageChange = (id, newStatus) =>
    setSystems(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));

  const filtered = useMemo(() =>
    systems.filter(c =>
      (statusFilter === 'All' || c.status === statusFilter) &&
      c.customer.toLowerCase().includes(search.toLowerCase())
    ), [search, statusFilter, systems]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const active = systems.filter(c => c.status === 'Active').length;
  const pending = systems.filter(c => c.status === 'Pending').length;
  const avgPR = systems.filter(c => c.pr !== null).reduce((a, c, _, arr) => a + c.pr / arr.length, 0).toFixed(1);
  const totalKW = systems.filter(c => c.status === 'Active').reduce((a, c) => a + c.systemSize, 0);

  const ROW_ACTIONS = [
    { label: 'View Certificate', icon: Award, onClick: row => setSelected(row) },
    { label: 'Download Report', icon: FileSignature, onClick: () => { } },
    { label: 'Run Checklist', icon: CheckCircle, onClick: () => { } },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <div className="page-header">
        <div>
          <h1 className="heading-page">Commissioning</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">System commissioning · checklist · performance ratio · warranty tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="view-toggle-pill">
            <button onClick={() => setView('kanban')} className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`}><LayoutGrid size={14} /></button>
            <button onClick={() => setView('table')} className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`}><List size={14} /></button>
          </div>
          <Button onClick={() => setShowAdd(true)}><Plus size={13} /> Commission System</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard title="Active Systems" value={active} icon={Sun} trend={+1} trendLabel="commissioned this month" color="solar" />
        <KPICard title="Total Capacity" value={`${totalKW} kW`} icon={Zap} trend={+80} trendLabel="kW commissioned" color="accent" />
        <KPICard title="Avg. PR" value={`${avgPR}%`} icon={Cpu} trend={+0.3} trendLabel="above target 78%" color="emerald" />
        <KPICard title="Pending" value={pending} icon={AlertTriangle} trend={0} trendLabel="awaiting commissioning" color="amber" />
      </div>

      <div className="ai-banner">
        <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="text-[var(--accent-light)] font-semibold">AI Insight:</span>{' '}
          CA001 (Prakash Agarwal) performing at 79.2% PR — 1.2% above target. CA002 (Joshi Industries) pending installation completion. CA003 (Suresh Bhatt) is 3/7 checklist items done.
        </p>
      </div>

      {/* Active system detail cards — both views */}
      {systems.filter(c => c.status === 'Active').map(sys => (
        <div key={sys.id} className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--solar)]/15 flex items-center justify-center">
                <Sun size={18} className="text-[var(--solar)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{sys.id} — {sys.customer}</p>
                <p className="text-xs text-[var(--text-muted)]">{sys.site} · {sys.systemSize} kW · Commissioned {sys.commissionDate}</p>
              </div>
            </div>
            <CommBadge value={sys.status} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="glass-card p-2 text-center"><p className="text-[10px] text-[var(--text-muted)]">Performance Ratio</p><p className="text-lg font-black text-emerald-400">{sys.pr}%</p></div>
            <div className="glass-card p-2 text-center"><p className="text-[10px] text-[var(--text-muted)]">Inverter Serial</p><p className="text-xs font-mono text-[var(--text-primary)] mt-0.5">{sys.inverterSerial}</p></div>
            <div className="glass-card p-2 text-center"><p className="text-[10px] text-[var(--text-muted)]">Panel Warranty Till</p><p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">{sys.warrantyPanel}</p></div>
            <div className="glass-card p-2 text-center"><p className="text-[10px] text-[var(--text-muted)]">Install Warranty Till</p><p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">{sys.warrantyInstall}</p></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {sys.checklist.map((c, i) => (
              <div key={i} className={`flex items-center gap-1.5 text-[11px] ${c.pass ? 'text-emerald-400' : 'text-red-400'}`}>
                <CheckCircle size={10} />{c.item}
              </div>
            ))}
          </div>
        </div>
      ))}

      {view === 'kanban' ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">Drag systems between columns to update commissioning status</p>
            <Input placeholder="Search systems…" value={search}
              onChange={e => setSearch(e.target.value)} className="h-8 text-xs w-52" />
          </div>
          <CommKanbanBoard systems={filtered} onStageChange={handleStageChange} onCardClick={setSelected} />
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            {['All', 'Active', 'In Progress', 'Pending', 'Flagged'].map(s => (
              <button key={s} onClick={() => { setFilter(s); setPage(1); }}
                className={`filter-chip ${statusFilter === s ? 'filter-chip-active' : ''}`}>{s}</button>
            ))}
            <div className="ml-auto">
              <Input placeholder="Search systems…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-8 text-xs w-52" />
            </div>
          </div>
          <DataTable columns={COLUMNS} data={paginated} total={filtered.length}
            page={page} pageSize={pageSize} onPageChange={setPage}
            onPageSizeChange={s => { setPageSize(s); setPage(1); }}
            rowActions={ROW_ACTIONS} emptyText="No commissioning records found." />
        </>
      )}

      {/* Commission Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Commission System"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button onClick={() => setShowAdd(false)}><CheckCircle size={13} /> Complete Commissioning</Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Project">
            <Select><option value="">Select Project</option><option>P001 – Joshi Industries 50kW</option></Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Commission Date"><Input type="date" /></FormField>
            <FormField label="Performance Ratio (%)"><Input type="number" placeholder="78.5" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Inverter Serial No."><Input placeholder="SMA-50K-…" /></FormField>
            <FormField label="Panel Batch No."><Input placeholder="TSP-B2025-LOT-…" /></FormField>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={`Commissioning — ${selected.id}`}
          footer={<div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            <Button><FileSignature size={13} /> Download Certificate</Button>
          </div>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[['Certificate ID', selected.id], ['Customer', selected.customer], ['Site', selected.site],
              ['System Size', `${selected.systemSize} kW`], ['Commission Date', selected.commissionDate ?? '—'],
              ['Performance Ratio', selected.pr ? `${selected.pr}%` : '—'],
              ['Inverter Serial', selected.inverterSerial ?? '—'], ['Panel Batch', selected.panelBatch ?? '—'],
              ['Panel Warranty', selected.warrantyPanel ?? '—'], ['Inverter Warranty', selected.warrantyInverter ?? '—'],
              ['Install Warranty', selected.warrantyInstall ?? '—'], ['Status', <CommBadge value={selected.status} />],
              ].map(([k, v]) => (
                <div key={k} className="glass-card p-2">
                  <div className="text-[var(--text-muted)] mb-0.5">{k}</div>
                  <div className="font-semibold text-[var(--text-primary)]">{v}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)] mb-2">Commissioning Checklist</div>
              <div className="space-y-1.5">
                {selected.checklist.map((c, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs ${c.pass ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${c.pass ? 'border-emerald-500 bg-emerald-500/20' : 'border-[var(--border-base)]'}`}>
                      {c.pass && <CheckCircle size={10} />}
                    </div>
                    {c.item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CommissioningPage;
