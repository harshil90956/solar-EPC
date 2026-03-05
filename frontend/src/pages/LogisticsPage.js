// Solar OS – EPC Edition — LogisticsPage.js
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Truck, Plus, MapPin, Package, CheckCircle, Clock, Zap, Navigation, LayoutGrid, List, Phone, Mail, Star } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { Avatar } from '../components/ui/Avatar';
import DataTable from '../components/ui/DataTable';
import { APP_CONFIG } from '../config/app.config';
import { api } from '../lib/apiClient';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api/v1';
const TENANT_ID = 'solarcorp';

// Local status map only (no data)
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
  const [activeTab, setActiveTab] = useState('dispatches');
  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');
  const [statusFilter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ delivered: 0, inTransit: 0, scheduled: 0, totalFreight: 0 });

  // Form state for new dispatch
  const [newDispatch, setNewDispatch] = useState({
    projectId: '',
    customer: '',
    items: '',
    from: '',
    to: '',
    dispatchDate: '',
    driver: '',
    vehicle: '',
    cost: '',
  });

  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: '', category: '', city: '', contact: '', phone: '', email: '' });

  // Vendor delivery state
  const [showVendorDeliveryModal, setShowVendorDeliveryModal] = useState(false);
  const [vendorDeliveryData, setVendorDeliveryData] = useState({ itemName: '', quantity: '' });

  // Project search state for dispatch modal
  const [projects, setProjects] = useState([]);
  const [projectSearch, setProjectSearch] = useState('');

  // Fetch data from backend
  const fetchData = async () => {
    try {
      setLoading(true);
      const [dispatchesRes, statsRes] = await Promise.all([
        api.get('/logistics/dispatches'),
        api.get('/logistics/stats'),
      ]);
      
      // Handle API response
      let dispatchesData = [];
      let statsData = { delivered: 0, inTransit: 0, scheduled: 0, totalFreight: 0 };
      
      if (Array.isArray(dispatchesRes.data)) {
        dispatchesData = dispatchesRes.data;
      } else if (dispatchesRes.data && typeof dispatchesRes.data === 'object') {
        dispatchesData = dispatchesRes.data.data || [];
      }

      if (statsRes.data && typeof statsRes.data === 'object') {
        statsData = statsRes.data.data || statsRes.data;
      }

      setDispatches(dispatchesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching logistics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch projects from backend (same as ProjectPage)
  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects?tenantId=${TENANT_ID}`);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      console.log('Projects API Response:', data);
      const projectsArray = Array.isArray(data) ? data : (data.data || []);
      setProjects(projectsArray);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchProjects();
    fetchVendors();
  }, []);

  // Fetch vendors from backend
  const fetchVendors = async () => {
    try {
      const response = await api.get('/logistics/vendors');
      let vendorsData = [];
      if (Array.isArray(response.data)) {
        vendorsData = response.data;
      } else if (response.data && typeof response.data === 'object') {
        vendorsData = response.data.data || [];
      }
      setVendors(vendorsData);
    } catch (err) {
      console.error('Error fetching vendors:', err);
    }
  };

  // Vendor action handlers
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
        const subject = 'Logistics Inquiry';
        const text = `Dear ${vendor.name || vendor.contact || 'Vendor'},\n\nI hope this email finds you well. We are interested in discussing potential logistics services and would like to connect with you regarding our requirements.\n\nPlease let us know your availability for a brief discussion.\n\nBest regards,\nSolarOS Team`;
        
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

  const handleCreateVendor = async () => {
    try {
      // Validation
      if (!newVendor.name || !newVendor.category || !newVendor.city || !newVendor.contact || !newVendor.phone || !newVendor.email) {
        alert('Please fill in all required fields');
        return;
      }
      console.log('Creating vendor with data:', newVendor);
      const res = await api.post('/logistics/vendors', newVendor);
      console.log('Vendor created:', res);
      await fetchVendors();
      setShowVendorModal(false);
      setNewVendor({ name: '', category: '', city: '', contact: '', phone: '', email: '' });
    } catch (error) {
      console.error('Error creating vendor:', error);
      alert('Failed to create vendor: ' + (error.message || 'Unknown error'));
    }
  };

  const handleVendorDelivery = async () => {
    try {
      if (!selectedVendor?.id) {
        alert('No vendor selected');
        return;
      }
      if (!vendorDeliveryData.itemName || !vendorDeliveryData.quantity) {
        alert('Please enter item name and quantity');
        return;
      }
      const quantity = Number(vendorDeliveryData.quantity);
      if (quantity <= 0) {
        alert('Quantity must be greater than 0');
        return;
      }
      console.log('Recording delivery from vendor:', selectedVendor.id, vendorDeliveryData);
      const res = await api.post(`/logistics/vendors/${selectedVendor.id}/delivery`, {
        itemName: vendorDeliveryData.itemName,
        quantity: quantity
      });
      console.log('Vendor delivery recorded:', res);
      alert(`Added ${quantity} units of ${vendorDeliveryData.itemName} to inventory`);
      setShowVendorDeliveryModal(false);
      setVendorDeliveryData({ itemName: '', quantity: '' });
      setSelectedVendor(null);
    } catch (error) {
      console.error('Error recording vendor delivery:', error);
      alert('Failed to record delivery: ' + (error.response?.data?.error?.message || error.message || 'Unknown error'));
    }
  };

  const handleStageChange = async (id, newStatus) => {
    try {
      await api.patch(`/logistics/dispatches/${id}/status`, { status: newStatus });
      setDispatches(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
      // Clear cached stats so KPI cards recalculate from updated dispatches
      setStats({});
    } catch (error) {
      console.error('Error updating dispatch status:', error);
    }
  };

  const handleCreateDispatch = async () => {
    try {
      const payload = {
        ...newDispatch,
        cost: Number(newDispatch.cost),
        status: 'Scheduled',
      };
      await api.post('/logistics/dispatches', payload);
      await fetchData();
      setShowAdd(false);
      setNewDispatch({
        projectId: '',
        customer: '',
        items: '',
        from: '',
        to: '',
        dispatchDate: '',
        driver: '',
        vehicle: '',
        cost: '',
      });
    } catch (error) {
      console.error('Error creating dispatch:', error);
    }
  };

  const handleMarkDelivered = async (dispatch) => {
    try {
      await api.patch(`/logistics/dispatches/${dispatch.id}/status`, { status: 'Delivered' });
      await fetchData();
      setSelected(null);
    } catch (error) {
      console.error('Error marking as delivered:', error);
    }
  };

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    return projects.filter(p => 
      p.projectId?.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.customerName?.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.site?.toLowerCase().includes(projectSearch.toLowerCase())
    );
  }, [projects, projectSearch]);

  const filtered = useMemo(() =>
    dispatches.filter(d => d &&
      (statusFilter === 'All' || d.status === statusFilter) &&
      (d.customer?.toLowerCase().includes(search.toLowerCase()) ||
        d.items?.toLowerCase().includes(search.toLowerCase()))
    ), [search, statusFilter, dispatches]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const delivered = stats.delivered || dispatches.filter(d => d?.status === 'Delivered').length;
  const inTransit = stats.inTransit || dispatches.filter(d => d?.status === 'In Transit').length;
  const scheduled = stats.scheduled || dispatches.filter(d => d?.status === 'Scheduled').length;
  const totalFreight = stats.totalFreight || dispatches.reduce((a, d) => a + (d?.cost || 0), 0);

  const ROW_ACTIONS = [
    { label: 'View Details', icon: Package, onClick: row => setSelected(row) },
    { label: 'Track Shipment', icon: Navigation, onClick: () => { } },
    { label: 'Mark Delivered', icon: CheckCircle, onClick: (row) => handleMarkDelivered(row) },
  ];

  const VENDOR_ACTIONS = [
    { label: 'View Vendor', icon: Package, onClick: row => setSelectedVendor(row) },
    { label: 'Record Delivery', icon: Plus, onClick: row => { setSelectedVendor(row); setShowVendorDeliveryModal(true); } },
    { label: 'Call Vendor', icon: Phone, onClick: row => handleCallVendor(row) },
    { label: 'Email Vendor', icon: Mail, onClick: row => handleEmailVendor(row) },
  ];

  if (loading) {
    return <div className="animate-fade-in space-y-5"><p className="text-xs text-[var(--text-muted)]">Loading...</p></div>;
  }

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Logistics & Dispatch"
        subtitle="Material dispatch · delivery tracking · freight management"
        tabs={[
          { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
          { id: 'table', label: 'Table', icon: List }
        ]}
        activeTab={view}
        onTabChange={setView}
        actions={[
          { type: 'button', label: 'Schedule Dispatch', icon: Plus, variant: 'primary', onClick: () => setShowAdd(true) }
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard title="In Transit" value={inTransit} icon={Truck} trend={inTransit} trendLabel="active shipments" color="cyan" />
        <KPICard title="Scheduled" value={scheduled} icon={Clock} trend={scheduled} trendLabel="upcoming dispatches" color="accent" />
        <KPICard title="Delivered" value={delivered} icon={CheckCircle} trend={delivered} trendLabel="this month" color="emerald" />
        <KPICard title="Freight Cost" value={`₹${totalFreight.toLocaleString('en-IN')}`} icon={MapPin} trend={totalFreight > 50000 ? -5 : +5} trendLabel="vs last month" color="solar" />
      </div>

      <div className="ai-banner">
        <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="text-[var(--accent-light)] font-semibold">AI Insight:</span>{' '}
          {activeTab === 'dispatches' 
            ? (inTransit > 0 
                ? `${inTransit} shipment(s) currently in transit. ${scheduled > 0 ? `${scheduled} pending dispatch(es) need vehicle assignment.` : 'All dispatches are on track.'}`
                : scheduled > 0 
                  ? `${scheduled} dispatch(es) scheduled. Assign vehicles and drivers to proceed.`
                  : 'All dispatches completed. No active shipments.')
            : `${vendors.length} vendors available for logistics operations.`
          }
        </p>
      </div>

      {activeTab === 'dispatches' ? (
        <>
          {/* Active Shipments strip (kanban-only) */}
          {view === 'kanban' && inTransit > 0 && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Truck size={14} className="text-cyan-400" /> Active Shipments ({inTransit})
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
        </>
      ) : (
        /* Vendors Tab */
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[var(--text-muted)]">Manage logistics vendors and suppliers</p>
            <Input placeholder="Search vendors…" value={search}
              onChange={e => setSearch(e.target.value)} className="h-8 text-xs w-52" />
          </div>
          <DataTable columns={VENDOR_COLUMNS} data={vendors.filter(v => 
            !search || v.name?.toLowerCase().includes(search.toLowerCase()) || 
            v.city?.toLowerCase().includes(search.toLowerCase()) ||
            v.category?.toLowerCase().includes(search.toLowerCase())
          )} rowActions={VENDOR_ACTIONS}
            emptyMessage="No vendors found. Click Add Vendor to create one." />
        </>
      )}

      {/* Schedule Dispatch Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Schedule Dispatch"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button onClick={handleCreateDispatch}><Plus size={13} /> Schedule</Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Project">
            <div className="space-y-2">
              <div className="relative">
                <Input 
                  type="text" 
                  placeholder="Search projects by ID, name or site..." 
                  value={projectSearch}
                  onChange={e => setProjectSearch(e.target.value)}
                  className="h-9 text-xs pr-8"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto border border-[var(--border)] rounded-md bg-[var(--bg-elevated)]">
                {filteredProjects.length === 0 ? (
                  <div className="p-3 text-xs text-[var(--text-muted)] text-center">
                    {projects.length === 0 ? 'No projects available' : 'No matching projects found'}
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {filteredProjects.map(p => (
                      <div 
                        key={p.projectId} 
                        onClick={() => {
                          setNewDispatch({
                            ...newDispatch, 
                            projectId: p.projectId,
                            customer: p.customerName || ''
                          });
                        }}
                        className={`p-2 cursor-pointer hover:bg-[var(--accent)]/10 transition-colors ${
                          newDispatch.projectId === p.projectId ? 'bg-[var(--accent)]/20 border-l-2 border-[var(--accent)]' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[var(--text-primary)]">{p.projectId}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">{p.site}</span>
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{p.customerName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {newDispatch.projectId && (
                <div className="text-xs text-[var(--accent)]">
                  Selected: {newDispatch.projectId}
                </div>
              )}
            </div>
          </FormField>
          <FormField label="Customer">
            <Input value={newDispatch.customer} onChange={e => setNewDispatch({...newDispatch, customer: e.target.value})} placeholder="Customer name" />
          </FormField>
          <FormField label="Items to Dispatch">
            <Input value={newDispatch.items} onChange={e => setNewDispatch({...newDispatch, items: e.target.value})} placeholder="e.g. 125 Panels, 1 Inverter" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="From Warehouse">
              <Select value={newDispatch.from} onChange={e => setNewDispatch({...newDispatch, from: e.target.value})}>
                <option value="">Select Warehouse</option>
                <option value="WH-Ahmedabad">WH-Ahmedabad</option>
                <option value="WH-Surat">WH-Surat</option>
              </Select>
            </FormField>
            <FormField label="To Location">
              <Input value={newDispatch.to} onChange={e => setNewDispatch({...newDispatch, to: e.target.value})} placeholder="Destination" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Dispatch Date">
              <Input type="date" value={newDispatch.dispatchDate} onChange={e => setNewDispatch({...newDispatch, dispatchDate: e.target.value})} />
            </FormField>
            <FormField label="Freight Cost (₹)">
              <Input type="number" value={newDispatch.cost} onChange={e => setNewDispatch({...newDispatch, cost: e.target.value})} placeholder="8500" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Driver Name">
              <Input value={newDispatch.driver} onChange={e => setNewDispatch({...newDispatch, driver: e.target.value})} placeholder="Driver name" />
            </FormField>
            <FormField label="Vehicle Number">
              <Input value={newDispatch.vehicle} onChange={e => setNewDispatch({...newDispatch, vehicle: e.target.value})} placeholder="GJ-01-AB-1234" />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={`Dispatch — ${selected.id}`}
          footer={<div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            {selected.status !== 'Delivered' && (
              <Button onClick={() => handleMarkDelivered(selected)}><CheckCircle size={13} /> Mark Delivered</Button>
            )}
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
      {/* Add Vendor Modal */}
      <Modal open={showVendorModal} onClose={() => setShowVendorModal(false)} title="Add Vendor"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowVendorModal(false)}>Cancel</Button>
          <Button onClick={handleCreateVendor}><Plus size={13} /> Add Vendor</Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Vendor Name">
            <Input value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} placeholder="e.g., ABC Logistics" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <Select value={newVendor.category} onChange={e => setNewVendor({...newVendor, category: e.target.value})}>
                <option value="">Select Category</option>
                <option value="Transport">Transport</option>
                <option value="Panel">Panel</option>
                <option value="Inverter">Inverter</option>
                <option value="BOS">BOS</option>
                <option value="Structure">Structure</option>
                <option value="Cable">Cable</option>
                <option value="Other">Other</option>
              </Select>
            </FormField>
            <FormField label="City">
              <Input value={newVendor.city} onChange={e => setNewVendor({...newVendor, city: e.target.value})} placeholder="e.g., Ahmedabad" />
            </FormField>
          </div>
          <FormField label="Contact Person">
            <Input value={newVendor.contact} onChange={e => setNewVendor({...newVendor, contact: e.target.value})} placeholder="e.g., John Doe" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Phone">
              <Input value={newVendor.phone} onChange={e => setNewVendor({...newVendor, phone: e.target.value})} placeholder="e.g., +91 98765 43210" />
            </FormField>
            <FormField label="Email">
              <Input type="email" value={newVendor.email} onChange={e => setNewVendor({...newVendor, email: e.target.value})} placeholder="e.g., vendor@example.com" />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <Modal open={!!selectedVendor} onClose={() => setSelectedVendor(null)} title={`Vendor — ${selectedVendor.name}`}
          footer={<div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setSelectedVendor(null)}>Close</Button>
            <Button onClick={() => { setShowVendorDeliveryModal(true); }}><Plus size={13} /> Record Delivery</Button>
            <Button onClick={() => handleCallVendor(selectedVendor)}><Phone size={13} /> Call</Button>
            <Button onClick={() => handleEmailVendor(selectedVendor)}><Mail size={13} /> Email</Button>
          </div>}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[['Vendor ID', selectedVendor.id], ['Name', selectedVendor.name], ['Category', selectedVendor.category], ['Contact', selectedVendor.contact], ['Phone', selectedVendor.phone], ['Email', selectedVendor.email], ['City', selectedVendor.city], ['Total Orders', selectedVendor.totalOrders], ['Rating', selectedVendor.rating + ' / 5']].map(([k, v]) => (
              <div key={k} className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">{k}</div>
                <div className="font-semibold text-[var(--text-primary)]">{v}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Vendor Delivery Modal */}
      <Modal open={showVendorDeliveryModal} onClose={() => setShowVendorDeliveryModal(false)} title={`Record Delivery - ${selectedVendor?.name || 'Vendor'}`}
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowVendorDeliveryModal(false)}>Cancel</Button>
          <Button onClick={handleVendorDelivery}><Plus size={13} /> Add Stock</Button>
        </div>}>
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)]">
            Record stock delivery from vendor. This will add the quantity to inventory.
          </p>
          <FormField label="Item Name *">
            <Input value={vendorDeliveryData.itemName} onChange={e => setVendorDeliveryData({...vendorDeliveryData, itemName: e.target.value})} placeholder="e.g., 400W Solar Panels" />
          </FormField>
          <FormField label="Quantity *">
            <Input type="number" value={vendorDeliveryData.quantity} onChange={e => setVendorDeliveryData({...vendorDeliveryData, quantity: e.target.value})} placeholder="e.g., 100" />
          </FormField>
        </div>
      </Modal>
    </div>
  );
};

export default LogisticsPage;
