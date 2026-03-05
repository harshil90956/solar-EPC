import React, { useState, useMemo, useRef } from 'react';
import {
  Headphones, Plus, Clock, CheckCircle, AlertTriangle,
  Shield, Zap, Wrench, LayoutGrid, List, Tag,
} from 'lucide-react';
import { TICKETS } from '../data/mockData';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { Avatar } from '../components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import DataTable from '../components/ui/DataTable';
import { APP_CONFIG } from '../config/app.config';

/* ── AMC local data ─────────────────────────────────────────────────────────── */
const AMC_CONTRACTS = [
  { id: 'AMC001', customer: 'Prakash Agarwal', site: 'Ahmedabad Plant', systemSize: 80, startDate: '2026-01-15', endDate: '2027-01-15', status: 'Active', nextVisit: '2026-07-15', amount: 48000 },
  { id: 'AMC002', customer: 'Meena Patel', site: 'Morbi Factory', systemSize: 40, startDate: '2025-09-22', endDate: '2026-09-22', status: 'Active', nextVisit: '2026-03-22', amount: 24000 },
];

/* ── Ticket stage defs ──────────────────────────────────────────────────────── */
const TICKET_STAGES = [
  { id: 'Open', label: 'Open', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  { id: 'Scheduled', label: 'Scheduled', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { id: 'In Progress', label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { id: 'Resolved', label: 'Resolved', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { id: 'Closed', label: 'Closed', color: '#64748b', bg: 'rgba(100,116,139,0.10)' },
];

/* ── Priority helpers ───────────────────────────────────────────────────────── */
const NEUTRAL_BADGE = 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-muted)]';
const PRIORITY_MAP = {
  High: { label: 'High', color: 'bg-red-500/15    text-red-400    border-red-500/30' },
  Medium: { label: 'Medium', color: 'bg-amber-500/15  text-amber-400  border-amber-500/30' },
  Low: { label: 'Low', color: NEUTRAL_BADGE },
};
const PriorityBadge = ({ value }) => {
  const meta = PRIORITY_MAP[value] ?? PRIORITY_MAP.Low;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>{meta.label}</span>;
};

/* ── AMC badge ──────────────────────────────────────────────────────────────── */
const AMC_MAP = {
  Active: { label: 'Active', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  Expired: { label: 'Expired', color: 'bg-red-500/15    text-red-400    border-red-500/30' },
  Expiring: { label: 'Expiring', color: 'bg-amber-500/15  text-amber-400  border-amber-500/30' },
};
const AmcBadge = ({ value }) => {
  const meta = AMC_MAP[value] ?? AMC_MAP.Active;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>{meta.label}</span>;
};

/* ── Ticket card ────────────────────────────────────────────────────────────── */
const PRIORITY_BORDER = { High: 'border-l-red-500', Medium: 'border-l-amber-500', Low: 'border-l-[var(--border-muted)]' };

const TicketCard = ({ ticket, onDragStart, onClick }) => (
  <div
    draggable
    onDragStart={() => onDragStart(ticket.id)}
    onClick={() => onClick(ticket)}
    className={`glass-card p-3 cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all space-y-2 border-l-2 ${PRIORITY_BORDER[ticket.priority] ?? 'border-l-[var(--border-muted)]'}`}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-mono text-[var(--accent-light)]">{ticket.id}</span>
      <PriorityBadge value={ticket.priority} />
    </div>
    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{ticket.customerName}</p>
    <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
      <Tag size={9} /><span className="truncate">{ticket.type}</span>
    </div>
    <p className="text-[10px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">{ticket.description}</p>
    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
      <Avatar name={ticket.assignedTo} size="xs" />
      <span className="truncate">{ticket.assignedTo}</span>
      <span className="ml-auto">{ticket.created}</span>
    </div>
  </div>
);

/* ── Ticket Kanban board ─────────────────────────────────────────────────────── */
const TicketKanbanBoard = ({ tickets, onStageChange, onCardClick }) => {
  const draggingId = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex gap-3 min-w-max">
        {TICKET_STAGES.map(stage => {
          const cards = tickets.filter(t => t.status === stage.id);
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
                <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
              </div>
              <div className="flex flex-col gap-2 p-2 flex-1 min-h-[120px]">
                {cards.map(t => (
                  <TicketCard key={t.id} ticket={t}
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
const TICKET_COLUMNS = [
  { key: 'id', header: 'Ticket ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
  { key: 'customerName', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
  { key: 'type', header: 'Type', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
  { key: 'description', header: 'Description', render: v => <span className="text-xs text-[var(--text-muted)] max-w-[200px] truncate block">{v}</span> },
  { key: 'priority', header: 'Priority', render: v => <PriorityBadge value={v} /> },
  { key: 'status', header: 'Status', render: v => <StatusBadge domain="ticket" value={v} /> },
  {
    key: 'assignedTo', header: 'Assigned', render: v => (
      <div className="flex items-center gap-1.5">
        <Avatar name={v} size="xs" />
        <span className="text-xs text-[var(--text-muted)]">{v}</span>
      </div>
    )
  },
  { key: 'created', header: 'Created', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'resolved', header: 'Resolved', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
];

const AMC_COLUMNS = [
  { key: 'id', header: 'Contract ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
  { key: 'customer', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
  { key: 'site', header: 'Site', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'systemSize', header: 'Size', render: v => <span className="text-xs font-bold text-[var(--solar)]">{v} kW</span> },
  { key: 'startDate', header: 'Start Date', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'endDate', header: 'End Date', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'nextVisit', header: 'Next Visit', render: v => <span className="text-xs text-cyan-400">{v}</span> },
  { key: 'amount', header: 'AMC Value', sortable: true, render: v => <span className="text-xs font-bold text-[var(--text-primary)]">₹{v.toLocaleString('en-IN')}</span> },
  { key: 'status', header: 'Status', render: v => <AmcBadge value={v} /> },
];

const TICKET_STATUS_FILTERS = ['All', 'Open', 'Scheduled', 'In Progress', 'Resolved', 'Closed'];

/* ══════════════════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════════════════ */
const ServicePage = () => {
  const [tickets, setTickets] = useState(TICKETS);
  const [view, setView] = useState('kanban');
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatus, setTicketStatus] = useState('All');
  const [tPage, setTPage] = useState(1);
  const [tPageSize, setTPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [aPage, setAPage] = useState(1);
  const [aPageSize, setAPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);

  const handleStageChange = (id, newStage) =>
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStage } : t));

  const filteredTickets = useMemo(() =>
    tickets.filter(t =>
      (ticketStatus === 'All' || t.status === ticketStatus) &&
      t.customerName.toLowerCase().includes(ticketSearch.toLowerCase())
    ), [tickets, ticketSearch, ticketStatus]);

  const paginatedTickets = filteredTickets.slice((tPage - 1) * tPageSize, tPage * tPageSize);
  const paginatedAMC = AMC_CONTRACTS.slice((aPage - 1) * aPageSize, aPage * aPageSize);

  const openTickets = tickets.filter(t => t.status === 'Open').length;
  const inProgress = tickets.filter(t => t.status === 'In Progress').length;
  const resolved = tickets.filter(t => t.status === 'Resolved').length;
  const activeAMC = AMC_CONTRACTS.filter(a => a.status === 'Active').length;

  const TICKET_ACTIONS = [
    { label: 'View Ticket', icon: Headphones, onClick: row => setSelected(row) },
    { label: 'Assign Engineer', icon: Wrench, onClick: () => { } },
    { label: 'Mark Resolved', icon: CheckCircle, onClick: () => { } },
  ];
  const AMC_ACTIONS = [
    { label: 'View Contract', icon: Shield, onClick: () => { } },
    { label: 'Schedule Visit', icon: Clock, onClick: () => { } },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Service & AMC"
        subtitle="Support tickets · maintenance · AMC contracts · warranty claims"
        actions={[
          { type: 'button', label: 'New Ticket', icon: Plus, variant: 'primary', onClick: () => setShowAdd(true) }
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard title="Open Tickets" value={openTickets} icon={AlertTriangle} trend={+1} trendLabel="need attention" color="red" />
        <KPICard title="In Progress" value={inProgress} icon={Wrench} trend={0} trendLabel="being handled" color="amber" />
        <KPICard title="Resolved" value={resolved} icon={CheckCircle} trend={+3} trendLabel="this month" color="emerald" />
        <KPICard title="AMC Contracts" value={activeAMC} icon={Shield} trend={+1} trendLabel="active contracts" color="accent" />
      </div>

      <div className="ai-banner">
        <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="text-[var(--accent-light)] font-semibold">AI Insight:</span>{' '}
          T001 (Prakash Agarwal) — inverter fault E003 is a known firmware issue. Recommend remote update first before site visit. T004 (Trivedi Foods) — generation loss may indicate dust accumulation, schedule cleaning.
        </p>
      </div>

      <Tabs defaultValue="tickets">
        <TabsList>
          <TabsTrigger value="tickets">Support Tickets ({tickets.length})</TabsTrigger>
          <TabsTrigger value="amc">AMC Contracts ({AMC_CONTRACTS.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-[var(--text-muted)] mr-1">Status:</span>
              {TICKET_STATUS_FILTERS.map(s => (
                <button key={s} onClick={() => { setTicketStatus(s); setTPage(1); }}
                  className={`filter-chip ${ticketStatus === s ? 'filter-chip-active' : ''}`}>{s}</button>
              ))}
              <div className="flex items-center gap-2 ml-auto">
                <Input placeholder="Search tickets..." value={ticketSearch}
                  onChange={e => { setTicketSearch(e.target.value); setTPage(1); }}
                  className="h-8 text-xs w-44" />
                <div className="view-toggle-pill">
                  <button onClick={() => setView('kanban')} className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`} title="Kanban"><LayoutGrid size={13} /></button>
                  <button onClick={() => setView('table')} className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`} title="Table"><List size={13} /></button>
                </div>
              </div>
            </div>

            {view === 'kanban' ? (
              <TicketKanbanBoard tickets={filteredTickets} onStageChange={handleStageChange} onCardClick={setSelected} />
            ) : (
              <DataTable
                columns={TICKET_COLUMNS}
                data={paginatedTickets}
                rowActions={TICKET_ACTIONS}
                pagination={{ page: tPage, pageSize: tPageSize, total: filteredTickets.length, onChange: setTPage, onPageSizeChange: setTPageSize }}
                emptyMessage="No tickets found."
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="amc">
          <DataTable
            columns={AMC_COLUMNS}
            data={paginatedAMC}
            rowActions={AMC_ACTIONS}
            pagination={{ page: aPage, pageSize: aPageSize, total: AMC_CONTRACTS.length, onChange: setAPage, onPageSizeChange: setAPageSize }}
            emptyMessage="No AMC contracts found."
          />
        </TabsContent>
      </Tabs>

      {/* New Ticket Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Raise Service Ticket"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => setShowAdd(false)}><Plus size={13} /> Submit Ticket</Button>
          </div>
        }>
        <div className="space-y-3">
          <FormField label="Customer">
            <Select><option value="">Select Customer</option>
              <option>Prakash Agarwal</option><option>Meena Patel</option>
              <option>Suresh Bhatt</option><option>Dinesh Trivedi</option>
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Ticket Type">
              <Select><option value="">Select Type</option>
                {['Maintenance', 'AMC', 'Warranty', 'Breakdown', 'Inspection'].map(t => <option key={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Priority">
              <Select><option value="">Priority</option>
                <option>High</option><option>Medium</option><option>Low</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Description">
            <Textarea placeholder="Describe the issue in detail..." rows={3} />
          </FormField>
          <FormField label="Assigned To">
            <Select><option value="">Assign Technician</option><option>Kiran Tech</option></Select>
          </FormField>
        </div>
      </Modal>

      {/* Ticket Detail Modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={`Ticket — ${selected.id}`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
              <Button><CheckCircle size={13} /> Mark Resolved</Button>
            </div>
          }>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                ['Ticket ID', selected.id],
                ['Customer', selected.customerName],
                ['Type', selected.type],
                ['Priority', <PriorityBadge value={selected.priority} />],
                ['Status', <StatusBadge domain="ticket" value={selected.status} />],
                ['Assigned To', selected.assignedTo],
                ['Created', selected.created],
                ['Resolved', selected.resolved ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="glass-card p-2">
                  <div className="text-[var(--text-muted)] mb-0.5">{k}</div>
                  <div className="font-semibold text-[var(--text-primary)]">{v}</div>
                </div>
              ))}
            </div>
            <div className="glass-card p-3">
              <div className="text-[11px] text-[var(--text-muted)] mb-1">Description</div>
              <p className="text-xs text-[var(--text-secondary)]">{selected.description}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ServicePage;
