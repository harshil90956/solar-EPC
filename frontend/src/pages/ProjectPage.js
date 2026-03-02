// Solar OS – EPC Edition — ProjectPage.js
import React, { useState, useMemo, useRef } from 'react';
import {
  FolderOpen, Plus, Calendar, CheckCircle, Zap, TrendingUp, BarChart2,
  LayoutGrid, List, User, Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { PROJECTS, PROJECT_STAGE_TREND } from '../data/mockData';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select } from '../components/ui/Input';
import { KPICard } from '../components/ui/KPICard';
import { Progress } from '../components/ui/Progress';
import { Stepper } from '../components/ui/Stepper';
import DataTable from '../components/ui/DataTable';
import { CURRENCY, APP_CONFIG } from '../config/app.config';

const fmt = CURRENCY.format;

const KANBAN_STAGES = [
  { id: 'Survey', label: 'Survey', color: '#7c5cfc', bg: 'rgba(124,92,252,0.12)' },
  { id: 'Design', label: 'Design', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  { id: 'Quotation', label: 'Quotation', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { id: 'Procurement', label: 'Procurement', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { id: 'Installation', label: 'Installation', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { id: 'Commissioned', label: 'Commissioned', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { id: 'On Hold', label: 'On Hold', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
];

const COLUMNS = [
  { key: 'id', header: 'Project ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
  { key: 'customerName', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
  { key: 'site', header: 'Site', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'systemSize', header: 'Size', sortable: true, render: v => <span className="text-xs font-bold text-[var(--solar)]">{v} kW</span> },
  { key: 'pm', header: 'PM', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
  {
    key: 'progress', header: 'Progress', sortable: true, render: v => (
      <div className="flex items-center gap-2 min-w-[90px]">
        <Progress value={v} className="h-1.5 flex-1" />
        <span className="text-xs text-[var(--text-muted)] w-8 text-right">{v}%</span>
      </div>
    )
  },
  { key: 'status', header: 'Status', render: v => <StatusBadge domain="project" value={v} /> },
  { key: 'estEndDate', header: 'Est. End', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
  { key: 'value', header: 'Value', sortable: true, render: v => <span className="text-xs font-bold text-[var(--text-primary)]">{fmt(v)}</span> },
];

const STATUS_FILTERS = ['All', 'Survey', 'Design', 'Quotation', 'Procurement', 'Installation', 'Commissioned', 'On Hold'];

/* ── Kanban Card ── */
const ProjectCard = ({ project, onDragStart, onClick }) => (
  <div draggable onDragStart={onDragStart} onClick={onClick}
    className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-[var(--primary)]/40 transition-all">
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[10px] font-mono text-[var(--accent-light)]">{project.id}</span>
      <span className="text-[10px] font-bold text-[var(--solar)]">{project.systemSize} kW</span>
    </div>
    <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5 leading-tight">{project.customerName}</p>
    <p className="text-[10px] text-[var(--text-muted)] mb-2 truncate">{project.site}</p>
    <Progress value={project.progress} className="h-1 mb-2" />
    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
      <span className="flex items-center gap-1"><User size={9} />{project.pm}</span>
      <span>{project.progress}%</span>
    </div>
    {project.estEndDate && (
      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[var(--text-faint)]">
        <Clock size={9} />{project.estEndDate}
      </div>
    )}
    <div className="mt-1.5 text-[10px] font-bold text-[var(--text-secondary)]">{fmt(project.value)}</div>
  </div>
);

/* ── Kanban Board ── */
const KanbanBoard = ({ projects, onStageChange, onCardClick }) => {
  const draggingId = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex gap-3 min-w-max">
        {KANBAN_STAGES.map(stage => {
          const cards = projects.filter(p => p.status === stage.id);
          const kw = cards.reduce((a, p) => a + p.systemSize, 0);
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
                  {kw > 0 && <span className="text-[10px] text-[var(--solar)] font-bold">{kw}kW</span>}
                  <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 p-2 flex-1 min-h-[180px]">
                {cards.map(p => (
                  <ProjectCard key={p.id} project={p}
                    onDragStart={() => { draggingId.current = p.id; }}
                    onClick={() => onCardClick(p)} />
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
const ProjectPage = () => {
  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');
  const [statusFilter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [projects, setProjects] = useState(PROJECTS);
  const [form, setForm] = useState({ customerName: '', site: '', systemSize: '', pm: '', value: '', estEndDate: '' });

  const handleStageChange = (id, newStage) =>
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStage } : p));

  const filtered = useMemo(() =>
    projects.filter(p =>
      (statusFilter === 'All' || p.status === statusFilter) &&
      p.customerName.toLowerCase().includes(search.toLowerCase())
    ), [search, statusFilter, projects]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalKW = projects.reduce((a, p) => a + p.systemSize, 0);
  const active = projects.filter(p => p.status !== 'Commissioned').length;
  const commissioned = projects.filter(p => p.status === 'Commissioned').length;
  const avgProgress = Math.round(projects.reduce((a, p) => a + p.progress, 0) / projects.length);

  const ROW_ACTIONS = [
    { label: 'View Details', icon: FolderOpen, onClick: row => setSelected(row) },
    { label: 'Update Status', icon: CheckCircle, onClick: () => { } },
    { label: 'View Timeline', icon: Calendar, onClick: () => { } },
  ];

  const STEPPER_STEPS = selected?.milestones?.map(m => ({ name: m.name, status: m.status, date: m.date })) ?? [];

  return (
    <div className="animate-fade-in space-y-5">
      <div className="page-header">
        <div>
          <h1 className="heading-page">Project Management</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Track all EPC projects · milestones · progress · delivery</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="view-toggle-pill">
            <button onClick={() => setView('kanban')}
              className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`}><LayoutGrid size={14} /></button>
            <button onClick={() => setView('table')}
              className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`}><List size={14} /></button>
          </div>
          <Button onClick={() => setShowAdd(true)}><Plus size={13} /> New Project</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Active Projects" value={active} sub="Currently executing" icon={FolderOpen} accentColor="#3b82f6" trend="+12% vs last mo" trendUp />
        <KPICard label="Total Capacity" value={`${totalKW} kW`} sub="Pipeline capacity" icon={Zap} accentColor="#f59e0b" trend="+8% installed" trendUp />
        <KPICard label="Avg. Progress" value={`${avgProgress}%`} sub="Across all projects" icon={TrendingUp} accentColor="#22c55e" trend="+5% completion" trendUp />
        <KPICard label="Commissioned" value={commissioned} sub="Completed this year" icon={CheckCircle} accentColor="#06b6d4" trend="+2 this month" trendUp />
      </div>

      <div className="ai-banner">
        <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="text-[var(--accent-light)] font-semibold">AI Insight:</span>{' '}
          Project P001 (Joshi Industries) is on track for on-time commissioning. P004 (Trivedi Foods) may face a 5-day delay — procurement ETA slipped by 2 days. Review PO002 immediately.
        </p>
      </div>

      {view === 'table' && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={15} className="text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Project Stage Trend (5 months)</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={PROJECT_STAGE_TREND} barSize={12} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, fontSize: 12 }} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="survey" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="Survey" />
              <Bar dataKey="design" fill="#06b6d4" radius={[3, 3, 0, 0]} name="Design" />
              <Bar dataKey="installation" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Installation" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {view === 'kanban' ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">Drag cards between columns to update project stage</p>
            <Input placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs w-52" />
          </div>
          <KanbanBoard projects={filtered} onStageChange={handleStageChange} onCardClick={setSelected} />
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
              <Input placeholder="Search projects…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-8 text-xs w-52" />
            </div>
          </div>
          <DataTable columns={COLUMNS} data={paginated} total={filtered.length}
            page={page} pageSize={pageSize} onPageChange={setPage}
            onPageSizeChange={s => { setPageSize(s); setPage(1); }}
            search={search} onSearch={v => { setSearch(v); setPage(1); }}
            rowActions={ROW_ACTIONS} emptyText="No projects found." />
        </>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Project"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button onClick={() => setShowAdd(false)}><Plus size={13} /> Create Project</Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Customer Name"><Input placeholder="Customer name" value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} /></FormField>
          <FormField label="Site Address"><Input placeholder="Installation site" value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="System Size (kW)"><Input type="number" placeholder="50" value={form.systemSize} onChange={e => setForm(f => ({ ...f, systemSize: e.target.value }))} /></FormField>
            <FormField label="Project Value (₹)"><Input type="number" placeholder="280000" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Project Manager">
              <Select value={form.pm} onChange={e => setForm(f => ({ ...f, pm: e.target.value }))}>
                <option value="">Assign PM</option>
                <option>Neha Gupta</option><option>Arjun Mehta</option>
              </Select>
            </FormField>
            <FormField label="Estimated End Date"><Input type="date" value={form.estEndDate} onChange={e => setForm(f => ({ ...f, estEndDate: e.target.value }))} /></FormField>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={`Project — ${selected.id}`}
          footer={<div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            <Button><CheckCircle size={13} /> Mark Stage Complete</Button>
          </div>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[['Customer', selected.customerName], ['Site', selected.site], ['System Size', `${selected.systemSize} kW`], ['Project Manager', selected.pm],
              ['Status', <StatusBadge domain="project" value={selected.status} />], ['Value', fmt(selected.value)],
              ['Start Date', selected.startDate], ['Est. End Date', selected.estEndDate ?? '—']
              ].map(([k, v]) => (
                <div key={k} className="glass-card p-2">
                  <div className="text-[var(--text-muted)] mb-0.5">{k}</div>
                  <div className="font-semibold text-[var(--text-primary)]">{v}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs flex items-center justify-between mb-1">
                <span className="font-semibold text-[var(--text-primary)]">Overall Progress</span>
                <span className="text-[var(--text-muted)]">{selected.progress}%</span>
              </div>
              <Progress value={selected.progress} className="h-2" />
            </div>
            {STEPPER_STEPS.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)] mb-3">Milestone Tracker</div>
                <Stepper steps={STEPPER_STEPS} />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProjectPage;
