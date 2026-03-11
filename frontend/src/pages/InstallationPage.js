import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useSettings } from '../context/SettingsContext';
import { usePermissions } from '../hooks/usePermissions';
import { useAuditLog } from '../hooks/useAuditLog';
import { PageHeader } from '../components/ui/PageHeader';
import { Input, FormField, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { KPICard } from '../components/ui/KPICard';
import { Progress } from '../components/ui/Progress';
import DataTable from '../components/ui/DataTable';
import { toast } from '../components/ui/Toast';
import CanAccess, { CanCreate, CanEdit, CanDelete } from '../components/CanAccess';
import { Wrench, Plus, LayoutGrid, List, CalendarDays, CheckCircle, Camera, User, MapPin, Clock, Edit } from 'lucide-react';
import { APP_CONFIG } from '../config/app.config';

// ── Kanban columns ─────────────────────────────────────────────────────────────
const INSTALL_STAGES = [
  { id: 'Pending', label: 'Pending', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  { id: 'In Progress', label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { id: 'Delayed', label: 'Delayed', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  { id: 'Completed', label: 'Completed', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
];

// Small badge renderer
const InstallBadge = ({ value }) => {
  const map = {
    'Pending': 'bg-indigo-100 text-indigo-600',
    'In Progress': 'bg-amber-100 text-amber-600',
    'Delayed': 'bg-red-100 text-red-600',
    'Completed': 'bg-emerald-100 text-emerald-600',
  };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs ${map[value]||''}`}>{value}</span>;
};

// Local cache for settings tasks (keeps stable shape)
let _installationTasksCache = [];
export const setTasksCache = (tasks) => { _installationTasksCache = tasks || []; };
export const getTasksFromSettings = () => _installationTasksCache || [];

// Merge settings tasks with saved tasks to ensure current settings are shown
const mergeWithSettingsTasks = (savedTasks = []) => {
  const settingsTasks = getTasksFromSettings();
  if (!settingsTasks.length) return savedTasks;
  
  return settingsTasks.map(st => {
    const saved = savedTasks.find(t => t.name === st.name);
    return {
      name: st.name,
      photoRequired: !!st.photoRequired,
      done: saved?.done || false
    };
  });
};
const calculateProgress = (tasks=[]) => {
  if (!tasks || tasks.length === 0) return 0;
  const done = tasks.filter(t => !!t.done).length;
  return Math.round((done / tasks.length) * 100);
};

// ── Installation Kanban Card ──
const InstallCard = ({ log, onDragStart, onClick }) => {
  const tasks = mergeWithSettingsTasks(log.tasks);
  const done = tasks.filter(t=>t.done).length;
  const progress = calculateProgress(tasks);
  const stage = INSTALL_STAGES.find(s => s.id === log.status);
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-[var(--primary)]/40 transition-all">
      <div className="flex items-start justify-between mb-1">
        <span className="text-[10px] font-mono text-[var(--accent-light)]">{log.installationId || log.id}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: stage?.bg, color: stage?.color }}>{progress}%</span>
      </div>
      <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5 leading-tight">{log.customerName || log.customer}</p>
      <div className="flex items-center gap-1.5 mb-2">
        <MapPin size={12} className="text-[var(--accent-light)]" />
        <span className="text-[11px] font-medium text-[var(--accent-light)]">{log.siteAddress || log.site}</span>
      </div>
      <Progress value={progress} className="h-1 mb-2" />
      <div className="grid grid-cols-2 gap-1 text-center">
        <div>
          <p className="text-[9px] text-[var(--text-faint)]">Tasks</p>
          <p className="text-[11px] font-bold text-[var(--text-primary)]">{done}/{tasks.length}</p>
        </div>
        <div>
          <p className="text-[9px] text-[var(--text-faint)]">Technician</p>
          <p className="text-[11px] font-bold text-[var(--text-primary)] truncate">{log.technicianName || log.technician || '-'}</p>
        </div>
      </div>
      {log.scheduledDate && (
        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[var(--text-muted)]">
          <Clock size={9} /> {new Date(log.scheduledDate).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

/* ── Kanban Board ── */
const InstallKanbanBoard = ({ items, onCardClick, onDrop, canEdit }) => {
  const draggingId = useRef(null);
  const draggingStageId = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  const [stageOrder, setStageOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('installKanbanStageOrder');
      if (!saved) return INSTALL_STAGES.map(s => s.id);
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return INSTALL_STAGES.map(s => s.id);
      const valid = parsed.filter(id => INSTALL_STAGES.some(s => s.id === id));
      const missing = INSTALL_STAGES.map(s => s.id).filter(id => !valid.includes(id));
      return [...valid, ...missing];
    } catch {
      return INSTALL_STAGES.map(s => s.id);
    }
  });

  const handleDrop = (stageId) => {
    // Prevent drag operations if user doesn't have edit permission
    if (!canEdit) {
      setDragOver(null);
      draggingId.current = null;
      draggingStageId.current = null;
      return;
    }
    
    if (draggingStageId.current) {
      const from = draggingStageId.current;
      const to = stageId;
      if (from !== to) {
        setStageOrder(prev => {
          const next = [...prev];
          const fromIdx = next.indexOf(from);
          const toIdx = next.indexOf(to);
          if (fromIdx === -1 || toIdx === -1) return prev;
          next.splice(fromIdx, 1);
          next.splice(toIdx, 0, from);
          return next;
        });
      }
      draggingStageId.current = null;
      setDragOver(null);
      return;
    }

    if (draggingId.current && onDrop) {
      onDrop(draggingId.current, stageId);
    }
    draggingId.current = null; setDragOver(null);
  };

  return (
    <div className="overflow-x-auto pb-3 -mx-2 px-2">
      <div className="flex gap-3 min-w-max">
        {stageOrder
          .map(id => INSTALL_STAGES.find(s => s.id === id))
          .filter(Boolean)
          .map(stage => {
            const cards = items.filter(i => i.status === stage.id);
            const avgProgress = cards.length ? Math.round(cards.reduce((a, i) => a + calculateProgress(i.tasks), 0) / cards.length) : 0;
            return (
              <div key={stage.id}
                className={`flex flex-col w-72 sm:w-60 rounded-xl border transition-colors ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}
                onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(stage.id)}>
                <div
                  draggable
                  onDragStart={(e) => {
                    draggingStageId.current = stage.id;
                    try {
                      e.dataTransfer.effectAllowed = 'move';
                    } catch {
                      // ignore
                    }
                  }}
                  onDragEnd={() => { draggingStageId.current = null; setDragOver(null); }}
                  className="flex items-center justify-between p-3 border-b border-[var(--border-base)] cursor-grab active:cursor-grabbing"
                  title="Drag to reorder columns"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {avgProgress > 0 && <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">{avgProgress}%</span>}
                    <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                      style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 p-2 flex-1 min-h-[180px]">
                  {cards.map(i => (
                    <InstallCard key={i.installationId || i.id} log={i}
                      onDragStart={() => { draggingId.current = i.installationId || i.id; }}
                      onClick={() => onCardClick(i)} />
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

const COLUMNS = [
  { key: 'installationId', header: 'Installation ID', render: v => <span className="font-mono text-xs">{v}</span> },
  { key: 'projectId', header: 'Project', render: v => <span className="text-xs">{typeof v === 'object' ? (v?.projectId || v?.id || '-') : (v || '-')}</span> },
  { key: 'customerName', header: 'Customer', render: v => <span className="text-xs font-semibold">{v}</span> },
  { key: 'siteAddress', header: 'Site', render: v => <span className="text-xs">{v}</span> },
  { key: 'technicianName', header: 'Technician', render: v => <span className="text-xs">{v}</span> },
  { key: 'status', header: 'Status', render: v => <InstallBadge value={v} /> },
  { key: 'progress', header: 'Progress', render: v => <Progress value={v} className="h-1.5" /> },
  { key: 'scheduledDate', header: 'Start Date', render: v => <span className="text-xs">{v}</span> },
];

const InstallationPage = () => {
  const { can, user, role } = usePermissions();
  const { logCreate, logUpdate, logStatusChange } = useAuditLog('installation');
  const { installationTasks } = useSettings();
  const [view, setView] = useState('kanban');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize || 20);

  // sync settings cache
  useEffect(()=>{ setTasksCache(installationTasks || []); }, [installationTasks]);

  // fetch installations
  const { data: installationsRaw=[], refetch } = useQuery({
    queryKey: ['installations'],
    queryFn: async () => { const r = await apiClient.get('/installations'); return r.data || []; }
  });

  // derive logs with normalized fields and progress
  const logs = useMemo(() => (installationsRaw || []).map(l => ({
    ...l,
    installationId: l.installationId || l.id || l._id,
    customerName: l.customerName || l.customer,
    siteAddress: l.siteAddress || l.site,
    technicianName: l.technicianName || l.technician,
    tasks: (l.tasks && l.tasks.length) ? l.tasks : (getTasksFromSettings().map(t=>({ ...t, done:false }))),
    progress: calculateProgress(l.tasks || getTasksFromSettings()),
  })), [installationsRaw]);

  // simple KPIs
  const active = logs.filter(l=>l.status==='In Progress').length;
  const completed = logs.filter(l=>l.status==='Completed').length;
  const pending = logs.filter(l=>l.status==='Pending').length;
  const avgProg = logs.length ? Math.round(logs.reduce((a,b)=>a+b.progress,0)/logs.length) : 0;

  // Kanban helpers
  const handleMove = async (id, toStatus) => {
    if (!can('installation','edit')) return toast.error('Permission denied');
    const log = logs.find(x => x.installationId === id || x.id === id || x._id === id);
    if (!log) return;
    // enforce completion rule
    if (toStatus === 'Completed') {
      const allTasksDone = (log.tasks || []).every(t => !!t.done);
      const allPhotos = (log.tasks || []).filter(t=>t.photoRequired).length === 0 || (log.photos && log.photos.length >= (log.tasks || []).filter(t=>t.photoRequired).length);
      if (!allTasksDone || !allPhotos) {
        return toast.error('Cannot mark completed: ensure all tasks done and required photos uploaded');
      }
    }
    try {
      await apiClient.patch(`/installations/${log._id || log.id}/status`, { status: toStatus });
      refetch();
      logStatusChange(log, log.status, toStatus);
    } catch (err) {
      toast.error(err.message || 'Failed to move');
    }
  };

  // table pagination/filter
  const filtered = logs.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (l.installationId||'').toString().toLowerCase().includes(s) || (l.customerName||'').toLowerCase().includes(s) || (l.siteAddress||'').toLowerCase().includes(s);
  });
  const paginated = filtered.slice((page-1)*pageSize, page*pageSize).map(l => ({ ...l, progress: calculateProgress(l.tasks) }));

  // Detail modal: toggle task with photo rule
  const handleToggleTask = async (index) => {
    if (!selected) return;
    
    // Debug logging
    console.log('[DEBUG] handleToggleTask:', {
      userRole: user?.role,
      userId: user?.id,
      user_id: user?._id,
      selectedTechId: selected.technicianId,
      selectedAssignedTo: selected.assignedTo,
      hasEditPermission: can('installation','edit')
    });
    
    // Technician or assigned user can update tasks even without edit permission
    const isTechnicianByRole = user?.role?.toLowerCase() === 'technician';
    const isAssignedUser = selected.technicianId === user?.id || 
                           selected.technicianId === user?._id ||
                           selected.assignedTo === user?.id ||
                           selected.assignedTo === user?._id;
    const canUpdate = can('installation','edit') || isTechnicianByRole || isAssignedUser;
    
    console.log('[DEBUG] Permission check:', { isTechnicianByRole, isAssignedUser, canUpdate });
    
    if (!canUpdate) {
      return toast.error('Permission denied');
    }
    
    // Get merged tasks (settings + saved status)
    const currentTasks = mergeWithSettingsTasks(selected.tasks);
    const t = currentTasks[index];
    if (!t) return;
    
    if (!t.done && t.photoRequired && (!selected.photos || selected.photos.length===0)) {
      return toast.error('Photo required before marking this task complete');
    }
    
    // Toggle the task - ensure proper data types for backend
    const updatedTasks = currentTasks.map((x,i)=> i===index ? { 
      ...x, 
      done: !x.done,
      name: x.name,
      photoRequired: !!x.photoRequired
    } : {
      ...x,
      done: !!x.done,
      name: x.name,
      photoRequired: !!x.photoRequired
    });
    
    try {
      const resp = await apiClient.patch(`/installations/${selected._id || selected.id}/tasks`, { tasks: updatedTasks });
      setSelected(resp.data);
      refetch();
      logUpdate(selected, { tasks: selected.tasks }, { tasks: resp.data.tasks });
    } catch (err) { 
      console.error('Task update error:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || err.message || 'Failed'); 
    }
  };

  // Calendar data derived from installation events (server stores events array)
  const calendarEvents = useMemo(() => {
    const ev = [];
    logs.forEach(l => {
      (l.events || []).forEach(e => ev.push({ installationId: l.installationId, timestamp: e.timestamp, eventType: e.eventType, metadata: e.metadata }));
      // ensure a created event exists
      if (!l.events || !l.events.some(x=>x.eventType==='Installation Created')) {
        ev.push({ installationId: l.installationId, timestamp: l.createdAt || l._created || null, eventType: 'Installation Created', metadata: {} });
      }
    });
    return ev.sort((a,b)=> new Date(b.timestamp||0) - new Date(a.timestamp||0));
  }, [logs]);

  // New installation creation uses settings tasks as template
  const [newForm, setNewForm] = useState({ department:'', technicianId:'', technicianName:'', customerName:'', site:'', scheduledDate:'', notes:'', projectId:'' });
  const [editForm, setEditForm] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  
  // Fetch pending installations for dropdown
  const { data: pendingInstallations=[] } = useQuery({
    queryKey: ['installations', 'pending'],
    queryFn: async () => { 
      try {
        const r = await apiClient.get('/installations?status=Pending'); 
        console.log('Installations API raw response:', r);
        
        // Handle different response structures
        let instList = [];
        if (Array.isArray(r)) {
          instList = r;
        } else if (r?.data) {
          instList = r.data;
        } else if (typeof r === 'object' && r !== null) {
          instList = r.data || [];
        }
        
        console.log('Pending installations:', instList);
        return instList;
      } catch(err) {
        console.error('Installations fetch error:', err);
        return [];
      }
    },
    enabled: showAdd
  });
  
  // Fetch employees from HRM
  const { data: employees=[] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => { 
      try {
        const r = await apiClient.get('/hrm/employees'); 
        console.log('Raw API response:', r);
        console.log('Type:', typeof r, 'Is Array:', Array.isArray(r));
        
        // Handle wrapped response { success: true, data: [...] }
        let empList = [];
        if (Array.isArray(r)) {
          empList = r;
        } else if (r && typeof r === 'object') {
          empList = r.data || [];
        }
        
        console.log('Extracted employee list:', empList);
        console.log('Employee count:', empList.length);
        return empList;
      } catch(err) {
        console.error('Employees fetch error:', err);
        return [];
      }
    },
    enabled: showAdd
  });
  
  // Get unique departments from employees
  const departments = useMemo(() => {
    console.log('Extracting departments from employees:', employees);
    console.log('Employee count:', employees.length);
    if (employees.length > 0) {
      console.log('First employee:', employees[0]);
      console.log('First employee keys:', Object.keys(employees[0]));
      console.log('First employee department:', employees[0].department);
      // Check for alternative field names
      console.log('dept:', employees[0].dept);
      console.log('departmentId:', employees[0].departmentId);
      console.log('departmentName:', employees[0].departmentName);
    }
    const depts = [...new Set(employees.map(e => {
      return e.department;
    }).filter(Boolean))];
    console.log('Unique departments found:', depts);
    return depts;
  }, [employees]);
  
  // Filter technicians by selected department
  const technicians = useMemo(() => {
    if (!selectedDept) return employees;
    return employees.filter(e => e.department === selectedDept);
  }, [employees, selectedDept]);
  const createInstallation = async () => {
    if (!can('installation','create')) return toast.error('Permission denied');
    try {
      await apiClient.post('/installations', { ...newForm, tasks: getTasksFromSettings().map(t=>({ name: t.name, photoRequired: !!t.photoRequired, done:false })) });
      setShowAdd(false);
      refetch();
      toast.success('Installation created');
    } catch (err) { toast.error(err.message || 'Create failed'); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Installation" subtitle="Site installation logs, checklist and photos" tabs={[{id:'kanban',label:'Kanban',icon:LayoutGrid},{id:'table',label:'Table',icon:List},{id:'calendar',label:'Calendar',icon:CalendarDays}]} activeTab={view} onTabChange={setView} actions={can('installation','create') ? [{ type: 'button', label: 'Assign', icon: Plus, variant: 'primary', onClick: () => setShowAdd(true) }] : []} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard title="Total Active Installations" value={active} icon={Wrench} sub="currently in progress" color="amber" />
        <KPICard title="Total Completed Installations" value={completed} icon={CheckCircle} sub="finished" color="emerald" />
        <KPICard title="Total Pending Installations" value={pending} icon={Wrench} sub="awaiting start" color="accent" />
        <KPICard title="Average Installation Progress" value={`${avgProg}%`} icon={Wrench} sub="across sites" color="solar" />
      </div>

      <div className="flex items-center justify-between">
        <Input placeholder="Search installations…" value={search} onChange={e=>setSearch(e.target.value)} className="w-80" />
      </div>

      {view === 'kanban' && (
        <InstallKanbanBoard items={logs} onCardClick={setSelected} onDrop={handleMove} canEdit={can('installation', 'edit')} />
      )}

      {view === 'table' && (
        <DataTable 
          columns={COLUMNS} 
          data={paginated.map(r=>({ ...r, progress: calculateProgress(r.tasks) }))} 
          pagination={{ page, pageSize, total: filtered.length, onChange: setPage, onPageSizeChange: setPageSize }} 
          emptyMessage="No installation logs found."
          onRowClick={(row) => setSelected(row)}
        />
      )}

      {view === 'calendar' && (
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1">Installation</th>
                <th className="px-2 py-1">Event</th>
                <th className="px-2 py-1">Details</th>
              </tr>
            </thead>
            <tbody>
              {calendarEvents.map((e,i)=> (
                <tr key={i} className="border-t"><td className="px-2 py-1">{e.timestamp?new Date(e.timestamp).toLocaleString():'-'}</td><td className="px-2 py-1">{e.installationId}</td><td className="px-2 py-1">{e.eventType}</td><td className="px-2 py-1">{e.metadata?JSON.stringify(e.metadata):''}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Log Modal */}
      <Modal open={showAdd} onClose={()=>{setShowAdd(false); setSelectedDept('');}} title="Assign Installation" footer={<div className="flex gap-2 justify-end"><Button variant="ghost" onClick={()=>{setShowAdd(false); setSelectedDept('');}}>Cancel</Button><Button onClick={createInstallation} disabled={!newForm.technicianId}><Plus size={12} /> Assign</Button></div>}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {/* Pending Installation Dropdown */}
            <select 
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] col-span-2"
              value={newForm.installationId}
              onChange={e=>{
                const inst = pendingInstallations.find(i => (i._id || i.id) === e.target.value);
                setNewForm(p=>({...p, installationId: e.target.value, customerName: inst?.customerName || '', site: inst?.site || ''}));
              }}
            >
              <option value="">{pendingInstallations.length > 0 ? 'Select Pending Installation' : 'No Pending Installations'}</option>
              {pendingInstallations.map(inst => (
                <option key={inst._id || inst.id} value={inst._id || inst.id}>
                  {inst.customerName || 'Unknown'} - {inst.site || 'No Site'}
                </option>
              ))}
            </select>
            
            {/* Department Dropdown */}
            <select 
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
              value={selectedDept}
              onChange={e=>{
                setSelectedDept(e.target.value);
                setNewForm(p=>({...p, department: e.target.value, technicianId:'', technicianName:''}));
              }}
            >
              <option value="">{departments.length > 0 ? 'Select Department' : 'No Departments Available'}</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            
            {/* Technician Dropdown */}
            <select 
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] disabled:opacity-50"
              value={newForm.technicianId}
              disabled={!selectedDept}
              onChange={e=>{
                const emp = employees.find(emp => emp._id === e.target.value || emp.id === e.target.value);
                setNewForm(p=>({...p, technicianId: e.target.value, technicianName: emp?.name || emp?.firstName + ' ' + emp?.lastName || ''}));
              }}
            >
              <option value="">{selectedDept ? 'Select Technician' : 'Select Department First'}</option>
              {technicians.map(tech => (
                <option key={tech._id || tech.id} value={tech._id || tech.id}>
                  {tech.name || `${tech.firstName || ''} ${tech.lastName || ''}`.trim()}
                </option>
              ))}
            </select>
            
            <Input placeholder="Site Address" value={newForm.site} onChange={e=>setNewForm(p=>({...p,site:e.target.value}))} />
            <Input type="date" placeholder="Start Date" value={newForm.scheduledDate} onChange={e=>setNewForm(p=>({...p,scheduledDate:e.target.value}))} />
            <Input placeholder="Notes (Optional)" value={newForm.notes} onChange={e=>setNewForm(p=>({...p,notes:e.target.value}))} />
          </div>
          {getTasksFromSettings().length>0 && (
            <div>
              <div className="text-xs font-semibold">Default Task Checklist</div>
              <ul className="list-disc list-inside text-[12px] mt-1">
                {getTasksFromSettings().map((t,i)=>(<li key={i}>{t.name}{t.photoRequired?' (photo required)':''}</li>))}
              </ul>
            </div>
          )}
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && (
        <Modal open={!!selected} onClose={()=>setSelected(null)} title={`Installation — ${selected.installationId || selected.id}`} footer={
          <div className="flex gap-2 justify-end">
            <CanEdit module="installation">
              <Button variant="primary" onClick={()=>{setEditForm(selected); setShowEdit(true);}}><Edit size={14} /> Edit</Button>
            </CanEdit>
            <Button variant="ghost" onClick={()=>setSelected(null)}>Close</Button>
          </div>
        }>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="glass-card p-2"><div className="text-[var(--text-muted)]">Installation ID</div><div className="font-semibold">{selected.installationId || selected.id}</div></div>
              <div className="glass-card p-2"><div className="text-[var(--text-muted)]">Project</div><div className="font-semibold">{typeof selected.projectId === 'object' ? (selected.projectId?.projectId || selected.projectId?.id || '-') : (selected.projectId || '-')}</div></div>
              <div className="glass-card p-2"><div className="text-[var(--text-muted)]">Customer</div><div className="font-semibold">{selected.customerName || '-'}</div></div>
              <div className="glass-card p-2"><div className="text-[var(--text-muted)]">Site</div><div className="font-semibold">{selected.siteAddress || '-'}</div></div>
            </div>

            <div>
              <div className="text-xs font-semibold">Task Checklist</div>
              <div className="space-y-2 mt-2">
                {(mergeWithSettingsTasks(selected.tasks) || []).map((t,i)=> {
                  // Technician or assigned user can update tasks even without edit permission
                  const isTechnicianByRole = user?.role?.toLowerCase() === 'technician';
                  const isAssignedUser = selected.technicianId === user?.id || 
                                         selected.technicianId === user?._id ||
                                         selected.assignedTo === user?.id ||
                                         selected.assignedTo === user?._id;
                  const canUpdateTask = can('installation','edit') || isTechnicianByRole || isAssignedUser;
                  
                  return (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border-base)]">
                    <div className="flex items-center gap-3">
                      {canUpdateTask ? (
                        <div 
                          onClick={()=>handleToggleTask(i)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${t.done?'bg-emerald-500 border-emerald-500':'border-[var(--border-base)]'}`}
                        >
                          {t.done && <CheckCircle size={14} className="text-white" />}
                        </div>
                      ) : (
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${t.done?'bg-emerald-500 border-emerald-500':'border-[var(--border-base)]'}`}>
                          {t.done && <CheckCircle size={14} className="text-white" />}
                        </div>
                      )}
                      <span className={`text-sm ${t.done?'text-[var(--text-muted)] line-through':''}`}>{t.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                        <div className={`w-3 h-3 rounded border ${t.photoRequired?'bg-emerald-500 border-emerald-500':'border-[var(--border-base)]'}`} />
                        Photo
                      </label>
                    </div>
                  </div>
                )})}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold">Photos</div>
              <div className="text-[12px] mt-2">{(selected.photos||[]).length} uploaded</div>
            </div>

            <div>
              <div className="text-xs font-semibold">Timeline</div>
              <div className="space-y-2 mt-2 text-[12px] max-h-40 overflow-auto">
                {(selected.events||[]).slice().sort((a,b)=> new Date(b.timestamp||0)-new Date(a.timestamp||0)).map((e,i)=>(<div key={i} className="glass-card p-2"><div className="flex justify-between"><div>{e.eventType}</div><div className="text-[10px] text-[var(--text-muted)]">{e.timestamp?new Date(e.timestamp).toLocaleString():'-'}</div></div>{e.metadata && <pre className="text-xs mt-1">{JSON.stringify(e.metadata)}</pre>}</div>))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Installation Modal */}
      {showEdit && editForm && (
        <Modal 
          open={showEdit} 
          onClose={()=>{setShowEdit(false); setEditForm(null);}} 
          title="Edit Installation"
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={()=>{setShowEdit(false); setEditForm(null);}}>Cancel</Button>
              <Button variant="primary" onClick={async ()=>{
                try {
                  // Clean up data - remove empty strings for optional ObjectId fields
                  const cleanData = { ...editForm };
                  if (!cleanData.dispatchId) delete cleanData.dispatchId;
                  if (!cleanData.technicianId) delete cleanData.technicianId;
                  if (!cleanData.supervisorId) delete cleanData.supervisorId;
                  if (!cleanData.assignedTo) delete cleanData.assignedTo;
                  await apiClient.patch(`/installations/${editForm._id || editForm.id}`, cleanData);
                  toast.success('Installation updated');
                  setShowEdit(false);
                  setEditForm(null);
                  refetch();
                } catch (err) {
                  toast.error(err.message || 'Update failed');
                }
              }}>Save Changes</Button>
            </div>
          }
        >
          <div className="space-y-3">
            {/* Department & Technician */}
            <div className="grid grid-cols-2 gap-2">
              <select
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)]"
                value={editForm.department || ''}
                onChange={e=>setEditForm(p=>({...p, department: e.target.value, technicianId: '', technicianName: ''}))}
              >
                <option value="">Select Department</option>
                {[...new Set((employees || []).map(e => e.department).filter(Boolean))].map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <select
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)]"
                value={editForm.technicianId || ''}
                onChange={e=>{
                  const emp = employees.find(x => (x._id || x.id) === e.target.value);
                  setEditForm(p=>({...p, technicianId: e.target.value, technicianName: emp ? `${emp.firstName} ${emp.lastName}` : ''}));
                }}
                disabled={!editForm.department}
              >
                <option value="">{editForm.department ? 'Select Technician' : 'Select Department First'}</option>
                {(employees || []).filter(e => e.department === editForm.department).map(emp => (
                  <option key={emp._id || emp.id} value={emp._id || emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
            </div>

            {/* Site & Status */}
            <div className="grid grid-cols-2 gap-2">
              <Input 
                placeholder="Site Address" 
                value={editForm.site || editForm.siteAddress || ''} 
                onChange={e=>setEditForm(p=>({...p, site: e.target.value, siteAddress: e.target.value}))} 
              />
              <select
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)]"
                value={editForm.status || 'Pending'}
                onChange={e=>setEditForm(p=>({...p, status: e.target.value}))}
              >
                {INSTALL_STAGES.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.label}</option>
                ))}
              </select>
            </div>

            {/* Tasks Checklist */}
            <div className="border border-[var(--border-base)] rounded-lg p-3">
              <div className="text-xs font-semibold mb-2">Tasks Checklist</div>
              <div className="space-y-2">
                {(mergeWithSettingsTasks(editForm.tasks) || []).map((t,i)=> (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-[var(--border-base)] last:border-0">
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={()=>{
                          const newTasks = [...(editForm.tasks || [])];
                          const taskIdx = newTasks.findIndex(nt => nt.name === t.name);
                          if (taskIdx >= 0) {
                            newTasks[taskIdx] = { ...newTasks[taskIdx], done: !newTasks[taskIdx].done };
                          } else {
                            newTasks.push({ name: t.name, photoRequired: t.photoRequired, done: true });
                          }
                          setEditForm(p=>({...p, tasks: newTasks}));
                        }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${t.done?'bg-emerald-500 border-emerald-500':'border-[var(--border-base)]'}`}
                      >
                        {t.done && <CheckCircle size={14} className="text-white" />}
                      </div>
                      <span className={`text-sm ${t.done?'text-[var(--text-muted)] line-through':''}`}>{t.name}</span>
                    </div>
                    {t.photoRequired && <span className="text-xs text-[var(--text-muted)]">Photo Required</span>}
                  </div>
                ))}
              </div>
            </div>

            <Input 
              placeholder="Notes (Optional)" 
              value={editForm.notes || ''} 
              onChange={e=>setEditForm(p=>({...p, notes: e.target.value}))} 
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InstallationPage;
