// Solar OS – EPC Edition — CommissioningPage.js
import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircle, Cpu, Sun, FileSignature, Award, Zap, Plus, AlertTriangle, LayoutGrid, List } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import DraggableKanban from '../components/ui/DraggableKanban';
import { APP_CONFIG } from '../config/app.config';
import { usePermissions } from '../hooks/usePermissions';
import { useAuditLog } from '../hooks/useAuditLog';
import CanAccess, { CanCreate, CanEdit, CanDelete } from '../components/CanAccess';
import { toast } from '../components/ui/Toast';
import { api } from '../lib/apiClient';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1';
const TENANT_ID = 'solarcorp'; // Default tenant for seed data

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

const COMMISSIONING_COLUMNS = [
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

/* ── Main Page ── */
const CommissioningPage = () => {
  const { can } = usePermissions();
  const { logCreate, logUpdate, logDelete, logStatusChange } = useAuditLog('commissioning');

  // Permission guard helpers
  const guardCreate = () => {
    if (!can('commissioning', 'create')) {
      toast.error('Permission denied: Cannot create commissioning records');
      return false;
    }
    return true;
  };

  const guardEdit = () => {
    if (!can('commissioning', 'edit')) {
      toast.error('Permission denied: Cannot edit commissioning');
      return false;
    }
    return true;
  };

  const guardApprove = () => {
    if (!can('commissioning', 'approve')) {
      toast.error('Permission denied: Cannot approve commissioning');
      return false;
    }
    return true;
  };

  const [search, setSearch] = useState('');
  const [statusFilter, setFilter] = useState('All');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [systems, setSystems] = useState([]);
  const [commissioningLoading, setCommissioningLoading] = useState(true);
  const [commissioningError, setCommissioningError] = useState(null);

  // Projects fetch state
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    projectId: '',
    date: '',
    percentage: '',
    inverterSerialNo: '',
    panelBatchNo: '',
    panelWarranty: '',
    inverterWarranty: '',
    installWarranty: '',
    notes: ''
  });

  // Fetch commissioning data from backend
  const fetchCommissioningData = async () => {
    try {
      setCommissioningLoading(true);
      const response = await fetch(`${API_BASE_URL}/commissioning?tenantId=${TENANT_ID}`);
      if (!response.ok) {
        throw new Error('Failed to fetch commissioning data');
      }
      const data = await response.json();
      const commissioningArray = Array.isArray(data) ? data : (data.data || []);

      // Transform backend data to frontend format
      const transformedData = commissioningArray.map(c => ({
        id: c._id || c.id,
        projectId: c.projectIdString,
        customer: c.projectId?.customerName || 'Unknown',
        site: c.projectId?.site || 'Unknown',
        systemSize: c.projectId?.systemSize || 0,
        commissionDate: c.date,
        status: c.status === 'Completed' ? 'Active' : c.status,
        inverterSerial: c.inverterSerialNo,
        panelBatch: c.panelBatchNo,
        pr: c.percentage,
        expectedPR: 78,
        notes: c.notes,
        warrantyPanel: c.panelWarranty,
        warrantyInverter: c.inverterWarranty,
        warrantyInstall: c.installWarranty,
        checklist: [
          { item: 'Insulation Resistance Test', pass: c.status === 'Completed' },
          { item: 'Open Circuit Voltage Check', pass: c.status === 'Completed' },
          { item: 'Short Circuit Current Check', pass: c.status === 'Completed' },
          { item: 'Grid Synchronisation', pass: c.status === 'Completed' },
          { item: 'Performance Ratio Test', pass: c.status === 'Completed' },
          { item: 'Net Meter Test', pass: c.status === 'Completed' },
          { item: 'Customer Handover Sign-off', pass: c.status === 'Completed' },
        ]
      }));

      setSystems(transformedData);
      setCommissioningError(null);
    } catch (err) {
      console.error('Error fetching commissioning data:', err);
      setCommissioningError(err.message);
      toast.error('Failed to load commissioning data');
    } finally {
      setCommissioningLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissioningData();
  }, []);

  // Fetch projects from backend
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setProjectsLoading(true);
        const res = await api.get('/projects', { tenantId: TENANT_ID });
        const data = res?.data ?? res;
        const projectsArray = Array.isArray(data) ? data : (data?.data || []);
        // Show all projects in commissioning dropdown (not just Installation stage)
        setProjects(projectsArray);
      } catch (err) {
        console.error('Error fetching projects:', err);
        toast.error('Failed to load projects');
      } finally {
        setProjectsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Handle form input changes
  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle commissioning submit
  const handleCreateCommissioning = async () => {
    if (!form.projectId || !form.date || !form.percentage || !form.inverterSerialNo || !form.panelBatchNo) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/commissioning?tenantId=${TENANT_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: form.projectId,
          date: form.date,
          percentage: parseFloat(form.percentage),
          inverterSerialNo: form.inverterSerialNo,
          panelBatchNo: form.panelBatchNo,
          panelWarranty: form.panelWarranty,
          inverterWarranty: form.inverterWarranty,
          installWarranty: form.installWarranty,
          notes: form.notes,
          status: 'Completed'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create commissioning: ${errorText}`);
      }

      const created = await response.json();

      // Add to local state
      const selectedProject = projects.find(p => p.projectId === form.projectId);
      const newRecord = {
        id: created._id || created.id || `CA${Date.now()}`,
        projectId: form.projectId,
        customer: selectedProject?.customerName || 'Unknown',
        site: selectedProject?.site || 'Unknown',
        systemSize: selectedProject?.systemSize || 0,
        commissionDate: form.date,
        status: 'Active',
        inverterSerial: form.inverterSerialNo,
        panelBatch: form.panelBatchNo,
        pr: parseFloat(form.percentage),
        expectedPR: 78,
        checklist: [
          { item: 'Insulation Resistance Test', pass: true },
          { item: 'Open Circuit Voltage Check', pass: true },
          { item: 'Short Circuit Current Check', pass: true },
          { item: 'Grid Synchronisation', pass: true },
          { item: 'Performance Ratio Test', pass: true },
          { item: 'Net Meter Test', pass: true },
          { item: 'Customer Handover Sign-off', pass: true },
        ]
      };

      setSystems(prev => [newRecord, ...prev]);

      // Refresh data from backend to ensure consistency
      await fetchCommissioningData();

      // Reset form and close modal
      setForm({
        projectId: '',
        date: '',
        percentage: '',
        inverterSerialNo: '',
        panelBatchNo: '',
        panelWarranty: '',
        inverterWarranty: '',
        installWarranty: '',
        notes: ''
      });
      setShowAdd(false);
      toast.success('Commissioning completed successfully!');
      logCreate(newRecord);
    } catch (err) {
      console.error('Error creating commissioning:', err);
      toast.error(err.message || 'Failed to complete commissioning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStageChange = (id, newStatus) => {
    if (!can('commissioning', 'edit')) {
      toast.error('Permission denied: Cannot change commissioning status');
      return;
    }
    const ca = systems.find(c => c.id === id);
    setSystems(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    logStatusChange(ca, ca.status, newStatus);
  };

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
    { label: 'View Details', icon: FileSignature, onClick: row => setSelected(row) },
    { label: 'Run Tests', icon: Cpu, onClick: (row) => { if (guardEdit()) console.log('Run Tests', row); } },
    { label: 'Generate Certificate', icon: Award, onClick: (row) => { if (guardApprove()) console.log('Generate Certificate', row); } },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Commissioning"
        subtitle="System commissioning · checklist · performance ratio · warranty tracking"
        actions={[
          { type: 'button', label: 'New Record', icon: Plus, variant: 'primary', onClick: () => { if (guardCreate()) setShowAdd(true); } }
        ]}
      />

      {/* Commissioning Overview KPI Cards */}
      <div className="mb-2">
        <p className="text-xs text-[var(--text-muted)] mb-2 flex items-center gap-2">
          <Sun size={12} className="text-[var(--accent-light)]" />
          <span>Commissioning Overview - System activation and performance tracking</span>
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard title="Total Active Systems" value={active} icon={Sun} sub="commissioned and running" color="solar" />
          <KPICard title="Total Commissioned Capacity" value={`${totalKW} kW`} icon={Zap} sub="active system capacity" color="accent" />
          <KPICard title="Average Performance Ratio" value={`${avgPR}%`} icon={Cpu} sub="system efficiency metric" color="emerald" />
          <KPICard title="Total Pending Commissioning" value={pending} icon={AlertTriangle} sub="awaiting activation" color="amber" />
        </div>
      </div>

      <div className="ai-banner">
        <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="text-[var(--accent-light)] font-semibold">AI Insight:</span>{' '}
          CA001 (Prakash Agarwal) performing at 79.2% PR — 1.2% above target. CA002 (Joshi Industries) pending installation completion. CA003 (Suresh Bhatt) is 3/7 checklist items done.
        </p>
      </div>

      {commissioningLoading ? (
        <div className="glass-card p-8 text-center">
          <div className="animate-pulse text-[var(--text-muted)]">Loading commissioning data...</div>
        </div>
      ) : commissioningError ? (
        <div className="glass-card p-8 text-center text-red-500">
          <p>Error loading commissioning data: {commissioningError}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            {['All', 'Active', 'In Progress', 'Pending', 'Flagged'].map(s => (
              <button key={s} onClick={() => { setFilter(s); setPage(1); }}
                className={`filter-chip ${statusFilter === s ? 'filter-chip-active' : ''}`}>{s}</button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center bg-[var(--bg-elevated)] rounded-lg p-1 border border-[var(--border-base)]">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  <List size={14} /> Table
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'kanban' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  <LayoutGrid size={14} /> Kanban
                </button>
              </div>
              <Input placeholder="Search systems…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-8 text-xs w-52" />
            </div>
          </div>

          {/* Table View */}
          {viewMode === 'table' && (
            <DataTable columns={COMMISSIONING_COLUMNS} data={paginated} total={filtered.length}
              page={page} pageSize={pageSize} onPageChange={setPage}
              onPageSizeChange={s => { setPageSize(s); setPage(1); }}
              rowActions={ROW_ACTIONS} emptyText="No commissioning records found." />
          )}

          {/* Kanban View */}
          {viewMode === 'kanban' && (
            <DraggableKanban
              data={filtered}
              onStatusChange={(cardId, newStatus) => handleStageChange(cardId, newStatus)}
              onCardClick={(item) => setSelected(item)}
            />
          )}
        </>
      )}

      {/* Commission Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); fetchCommissioningData(); }} title="Commission System"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => { setShowAdd(false); fetchCommissioningData(); }}>Cancel</Button>
          <Button
            onClick={handleCreateCommissioning}
            disabled={submitting || !form.projectId || !form.date || !form.percentage || !form.inverterSerialNo || !form.panelBatchNo}
          >
            {submitting ? 'Saving...' : <><CheckCircle size={13} /> Complete Commissioning</>}
          </Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Project">
            <Select
              value={form.projectId}
              onChange={e => handleFormChange('projectId', e.target.value)}
              disabled={projectsLoading}
            >
              <option value="">{projectsLoading ? 'Loading projects...' : 'Select Project'}</option>
              {projects.map(p => (
                <option key={p.projectId} value={p.projectId}>
                  {p.projectId} – {p.customerName} {p.systemSize}kW
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Commission Date">
              <Input
                type="date"
                value={form.date}
                onChange={e => handleFormChange('date', e.target.value)}
              />
            </FormField>
            <FormField label="Performance Ratio (%)">
              <Input
                type="number"
                placeholder="78.5"
                value={form.percentage}
                onChange={e => handleFormChange('percentage', e.target.value)}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Inverter Serial No.">
              <Input
                placeholder="SMA-50K-…"
                value={form.inverterSerialNo}
                onChange={e => handleFormChange('inverterSerialNo', e.target.value)}
              />
            </FormField>
            <FormField label="Panel Batch No.">
              <Input
                placeholder="TSP-B2025-LOT-…"
                value={form.panelBatchNo}
                onChange={e => handleFormChange('panelBatchNo', e.target.value)}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Panel Warranty Till">
              <Input
                type="date"
                value={form.panelWarranty}
                onChange={e => handleFormChange('panelWarranty', e.target.value)}
              />
            </FormField>
            <FormField label="Inverter Warranty Till">
              <Input
                type="date"
                value={form.inverterWarranty}
                onChange={e => handleFormChange('inverterWarranty', e.target.value)}
              />
            </FormField>
            <FormField label="Install Warranty Till">
              <Input
                type="date"
                value={form.installWarranty}
                onChange={e => handleFormChange('installWarranty', e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Notes (Optional)">
            <Input
              placeholder="Add any additional notes..."
              value={form.notes}
              onChange={e => handleFormChange('notes', e.target.value)}
            />
          </FormField>
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
