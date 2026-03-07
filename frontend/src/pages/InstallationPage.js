// Solar OS – EPC Edition — InstallationPage.js
import React, { useState, useMemo, useRef } from 'react';
import {
  Wrench, Plus, Camera, CheckCircle, Clock,
  Zap, Upload, LayoutGrid, List, User
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { Progress } from '../components/ui/Progress';
import DataTable from '../components/ui/DataTable';
import { APP_CONFIG } from '../config/app.config';
import { usePermissions } from '../hooks/usePermissions';
import { useAuditLog } from '../hooks/useAuditLog';
import CanAccess, { CanCreate, CanEdit, CanDelete } from '../components/CanAccess';
import { toast } from '../components/ui/Toast';

// Local installation data
const INSTALLATION_LOGS = [
  {
    id: 'IL001', projectId: 'P001', customer: 'Ramesh Joshi', site: 'GIDC Ahmedabad',
    technician: 'Kiran Tech', date: '2026-02-26', status: 'In Progress', progress: 60,
    tasks: [
      { name: 'Mounting Structure Installed', done: true },
      { name: 'Panel Mounting (Row 1–5)', done: true },
      { name: 'Panel Mounting (Row 6–10)', done: true },
      { name: 'DC Wiring', done: false },
      { name: 'Inverter Installation', done: false },
      { name: 'AC Wiring & DB', done: false },
      { name: 'Earthing', done: false },
    ],
  },
  {
    id: 'IL002', projectId: 'P003', customer: 'Prakash Agarwal', site: 'Ahmedabad Plant',
    technician: 'Kiran Tech', date: '2025-12-28', status: 'Completed', progress: 100,
    tasks: [
      { name: 'Mounting Structure Installed', done: true },
      { name: 'Panel Mounting', done: true },
      { name: 'DC Wiring', done: true },
      { name: 'Inverter Installation', done: true },
      { name: 'AC Wiring & DB', done: true },
      { name: 'Earthing', done: true },
    ],
  },
  {
    id: 'IL003', projectId: 'P004', customer: 'Dinesh Trivedi', site: 'Nadiad Plant',
    technician: 'TBD', date: '2026-03-10', status: 'Pending', progress: 0,
    tasks: [],
  },
  {
    id: 'IL004', projectId: 'P002', customer: 'Suresh Bhatt', site: 'Vapi GIDC',
    technician: 'Kiran Tech', date: '2026-03-15', status: 'Delayed', progress: 20,
    tasks: [
      { name: 'Mounting Structure Installed', done: true },
      { name: 'Panel Mounting (Partial)', done: false },
      { name: 'DC Wiring', done: false },
      { name: 'Inverter Installation', done: false },
    ],
  },
];

const NEUTRAL = 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-muted)]';
const STATUS_MAP = {
  'In Progress': { label: 'In Progress', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  Completed: { label: 'Completed', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  Pending: { label: 'Pending', color: NEUTRAL },
  Delayed: { label: 'Delayed', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const InstallBadge = ({ value }) => {
  const meta = STATUS_MAP[value] ?? { label: value, color: NEUTRAL };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>{meta.label}</span>;
};

// ── Kanban stage defs ─────────────────────────────────────────────────────────
const INSTALL_STAGES = [
  { id: 'Pending', label: 'Pending', color: 'var(--text-faint)', bg: 'var(--bg-elevated)' },
  { id: 'In Progress', label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { id: 'Delayed', label: 'Delayed', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  { id: 'Completed', label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
];

const COLUMNS = [
  { key: 'id', header: 'Log ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
  { key: 'projectId', header: 'Project', render: v => <span className="text-xs font-mono text-[var(--text-secondary)]">{v}</span> },
  { key: 'customer', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
  { key: 'site', header: 'Site', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'technician', header: 'Technician', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
  { key: 'date', header: 'Date', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  {
    key: 'progress', header: 'Progress', sortable: true, render: v => (
      <div className="flex items-center gap-2 min-w-[80px]">
        <Progress value={v} className="h-1.5 flex-1" />
        <span className="text-xs text-[var(--text-muted)] w-8 text-right">{v}%</span>
      </div>
    )
  },
  { key: 'status', header: 'Status', render: v => <InstallBadge value={v} /> },
];

const STATUS_FILTERS = ['All', 'Pending', 'In Progress', 'Completed', 'Delayed'];

/* ── Install Kanban Card ── */
const InstallCard = ({ log, onDragStart, onClick }) => {
  const doneTasks = log.tasks.filter(t => t.done).length;
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-[var(--primary)]/40 transition-all">
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-[10px] font-mono text-[var(--accent-light)]">{log.id}</span>
        <span className="text-[10px] font-mono text-[var(--text-secondary)]">{log.projectId}</span>
      </div>
      <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">{log.customer}</p>
      <p className="text-[10px] text-[var(--text-muted)] mb-2 truncate">{log.site}</p>
      <Progress value={log.progress} className="h-1 mb-2" />
      <div className="flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-[var(--text-muted)]"><User size={9} />{log.technician}</span>
        <span className="text-[var(--text-muted)]">{log.progress}%</span>
      </div>
      {log.tasks.length > 0 && (
        <div className="mt-1.5 text-[10px] text-[var(--text-faint)]">
          ✓ {doneTasks}/{log.tasks.length} tasks
        </div>
      )}
      <div className="mt-1 text-[10px] text-[var(--text-faint)]">{log.date}</div>
    </div>
  );
};

/* ── Kanban Board ── */
const InstallKanbanBoard = ({ logs, onStageChange, onCardClick }) => {
  const draggingId = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex gap-3 min-w-max">
        {INSTALL_STAGES.map(stage => {
          const cards = logs.filter(l => l.status === stage.id);
          const avgProg = cards.length ? Math.round(cards.reduce((a, l) => a + l.progress, 0) / cards.length) : 0;
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
                  {cards.length > 0 && <span className="text-[10px] text-[var(--text-muted)]">{avgProg}% avg</span>}
                  <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 p-2 flex-1 min-h-[160px]">
                {cards.map(l => (
                  <InstallCard key={l.id} log={l}
                    onDragStart={() => { draggingId.current = l.id; }}
                    onClick={() => onCardClick(l)} />
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
const InstallationPage = () => {
  const { can } = usePermissions();
  const { logCreate, logUpdate, logDelete, logStatusChange } = useAuditLog('installation');

  // Permission guard helpers
  const guardCreate = () => {
    if (!can('installation', 'create')) {
      toast.error('Permission denied: Cannot create installation logs');
      return false;
    }
    return true;
  };

  const guardEdit = () => {
    if (!can('installation', 'edit')) {
      toast.error('Permission denied: Cannot edit installation');
      return false;
    }
    return true;
  };

  const guardDelete = () => {
    if (!can('installation', 'delete')) {
      toast.error('Permission denied: Cannot delete installation logs');
      return false;
    }
    return true;
  };

  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');
  const [statusFilter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [logs, setLogs] = useState(INSTALLATION_LOGS);

  const handleStageChange = (id, newStatus) => {
    if (!can('installation', 'edit')) {
      toast.error('Permission denied: Cannot change installation status');
      return;
    }
    const log = logs.find(l => l.id === id);
    setLogs(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    logStatusChange(log, log.status, newStatus);
  };

  const filtered = useMemo(() =>
    logs.filter(l =>
      (statusFilter === 'All' || l.status === statusFilter) &&
      l.customer.toLowerCase().includes(search.toLowerCase())
    ), [search, statusFilter, logs]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const active = logs.filter(l => l.status === 'In Progress').length;
  const completed = logs.filter(l => l.status === 'Completed').length;
  const pending = logs.filter(l => l.status === 'Pending').length;
  const avgProg = Math.round(logs.reduce((a, l) => a + l.progress, 0) / logs.length);

  const ROW_ACTIONS = [
    { label: 'View Log', icon: Camera, onClick: row => setSelected(row) },
    { label: 'Add Photo', icon: Camera, onClick: (row) => { if (guardEdit()) console.log('Add Photo', row); } },
    { label: 'Mark Complete', icon: CheckCircle, onClick: (row) => { if (guardEdit()) console.log('Mark Complete', row); } },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Installation"
        subtitle="Site installation logs · task checklist · photo documentation"
        tabs={[
          { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
          { id: 'table', label: 'Table', icon: List }
        ]}
        activeTab={view}
        onTabChange={setView}
        actions={[
          { type: 'button', label: 'New Log', icon: Plus, variant: 'primary', onClick: () => setShowAdd(true) }
        ]}
      />

      {/* Installation Overview KPI Cards */}
      <div className="mb-2">
        <p className="text-xs text-[var(--text-muted)] mb-2 flex items-center gap-2">
          <Wrench size={12} className="text-[var(--accent-light)]" />
          <span>Installation Overview - Site installation tracking and progress</span>
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard title="Total Active Installations" value={active} icon={Wrench} sub="currently in progress" color="amber" />
          <KPICard title="Total Completed Installations" value={completed} icon={CheckCircle} sub="finished this month" color="emerald" />
          <KPICard title="Total Pending Installations" value={pending} icon={Clock} sub="awaiting start" color="accent" />
          <KPICard title="Average Installation Progress" value={`${avgProg}%`} icon={Zap} sub="across all active sites" color="solar" />
        </div>
      </div>

      <div className="ai-banner">
        <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="text-[var(--accent-light)] font-semibold">AI Insight:</span>{' '}
          IL001 (Joshi Industries) is 60% complete. DC wiring and inverter installation remain — estimated 2 more days. IL004 (Suresh Bhatt) is delayed — coordinate with site team.
        </p>
      </div>

      {/* Active site progress cards — shown in both views */}
      {logs.filter(l => l.status === 'In Progress').map(log => (
        <div key={log.id} className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Wrench size={16} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{log.id} — {log.customer}</p>
                <p className="text-xs text-[var(--text-muted)]">{log.site} · {log.technician}</p>
              </div>
            </div>
            <div className="text-right">
              <InstallBadge value={log.status} />
              <p className="text-xs text-[var(--text-muted)] mt-1">{log.progress}% complete</p>
            </div>
          </div>
          <Progress value={log.progress} className="h-2 mb-3" />
          <div className="grid grid-cols-2 gap-2">
            {log.tasks.map((t, i) => (
              <div key={i} className={`flex items-center gap-2 text-[11px] ${t.done ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${t.done ? 'border-emerald-500 bg-emerald-500/20' : 'border-[var(--border-base)]'}`}>
                  {t.done && <CheckCircle size={9} />}
                </div>
                {t.name}
              </div>
            ))}
          </div>
        </div>
      ))}

      {view === 'kanban' ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">Drag installation logs between columns to update status</p>
            <Input placeholder="Search installations…" value={search}
              onChange={e => setSearch(e.target.value)} className="h-8 text-xs w-52" />
          </div>
          <InstallKanbanBoard logs={filtered} onStageChange={handleStageChange} onCardClick={setSelected} />
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
              <Input placeholder="Search installations…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-8 text-xs w-52" />
            </div>
          </div>
          <DataTable columns={COLUMNS} data={paginated} rowActions={ROW_ACTIONS}
            pagination={{ page, pageSize, total: filtered.length, onChange: setPage, onPageSizeChange: setPageSize }}
            emptyMessage="No installation logs found." />
        </>
      )}

      {/* New Log Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Installation Log"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          <CanCreate module="installation">
            <Button onClick={() => { if (guardCreate()) setShowAdd(true); }}><Plus size={13} /> New Log</Button>
          </CanCreate>
        </div>}>
        <div className="space-y-3">
          <FormField label="Project">
            <Select><option value="">Select Project</option>
              <option>P001 – Joshi Industries</option><option>P004 – Trivedi Foods</option>
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Technician">
              <Select><option value="">Assign Technician</option><option>Kiran Tech</option></Select>
            </FormField>
            <FormField label="Start Date"><Input type="date" /></FormField>
          </div>
          <FormField label="Notes"><Textarea placeholder="Site observations, special requirements…" rows={2} /></FormField>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={`Installation Log — ${selected.id}`}
          footer={<div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            <Button><Upload size={13} /> Upload Photos</Button>
          </div>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[['Log ID', selected.id], ['Project', selected.projectId], ['Customer', selected.customer],
              ['Site', selected.site], ['Technician', selected.technician], ['Date', selected.date]
              ].map(([k, v]) => (
                <div key={k} className="glass-card p-2">
                  <div className="text-[var(--text-muted)] mb-0.5">{k}</div>
                  <div className="font-semibold text-[var(--text-primary)]">{v}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-[var(--text-primary)]">Progress</span>
                <span className="text-[var(--text-muted)]">{selected.progress}%</span>
              </div>
              <Progress value={selected.progress} className="h-2" />
            </div>
            {selected.tasks.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)] mb-2">Task Checklist</div>
                <div className="space-y-1.5">
                  {selected.tasks.map((t, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs ${t.done ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${t.done ? 'bg-emerald-500/20 border-emerald-500' : 'border-[var(--border-base)]'}`}>
                        {t.done && <CheckCircle size={10} />}
                      </div>
                      {t.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InstallationPage;
