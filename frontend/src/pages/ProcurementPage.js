// Solar OS – EPC Edition — ProcurementPage.js
import React, { useState, useMemo, useRef } from 'react';
import {
  ShoppingCart, Plus, Truck, Star, Phone, Mail,
  CheckCircle, Zap, Package, LayoutGrid, List, Calendar
} from 'lucide-react';
import { VENDORS, PURCHASE_ORDERS } from '../data/mockData';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import { KPICard } from '../components/ui/KPICard';
import { Avatar } from '../components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import DataTable from '../components/ui/DataTable';
import { CURRENCY, APP_CONFIG } from '../config/app.config';
import { usePermissions } from '../hooks/usePermissions';
import { useAuditLog } from '../hooks/useAuditLog';
import CanAccess, { CanCreate, CanEdit, CanDelete } from '../components/CanAccess';
import { toast } from '../components/ui/Toast';

const fmt = CURRENCY.format;

// ── PO Stage Kanban definitions ────────────────────────────────────────────────
const PO_KANBAN_STAGES = [
  { id: 'Draft', label: 'Draft', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  { id: 'Ordered', label: 'Ordered', color: '#7c5cfc', bg: 'rgba(124,92,252,0.12)' },
  { id: 'In Transit', label: 'In Transit', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  { id: 'Delivered', label: 'Delivered', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { id: 'Cancelled', label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

const PO_COLUMNS = [
  { key: 'id', header: 'PO Number', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
  { key: 'vendorName', header: 'Vendor', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
  { key: 'items', header: 'Items', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
  { key: 'totalAmount', header: 'Amount', sortable: true, render: v => <span className="text-xs font-bold text-[var(--text-primary)]">{fmt(v)}</span> },
  { key: 'status', header: 'Status', render: v => <StatusBadge domain="purchaseOrder" value={v} /> },
  { key: 'orderedDate', header: 'Ordered', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'expectedDate', header: 'Expected', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'deliveredDate', header: 'Delivered', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
];

const VENDOR_COLUMNS = [
  { key: 'id', header: 'Vendor ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
  {
    key: 'name', header: 'Vendor Name', sortable: true, render: (v, row) => (
      <div className="flex items-center gap-2">
        <Avatar name={v} size="xs" />
        <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span>
      </div>
    )
  },
  { key: 'category', header: 'Category', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
  { key: 'contact', header: 'Contact', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'phone', header: 'Phone', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'city', header: 'City', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  {
    key: 'rating', header: 'Rating', sortable: true, render: v => (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={10} className={i < v ? 'text-yellow-400 fill-yellow-400' : 'text-[var(--border-base)]'} />
        ))}
      </div>
    )
  },
  { key: 'totalOrders', header: 'Total Orders', sortable: true, render: v => <span className="text-xs font-bold text-[var(--text-primary)]">{v}</span> },
];

const PO_STATUS_FILTERS = ['All', 'Draft', 'Ordered', 'In Transit', 'Delivered', 'Cancelled'];

/* ── PO Kanban Card ── */
const POCard = ({ po, onDragStart, onClick }) => {
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-[var(--primary)]/40 transition-all">
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-[10px] font-mono text-[var(--accent-light)]">{po.id}</span>
        <span className="text-[10px] font-bold text-[var(--text-primary)]">{fmt(po.totalAmount)}</span>
      </div>
      <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5 leading-tight">{po.vendorName}</p>
      <p className="text-[10px] text-[var(--text-muted)] mb-2 leading-relaxed line-clamp-2">{po.items}</p>
      <div className="flex items-center gap-1 text-[10px] text-[var(--text-faint)]">
        <Calendar size={9} />
        <span>Expected: {po.expectedDate}</span>
      </div>
      {po.deliveredDate && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-400">
          <CheckCircle size={9} />
          <span>Delivered: {po.deliveredDate}</span>
        </div>
      )}
    </div>
  );
};

/* ── PO Kanban Board ── */
const POKanbanBoard = ({ pos, onStageChange, onCardClick }) => {
  const draggingId = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex gap-3 min-w-max">
        {PO_KANBAN_STAGES.map(stage => {
          const cards = pos.filter(p => p.status === stage.id);
          const total = cards.reduce((a, p) => a + p.totalAmount, 0);
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
                  {total > 0 && <span className="text-[10px] text-[var(--text-muted)]">{fmt(total).replace('₹', '₹')}</span>}
                  <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 p-2 flex-1 min-h-[160px]">
                {cards.map(po => (
                  <POCard key={po.id} po={po}
                    onDragStart={() => { draggingId.current = po.id; }}
                    onClick={() => onCardClick(po)} />
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
const ProcurementPage = () => {
  const { can } = usePermissions();
  const { logCreate, logUpdate, logDelete, logStatusChange } = useAuditLog('procurement');

  // Permission guard helpers
  const guardCreate = () => {
    if (!can('procurement', 'create')) {
      toast.error('Permission denied: Cannot create procurement items');
      return false;
    }
    return true;
  };

  const guardEdit = () => {
    if (!can('procurement', 'edit')) {
      toast.error('Permission denied: Cannot edit procurement');
      return false;
    }
    return true;
  };

  const guardDelete = () => {
    if (!can('procurement', 'delete')) {
      toast.error('Permission denied: Cannot delete procurement items');
      return false;
    }
    return true;
  };

  const [poView, setPoView] = useState('kanban');
  const [poSearch, setPoSearch] = useState('');
  const [poStatus, setPoStatus] = useState('All');
  const [poPage, setPoPage] = useState(1);
  const [poPageSize, setPoPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [vPage, setVPage] = useState(1);
  const [vPageSize, setVPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showPO, setShowPO] = useState(false);
  const [showVendor, setShowVendor] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [pos, setPos] = useState(PURCHASE_ORDERS);

  const handlePOStageChange = (id, newStatus) => {
    if (!can('procurement', 'edit')) {
      toast.error('Permission denied: Cannot change PO status');
      return;
    }
    const po = pos.find(p => p.id === id);
    setPos(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    logStatusChange(po, po.status, newStatus);
  };

  const filteredPOs = useMemo(() =>
    pos.filter(po =>
      (poStatus === 'All' || po.status === poStatus) &&
      po.vendorName.toLowerCase().includes(poSearch.toLowerCase())
    ), [poSearch, poStatus, pos]);

  const paginatedPOs = filteredPOs.slice((poPage - 1) * poPageSize, poPage * poPageSize);
  const paginatedVendors = VENDORS.slice((vPage - 1) * vPageSize, vPage * vPageSize);

  const pendingPOs = pos.filter(p => p.status !== 'Delivered').length;
  const totalSpend = pos.reduce((a, p) => a + p.totalAmount, 0);
  const inTransit = pos.filter(p => p.status === 'In Transit').length;

  const PO_ACTIONS = [
    { label: 'View PO', icon: Package, onClick: row => setSelectedPO(row) },
    { label: 'Mark Delivered', icon: CheckCircle, onClick: (row) => { if (guardEdit()) console.log('Mark Delivered', row); } },
    { label: 'Track Shipment', icon: Truck, onClick: () => { } },
  ];
  const VENDOR_ACTIONS = [
    { label: 'View Vendor', icon: Package, onClick: row => setSelectedVendor(row) },
    { label: 'Call Vendor', icon: Phone, onClick: () => { } },
    { label: 'Email Vendor', icon: Mail, onClick: () => { } },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <div className="page-header">
        <div>
          <h1 className="heading-page">Procurement</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Purchase orders · vendor management · delivery tracking</p>
        </div>
        <div className="flex gap-2">
          <CanCreate module="procurement">
            <Button variant="ghost" onClick={() => { if (guardCreate()) setShowVendor(true); }}><Plus size={13} /> Add Vendor</Button>
          </CanCreate>
          <CanCreate module="procurement">
            <Button onClick={() => { if (guardCreate()) setShowPO(true); }}><Plus size={13} /> Create PO</Button>
          </CanCreate>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard title="Active POs" value={pendingPOs} icon={ShoppingCart} trend={+2} trendLabel="this month" color="accent" />
        <KPICard title="Total Spend" value={fmt(totalSpend)} icon={Package} trend={+8} trendLabel="vs last month" color="solar" />
        <KPICard title="In Transit" value={inTransit} icon={Truck} trend={0} trendLabel="awaiting delivery" color="cyan" />
        <KPICard title="Vendors" value={VENDORS.length} icon={Star} trend={+1} trendLabel="new this quarter" color="emerald" />
      </div>

      <div className="ai-banner">
        <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="text-[var(--accent-light)] font-semibold">AI Insight:</span>{' '}
          PO002 (SMA Inverters) is expected by Feb 28 — 3 days before Project P001 installation deadline. Consider expediting delivery.
        </p>
      </div>

      <Tabs defaultValue="pos">
        <TabsList>
          <TabsTrigger value="pos">Purchase Orders ({pos.length})</TabsTrigger>
          <TabsTrigger value="vendors">Vendors ({VENDORS.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pos">
          <div className="space-y-3">
            <div className="flex items-center gap-2 justify-between">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-[var(--text-muted)] mr-1">Status:</span>
                {PO_STATUS_FILTERS.map(s => (
                  <button key={s} onClick={() => { setPoStatus(s); setPoPage(1); }}
                    className={`filter-chip ${poStatus === s ? 'filter-chip-active' : ''}`}>{s}</button>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input placeholder="Search POs…" value={poSearch}
                  onChange={e => { setPoSearch(e.target.value); setPoPage(1); }} className="h-8 text-xs w-44" />
                <div className="view-toggle-pill">
                  <button onClick={() => setPoView('kanban')} className={`view-toggle-btn ${poView === 'kanban' ? 'active' : ''}`}><LayoutGrid size={13} /></button>
                  <button onClick={() => setPoView('table')} className={`view-toggle-btn ${poView === 'table' ? 'active' : ''}`}><List size={13} /></button>
                </div>
              </div>
            </div>

            {poView === 'kanban' ? (
              <>
                <p className="text-xs text-[var(--text-muted)]">Drag POs between columns to update their status</p>
                <POKanbanBoard pos={filteredPOs} onStageChange={handlePOStageChange} onCardClick={setSelectedPO} />
              </>
            ) : (
              <DataTable columns={PO_COLUMNS} data={paginatedPOs} rowActions={PO_ACTIONS}
                pagination={{ page: poPage, pageSize: poPageSize, total: filteredPOs.length, onChange: setPoPage, onPageSizeChange: setPoPageSize }}
                emptyMessage="No purchase orders found." />
            )}
          </div>
        </TabsContent>

        <TabsContent value="vendors">
          <DataTable columns={VENDOR_COLUMNS} data={paginatedVendors} rowActions={VENDOR_ACTIONS}
            pagination={{ page: vPage, pageSize: vPageSize, total: VENDORS.length, onChange: setVPage, onPageSizeChange: setVPageSize }}
            emptyMessage="No vendors found." />
        </TabsContent>
      </Tabs>

      {/* Create PO Modal */}
      <Modal open={showPO} onClose={() => setShowPO(false)} title="Create Purchase Order"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowPO(false)}>Cancel</Button>
          <CanCreate module="procurement">
            <Button onClick={() => { if (guardCreate()) { console.log('Create PO'); setShowPO(false); } }}><Plus size={13} /> Create PO</Button>
          </CanCreate>
        </div>}>
        <div className="space-y-3">
          <FormField label="Vendor">
            <Select><option value="">Select Vendor</option>
              {VENDORS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Items Description"><Textarea placeholder="e.g. 200 x 400W Mono PERC Panels" rows={2} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Total Amount (₹)"><Input type="number" placeholder="2900000" /></FormField>
            <FormField label="Expected Delivery"><Input type="date" /></FormField>
          </div>
          <FormField label="Related Project">
            <Select><option value="">Link to Project (optional)</option>
              <option>P001 – Joshi Industries</option>
              <option>P002 – Suresh Bhatt</option>
              <option>P004 – Trivedi Foods</option>
            </Select>
          </FormField>
        </div>
      </Modal>

      {/* Add Vendor Modal */}
      <Modal open={showVendor} onClose={() => setShowVendor(false)} title="Add Vendor"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowVendor(false)}>Cancel</Button>
          <CanCreate module="procurement">
            <Button onClick={() => { if (guardCreate()) { console.log('Add Vendor'); setShowVendor(false); } }}><Plus size={13} /> Add Vendor</Button>
          </CanCreate>
        </div>}>
        <div className="space-y-3">
          <FormField label="Vendor Name"><Input placeholder="Company name" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <Select><option value="">Select Category</option>
                {['Panel', 'Inverter', 'BOS', 'Structure', 'Cable', 'Other'].map(c => <option key={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="City"><Input placeholder="City" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Contact Person"><Input placeholder="Name" /></FormField>
            <FormField label="Phone"><Input placeholder="9876543210" /></FormField>
          </div>
          <FormField label="Email"><Input type="email" placeholder="vendor@company.com" /></FormField>
        </div>
      </Modal>

      {/* PO Detail Modal */}
      {selectedPO && (
        <Modal open={!!selectedPO} onClose={() => setSelectedPO(null)} title={`PO — ${selectedPO.id}`}
          footer={<Button variant="ghost" onClick={() => setSelectedPO(null)}>Close</Button>}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['PO Number', selectedPO.id], ['Vendor', selectedPO.vendorName], ['Items', selectedPO.items],
              ['Amount', fmt(selectedPO.totalAmount)], ['Status', <StatusBadge domain="purchaseOrder" value={selectedPO.status} />],
              ['Ordered Date', selectedPO.orderedDate], ['Expected Date', selectedPO.expectedDate],
              ['Delivered Date', selectedPO.deliveredDate ?? '—'],
            ].map(([k, v]) => (
              <div key={k} className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">{k}</div>
                <div className="font-semibold text-[var(--text-primary)]">{v}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <Modal open={!!selectedVendor} onClose={() => setSelectedVendor(null)} title={`Vendor — ${selectedVendor.name}`}
          footer={<div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setSelectedVendor(null)}>Close</Button>
            <Button onClick={() => setSelectedVendor(null)}><Phone size={13} /> Call Vendor</Button>
          </div>}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['Vendor ID', selectedVendor.id], ['Company', selectedVendor.name], ['Category', selectedVendor.category],
              ['Contact Person', selectedVendor.contact], ['Phone', selectedVendor.phone], ['Email', selectedVendor.email],
              ['City', selectedVendor.city], ['Total Orders', selectedVendor.totalOrders],
            ].map(([k, v]) => (
              <div key={k} className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">{k}</div>
                <div className="font-semibold text-[var(--text-primary)]">{v}</div>
              </div>
            ))}
            <div className="glass-card p-2 col-span-2">
              <div className="text-[var(--text-muted)] mb-1">Rating</div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className={i < selectedVendor.rating ? 'text-yellow-400 fill-yellow-400' : 'text-[var(--border-base)]'} />
                ))}
                <span className="text-xs text-[var(--text-muted)] ml-1">{selectedVendor.rating}/5</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProcurementPage;
