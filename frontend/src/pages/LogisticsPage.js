// Solar OS – EPC Edition — LogisticsPage.js
import React, { useState, useMemo, useRef } from 'react';
import { Truck, Plus, MapPin, Package, CheckCircle, Clock, Zap, Navigation, LayoutGrid, List } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select } from '../components/ui/Input';
import { KPICard } from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import { APP_CONFIG } from '../config/app.config';

// Local logistics data (extends mockData pattern)
const DISPATCHES = [
  { id: 'DS001', projectId: 'P001', customer: 'Ramesh Joshi', items: '125 Panels, 1 Inverter, BOS Kit', from: 'WH-Ahmedabad', to: 'GIDC Ahmedabad', status: 'Delivered', dispatchDate: '2026-02-20', driver: 'Mahesh K.', vehicle: 'GJ-01-AB-1234', cost: 8500 },
  { id: 'DS002', projectId: 'P002', customer: 'Suresh Bhatt', items: '375 Panels, 3 Inverters', from: 'WH-Ahmedabad', to: 'Vapi GIDC', status: 'In Transit', dispatchDate: '2026-02-25', driver: 'Raju S.', vehicle: 'GJ-05-CD-5678', cost: 22000 },
  { id: 'DS003', projectId: 'P001', customer: 'Ramesh Joshi', items: 'Mounting Structure (GI) x5 Sets', from: 'WH-Surat', to: 'GIDC Ahmedabad', status: 'Scheduled', dispatchDate: '2026-02-28', driver: 'TBD', vehicle: 'TBD', cost: 6000 },
  { id: 'DS004', projectId: 'P004', customer: 'Dinesh Trivedi', items: '140 Panels, 2x50kW Inverters', from: 'WH-Ahmedabad', to: 'Nadiad Plant', status: 'Scheduled', dispatchDate: '2026-03-05', driver: 'TBD', vehicle: 'TBD', cost: 9500 },
];

