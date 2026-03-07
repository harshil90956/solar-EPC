// Solar OS – EPC Edition — ProjectPage.js
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FolderOpen, Plus, Calendar, CheckCircle, Zap, TrendingUp, BarChart2,
  LayoutGrid, List, User, Clock, Trash2, Edit2, Clock3, History,
  Eye, Check, EyeOff, Layers
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { PROJECT_STAGE_TREND } from '../data/mockData';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
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

  const [view, setView] = useState('dashboard');
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
  const [projectReservations, setProjectReservations] = useState([]);
  const [loadingProjectReservations, setLoadingProjectReservations] = useState(false);
  const [editForm, setEditForm] = useState({ customerName: '', site: '', systemSize: '', pm: '', value: '', estEndDate: '', email: '', mobileNumber: '', materials: [] });
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [hiddenCols, setHiddenCols] = useState(new Set());
  const [showCardsInViews, setShowCardsInViews] = useState(false);
  const [colToggleOpen, setColToggleOpen] = useState(false);
  const [projectStats, setProjectStats] = useState(null);
  const [projectsByStage, setProjectsByStage] = useState([]);

  // Fetch projects stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/projects/stats?tenantId=${TENANT_ID}`);
        if (response.ok) {
          const data = await response.json();
          setProjectStats(data.data || data);
        }
      } catch (err) {
        console.error('Error fetching project stats:', err);
      }
    };
    fetchStats();
  }, []);

  // Fetch projects by stage for chart
  useEffect(() => {
    const fetchByStage = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/projects/by-stage?tenantId=${TENANT_ID}`);
        if (response.ok) {
          const data = await response.json();
          setProjectsByStage(data.data || data || []);
        }
      } catch (err) {
        console.error('Error fetching projects by stage:', err);
      }
    };
    fetchByStage();
  }, []);

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

  // Fetch project managers from HRM for PM dropdown
  useEffect(() => {
    const fetchProjectManagers = async () => {
      setUsersLoading(true);
      try {
        // Fetch all employees from HRM
        const response = await fetch(`${API_BASE_URL}/hrm/employees?tenantId=${TENANT_ID}`);
        if (response.ok) {
          const result = await response.json();
          const employees = result.data || result || [];
          // Filter to get project managers - employees with roleId containing 'manager' or designation 'Project Manager'
          const projectManagers = employees.filter(e => 
            e.roleId?.toLowerCase().includes('manager') || 
            e.designation?.toLowerCase().includes('project manager') ||
            e.department?.toLowerCase().includes('project')
          );
          // Map to format needed for dropdown
          const pmList = projectManagers.map(e => ({
            id: e._id || e.id,
            name: `${e.firstName} ${e.lastName}`.trim(),
            email: e.email,
            department: e.department
          }));
          setUsers(pmList);
        }
      } catch (err) {
        console.error('Error fetching project managers from HRM:', err);
      } finally {
        setUsersLoading(false);
      }
    };
    fetchProjectManagers();
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

  // Fetch project reservations from inventory when project is selected
  useEffect(() => {
    const fetchProjectReservations = async () => {
      if (!selected?.projectId) {
        setProjectReservations([]);
        return;
      }
      setLoadingProjectReservations(true);
      try {
        const response = await fetch(`${API_BASE_URL}/inventory/reservations/by-project/${selected.projectId}?tenantId=${TENANT_ID}`);
        if (response.ok) {
          const data = await response.json();
          setProjectReservations(data.data || data || []);
        } else {
          setProjectReservations([]);
        }
      } catch (err) {
        console.error('Error fetching project reservations:', err);
        setProjectReservations([]);
      } finally {
        setLoadingProjectReservations(false);
      }
    };
    fetchProjectReservations();
  }, [selected?.projectId]);

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

  // Helper functions for managing edit materials
  const addEditMaterial = () => {
    setEditForm(f => ({
      ...f,
      materials: [...(f.materials || []), { itemId: '', itemName: '', quantity: '', issuedDate: '', remarks: '' }]
    }));
  };

  const removeEditMaterial = (index) => {
    setEditForm(f => ({
      ...f,
      materials: (f.materials || []).filter((_, i) => i !== index)
    }));
  };

  const updateEditMaterial = (index, field, value) => {
    setEditForm(f => {
      const updatedMaterials = [...(f.materials || [])];
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
      mobileNumber: project.mobileNumber || '',
      materials: project.materials || []
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
        mobileNumber: editForm.mobileNumber,
        materials: (editForm.materials || []).map(m => ({
          itemId: m.itemId,
          itemName: m.itemName,
          quantity: parseInt(m.quantity) || 0,
          issuedDate: m.issuedDate,
          remarks: m.remarks
        }))
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
      setEditForm({ customerName: '', site: '', systemSize: '', pm: '', value: '', estEndDate: '', email: '', mobileNumber: '', materials: [] });
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
      <PageHeader
        title="Project Management"
        subtitle="Track all EPC projects · milestones · progress · delivery"
        tabs={[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
          { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
          { id: 'table', label: 'Table', icon: List }
        ]}
        activeTab={view}
        onTabChange={setView}
        actions={[
          { type: 'button', label: 'New Project', icon: Plus, variant: 'primary', onClick: () => { if (guardCreate()) setShowAdd(true); } },
          view !== 'dashboard' && { type: 'button', label: showCardsInViews ? 'Hide Cards' : 'Show Cards', icon: Layers, variant: 'ghost', onClick: () => setShowCardsInViews(!showCardsInViews) }
        ].filter(Boolean)}
      />

      {(view === 'dashboard' || showCardsInViews) && (
        <>
          {/* Summary Cards with Light Colors */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-violet-600 font-semibold">TOTAL PROJECTS</span>
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Layers size={16} className="text-violet-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">{projectStats?.totalProjects ?? projects.length}</div>
          <div className="text-xs text-gray-500 mt-1">All projects</div>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">ACTIVE PROJECTS</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <FolderOpen size={16} className="text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">{projectStats?.active ?? active}</div>
          <div className="text-xs text-gray-500 mt-1">Currently executing</div>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-50 to-teal-50 border border-cyan-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-cyan-600 font-semibold">COMPLETED</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
              <CheckCircle size={16} className="text-cyan-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">{projectStats?.commissioned ?? commissioned}</div>
          <div className="text-xs text-gray-500 mt-1">Finished projects</div>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">TOTAL CAPACITY</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Zap size={16} className="text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">{Math.round(projectStats?.totalCapacity ?? totalKW)} <span className="text-sm font-normal text-gray-600">kW</span></div>
          <div className="text-xs text-gray-500 mt-1">Pipeline capacity</div>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">CURRENT PROGRESS</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">{Math.round(projectStats?.avgProgress ?? avgProgress)}%</div>
          <div className="text-xs text-gray-500 mt-1">Across all projects</div>
        </div>
          </div>

          <div className="ai-banner">
            <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
            <p className="text-xs text-[var(--text-secondary)]">
              <span className="text-[var(--accent-light)] font-semibold">AI Insight:</span>{' '}
              Project P001 (Joshi Industries) is on track for on-time commissioning. P004 (Trivedi Foods) may face a 5-day delay — procurement ETA slipped by 2 days. Review PO002 immediately.
            </p>
          </div>
        </>
      )}

      {/* Dashboard View - Comprehensive Charts */}
      {view === 'dashboard' && (
        <div className="space-y-4">
          {/* Row 1: Projects by Stage & Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Projects by Stage Bar Chart */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 size={15} className="text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Projects by Stage</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={projectsByStage.map(s => ({ stage: s._id, count: s.count, capacity: Math.round(s.capacity || 0) }))} barSize={20} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="stage" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="Projects" />
                  <Bar dataKey="capacity" fill="#06b6d4" radius={[3, 3, 0, 0]} name="Capacity (kW)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Status Distribution Pie Chart */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={15} className="text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Status Distribution</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Active', value: activeProjects.filter(p => p.status !== 'Commissioned' && p.status !== 'On Hold' && p.status !== 'Cancelled').length, color: '#3b82f6' },
                      { name: 'Commissioned', value: activeProjects.filter(p => p.status === 'Commissioned').length, color: '#22c55e' },
                      { name: 'On Hold', value: activeProjects.filter(p => p.status === 'On Hold').length, color: '#f59e0b' },
                      { name: 'Cancelled', value: projects.filter(p => p.status === 'Cancelled').length, color: '#ef4444' },
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {[
                      { name: 'Active', value: activeProjects.filter(p => p.status !== 'Commissioned' && p.status !== 'On Hold' && p.status !== 'Cancelled').length, color: '#3b82f6' },
                      { name: 'Commissioned', value: activeProjects.filter(p => p.status === 'Commissioned').length, color: '#22c55e' },
                      { name: 'On Hold', value: activeProjects.filter(p => p.status === 'On Hold').length, color: '#f59e0b' },
                      { name: 'Cancelled', value: projects.filter(p => p.status === 'Cancelled').length, color: '#ef4444' },
                    ].filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Performance Overview */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={18} className="text-[var(--accent)]" />
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Performance Overview</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Completion Rate', value: Math.round((activeProjects.filter(p => p.progress === 100).length / (activeProjects.length || 1)) * 100), target: 85, color: '#22c55e', bgColor: 'bg-green-50', iconColor: 'text-green-500', hint: 'Finished projects' },
                { label: 'Avg Progress', value: avgProgress, target: 75, color: '#3b82f6', bgColor: 'bg-blue-50', iconColor: 'text-blue-500', hint: 'How far along' },
                { label: 'On Track', value: Math.round((activeProjects.filter(p => p.progress >= 50).length / (activeProjects.length || 1)) * 100), target: 80, color: '#8b5cf6', bgColor: 'bg-purple-50', iconColor: 'text-purple-500', hint: 'Going well' },
                { label: 'Delayed Risk', value: Math.round((activeProjects.filter(p => p.progress < 25 && p.status !== 'Commissioned').length / (activeProjects.length || 1)) * 100), target: 15, color: '#f59e0b', bgColor: 'bg-amber-50', iconColor: 'text-amber-500', reverse: true, hint: 'Needs attention' },
              ].map((metric) => {
                const circumference = 2 * Math.PI * 36;
                const strokeDashoffset = circumference - (Math.min(metric.value, 100) / 100) * circumference;
                const isGood = metric.reverse ? metric.value <= metric.target : metric.value >= metric.target;
                
                return (
                  <div key={metric.label} className="flex items-center gap-4">
                    {/* Circular Chart */}
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                        {/* Background circle */}
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          fill="none"
                          stroke={metric.color + '20'}
                          strokeWidth="8"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          fill="none"
                          stroke={metric.color}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      {/* Percentage in center */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold" style={{ color: metric.color }}>{metric.value}%</span>
                      </div>
                    </div>
                    
                    {/* Text Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{metric.label}</p>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs text-[var(--text-muted)]">Target: {metric.target}%</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-xs font-medium ${isGood ? 'text-green-500' : metric.reverse ? 'text-amber-500' : 'text-red-500'}`}>
                          {isGood ? '✓ On Track' : metric.reverse ? '⚠ High Risk' : '↓ Below Target'}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-faint)] italic">{metric.hint}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 3: Project Manager Performance - Charts */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <User size={18} className="text-[var(--accent)]" />
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Project Manager Performance</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600" /> Active</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" /> Completed</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" /> Progress</span>
              </div>
            </div>
            
            {/* PM Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Chart 1: Projects Distribution Bar Chart */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200">
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-4">Projects by Manager</h4>
                <div className="space-y-3">
                  {Array.from(new Set(projects.map(p => p.pm))).filter(pm => pm).slice(0, 6).map((pm, index) => {
                    const pmProjects = projects.filter(p => p.pm === pm);
                    const maxProjects = Math.max(...Array.from(new Set(projects.map(p => p.pm))).filter(pm => pm).map(pm => projects.filter(p => p.pm === pm).length));
                    const barWidth = maxProjects > 0 ? (pmProjects.length / maxProjects) * 100 : 0;
                    const colors = [
                      'from-violet-400 to-purple-600',
                      'from-blue-400 to-blue-600',
                      'from-cyan-400 to-teal-500',
                      'from-amber-400 to-orange-500',
                      'from-rose-400 to-pink-500',
                      'from-emerald-400 to-green-500'
                    ];
                    return (
                      <div key={pm} className="flex items-center gap-3">
                        <div className="w-24 text-xs font-medium text-[var(--text-primary)] truncate">{pm}</div>
                        <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${colors[index % colors.length]} rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2`}
                            style={{ width: `${Math.max(barWidth, 8)}%` }}
                          >
                            <span className="text-[10px] text-white font-semibold">{pmProjects.length}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 2: Active vs Completed Stacked Bar */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200">
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-4">Active vs Completed Projects</h4>
                <div className="space-y-3">
                  {Array.from(new Set(projects.map(p => p.pm))).filter(pm => pm).slice(0, 6).map((pm, index) => {
                    const pmProjects = projects.filter(p => p.pm === pm);
                    const completed = pmProjects.filter(p => p.status === 'Commissioned').length;
                    const active = pmProjects.filter(p => p.status !== 'Commissioned' && p.status !== 'Cancelled').length;
                    const total = active + completed;
                    const activePct = total > 0 ? (active / total) * 100 : 0;
                    const completedPct = total > 0 ? (completed / total) * 100 : 0;
                    
                    return (
                      <div key={pm} className="flex items-center gap-3">
                        <div className="w-20 text-[10px] text-[var(--text-muted)] truncate">{pm.split(' ')[0]}</div>
                        <div className="flex-1 h-5 flex rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-1000 ease-out"
                            style={{ width: `${activePct}%` }}
                            title={`Active: ${active}`}
                          />
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000 ease-out"
                            style={{ width: `${completedPct}%` }}
                            title={`Completed: ${completed}`}
                          />
                        </div>
                        <div className="w-16 text-[10px] text-right">
                          <span className="text-blue-600 font-semibold">{active}</span>
                          <span className="text-gray-400 mx-1">|</span>
                          <span className="text-emerald-600 font-semibold">{completed}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 3: Average Progress Circular Indicators */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200">
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-4">Average Progress</h4>
                <div className="grid grid-cols-3 gap-4">
                  {Array.from(new Set(projects.map(p => p.pm))).filter(pm => pm).slice(0, 6).map((pm, index) => {
                    const pmProjects = projects.filter(p => p.pm === pm);
                    const avgProgress = pmProjects.length > 0 ? Math.round(pmProjects.reduce((a, p) => a + (p.progress || 0), 0) / pmProjects.length) : 0;
                    const colors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#f59e0b', '#ec4899', '#22c55e'];
                    const color = colors[index % colors.length];
                    const circumference = 2 * Math.PI * 28;
                    const strokeDashoffset = circumference - (avgProgress / 100) * circumference;
                    
                    return (
                      <div key={pm} className="flex flex-col items-center">
                        <div className="relative w-16 h-16">
                          <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r="28" fill="none" stroke={color + '20'} strokeWidth="6" />
                            <circle 
                              cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="6" 
                              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold" style={{ color }}>{avgProgress}%</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] mt-1 text-center truncate w-full">{pm.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 4: Project Value Comparison */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200">
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-4">Total Project Value</h4>
                <div className="space-y-3">
                  {Array.from(new Set(projects.map(p => p.pm))).filter(pm => pm).slice(0, 6).map((pm, index) => {
                    const pmProjects = projects.filter(p => p.pm === pm);
                    const totalValue = pmProjects.reduce((a, p) => a + (p.value || 0), 0);
                    const maxValue = Math.max(...Array.from(new Set(projects.map(p => p.pm))).filter(pm => pm).map(pm => projects.filter(p => p.pm === pm).reduce((a, p) => a + (p.value || 0), 0)));
                    const barWidth = maxValue > 0 ? (totalValue / maxValue) * 100 : 0;
                    const colors = [
                      'from-violet-400 to-purple-600',
                      'from-blue-400 to-blue-600',
                      'from-cyan-400 to-teal-500',
                      'from-amber-400 to-orange-500',
                      'from-rose-400 to-pink-500',
                      'from-emerald-400 to-green-500'
                    ];
                    
                    return (
                      <div key={pm} className="flex items-center gap-3">
                        <div className="w-20 text-[10px] text-[var(--text-muted)] truncate">{pm.split(' ')[0]}</div>
                        <div className="flex-1 h-5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${colors[index % colors.length]} rounded-full transition-all duration-1000 ease-out`}
                            style={{ width: `${Math.max(barWidth, 5)}%` }}
                          />
                        </div>
                        <div className="w-16 text-[10px] font-semibold text-[var(--text-primary)] text-right">
                          ₹{(totalValue / 100000).toFixed(1)}L
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <>
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <span className="text-xs text-[var(--text-muted)] mr-1">Status:</span>
            {STATUS_FILTERS.map(s => (
              <button key={s} onClick={() => { setFilter(s); setPage(1); }}
                className={`filter-chip ${statusFilter === s ? 'filter-chip-active' : ''}`}>{s}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center mb-2 justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <Input placeholder="Search projects…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-8 text-xs w-52" />
              <span className="text-xs text-[var(--text-muted)] mr-1 ml-2">Progress:</span>
              {PROGRESS_FILTERS.map(p => (
                <button key={p.label} onClick={() => { setProgressFilter(p.value); setPage(1); }}
                  className={`filter-chip ${progressFilter === p.value ? 'filter-chip-active' : ''}`}>{p.label}</button>
              ))}
            </div>
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
          <DataTable columns={COLUMNS} data={paginated} total={filtered.length}
            page={page} pageSize={pageSize} onPageChange={setPage}
            onPageSizeChange={s => { setPageSize(s); setPage(1); }}
            hiddenCols={hiddenCols}
            onHiddenColsChange={setHiddenCols}
            hideColumnToggle={true}
            rowActions={ROW_ACTIONS} emptyText="No projects found."
            onRowClick={row => setSelected(row)} />
        </>
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-[var(--text-muted)] mr-1">Status:</span>
            {STATUS_FILTERS.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`filter-chip ${statusFilter === s ? 'filter-chip-active' : ''}`}>{s}</button>
            ))}
            <div className="ml-auto">
              <Input placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs w-52" />
            </div>
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

          {/* Materials Section */}
          <div className="border-t border-[var(--border-base)] pt-3 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-[var(--text-primary)]">Required Materials</div>
              <Button variant="ghost" size="sm" onClick={addEditMaterial}><Plus size={13} /> Add Item</Button>
            </div>
            {(editForm.materials || []).map((material, index) => (
              <div key={index} className="space-y-2 mb-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Item #{index + 1}</span>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeEditMaterial(index)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Item">
                    <Select value={material.itemId} onChange={e => updateEditMaterial(index, 'itemId', e.target.value)}>
                      <option value="">{itemsLoading ? 'Loading...' : 'Select Item'}</option>
                      {items.map(item => (
                        <option key={item._id || item.id} value={item._id || item.id}>
                          {item.description || item.name} (Stock: {item.stock || 0})
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Quantity">
                    <Input type="number" placeholder="50" value={material.quantity} onChange={e => updateEditMaterial(index, 'quantity', e.target.value)} />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Issue Date"><Input type="date" value={material.issuedDate} onChange={e => updateEditMaterial(index, 'issuedDate', e.target.value)} /></FormField>
                  <FormField label="Remarks"><Input placeholder="Notes..." value={material.remarks} onChange={e => updateEditMaterial(index, 'remarks', e.target.value)} /></FormField>
                </div>
              </div>
            ))}
            {(!editForm.materials || editForm.materials.length === 0) && (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">No materials added. Click "Add Item" to select materials for this project.</p>
            )}
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
                  <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 ${item.status === 'Done' ? 'bg-green-500 border-green-500' :
                    item.status === 'In Progress' ? 'bg-blue-500 border-blue-500' :
                      'bg-[var(--bg-surface)] border-[var(--border-base)]'
                    }`} />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-[var(--text-primary)]">{item.label}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{item.date || '—'}</div>
                    <div className={`text-[10px] font-medium ${item.status === 'Done' ? 'text-green-500' :
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
                  <div className={`w-2 h-2 rounded-full mt-1 ${log.type === 'create' ? 'bg-green-500' :
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
