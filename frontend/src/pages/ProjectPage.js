// Solar OS – EPC Edition — ProjectPage.js
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FolderOpen, Plus, Calendar, CheckCircle, Zap, TrendingUp, BarChart2,
  LayoutGrid, List, User, Clock, Trash2, Edit2, Clock3, History,
  Eye, Check, EyeOff, Layers
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { PROJECT_STAGE_TREND } from '../data/mockData';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select } from '../components/ui/Input';
import { KPICard } from '../components/ui/KPICard';
import { Progress } from '../components/ui/Progress';
import { Stepper } from '../components/ui/Stepper';
import DataTable from '../components/ui/DataTable';
import { CURRENCY, APP_CONFIG } from '../config/app.config';
import { usePermissions } from '../hooks/usePermissions';
import { useAuditLog } from '../hooks/useAuditLog';
import CanAccess, { CanCreate } from '../components/CanAccess';
import { toast } from '../components/ui/Toast';

const fmt = CURRENCY.format;

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api/v1';
const TENANT_ID = 'solarcorp'; // Default tenant for seed data

const KANBAN_STAGES = [
  { id: 'Survey', label: 'Survey', color: '#7c5cfc', bg: 'rgba(124,92,252,0.12)' },
  { id: 'Design', label: 'Design', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  { id: 'Quotation', label: 'Quotation', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { id: 'Procurement', label: 'Procurement', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { id: 'Installation', label: 'Installation', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { id: 'Commissioned', label: 'Commissioned', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { id: 'On Hold', label: 'On Hold', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  { id: 'Cancelled', label: 'Cancelled', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
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

const STATUS_FILTERS = ['All', 'Survey', 'Design', 'Quotation', 'Procurement', 'Installation', 'Commissioned', 'On Hold', 'Cancelled'];

const PROGRESS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: '0-25%', value: { min: 0, max: 25 } },
  { label: '26-50%', value: { min: 26, max: 50 } },
  { label: '51-75%', value: { min: 51, max: 75 } },
  { label: '76-100%', value: { min: 76, max: 100 } },
];

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
    <div className="overflow-x-auto pb-3 -mx-2 px-2">
      <div className="flex gap-3 min-w-max">
        {KANBAN_STAGES.map(stage => {
          const cards = projects.filter(p => p.status === stage.id);
          const kw = cards.reduce((a, p) => a + p.systemSize, 0);
          return (
            <div key={stage.id}
              className={`flex flex-col w-72 sm:w-60 rounded-xl border transition-colors ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => { if (draggingId.current) onStageChange(draggingId.current, stage.id); draggingId.current = null; setDragOver(null); }}>
              <div className="flex items-center justify-between p-3 border-b border-[var(--border-base)]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {kw > 0 && <span className="text-[10px] text-[var(--solar)] font-bold hidden sm:inline">{kw}kW</span>}
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
  const { can } = usePermissions();
  const { logStatusChange } = useAuditLog('project');

  // Permission guard helper
  const guardCreate = () => {
    if (!can('project', 'create')) {
      toast.error('Permission denied: Cannot create projects');
      return false;
    }
    return true;
  };

  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');
  const [statusFilter, setFilter] = useState('All');
  const [progressFilter, setProgressFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [timelineProject, setTimelineProject] = useState(null);
  const [activityProject, setActivityProject] = useState(null);
  const [statusProject, setStatusProject] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [selected, setSelected] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ customerName: '', site: '', systemSize: '', pm: '', value: '', estEndDate: '', email: '', mobileNumber: '', materials: [] });
  const [items, setItems] = useState([]); // Items for material selection
  const [itemsLoading, setItemsLoading] = useState(false);
  const [editForm, setEditForm] = useState({ customerName: '', site: '', systemSize: '', pm: '', value: '', estEndDate: '', email: '', mobileNumber: '' });
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [hiddenCols, setHiddenCols] = useState(new Set());
  const [colToggleOpen, setColToggleOpen] = useState(false);

  // Fetch projects from backend
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/projects?tenantId=${TENANT_ID}`);
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        console.log('API Response:', data); // Debug log
        const projectsArray = Array.isArray(data) ? data : (data.data || []);
        const transformedProjects = projectsArray.map(p => ({
          ...p,
          id: p.projectId,
        }));
        setProjects(transformedProjects);
        setError(null);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Fetch users for PM dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/auth/users?tenantId=${TENANT_ID}&role=Project Manager`);
        if (response.ok) {
          const result = await response.json();
          const usersArray = Array.isArray(result) ? result : (result.data || []);
          setUsers(usersArray);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Fetch items for material selection
  useEffect(() => {
    const fetchItems = async () => {
      setItemsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/items?tenantId=${TENANT_ID}`);
        if (response.ok) {
          const result = await response.json();
          const itemsArray = Array.isArray(result) ? result : (result.data || []);
          setItems(itemsArray);
        }
      } catch (err) {
        console.error('Error fetching items:', err);
      } finally {
        setItemsLoading(false);
      }
    };
    fetchItems();
  }, []);

  const handleStageChange = async (id, newStage) => {
    // Get current user role from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = user?.role;
    
    // Check if trying to cancel without proper role
    if (newStage === 'Cancelled' && !['Admin', 'Project Manager'].includes(userRole)) {
      alert('Only Admin or Project Manager can cancel a project');
      return;
    }
    
    // Optimistic update
    const project = projects.find(p => p.id === id);
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStage } : p));
    logStatusChange(project, project.status, newStage);
    
    // API call to update status
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}/status?tenantId=${TENANT_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStage, userRole }),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
    } catch (err) {
      console.error('Error updating project status:', err);
      alert(err.message || 'Failed to update project status');
      // Revert the change
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: p.status } : p));
    }
  };

  // Filter out cancelled projects from calculations and kanban view
  const activeProjects = useMemo(() => 
    projects.filter(p => p.status !== 'Cancelled'), 
    [projects]
  );

  const filtered = useMemo(() =>
    projects.filter(p => {
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      const matchesSearch = p.customerName.toLowerCase().includes(search.toLowerCase());
      let matchesProgress = true;
      if (progressFilter !== 'all') {
        const { min, max } = progressFilter;
        matchesProgress = p.progress >= min && p.progress <= max;
      }
      return matchesStatus && matchesSearch && matchesProgress;
    }), [search, statusFilter, progressFilter, projects]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Exclude cancelled from capacity/progress calculations
  const totalKW = activeProjects.reduce((a, p) => a + p.systemSize, 0);
  const active = activeProjects.filter(p => p.status !== 'Commissioned').length;
  const commissioned = activeProjects.filter(p => p.status === 'Commissioned').length;
  const avgProgress = activeProjects.length > 0 
    ? Math.round(activeProjects.reduce((a, p) => a + p.progress, 0) / activeProjects.length) 
    : 0;

  const ROW_ACTIONS = [
    { label: 'View Details', icon: FolderOpen, onClick: row => setSelected(row) },
    { label: 'Edit', icon: Edit2, onClick: row => handleEditClick(row) },
    { label: 'Update Status', icon: CheckCircle, onClick: row => handleUpdateStatusClick(row) },
    { label: 'Timeline', icon: Clock3, onClick: row => handleViewTimeline(row) },
    { label: 'Activity Log', icon: History, onClick: row => handleViewActivity(row) },
    { label: 'Delete', icon: Trash2, onClick: row => handleDeleteProject(row.id), danger: true },
  ];

  const STEPPER_STEPS = selected?.milestones?.map(m => ({ name: m.name, status: m.status, date: m.date })) ?? [];

  // Find first pending milestone index
  const firstPendingIndex = STEPPER_STEPS.findIndex(s => s.status === 'Pending' || s.status === 'In Progress');
  const canMarkComplete = firstPendingIndex !== -1;

  const handleMarkStageComplete = async () => {
    if (!selected || !canMarkComplete) return;

    const milestoneName = STEPPER_STEPS[firstPendingIndex].name;
    
    try {
      // Update the milestone status in backend
      const updatedMilestones = selected.milestones.map((m, idx) => 
        idx === firstPendingIndex 
          ? { ...m, status: 'Done', date: new Date().toISOString().split('T')[0] }
          : m
      );

      // Calculate new progress based on completed milestones
      const completedCount = updatedMilestones.filter(m => m.status === 'Done').length;
      const newProgress = Math.round((completedCount / updatedMilestones.length) * 100);

      // Determine new project status based on milestones
      let newStatus = selected.status;
      if (milestoneName === 'Material Ready') newStatus = 'Procurement';
      else if (milestoneName === 'Installation') newStatus = 'Installation';
      else if (milestoneName === 'Commission') newStatus = 'Commissioned';

      const response = await fetch(`${API_BASE_URL}/projects/${selected.id}/status?tenantId=${TENANT_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus, 
          progress: newProgress,
          milestones: updatedMilestones.map(m => ({ name: m.name, status: m.status, date: m.date })),
          userRole: JSON.parse(localStorage.getItem('user') || '{}')?.role
        }),
      });

      console.log('Update response status:', response.status, response.ok);
      const responseData = await response.json();
      console.log('Update response data:', responseData);

      if (!response.ok) {
        throw new Error('Failed to update milestone');
      }

      // Update local state
      const updatedProject = { 
        ...selected, 
        status: newStatus, 
        progress: newProgress,
        milestones: updatedMilestones 
      };
      
      setProjects(prev => prev.map(p => p.id === selected.id ? updatedProject : p));
      setSelected(updatedProject);
      
      // Show success message or close modal
      // setSelected(null); // Optional: close modal after update
    } catch (err) {
      console.error('Error marking stage complete:', err);
      alert('Failed to mark stage complete. Please try again.');
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}?tenantId=${TENANT_ID}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete project');
      }
      
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Failed to delete project. Please try again.');
    }
  };

  const handleCreateProject = async () => {
    setSubmitting(true);
    try {
      const newProject = {
        projectId: `P${Date.now().toString().slice(-4)}`,
        customerName: form.customerName,
        site: form.site,
        systemSize: parseFloat(form.systemSize) || 0,
        value: parseFloat(form.value) || 0,
        pm: form.pm,
        estEndDate: form.estEndDate,
        email: form.email,
        mobileNumber: form.mobileNumber,
        startDate: new Date().toISOString().split('T')[0],
        status: 'Survey',
        progress: 0,
        milestones: [
          { name: 'Material Ready', status: 'Pending', date: null },
          { name: 'Installation', status: 'Pending', date: null },
          { name: 'Commission', status: 'Pending', date: null },
          { name: 'Billing', status: 'Pending', date: null },
          { name: 'Closure', status: 'Pending', date: null }
        ],
        materials: form.materials.map(m => ({
          itemId: m.itemId,
          itemName: m.itemName,
          quantity: parseInt(m.quantity) || 0,
          issuedDate: m.issuedDate,
          remarks: m.remarks
        }))
      };
      
      const response = await fetch(`${API_BASE_URL}/projects?tenantId=${TENANT_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create project: ${errorText}`);
      }
      
      const createdProject = await response.json();
      const projectData = createdProject.data || createdProject;
      setProjects(prev => [...prev, { ...projectData, id: projectData.projectId }]);
      setShowAdd(false);
      setForm({ customerName: '', site: '', systemSize: '', pm: '', value: '', estEndDate: '', email: '', mobileNumber: '', materials: [] });
      alert('Project created successfully!');
    } catch (err) {
      console.error('Error creating project:', err);
      alert(err.message || 'Failed to create project. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper functions for managing materials
  const addMaterial = () => {
    setForm(f => ({
      ...f,
      materials: [...f.materials, { itemId: '', itemName: '', quantity: '', issuedDate: '', remarks: '' }]
    }));
  };

  const removeMaterial = (index) => {
    setForm(f => ({
      ...f,
      materials: f.materials.filter((_, i) => i !== index)
    }));
  };

  const updateMaterial = (index, field, value) => {
    setForm(f => {
      const updatedMaterials = [...f.materials];
      if (field === 'itemId') {
        const selectedItem = items.find(i => i._id === value || i.id === value);
        updatedMaterials[index] = {
          ...updatedMaterials[index],
          itemId: value,
          itemName: selectedItem?.description || selectedItem?.name || ''
        };
      } else {
        updatedMaterials[index] = { ...updatedMaterials[index], [field]: value };
      }
      return { ...f, materials: updatedMaterials };
    });
  };

  const handleViewTimeline = (project) => {
    setTimelineProject(project);
    setShowTimeline(true);
  };

  const handleViewActivity = (project) => {
    setActivityProject(project);
    setShowActivity(true);
  };

  const handleEditClick = (project) => {
    setEditingProject(project);
    setEditForm({
      customerName: project.customerName || '',
      site: project.site || '',
      systemSize: project.systemSize || '',
      pm: project.pm || '',
      value: project.value || '',
      estEndDate: project.estEndDate || '',
      email: project.email || '',
      mobileNumber: project.mobileNumber || ''
    });
    setShowEdit(true);
  };

  const handleUpdateStatusClick = (project) => {
    setStatusProject(project);
    setNewStatus(project.status);
    setShowStatus(true);
  };

  const handleStatusUpdateConfirm = async () => {
    if (!statusProject || !newStatus) return;
    await handleStageChange(statusProject.id, newStatus);
    setShowStatus(false);
    setStatusProject(null);
    setNewStatus('');
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;
    
    setSubmitting(true);
    try {
      const updateData = {
        customerName: editForm.customerName,
        site: editForm.site,
        systemSize: parseFloat(editForm.systemSize) || 0,
        value: parseFloat(editForm.value) || 0,
        pm: editForm.pm,
        estEndDate: editForm.estEndDate,
        email: editForm.email,
        mobileNumber: editForm.mobileNumber
      };
      
      const response = await fetch(`${API_BASE_URL}/projects/${editingProject.id}?tenantId=${TENANT_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update project: ${errorText}`);
      }
      
      const updatedProject = await response.json();
      const projectData = updatedProject.data || updatedProject;
      
      setProjects(prev => prev.map(p => p.id === editingProject.id ? { ...p, ...projectData } : p));
      setShowEdit(false);
      setEditingProject(null);
      setEditForm({ customerName: '', site: '', systemSize: '', pm: '', value: '', estEndDate: '', email: '', mobileNumber: '' });
      alert('Project updated successfully!');
    } catch (err) {
      console.error('Error updating project:', err);
      alert(err.message || 'Failed to update project. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="page-header flex-col sm:flex-row gap-3">
        <div>
          <h1 className="heading-page text-lg sm:text-xl">Project Management</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Track all EPC projects · milestones · progress · delivery</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="view-toggle-pill">
            <button onClick={() => setView('kanban')}
              className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`}><LayoutGrid size={14} /></button>
            <button onClick={() => setView('table')}
              className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`}><List size={14} /></button>
          </div>
          <CanCreate module="project">
            <Button size="sm" onClick={() => { if (guardCreate()) setShowAdd(true); }}><Plus size={13} /> <span className="hidden sm:inline">New Project</span></Button>
          </CanCreate>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard label="Total Projects" value={projects.length} sub="All projects" icon={Layers} accentColor="#6366f1" />
        <KPICard label="Active Projects" value={active} sub="Currently executing" icon={FolderOpen} accentColor="#3b82f6" />
        <KPICard label="Total Capacity" value={`${totalKW} kW`} sub="Pipeline capacity" icon={Zap} accentColor="#f59e0b" />
        <KPICard label="Current Progress" value={`${avgProgress}%`} sub="Across all projects" icon={TrendingUp} accentColor="#22c55e" />
        <KPICard label="Completed" value={commissioned} sub="Finished projects" icon={CheckCircle} accentColor="#06b6d4" />
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
          {loading ? (
            <div className="glass-card p-8 text-center">
              <div className="animate-pulse text-[var(--text-muted)]">Loading projects...</div>
            </div>
          ) : error ? (
            <div className="glass-card p-8 text-center text-red-500">
              <p>Error loading projects: {error}</p>
              <p className="text-xs mt-2 text-[var(--text-muted)]">Make sure the backend server is running on port 8000</p>
            </div>
          ) : (
            <KanbanBoard projects={filtered} onStageChange={handleStageChange} onCardClick={setSelected} />
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <span className="text-xs text-[var(--text-muted)] mr-1">Status:</span>
            {STATUS_FILTERS.map(s => (
              <button key={s} onClick={() => { setFilter(s); setPage(1); }}
                className={`filter-chip ${statusFilter === s ? 'filter-chip-active' : ''}`}>{s}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <Input placeholder="Search projects…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-8 text-xs w-52" />
            <span className="text-xs text-[var(--text-muted)] mr-1 ml-2">Progress:</span>
            {PROGRESS_FILTERS.map(p => (
              <button key={p.label} onClick={() => { setProgressFilter(p.value); setPage(1); }}
                className={`filter-chip ${progressFilter === p.value ? 'filter-chip-active' : ''}`}>{p.label}</button>
            ))}
            <div className="relative ml-auto">
              <Button size="sm" variant="secondary" onClick={() => setColToggleOpen(p => !p)}>
                <Eye size={12} /> Columns
              </Button>
              {colToggleOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setColToggleOpen(false)} />
                  <div className="absolute right-0 top-9 z-40 w-44 glass-card shadow-2xl shadow-black/40 py-1.5 animate-slide-up">
                    {COLUMNS.map(col => (
                      <button
                        key={col.key}
                        onClick={() => {
                          setHiddenCols(prev => {
                            const next = new Set(prev);
                            next.has(col.key) ? next.delete(col.key) : next.add(col.key);
                            return next;
                          });
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        {col.header}
                        {!hiddenCols.has(col.key)
                          ? <Check size={11} className="text-[var(--primary)]" />
                          : <EyeOff size={11} className="text-[var(--text-faint)]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <DataTable columns={COLUMNS} data={paginated} total={filtered.length}
            page={page} pageSize={pageSize} onPageChange={setPage}
            onPageSizeChange={s => { setPageSize(s); setPage(1); }}
            hiddenCols={hiddenCols}
            onHiddenColsChange={setHiddenCols}
            hideColumnToggle={true}
            rowActions={ROW_ACTIONS} emptyText="No projects found." />
        </>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Project"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button onClick={handleCreateProject} disabled={!form.customerName || !form.site || !form.systemSize || !form.pm}>
            <Plus size={13} /> Create Project
          </Button>
        </div>}>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          <FormField label="Customer Name"><Input placeholder="Customer name" value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email"><Input type="email" placeholder="customer@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></FormField>
            <FormField label="Mobile Number"><Input type="tel" placeholder="+91 98765 43210" value={form.mobileNumber} onChange={e => setForm(f => ({ ...f, mobileNumber: e.target.value }))} /></FormField>
          </div>
          <FormField label="Site Address"><Input placeholder="Installation site" value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))} /></FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="System Size (kW)"><Input type="number" placeholder="50" value={form.systemSize} onChange={e => setForm(f => ({ ...f, systemSize: e.target.value }))} /></FormField>
            <FormField label="Project Value (₹)"><Input type="number" placeholder="280000" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Project Manager">
              <Select value={form.pm} onChange={e => setForm(f => ({ ...f, pm: e.target.value }))}>
                <option value="">{usersLoading ? 'Loading...' : 'Assign PM'}</option>
                {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Estimated End Date"><Input type="date" value={form.estEndDate} onChange={e => setForm(f => ({ ...f, estEndDate: e.target.value }))} /></FormField>
          </div>

          {/* Materials Section */}
          <div className="border-t border-[var(--border-base)] pt-3 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-[var(--text-primary)]">Required Materials</div>
              <Button variant="ghost" size="sm" onClick={addMaterial}><Plus size={13} /> Add Item</Button>
            </div>
            {form.materials.map((material, index) => (
              <div key={index} className="space-y-2 mb-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Item #{index + 1}</span>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeMaterial(index)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Item">
                    <Select value={material.itemId} onChange={e => updateMaterial(index, 'itemId', e.target.value)}>
                      <option value="">{itemsLoading ? 'Loading...' : 'Select Item'}</option>
                      {items.map(item => (
                        <option key={item._id || item.id} value={item._id || item.id}>
                          {item.description || item.name} (Stock: {item.stock || 0})
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Quantity">
                    <Input type="number" placeholder="50" value={material.quantity} onChange={e => updateMaterial(index, 'quantity', e.target.value)} />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Issue Date"><Input type="date" value={material.issuedDate} onChange={e => updateMaterial(index, 'issuedDate', e.target.value)} /></FormField>
                  <FormField label="Remarks"><Input placeholder="Notes..." value={material.remarks} onChange={e => updateMaterial(index, 'remarks', e.target.value)} /></FormField>
                </div>
              </div>
            ))}
            {form.materials.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">No materials added. Click "Add Item" to select materials for this project.</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Edit Project — ${editingProject?.id}`}
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowEdit(false)}>Cancel</Button>
          <Button onClick={handleUpdateProject} disabled={submitting || !editForm.customerName || !editForm.site}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Customer Name"><Input placeholder="Customer name" value={editForm.customerName} onChange={e => setEditForm(f => ({ ...f, customerName: e.target.value }))} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email"><Input type="email" placeholder="customer@email.com" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></FormField>
            <FormField label="Mobile Number"><Input type="tel" placeholder="+91 98765 43210" value={editForm.mobileNumber} onChange={e => setEditForm(f => ({ ...f, mobileNumber: e.target.value }))} /></FormField>
          </div>
          <FormField label="Site Address"><Input placeholder="Installation site" value={editForm.site} onChange={e => setEditForm(f => ({ ...f, site: e.target.value }))} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="System Size (kW)"><Input type="number" placeholder="50" value={editForm.systemSize} onChange={e => setEditForm(f => ({ ...f, systemSize: e.target.value }))} /></FormField>
            <FormField label="Project Value (₹)"><Input type="number" placeholder="280000" value={editForm.value} onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Project Manager">
              <Select value={editForm.pm} onChange={e => setEditForm(f => ({ ...f, pm: e.target.value }))}>
                <option value="">{usersLoading ? 'Loading...' : 'Assign PM'}</option>
                {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Estimated End Date"><Input type="date" value={editForm.estEndDate} onChange={e => setEditForm(f => ({ ...f, estEndDate: e.target.value }))} /></FormField>
          </div>
        </div>
      </Modal>

      {/* Status Update Modal */}
      {statusProject && (
        <Modal open={showStatus} onClose={() => { setShowStatus(false); setStatusProject(null); }} title={`Update Status — ${statusProject.id}`}
          footer={<div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { setShowStatus(false); setStatusProject(null); }}>Cancel</Button>
            <Button onClick={handleStatusUpdateConfirm} disabled={!newStatus || newStatus === statusProject.status}>
              Update Status
            </Button>
          </div>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Customer</div>
                <div className="font-semibold text-[var(--text-primary)]">{statusProject.customerName}</div>
              </div>
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Email</div>
                <div className="font-semibold text-[var(--text-primary)]">{statusProject.email || '—'}</div>
              </div>
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Mobile</div>
                <div className="font-semibold text-[var(--text-primary)]">{statusProject.mobileNumber || '—'}</div>
              </div>
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Site</div>
                <div className="font-semibold text-[var(--text-primary)]">{statusProject.site}</div>
              </div>
            </div>
            <div className="text-xs text-[var(--text-muted)] mb-4">
              Current Status: <span className="font-semibold text-[var(--accent-light)]">{statusProject.status}</span>
            </div>
            <FormField label="New Status">
              <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                <option value="">Select Status</option>
                {['Survey', 'Design', 'Quotation', 'Procurement', 'Installation', 'Commissioned', 'On Hold', 'Cancelled'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </FormField>
            {newStatus === 'Cancelled' && (
              <div className="text-xs text-amber-500 bg-amber-500/10 p-2 rounded">
                Only Admin and Project Manager can cancel projects.
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={`Project — ${selected.id}`}
          footer={<div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            {canMarkComplete && (
              <Button onClick={handleMarkStageComplete}>
                <CheckCircle size={13} /> Mark Stage Complete
              </Button>
            )}
          </div>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[['Customer', selected.customerName], ['Email', selected.email || '—'], ['Mobile', selected.mobileNumber || '—'], ['Site', selected.site], ['System Size', `${selected.systemSize} kW`], ['Project Manager', selected.pm],
              ['Status', <StatusBadge domain="project" value={selected.status} />], ['Value', fmt(selected.value)],
              // ...
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
            {/* Milestone Tracker - Always show with defaults if none exist */}
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)] mb-3">Milestone Tracker</div>
              <Stepper steps={STEPPER_STEPS.length > 0 ? STEPPER_STEPS : [
                { name: 'Material Ready', status: 'Pending', date: null },
                { name: 'Installation', status: 'Pending', date: null },
                { name: 'Commission', status: 'Pending', date: null },
                { name: 'Billing', status: 'Pending', date: null },
                { name: 'Closure', status: 'Pending', date: null }
              ]} />
            </div>
            {(selected.materials?.length > 0 || projectReservations.length > 0) && (
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)] mb-3">Reserved Materials</div>
                {loadingProjectReservations ? (
                  <p className="text-xs text-[var(--text-muted)]">Loading reservations...</p>
                ) : (
                  <div className="space-y-2">
                    {/* Project materials from project schema */}
                    {selected.materials?.map((m, idx) => (
                      <div key={`mat-${idx}`} className="glass-card p-2 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-medium text-[var(--text-primary)]">{m.itemName}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">Qty: {m.quantity} | Issued: {m.issuedDate || '—'}</div>
                        </div>
                        {m.remarks && (
                          <div className="text-[10px] text-[var(--text-faint)] max-w-[150px] truncate" title={m.remarks}>
                            {m.remarks}
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Reservations from inventory-reservation collection */}
                    {projectReservations.map((res, idx) => {
                      const item = items.find(i => i.itemId === res.itemId || i._id === res.itemId);
                      const itemName = item?.description || item?.name || res.itemId;
                      return (
                        <div key={`res-${idx}`} className="glass-card p-2 flex items-center justify-between border-l-2 border-amber-400">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400">{res.status}</span>
                              <span className="text-xs font-medium text-[var(--text-primary)]">{itemName}</span>
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)]">Qty: {res.quantity} | Reserved: {res.reservedDate || '—'}</div>
                          </div>
                          {res.notes && (
                            <div className="text-[10px] text-[var(--text-faint)] max-w-[150px] truncate" title={res.notes}>
                              {res.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {selected.materials && selected.materials.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)] mb-3">Reserved Materials</div>
                <div className="space-y-2">
                  {selected.materials.map((m, idx) => (
                    <div key={idx} className="glass-card p-2 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-[var(--text-primary)]">{m.itemName}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Qty: {m.quantity} | Issued: {m.issuedDate || '—'}</div>
                      </div>
                      {m.remarks && (
                        <div className="text-[10px] text-[var(--text-faint)] max-w-[150px] truncate" title={m.remarks}>
                          {m.remarks}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Timeline Modal */}
      {timelineProject && (
        <Modal open={showTimeline} onClose={() => { setShowTimeline(false); setTimelineProject(null); }} title={`Timeline — ${timelineProject.id}`}
          footer={<div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { setShowTimeline(false); setTimelineProject(null); }}>Close</Button>
          </div>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Customer</div>
                <div className="font-semibold text-[var(--text-primary)]">{timelineProject.customerName}</div>
              </div>
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Email</div>
                <div className="font-semibold text-[var(--text-primary)]">{timelineProject.email || '—'}</div>
              </div>
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Mobile</div>
                <div className="font-semibold text-[var(--text-primary)]">{timelineProject.mobileNumber || '—'}</div>
              </div>
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Site</div>
                <div className="font-semibold text-[var(--text-primary)]">{timelineProject.site}</div>
              </div>
            </div>
            <div className="relative pl-4 border-l-2 border-[var(--border-base)] space-y-4">
              {[
                { label: 'Project Created', date: timelineProject.startDate, status: 'Done', icon: Plus },
                { label: 'Current Status', date: null, status: timelineProject.status, icon: Clock3 },
                ...(timelineProject.milestones || []).map(m => ({ label: m.name, date: m.date, status: m.status, icon: CheckCircle })),
                { label: 'Estimated Completion', date: timelineProject.estEndDate, status: timelineProject.status === 'Commissioned' ? 'Done' : 'Pending', icon: Calendar }
              ].map((item, idx) => (
                <div key={idx} className="relative flex items-start gap-3">
                  <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 ${
                    item.status === 'Done' ? 'bg-green-500 border-green-500' : 
                    item.status === 'In Progress' ? 'bg-blue-500 border-blue-500' : 
                    'bg-[var(--bg-surface)] border-[var(--border-base)]'
                  }`} />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-[var(--text-primary)]">{item.label}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{item.date || '—'}</div>
                    <div className={`text-[10px] font-medium ${
                      item.status === 'Done' ? 'text-green-500' :
                      item.status === 'In Progress' ? 'text-blue-500' :
                      item.status === 'Pending' ? 'text-amber-500' :
                      'text-[var(--text-muted)]'
                    }`}>{item.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Activity Log Modal */}
      {activityProject && (
        <Modal open={showActivity} onClose={() => { setShowActivity(false); setActivityProject(null); }} title={`Activity Log — ${activityProject.id}`}
          footer={<div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { setShowActivity(false); setActivityProject(null); }}>Close</Button>
          </div>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Customer</div>
                <div className="font-semibold text-[var(--text-primary)]">{activityProject.customerName}</div>
              </div>
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Email</div>
                <div className="font-semibold text-[var(--text-primary)]">{activityProject.email || '—'}</div>
              </div>
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Mobile</div>
                <div className="font-semibold text-[var(--text-primary)]">{activityProject.mobileNumber || '—'}</div>
              </div>
              <div className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">Site</div>
                <div className="font-semibold text-[var(--text-primary)]">{activityProject.site}</div>
              </div>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {[
                { action: 'Project created', date: activityProject.startDate, user: activityProject.pm || 'System', type: 'create' },
                { action: `Status updated to ${activityProject.status}`, date: new Date().toISOString().split('T')[0], user: 'Admin', type: 'update' },
                ...(activityProject.milestones || []).filter(m => m.date).map(m => ({ 
                  action: `Milestone completed: ${m.name}`, 
                  date: m.date, 
                  user: activityProject.pm || 'PM', 
                  type: 'milestone' 
                })),
                { action: 'Last modified', date: new Date().toISOString().split('T')[0], user: 'System', type: 'system' }
              ].map((log, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-[var(--bg-tertiary)]">
                  <div className={`w-2 h-2 rounded-full mt-1 ${
                    log.type === 'create' ? 'bg-green-500' :
                    log.type === 'update' ? 'bg-blue-500' :
                    log.type === 'milestone' ? 'bg-purple-500' :
                    'bg-gray-500'
                  }`} />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-[var(--text-primary)]">{log.action}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-[var(--text-muted)]">{log.date}</span>
                      <span className="text-[10px] text-[var(--accent-light)]">• {log.user}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default ProjectPage;