// Add logistics status to STATUS_CONFIG locally (domain: dispatch)
const DISPATCH_STATUS_MAP = {
  Delivered: { label: 'Delivered', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  'In Transit': { label: 'In Transit', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  Scheduled: { label: 'Scheduled', color: 'bg-[var(--bg-hover)] text-[var(--primary-light)] border-[var(--border-active)]' },
  Cancelled: { label: 'Cancelled', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const DispatchBadge = ({ value }) => {
  const meta = DISPATCH_STATUS_MAP[value] ?? { label: value, color: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-muted)]' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>
      {meta.label}
    </span>
  );
};

// ── Kanban stage defs ─────────────────────────────────────────────────────────
const DISPATCH_STAGES = [
  { id: 'Scheduled', label: 'Scheduled', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { id: 'In Transit', label: 'In Transit', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  { id: 'Delivered', label: 'Delivered', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { id: 'Cancelled', label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

const COLUMNS = [
  { key: 'id', header: 'Dispatch ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
  { key: 'projectId', header: 'Project', render: v => <span className="text-xs font-mono text-[var(--text-secondary)]">{v}</span> },
  { key: 'customer', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
  { key: 'items', header: 'Items', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
  { key: 'from', header: 'From', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'to', header: 'To', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'driver', header: 'Driver', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
  { key: 'vehicle', header: 'Vehicle', render: v => <span className="text-xs font-mono text-[var(--text-muted)]">{v}</span> },
  { key: 'dispatchDate', header: 'Dispatch Date', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'cost', header: 'Freight Cost', sortable: true, render: v => <span className="text-xs font-bold text-[var(--text-primary)]">₹{v.toLocaleString('en-IN')}</span> },
  { key: 'status', header: 'Status', render: v => <DispatchBadge value={v} /> },
];

const STATUS_FILTERS = ['All', 'Scheduled', 'In Transit', 'Delivered', 'Cancelled'];

/* ── Dispatch Kanban Card ── */
const DispatchCard = ({ d, onDragStart, onClick }) => {
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-[var(--primary)]/40 transition-all">
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-[10px] font-mono text-[var(--accent-light)]">{d.id}</span>
        <span className="text-[10px] font-mono text-[var(--text-secondary)]">{d.projectId}</span>
      </div>
      <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">{d.customer}</p>
      <p className="text-[10px] text-[var(--text-muted)] mb-2 line-clamp-2">{d.items}</p>
      <div className="flex items-center gap-1 text-[10px] text-cyan-400 mb-1">
        <MapPin size={9} /> {d.from} → {d.to}
      </div>
      <div className="flex items-center justify-between text-[10px] text-[var(--text-faint)]">
        <span className="flex items-center gap-1"><Truck size={9} />{d.driver}</span>
        <span>{d.dispatchDate}</span>
      </div>
      <div className="mt-1.5 text-[10px] font-bold text-[var(--text-secondary)]">
        ₹{d.cost.toLocaleString('en-IN')}
      </div>
    </div>
  );
};

/* ── Kanban Board ── */
const DispatchKanbanBoard = ({ dispatches, onStageChange, onCardClick }) => {
  const draggingId = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex gap-3 min-w-max">
        {DISPATCH_STAGES.map(stage => {
          const cards = dispatches.filter(d => d.status === stage.id);
          const totalCost = cards.reduce((a, d) => a + d.cost, 0);
          return (
            <div key={stage.id}
              className={`flex flex-col w-64 rounded-xl border transition-colors ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => { if (draggingId.current) onStageChange(draggingId.current, stage.id); draggingId.current = null; setDragOver(null); }}>
              <div className="flex items-center justify-between p-3 border-b border-[var(--border-base)]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {totalCost > 0 && <span className="text-[10px] text-[var(--text-muted)]">₹{totalCost.toLocaleString('en-IN')}</span>}
                  <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 p-2 flex-1 min-h-[160px]">
                {cards.map(d => (
                  <DispatchCard key={d.id} d={d}
                    onDragStart={() => { draggingId.current = d.id; }}
                    onClick={() => onCardClick(d)} />
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
const LogisticsPage = () => {
  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');
  const [statusFilter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [dispatches, setDispatches] = useState(DISPATCHES);

  const handleStageChange = (id, newStatus) =>
    setDispatches(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));

  const filtered = useMemo(() =>
    dispatches.filter(d =>
      (statusFilter === 'All' || d.status === statusFilter) &&
      (d.customer.toLowerCase().includes(search.toLowerCase()) ||
        d.items.toLowerCase().includes(search.toLowerCase()))
    ), [search, statusFilter, dispatches]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const delivered = dispatches.filter(d => d.status === 'Delivered').length;
  const inTransit = dispatches.filter(d => d.status === 'In Transit').length;
  const scheduled = dispatches.filter(d => d.status === 'Scheduled').length;
  const totalFreight = dispatches.reduce((a, d) => a + d.cost, 0);

  const ROW_ACTIONS = [
    { label: 'View Details', icon: Package, onClick: row => setSelected(row) },
    { label: 'Track Shipment', icon: Navigation, onClick: () => { } },
    { label: 'Mark Delivered', icon: CheckCircle, onClick: () => { } },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <div className="page-header">
        <div>
          <h1 className="heading-page">Logistics & Dispatch</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Material dispatch · delivery tracking · freight management</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="view-toggle-pill">
            <button onClick={() => setView('kanban')} className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`}><LayoutGrid size={14} /></button>
            <button onClick={() => setView('table')} className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`}><List size={14} /></button>
          </div>
          <Button onClick={() => setShowAdd(true)}><Plus size={13} /> Schedule Dispatch</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard title="In Transit" value={inTransit} icon={Truck} trend={0} trendLabel="active shipments" color="cyan" />
        <KPICard title="Scheduled" value={scheduled} icon={Clock} trend={+2} trendLabel="upcoming dispatches" color="accent" />
        <KPICard title="Delivered" value={delivered} icon={CheckCircle} trend={+1} trendLabel="this month" color="emerald" />
        <KPICard title="Freight Cost" value={`₹${totalFreight.toLocaleString('en-IN')}`} icon={MapPin} trend={-5} trendLabel="vs last month" color="solar" />
      </div>

      <div className="ai-banner">
        <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="text-[var(--accent-light)] font-semibold">AI Insight:</span>{' '}
          DS002 (Suresh Bhatt — Vapi GIDC) is in transit and expected within 2 days. DS003 and DS004 need vehicle assignment and driver confirmation before dispatch dates.
        </p>
      </div>

      {/* Active Shipments strip (kanban-only) */}
      {view === 'kanban' && inTransit > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Truck size={14} className="text-cyan-400" /> Active Shipments
          </h3>
          <div className="space-y-2">
            {dispatches.filter(d => d.status === 'In Transit').map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-muted)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Truck size={14} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{d.id} — {d.customer}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{d.items}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-cyan-400 font-medium">{d.from} → {d.to}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">Driver: {d.driver} · {d.vehicle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'kanban' ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">Drag dispatches between columns to update status</p>
            <Input placeholder="Search dispatches…" value={search}
              onChange={e => setSearch(e.target.value)} className="h-8 text-xs w-52" />
          </div>
          <DispatchKanbanBoard dispatches={filtered} onStageChange={handleStageChange} onCardClick={setSelected} />
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-[var(--text-muted)] mr-1">Filter:</span>
            {STATUS_FILTERS.map(s => (
              <button key={s} onClick={() => { setFilter(s); setPage(1); }}
                className={`filter-chip ${statusFilter === s ? 'filter-chip-active' : ''}`}>{s}</button>
            ))}
            <div className="ml-auto">
              <Input placeholder="Search dispatches…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-8 text-xs w-52" />
            </div>
          </div>
          <DataTable columns={COLUMNS} data={paginated} rowActions={ROW_ACTIONS}
            pagination={{ page, pageSize, total: filtered.length, onChange: setPage, onPageSizeChange: setPageSize }}
            emptyMessage="No dispatch records found." />
        </>
      )}

      {/* Schedule Dispatch Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Schedule Dispatch"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button onClick={() => setShowAdd(false)}><Plus size={13} /> Schedule</Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Project">
            <Select><option value="">Select Project</option>
              <option>P001 – Joshi Industries</option>
              <option>P002 – Suresh Bhatt</option>
              <option>P004 – Trivedi Foods</option>
            </Select>
          </FormField>
          <FormField label="Items to Dispatch"><Input placeholder="e.g. 125 Panels, 1 Inverter" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="From Warehouse">
              <Select><option value="">Select Warehouse</option>
                <option>WH-Ahmedabad</option><option>WH-Surat</option>
              </Select>
            </FormField>
            <FormField label="Dispatch Date"><Input type="date" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Driver Name"><Input placeholder="Driver name" /></FormField>
            <FormField label="Vehicle Number"><Input placeholder="GJ-01-AB-1234" /></FormField>
          </div>
          <FormField label="Freight Cost (₹)"><Input type="number" placeholder="8500" /></FormField>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={`Dispatch — ${selected.id}`}
          footer={<div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            <Button onClick={() => setSelected(null)}><CheckCircle size={13} /> Mark Delivered</Button>
          </div>}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['Dispatch ID', selected.id], ['Project', selected.projectId], ['Customer', selected.customer],
              ['Items', selected.items], ['From', selected.from], ['To', selected.to],
              ['Driver', selected.driver], ['Vehicle', selected.vehicle],
              ['Dispatch Date', selected.dispatchDate], ['Freight Cost', `₹${selected.cost.toLocaleString('en-IN')}`],
              ['Status', <DispatchBadge value={selected.status} />],
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

export default LogisticsPage;
