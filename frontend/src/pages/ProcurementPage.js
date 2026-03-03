// Solar OS – EPC Edition — ProcurementPage.js
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ShoppingCart, Plus, Truck, Star, Phone, Mail,
  CheckCircle, Zap, Package, LayoutGrid, List, Calendar
} from 'lucide-react';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import { KPICard } from '../components/ui/KPICard';
import { Avatar } from '../components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import DataTable from '../components/ui/DataTable';
import { CURRENCY, APP_CONFIG } from '../config/app.config';
import { api } from '../lib/apiClient';

const fmt = CURRENCY.format;
const fmtFull = CURRENCY.formatFull;

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
  const [pos, setPos] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newVendor, setNewVendor] = useState({ name: '', category: '', city: '', contact: '', phone: '', email: '' });
  const [newPO, setNewPO] = useState({ vendorId: '', items: '', totalAmount: '', expectedDate: '', relatedProjectId: '' });

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Reset vPage when vendors change to fix pagination showing empty table
  useEffect(() => {
    setVPage(1);
  }, [vendors.length]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vendorsRes, posRes] = await Promise.all([
        api.get('/procurement/vendors'),
        api.get('/procurement/purchase-orders')
      ]);
      // Handle API response - could be direct array or wrapped object
      let vendorsData = [];
      let posData = [];
      
      if (Array.isArray(vendorsRes.data)) {
        vendorsData = vendorsRes.data;
      } else if (vendorsRes.data && typeof vendorsRes.data === 'object') {
        vendorsData = vendorsRes.data.data || [];
      }
      
      if (Array.isArray(posRes.data)) {
        posData = posRes.data;
      } else if (posRes.data && typeof posRes.data === 'object') {
        posData = posRes.data.data || [];
      }
      
      setVendors(vendorsData);
      setPos(posData);
    } catch (error) {
      console.error('Error fetching procurement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePOStageChange = async (id, newStatus) => {
    try {
      await api.patch(`/procurement/purchase-orders/${id}/status`, { status: newStatus });
      setPos(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (error) {
      console.error('Error updating PO status:', error);
    }
  };

  const handleCreateVendor = async () => {
    try {
      const res = await api.post('/procurement/vendors', newVendor);
      // Refetch all data to ensure UI is in sync with backend
      await fetchData();
      setShowVendor(false);
      setNewVendor({ name: '', category: '', city: '', contact: '', phone: '', email: '' });
    } catch (error) {
      console.error('Error creating vendor:', error);
    }
  };

  const handleCallVendor = (vendor) => {
    if (vendor?.phone) {
      window.open(`tel:${vendor.phone}`, '_self');
    } else {
      alert('No phone number available');
    }
  };

  const handleEmailVendor = async (vendor) => {
    if (vendor?.email) {
      try {
        const subject = 'Purchase Order Inquiry';
        const text = `Dear ${vendor.name || vendor.contact || 'Vendor'},\n\nI hope this email finds you well. We are interested in discussing potential purchase orders and would like to connect with you regarding our requirements.\n\nPlease let us know your availability for a brief discussion.\n\nBest regards,\nSolarOS Team`;
        
        const res = await api.post('/email/send', {
          to: vendor.email,
          subject,
          text
        });
        
        if (res.data?.success) {
          alert(`Email sent to ${vendor.email}`);
        } else {
          alert(`Email queued: ${res.data?.message || 'Will be sent shortly'}`);
        }
      } catch (error) {
        console.error('Error sending email:', error);
        alert('Failed to send email. Please try again later.');
      }
    } else {
      alert('No email address available');
    }
  };

  const handleCreatePO = async () => {
    try {
      const payload = {
        ...newPO,
        totalAmount: Number(newPO.totalAmount),
      };
      const res = await api.post('/procurement/purchase-orders', payload);
      // Refetch all data to ensure UI is in sync with backend
      await fetchData();
      setShowPO(false);
      setNewPO({ vendorId: '', items: '', totalAmount: '', expectedDate: '', relatedProjectId: '' });
    } catch (error) {
      console.error('Error creating PO:', error);
    }
  };

  const filteredPOs = useMemo(() =>
    pos.filter(po => po && 
      (poStatus === 'All' || po?.status === poStatus) &&
      po?.vendorName?.toLowerCase().includes(poSearch.toLowerCase())
    ), [poSearch, poStatus, pos]);

  const paginatedPOs = filteredPOs.slice((poPage - 1) * poPageSize, poPage * poPageSize);
  const paginatedVendors = vendors.filter(Boolean).slice((vPage - 1) * vPageSize, vPage * vPageSize);

  // Debug logging for pagination issue
  console.log('vendors:', vendors, 'length:', vendors.length);
  console.log('vendors.filter(Boolean):', vendors.filter(Boolean));
  console.log('paginatedVendors:', paginatedVendors);
  console.log('vPage:', vPage, 'vPageSize:', vPageSize);

  const pendingPOs = pos.filter(p => p && p?.status !== 'Delivered' && p?.status !== 'Cancelled').length;
  const totalSpend = pos.reduce((a, p) => a + (p?.totalAmount || 0), 0);
  const inTransit = pos.filter(p => p && p?.status === 'In Transit').length;
  const delivered = pos.filter(p => p && p?.status === 'Delivered').length;

  const PO_ACTIONS = [
    { label: 'View PO', icon: Package, onClick: row => setSelectedPO(row) },
    { label: 'Mark Delivered', icon: CheckCircle, onClick: (row) => handlePOStageChange(row.id, 'Delivered') },
    { label: 'Track Shipment', icon: Truck, onClick: () => { } },
  ];
  const VENDOR_ACTIONS = [
    { label: 'View Vendor', icon: Package, onClick: row => setSelectedVendor(row) },
    { label: 'Call Vendor', icon: Phone, onClick: row => handleCallVendor(row) },
    { label: 'Email Vendor', icon: Mail, onClick: row => handleEmailVendor(row) },
  ];

  if (loading) {
    return <div className="animate-fade-in space-y-5"><p className="text-xs text-[var(--text-muted)]">Loading...</p></div>;
  }

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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard title="Active POs" value={pendingPOs} icon={ShoppingCart} color="accent" />
        <KPICard title="Delivered" value={delivered} icon={CheckCircle} color="emerald" />
        <KPICard title="In Transit" value={inTransit} icon={Truck} color="cyan" />
        <KPICard title="Total Spend" value={fmtFull(totalSpend)} icon={Package} color="solar" />
        <KPICard title="Vendors" value={vendors.length} icon={Star} color="emerald" />
      </div>

      <div className="ai-banner">
        <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="text-[var(--accent-light)] font-semibold">Procurement:</span>{' '}
          Manage purchase orders, track vendor deliveries, and monitor spending in real-time.
        </p>
      </div>

      <Tabs defaultValue="pos">
        <TabsList>
          <TabsTrigger value="pos">Purchase Orders ({pos.length})</TabsTrigger>
          <TabsTrigger value="vendors">Vendors ({vendors.length})</TabsTrigger>
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
            pagination={{ page: vPage, pageSize: vPageSize, total: vendors.length, onChange: setVPage, onPageSizeChange: setVPageSize }}
            emptyMessage="No vendors found." />
        </TabsContent>
      </Tabs>

      {/* Create PO Modal */}
      <Modal open={showPO} onClose={() => setShowPO(false)} title="Create Purchase Order"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowPO(false)}>Cancel</Button>
          <Button onClick={handleCreatePO}><Plus size={13} /> Create PO</Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Vendor">
            <Select value={newPO.vendorId} onChange={e => setNewPO({ ...newPO, vendorId: e.target.value })}>
              <option value="">Select Vendor</option>
              {vendors.filter(Boolean).map(v => <option key={v?.id || v?._id} value={v?.id}>{v?.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Items Description">
            <Textarea value={newPO.items} onChange={e => setNewPO({ ...newPO, items: e.target.value })} placeholder="e.g. 200 x 400W Mono PERC Panels" rows={2} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Total Amount (₹)">
              <Input type="number" value={newPO.totalAmount} onChange={e => setNewPO({ ...newPO, totalAmount: e.target.value })} placeholder="2900000" />
            </FormField>
            <FormField label="Expected Delivery">
              <Input type="date" value={newPO.expectedDate} onChange={e => setNewPO({ ...newPO, expectedDate: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Related Project">
            <Select value={newPO.relatedProjectId} onChange={e => setNewPO({ ...newPO, relatedProjectId: e.target.value })}>
              <option value="">Link to Project (optional)</option>
              <option value="P001">P001 – Joshi Industries</option>
              <option value="P002">P002 – Suresh Bhatt</option>
              <option value="P004">P004 – Trivedi Foods</option>
            </Select>
          </FormField>
        </div>
      </Modal>

      {/* Add Vendor Modal */}
      <Modal open={showVendor} onClose={() => setShowVendor(false)} title="Add Vendor"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowVendor(false)}>Cancel</Button>
          <Button onClick={handleCreateVendor}><Plus size={13} /> Add Vendor</Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Vendor Name">
            <Input value={newVendor.name} onChange={e => setNewVendor({ ...newVendor, name: e.target.value })} placeholder="Company name" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <Select value={newVendor.category} onChange={e => setNewVendor({ ...newVendor, category: e.target.value })}>
                <option value="">Select Category</option>
                {['Panel', 'Inverter', 'BOS', 'Structure', 'Cable', 'Other'].map(c => <option key={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="City">
              <Input value={newVendor.city} onChange={e => setNewVendor({ ...newVendor, city: e.target.value })} placeholder="City" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Contact Person">
              <Input value={newVendor.contact} onChange={e => setNewVendor({ ...newVendor, contact: e.target.value })} placeholder="Name" />
            </FormField>
            <FormField label="Phone">
              <Input value={newVendor.phone} onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })} placeholder="9876543210" />
            </FormField>
          </div>
          <FormField label="Email">
            <Input type="email" value={newVendor.email} onChange={e => setNewVendor({ ...newVendor, email: e.target.value })} placeholder="vendor@company.com" />
          </FormField>
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
            <Button variant="secondary" onClick={() => handleCallVendor(selectedVendor)}><Phone size={13} /> Call</Button>
            <Button onClick={() => handleEmailVendor(selectedVendor)}><Mail size={13} /> Email</Button>
          </div>}>
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="timeline">Timeline ({pos.filter(p => p && (p?.vendorId?._id === selectedVendor?._id || p?.vendorName === selectedVendor?.name)).length})</TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details">
              <div className="grid grid-cols-2 gap-3 text-xs mt-3">
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
            </TabsContent>
            
            <TabsContent value="timeline">
              <div className="space-y-2 mt-3">
                {pos.filter(p => p && (p?.vendorId?._id === selectedVendor?._id || p?.vendorName === selectedVendor?.name))
                  .sort((a, b) => new Date(b?.orderedDate || 0) - new Date(a?.orderedDate || 0))
                  .map(po => (
                    <div key={po?.id || Math.random()} className="glass-card p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">{po?.id}</div>
                        <div className="text-xs text-[var(--text-muted)]">{po?.items}</div>
                        <div className="text-xs mt-1">{fmt(po?.totalAmount)} • {po?.orderedDate}</div>
                      </div>
                      <StatusBadge domain="purchaseOrder" value={po?.status} />
                    </div>
                  ))}
                {pos.filter(p => p && (p?.vendorId?._id === selectedVendor?._id || p?.vendorName === selectedVendor?.name)).length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] text-center py-4">No purchase orders found for this vendor.</p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="activity">
              <div className="space-y-2 mt-3">
                <div className="glass-card p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <div className="text-xs font-semibold">Vendor Created</div>
                    <div className="text-xs text-[var(--text-muted)] ml-auto">{new Date(selectedVendor?.createdAt || Date.now()).toLocaleDateString()}</div>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1 ml-4">Vendor profile added to system</div>
                </div>
                {pos.filter(p => p && (p?.vendorId?._id === selectedVendor?._id || p?.vendorName === selectedVendor?.name))
                  .map(po => (
                    <div key={`activity-${po?.id || Math.random()}`} className="glass-card p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <div className="text-xs font-semibold">PO {po?.id} - {po?.status}</div>
                        <div className="text-xs text-[var(--text-muted)] ml-auto">{po?.orderedDate}</div>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1 ml-4">{po?.items} • {fmt(po?.totalAmount)}</div>
                    </div>
                  ))}
                <div className="glass-card p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <div className="text-xs font-semibold">Last Updated</div>
                    <div className="text-xs text-[var(--text-muted)] ml-auto">{new Date(selectedVendor?.updatedAt || Date.now()).toLocaleDateString()}</div>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1 ml-4">Profile information last modified</div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Modal>
      )}
    </div>
  );
};

export default ProcurementPage;
