// Solar OS – EPC Edition — ProcurementPage.js
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ShoppingCart, Plus, Truck, Package, CheckCircle, LayoutGrid, List, Calendar, Zap, Phone, Mail, Star, Edit
} from 'lucide-react';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { Avatar } from '../components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import DataTable from '../components/ui/DataTable';
import { CURRENCY, APP_CONFIG } from '../config/app.config';
import { api } from '../lib/apiClient';
import { usePermissions } from '../hooks/usePermissions';
import { useAuditLog } from '../hooks/useAuditLog';
import { toast } from '../components/ui/Toast';
import CanAccess, { CanCreate } from '../components/CanAccess';

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
  const [showPO, setShowPO] = useState(false);
  const [showVendor, setShowVendor] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newPO, setNewPO] = useState({ vendorId: '', items: '', totalAmount: '', expectedDate: '', relatedProjectId: '' });
  const [newVendor, setNewVendor] = useState({ name: '', category: '', city: '', contact: '', phone: '', email: '' });

  // Vendors list for dropdown
  const [vendors, setVendors] = useState([]);

  // Projects list for dropdown
  const [projects, setProjects] = useState([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const projectDropdownRef = useRef(null);

  // Vendor detail modal state
  const [selectedVendor, setSelectedVendor] = useState(null);

  // PO Edit state
  const [isEditingPO, setIsEditingPO] = useState(false);
  const [editedPO, setEditedPO] = useState(null);

  const handleUpdatePO = async () => {
    try {
      if (!editedPO) return;
      const payload = {
        items: editedPO.items,
        totalAmount: Number(editedPO.totalAmount),
        status: editedPO.status,
        expectedDate: editedPO.expectedDate,
        deliveredDate: editedPO.deliveredDate,
        relatedProjectId: editedPO.relatedProjectId,
      };
      await api.patch(`/procurement/purchase-orders/${editedPO.id}`, payload);
      await fetchData();
      setSelectedPO(null);
      setIsEditingPO(false);
      setEditedPO(null);
      toast.success('PO updated successfully');
    } catch (error) {
      console.error('Error updating PO:', error);
      toast.error('Failed to update PO');
    }
  };

  const startEditingPO = () => {
    setEditedPO({ ...selectedPO });
    setIsEditingPO(true);
  };

  const cancelEditingPO = () => {
    setIsEditingPO(false);
    setEditedPO(null);
    setSelectedPO(null);
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
        const subject = 'Procurement Inquiry';
        const text = `Dear ${vendor.name || vendor.contact || 'Vendor'},\n\nI hope this email finds you well. We are interested in discussing potential procurement services and would like to connect with you regarding our requirements.\n\nPlease let us know your availability for a brief discussion.\n\nBest regards,\nSolarOS Team`;
        
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

  // Fetch data on mount
  useEffect(() => {
    fetchData();
    fetchVendors();
    fetchProjects();
  }, []);

  // Click outside handler for project dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target)) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await api.get('/procurement/vendors');
      console.log('Vendors API response:', res);
      const vendorsData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      console.log('Parsed vendors:', vendorsData);
      setVendors(vendorsData);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId') || 'default';
      const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api/v1';
      const response = await fetch(`${baseUrl}/projects?tenantId=${tenantId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      console.log('Projects API response:', data);
      
      const projectsData = Array.isArray(data) ? data : (data?.data || []);
      console.log('Parsed projects:', projectsData);
      
      // If API returns empty data, use mock data for testing
      if (projectsData.length === 0) {
        console.log('API returned empty projects, using mock data');
        const mockProjects = [
          { id: 'P0134', projectId: 'P0134', customerName: 'Pintu Sharma', name: 'Pune Mumbai' },
          { id: 'P7244', projectId: 'P7244', customerName: 'Srikant Mehta', name: 'ahmedabad' },
          { id: 'P0327', projectId: 'P0327', customerName: 'Karan Johr', name: 'Vesu Surat' },
          { id: 'P5802', projectId: 'P5802', customerName: 'Manoj Patel', name: 'Station Surat' },
          { id: 'P0090', projectId: 'P0090', customerName: 'Deepika Shah', name: 'Shan Motors Vadodara' },
          { id: 'P0877', projectId: 'P0877', customerName: 'Harish Mehta', name: 'Anand Dairy' },
          { id: 'P0096', projectId: 'P0096', customerName: 'Nilesh Parakh', name: 'Morbi Ceramic Belt' },
          { id: 'P0085', projectId: 'P0085', customerName: 'Meena Patel', name: 'Morbi Factory' },
          { id: 'P0084', projectId: 'P0084', customerName: 'Dinesh Trivedi', name: 'Nadiad Plant' },
          { id: 'P0082', projectId: 'P0082', customerName: 'Suresh Bhatt', name: 'Vapi GIDC' },
          { id: 'P0081', projectId: 'P0081', customerName: 'Ramesh Joshi', name: 'GIDC Ahmedabad' },
        ];
        setProjects(mockProjects);
      } else {
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      // Use mock data as fallback when API fails
      const mockProjects = [
        { id: 'P0134', projectId: 'P0134', customerName: 'Pintu Sharma', name: 'Pune Mumbai' },
        { id: 'P7244', projectId: 'P7244', customerName: 'Srikant Mehta', name: 'ahmedabad' },
        { id: 'P0327', projectId: 'P0327', customerName: 'Karan Johr', name: 'Vesu Surat' },
        { id: 'P5802', projectId: 'P5802', customerName: 'Manoj Patel', name: 'Station Surat' },
        { id: 'P0090', projectId: 'P0090', customerName: 'Deepika Shah', name: 'Shan Motors Vadodara' },
        { id: 'P0877', projectId: 'P0877', customerName: 'Harish Mehta', name: 'Anand Dairy' },
        { id: 'P0096', projectId: 'P0096', customerName: 'Nilesh Parakh', name: 'Morbi Ceramic Belt' },
        { id: 'P0085', projectId: 'P0085', customerName: 'Meena Patel', name: 'Morbi Factory' },
        { id: 'P0084', projectId: 'P0084', customerName: 'Dinesh Trivedi', name: 'Nadiad Plant' },
        { id: 'P0082', projectId: 'P0082', customerName: 'Suresh Bhatt', name: 'Vapi GIDC' },
        { id: 'P0081', projectId: 'P0081', customerName: 'Ramesh Joshi', name: 'GIDC Ahmedabad' },
      ];
      console.log('Using mock projects:', mockProjects);
      setProjects(mockProjects);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [posRes, vendorsRes] = await Promise.all([
        api.get('/procurement/purchase-orders'),
        api.get('/procurement/vendors'),
      ]);
      // Handle API response - could be direct array or wrapped object
      let posData = [];

      const vendorsData = Array.isArray(vendorsRes.data)
        ? vendorsRes.data
        : (vendorsRes.data?.data || []);

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
      await fetchData();
      setShowVendor(false);
      setNewVendor({ name: '', category: '', city: '', contact: '', phone: '', email: '' });
    } catch (error) {
      console.error('Error creating vendor:', error);
    }
  };

  const handleCreatePO = async () => {
    try {
      console.log('Creating PO with data:', newPO);
      if (!newPO.vendorId) {
        alert('Please select a vendor');
        return;
      }
      if (!newPO.relatedProjectId) {
        alert('Please select a project');
        return;
      }
      const payload = {
        ...newPO,
        totalAmount: Number(newPO.totalAmount),
      };
      console.log('Payload:', payload);
      const res = await api.post('/procurement/purchase-orders', payload);
      console.log('Create PO response:', res);
      // Refetch all data to ensure UI is in sync with backend
      await fetchData();
      setShowPO(false);
      setNewPO({ vendorId: '', items: '', totalAmount: '', expectedDate: '', relatedProjectId: '' });
    } catch (error) {
      console.error('Error creating PO:', error);
    }
  };

  // Helper function to get project display name - prioritizes customer names
  const getProjectDisplayName = (project) => {
    if (!project) return 'Unknown Customer';
    
    // Debug: log the full project object
    console.log('Project object:', JSON.stringify(project, null, 2));
    
    // List of fields to check for customer name (in priority order)
    const customerFields = ['customer', 'customerName', 'clientName', 'client', 'customerEmail', 'email'];
    
    // Check each field
    for (const field of customerFields) {
      const value = project[field];
      if (value && typeof value === 'string') {
        const clean = value.trim();
        // Skip empty or placeholder values
        if (clean && 
            clean.length > 0 &&
            !clean.toLowerCase().includes('project name') &&
            !clean.toLowerCase().includes('enter') &&
            !clean.toLowerCase().includes('type here') &&
            !clean.toLowerCase().includes('customer') &&
            clean !== '*' &&
            clean !== '-') {
          console.log(`Found customer name in field "${field}": ${clean}`);
          return clean;
        }
      }
    }
    
    // Check name field as fallback
    if (project.name && typeof project.name === 'string') {
      const cleanName = project.name.trim();
      if (cleanName &&
          !cleanName.toLowerCase().includes('project name') &&
          !cleanName.toLowerCase().includes('enter') &&
          !cleanName.includes('*')) {
        return cleanName;
      }
    }
    
    // Check title field
    if (project.title && typeof project.title === 'string' && project.title.trim()) {
      return project.title.trim();
    }
    
    // Last resort - show project ID
    return `Project ${project.id || project._id || 'Unknown'}`;
  };

  const filteredPOs = useMemo(() =>
    pos.filter(po => po &&
      (poStatus === 'All' || po?.status === poStatus) &&
      po?.vendorName?.toLowerCase().includes(poSearch.toLowerCase())
    ), [poSearch, poStatus, pos]);

  const paginatedPOs = filteredPOs.slice((poPage - 1) * poPageSize, poPage * poPageSize);

  const pendingPOs = pos.filter(p => p && p?.status !== 'Delivered' && p?.status !== 'Cancelled').length;
  const totalSpend = pos.reduce((a, p) => a + (p?.totalAmount || 0), 0);
  const inTransit = pos.filter(p => p && p?.status === 'In Transit').length;
  const delivered = pos.filter(p => p && p?.status === 'Delivered').length;

  const PO_ACTIONS = [
    { label: 'View PO', icon: Package, onClick: row => setSelectedPO(row) },
    { label: 'Mark Delivered', icon: CheckCircle, onClick: (row) => handlePOStageChange(row.id, 'Delivered') },
    { label: 'Track Shipment', icon: Truck, onClick: () => { } },
  ];

  if (loading) {
    return <div className="animate-fade-in space-y-5"><p className="text-xs text-[var(--text-muted)]">Loading...</p></div>;
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="page-header">
        <div>
          <h1 className="heading-page">Procurement</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowPO(true)}><Plus size={13} /> Create PO</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard title="Active POs" value={pendingPOs} icon={ShoppingCart} color="accent" />
        <KPICard title="Delivered" value={delivered} icon={CheckCircle} color="emerald" />
        <KPICard title="In Transit" value={inTransit} icon={Truck} color="cyan" />
        <KPICard title="Total Spend" value={fmtFull(totalSpend)} icon={Package} color="solar" />
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
      </Tabs>

      {/* Create PO Modal */}
      <Modal open={showPO} onClose={() => setShowPO(false)} title="Create Purchase Order"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowPO(false)}>Cancel</Button>
          <Button onClick={handleCreatePO}><Plus size={13} /> Create PO</Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Vendor *">
            <Select value={newPO.vendorId} onChange={e => {
              console.log('Selected vendor:', e.target.value);
              setNewPO({ ...newPO, vendorId: e.target.value });
            }}>
              <option value="">{vendors.length === 0 ? 'No vendors available - Add vendors in Logistics tab' : 'Select a vendor'}</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.id})</option>
              ))}
            </Select>
            {vendors.length === 0 && (
              <p className="text-xs text-red-400 mt-1">Please add vendors in Logistics → Vendors tab first</p>
            )}
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
          <FormField label="Related Project *">
            <div className="relative" ref={projectDropdownRef}>
              {/* Selected Project Display / Search Input */}
              <div 
                onClick={() => setShowProjectDropdown(true)}
                className="w-full h-9 px-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-primary)] text-sm cursor-pointer flex items-center justify-between hover:border-[var(--primary)] transition-colors"
              >
                {newPO.relatedProjectId ? (
                  <span className="truncate">
                    {(() => {
                      const project = projects.find(p => (p.id || p._id) === newPO.relatedProjectId);
                      return `${project?.id || project?._id || newPO.relatedProjectId} – ${getProjectDisplayName(project)}`;
                    })()}
                  </span>
                ) : (
                  <span className="text-[var(--text-muted)]">Select a Project</span>
                )}
                <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Dropdown with Search */}
              {showProjectDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg shadow-xl max-h-64 overflow-hidden">
                  {/* Search Input */}
                  <div className="p-2 border-b border-[var(--border-base)]">
                    <div className="relative">
                      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-faint)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={projectSearch}
                        onChange={e => setProjectSearch(e.target.value)}
                        className="w-full h-8 pl-9 pr-3 rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Filtered Projects List */}
                  <div className="overflow-y-auto max-h-48">
                    {projects.filter(p => {
                      const searchTerm = projectSearch.toLowerCase();
                      const projectId = (p.id || p._id || '').toLowerCase();
                      const customer = (p.customer || p.customerName || p.name || '').toLowerCase();
                      return projectId.includes(searchTerm) || customer.includes(searchTerm);
                    }).length === 0 ? (
                      <div className="p-3 text-sm text-[var(--text-muted)] text-center">
                        {projects.length === 0 ? 'No projects available' : 'No matching projects'}
                      </div>
                    ) : (
                      projects.filter(p => {
                        const searchTerm = projectSearch.toLowerCase();
                        const projectId = (p.id || p._id || '').toLowerCase();
                        const customer = (p.customer || p.customerName || p.name || '').toLowerCase();
                        return projectId.includes(searchTerm) || customer.includes(searchTerm);
                      }).map(p => (
                        <div
                          key={p.id || p._id}
                          onClick={() => {
                            setNewPO({ ...newPO, relatedProjectId: p.id || p._id });
                            setShowProjectDropdown(false);
                            setProjectSearch('');
                          }}
                          className={`px-3 py-2 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border-base)] last:border-0 ${
                            newPO.relatedProjectId === (p.id || p._id) ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--primary)] px-1.5 py-0.5 rounded bg-[var(--primary)]/10">
                              {p.id || p._id}
                            </span>
                            <span className="text-sm text-[var(--text-primary)] truncate">
                              {getProjectDisplayName(p)}
                            </span>
                          </div>
                          {p.name && (
                            <div className="text-xs text-[var(--text-muted)] mt-0.5 ml-8">
                              {p.name}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {projects.length === 0 && (
              <p className="text-xs text-red-400 mt-1">No projects available. Please create projects first.</p>
            )}
          </FormField>
        </div>
      </Modal>

      {/* PO Detail Modal */}
      {selectedPO && (
        <Modal 
          open={!!selectedPO} 
          onClose={() => { setSelectedPO(null); setIsEditingPO(false); setEditedPO(null); }} 
          title={isEditingPO ? `Edit PO — ${selectedPO.id}` : `PO — ${selectedPO.id}`}
          footer={
            <div className="flex gap-2 justify-end">
              {isEditingPO ? (
                <>
                  <Button variant="ghost" onClick={cancelEditingPO}>Cancel</Button>
                  <Button onClick={handleUpdatePO}><CheckCircle size={13} /> Save Changes</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setSelectedPO(null)}>Close</Button>
                  <Button onClick={startEditingPO}><Edit size={13} /> Edit</Button>
                </>
              )}
            </div>
          }>
          {isEditingPO && editedPO ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Vendor Name">
                  <Input value={editedPO.vendorName} onChange={e => setEditedPO({ ...editedPO, vendorName: e.target.value })} />
                </FormField>
                <FormField label="Status">
                  <Select value={editedPO.status} onChange={e => setEditedPO({ ...editedPO, status: e.target.value })}>
                    <option value="Draft">Draft</option>
                    <option value="Ordered">Ordered</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </Select>
                </FormField>
              </div>
              <FormField label="Items Description">
                <Textarea value={editedPO.items} onChange={e => setEditedPO({ ...editedPO, items: e.target.value })} rows={2} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Total Amount (₹)">
                  <Input type="number" value={editedPO.totalAmount} onChange={e => setEditedPO({ ...editedPO, totalAmount: e.target.value })} />
                </FormField>
                <FormField label="Ordered Date">
                  <Input type="date" value={editedPO.orderedDate} onChange={e => setEditedPO({ ...editedPO, orderedDate: e.target.value })} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Expected Date">
                  <Input type="date" value={editedPO.expectedDate || ''} onChange={e => setEditedPO({ ...editedPO, expectedDate: e.target.value })} />
                </FormField>
                <FormField label="Delivered Date">
                  <Input type="date" value={editedPO.deliveredDate || ''} onChange={e => setEditedPO({ ...editedPO, deliveredDate: e.target.value })} />
                </FormField>
              </div>
              <FormField label="Related Project *">
                <div className="relative" ref={projectDropdownRef}>
                  {/* Selected Project Display */}
                  <div 
                    onClick={() => setShowProjectDropdown(true)}
                    className="w-full h-9 px-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-primary)] text-sm cursor-pointer flex items-center justify-between hover:border-[var(--primary)] transition-colors"
                  >
                    {editedPO?.relatedProjectId ? (
                      <span className="truncate">
                        {(() => {
                          const project = projects.find(p => (p.id || p._id) === editedPO.relatedProjectId);
                          return `${project?.id || project?._id || editedPO.relatedProjectId} – ${getProjectDisplayName(project)}`;
                        })()}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">Select a Project</span>
                    )}
                    <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Dropdown with Search */}
                  {showProjectDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg shadow-xl max-h-64 overflow-hidden">
                      {/* Search Input */}
                      <div className="p-2 border-b border-[var(--border-base)]">
                        <div className="relative">
                          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-faint)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            placeholder="Search projects..."
                            value={projectSearch}
                            onChange={e => setProjectSearch(e.target.value)}
                            className="w-full h-8 pl-9 pr-3 rounded bg-[var(--bg-elevated)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Filtered Projects List */}
                      <div className="overflow-y-auto max-h-48">
                        {projects.filter(p => {
                          const searchTerm = projectSearch.toLowerCase();
                          const projectId = (p.id || p._id || '').toLowerCase();
                          const customer = (p.customer || p.customerName || p.name || '').toLowerCase();
                          return projectId.includes(searchTerm) || customer.includes(searchTerm);
                        }).length === 0 ? (
                          <div className="p-3 text-sm text-[var(--text-muted)] text-center">
                            {projects.length === 0 ? 'No projects available' : 'No matching projects'}
                          </div>
                        ) : (
                          projects.filter(p => {
                            const searchTerm = projectSearch.toLowerCase();
                            const projectId = (p.id || p._id || '').toLowerCase();
                            const customer = (p.customer || p.customerName || p.name || '').toLowerCase();
                            return projectId.includes(searchTerm) || customer.includes(searchTerm);
                          }).map(p => (
                            <div
                              key={p.id || p._id}
                              onClick={() => {
                                setEditedPO({ ...editedPO, relatedProjectId: p.id || p._id });
                                setShowProjectDropdown(false);
                                setProjectSearch('');
                              }}
                              className={`px-3 py-2 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border-base)] last:border-0 ${
                                editedPO?.relatedProjectId === (p.id || p._id) ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-[var(--primary)] px-1.5 py-0.5 rounded bg-[var(--primary)]/10">
                                  {p.id || p._id}
                                </span>
                                <span className="text-sm text-[var(--text-primary)] truncate">
                                  {getProjectDisplayName(p)}
                                </span>
                              </div>
                              {p.name && (
                                <div className="text-xs text-[var(--text-muted)] mt-0.5 ml-8">
                                  {p.name}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </FormField>
            </div>
          ) : (
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
          )}
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
