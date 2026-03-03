// Solar OS – EPC Edition — ProjectPage.js
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FolderOpen, Plus, Calendar, CheckCircle, Zap, TrendingUp, BarChart2,
  LayoutGrid, List, User, Clock, Trash2, Edit2, Clock3, History
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
  const [form, setForm] = useState({ customerName: '', site: '', systemSize: '', pm: '', value: '', estEndDate: '' });
  const [editForm, setEditForm] = useState({ customerName: '', site: '', systemSize: '', pm: '', value: '', estEndDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

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
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStage } : p));
    
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
    projects.filter(p =>
      (statusFilter === 'All' || p.status === statusFilter) &&
      p.customerName.toLowerCase().includes(search.toLowerCase())
    ), [search, statusFilter, projects]);

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
        startDate: new Date().toISOString().split('T')[0],
        status: 'Survey',
        progress: 0,
        milestones: [
          { name: 'Material Ready', status: 'Pending', date: null },
          { name: 'Installation', status: 'Pending', date: null },
          { name: 'Commission', status: 'Pending', date: null },
          { name: 'Billing', status: 'Pending', date: null },
          { name: 'Closure', status: 'Pending', date: null }
        ]
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
      setForm({ customerName: '', site: '', systemSize: '', pm: '', value: '', estEndDate: '' });
      alert('Project created successfully!');
    } catch (err) {
      console.error('Error creating project:', err);
      alert(err.message || 'Failed to create project. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
      estEndDate: project.estEndDate || ''
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
        estEndDate: editForm.estEndDate
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
      setEditForm({ customerName: '', site: '', systemSize: '', pm: '', value: '', estEndDate: '' });
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
          <Button onClick={handleCreateProject} disabled={!form.customerName || !form.site || !form.systemSize || !form.pm}>
            <Plus size={13} /> Create Project
          </Button>
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
                <option value="">{usersLoading ? 'Loading...' : 'Assign PM'}</option>
                {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Estimated End Date"><Input type="date" value={form.estEndDate} onChange={e => setForm(f => ({ ...f, estEndDate: e.target.value }))} /></FormField>
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
            <div className="text-xs text-[var(--text-muted)] mb-2">
              <span className="font-semibold text-[var(--text-primary)]">{statusProject.customerName}</span> — {statusProject.site}
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

      {/* Timeline Modal */}
      {timelineProject && (
        <Modal open={showTimeline} onClose={() => { setShowTimeline(false); setTimelineProject(null); }} title={`Timeline — ${timelineProject.id}`}
          footer={<div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { setShowTimeline(false); setTimelineProject(null); }}>Close</Button>
          </div>}>
          <div className="space-y-4">
            <div className="text-xs text-[var(--text-muted)] mb-2">
              <span className="font-semibold text-[var(--text-primary)]">{timelineProject.customerName}</span> — {timelineProject.site}
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
            <div className="text-xs text-[var(--text-muted)] mb-2">
              <span className="font-semibold text-[var(--text-primary)]">{activityProject.customerName}</span> — {activityProject.site}
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
