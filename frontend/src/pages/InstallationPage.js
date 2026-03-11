import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
import { Wrench, Plus, LayoutGrid, List, CalendarDays, CheckCircle, Camera, User, MapPin, Clock, Edit, AlertCircle, Download, Trash2, Eye, SortAsc, SortDesc, UserPlus, UserMinus, TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, LayoutDashboard } from 'lucide-react';
import { APP_CONFIG } from '../config/app.config';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line, ComposedChart } from 'recharts';

// ── Kanban columns ─────────────────────────────────────────────────────────────
const INSTALL_STAGES = [
  { id: 'Pending Assign', label: 'Pending Assign', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  { id: 'In Progress', label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { id: 'Completed', label: 'Completed', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { id: 'Delayed', label: 'Delayed', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

// Small badge renderer
const InstallBadge = ({ value }) => {
  const map = {
    'Pending Assign': 'bg-indigo-100 text-indigo-600',
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
          <p className="text-[11px] font-bold truncate" style={{color: (log.technicianName && log.technicianName !== 'TBD') ? 'var(--text-primary)' : 'var(--text-muted)'}}>{(log.technicianName && log.technicianName !== 'TBD') ? log.technicianName : 'Not Assigned'}</p>
        </div>
      </div>
      {log.scheduledDate && (
        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[var(--text-muted)]">
          <Clock size={9} /> {new Date(log.scheduledDate).toLocaleDateString()}
        </div>
      )}
      {log.status === 'Delayed' && log.delayDays > 0 && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-red-500 font-semibold">
          <AlertCircle size={9} /> {log.delayDays} days overdue
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
    // Clear old order to force new INSTALL_STAGES order
    localStorage.removeItem('installKanbanStageOrder');
    return INSTALL_STAGES.map(s => s.id);
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
            const cards = items.filter(i => {
              return i.status === stage.id;
            });
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
  { key: 'installationId', header: 'Installation ID', sortable: true, render: (v) => <span className="font-mono text-xs font-semibold text-[var(--accent-light)]">{v}</span> },
  { key: 'projectId', header: 'Project', sortable: true, render: (v) => <span className="text-xs">{typeof v === 'object' ? (v?.projectId || v?.id || '-') : (v || '-')}</span> },
  { key: 'customerName', header: 'Customer', sortable: true, render: (v, row) => (
    <div>
      <p className="text-xs font-semibold text-[var(--text-primary)]">{v || '-'}</p>
      {row.siteAddress && <p className="text-[10px] text-[var(--text-muted)]">{row.siteAddress}</p>}
    </div>
  )},
  { key: 'technicianName', header: 'Technician', sortable: true, render: (v) => (
    <span className={`text-xs ${(!v || v === 'Not Assigned') ? 'text-[var(--text-muted)] italic' : 'text-[var(--text-primary)]'}`}>{v || 'Not Assigned'}</span>
  )},
  { key: 'status', header: 'Status', sortable: true, render: (v) => <InstallBadge value={v} /> },
  { key: 'progress', header: 'Progress', sortable: true, render: (v) => (
    <div className="flex items-center gap-2 min-w-[80px]">
      <Progress value={v} className="h-1.5 flex-1" />
      <span className="text-[10px] font-semibold text-[var(--text-muted)] w-7 text-right">{v}%</span>
    </div>
  )},
  { key: 'scheduledDate', header: 'Due Date', sortable: true, render: (v) => <span className="text-xs">{v ? new Date(v).toLocaleDateString() : '—'}</span> },
];

// ── Installation Calendar Component ───────────────────────────────────────────
const STATUS_COLORS = {
  'Pending Assign': '#6366f1',
  'In Progress':   '#f59e0b',
  'Completed':     '#22c55e',
  'Delayed':       '#ef4444',
};

const InstallationCalendar = ({ logs, onOpenInstallation }) => {
  const today = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());       // 0-based
  const [selectedDay, setSelectedDay] = useState(null);             // 'YYYY-MM-DD'
  const [animDir,  setAnimDir]  = useState('');                     // 'left'|'right'
  const [animKey,  setAnimKey]  = useState(0);

  // Map: 'YYYY-MM-DD' -> installations
  const dayMap = useMemo(() => {
    const m = {};
    logs.forEach(l => {
      const d = l.scheduledDate || l.dueDate;
      if (!d) return;
      const key = new Date(d).toISOString().slice(0, 10);
      if (!m[key]) m[key] = [];
      m[key].push(l);
    });
    return m;
  }, [logs]);

  const selectedInstalls = useMemo(() => selectedDay ? (dayMap[selectedDay] || []) : [], [selectedDay, dayMap]);

  const navigate = (dir) => {
    setAnimDir(dir);
    setAnimKey(k => k + 1);
    if (dir === 'left') {
      if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
      else setCalMonth(m => m - 1);
    } else {
      if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
      else setCalMonth(m => m + 1);
    }
    setSelectedDay(null);
  };

  // Build grid: always 6 rows × 7 cols
  const grid = useMemo(() => {
    const first = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
    const days  = new Date(calYear, calMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = i - first + 1;
      if (d < 1 || d > days) { cells.push(null); continue; }
      const key = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      cells.push({ d, key });
    }
    return cells;
  }, [calYear, calMonth]);

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const todayKey    = today.toISOString().slice(0, 10);

  const animClass = animDir === 'left'
    ? 'animate-[slideInLeft_0.25s_ease]'
    : animDir === 'right'
      ? 'animate-[slideInRight_0.25s_ease]'
      : '';

  return (
    <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[480px]">
      {/* Calendar grid */}
      <div className="flex-1 rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] overflow-hidden flex flex-col shadow-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-base)] bg-gradient-to-r from-[var(--primary)]/10 to-transparent">
          <button
            onClick={() => navigate('left')}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--primary)]/20 transition-all duration-200 hover:scale-110 text-[var(--text-primary)]"
          >&#8249;</button>
          <div className="text-center">
            <h3 className="text-base font-bold text-[var(--text-primary)] tracking-wide">{MONTH_NAMES[calMonth]} {calYear}</h3>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              {Object.keys(dayMap).filter(k => k.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`)).length} installations this month
            </p>
          </div>
          <button
            onClick={() => navigate('right')}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--primary)]/20 transition-all duration-200 hover:scale-110 text-[var(--text-primary)]"
          >&#8250;</button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 border-b border-[var(--border-base)]">
          {DAY_NAMES.map(d => (
            <div key={d} className={`py-2 text-center text-[10px] font-semibold uppercase tracking-widest ${
              d === 'Sun' || d === 'Sat' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
            }`}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div key={animKey} className={`flex-1 grid grid-cols-7 grid-rows-6 p-2 gap-1 overflow-hidden ${animClass}`}>
          {grid.map((cell, i) => {
            if (!cell) return <div key={i} />;
            const installs = dayMap[cell.key] || [];
            const isToday   = cell.key === todayKey;
            const isSelected = cell.key === selectedDay;
            const hasItems  = installs.length > 0;
            return (
              <button
                key={cell.key}
                onClick={() => setSelectedDay(isSelected ? null : cell.key)}
                className={`relative rounded-xl flex flex-col items-center justify-start pt-1.5 pb-1 px-1 transition-all duration-200 group ${
                  isSelected
                    ? 'bg-[var(--primary)] shadow-lg shadow-[var(--primary)]/30 scale-105'
                    : isToday
                      ? 'bg-[var(--primary)]/15 ring-2 ring-[var(--primary)]/40'
                      : hasItems
                        ? 'hover:bg-[var(--primary)]/10 hover:scale-105'
                        : 'hover:bg-[var(--bg-muted,var(--bg-surface))]'
                }`}
              >
                <span className={`text-xs font-bold leading-none ${
                  isSelected ? 'text-white' : isToday ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'
                }`}>{cell.d}</span>

                {/* Status dots */}
                {hasItems && (
                  <div className="flex flex-wrap gap-[2px] justify-center mt-1 max-w-full">
                    {installs.slice(0, 5).map((inst, idx) => (
                      <span
                        key={idx}
                        className="w-1.5 h-1.5 rounded-full transition-transform group-hover:scale-125"
                        style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.8)' : (STATUS_COLORS[inst.status] || '#94a3b8') }}
                      />
                    ))}
                    {installs.length > 5 && (
                      <span className={`text-[8px] font-bold ${isSelected ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>+{installs.length - 5}</span>
                    )}
                  </div>
                )}

                {/* Count badge */}
                {hasItems && !isSelected && (
                  <span className="absolute top-0.5 right-1 text-[8px] font-bold text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">{installs.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-6 py-3 border-t border-[var(--border-base)] bg-[var(--bg-muted,var(--bg-surface))]">
          {Object.entries(STATUS_COLORS).map(([s, c]) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
              <span className="text-[10px] text-[var(--text-muted)]">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div
        className={`w-80 rounded-2xl border border-[var(--border-base)] bg-[var(--bg-surface)] shadow-lg flex flex-col overflow-hidden transition-all duration-300 ${
          selectedDay ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
        }`}
        style={{ transform: selectedDay ? 'translateX(0)' : 'translateX(16px)' }}
      >
        {/* Panel header */}
        <div className="px-5 py-4 border-b border-[var(--border-base)] bg-gradient-to-r from-[var(--primary)]/10 to-transparent">
          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Selected Date</p>
          <h4 className="text-sm font-bold text-[var(--text-primary)]">
            {selectedDay ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) : ''}
          </h4>
          <p className="text-xs text-[var(--primary)] font-semibold mt-1">{selectedInstalls.length} Installation{selectedInstalls.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Installation cards */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {selectedInstalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-[var(--text-muted)]">
              <CalendarDays size={32} className="mb-2 opacity-30" />
              <p className="text-xs">No installations</p>
            </div>
          ) : selectedInstalls.map((inst, idx) => (
            <button
              key={inst._id || inst.id}
              onClick={() => onOpenInstallation(inst)}
              className="w-full text-left rounded-xl border border-[var(--border-base)] p-3 hover:border-[var(--primary)] hover:shadow-md hover:scale-[1.02] transition-all duration-200 bg-[var(--bg-page,var(--bg-surface))] group"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-[var(--primary)]">{inst.installationId}</span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: (STATUS_COLORS[inst.status] || '#94a3b8') + '22', color: STATUS_COLORS[inst.status] || '#94a3b8' }}
                >{inst.status}</span>
              </div>
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{inst.customerName || '—'}</p>
              {inst.siteAddress && <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">📍 {inst.siteAddress}</p>}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-muted)]">
                  {inst.technicianName && inst.technicianName !== 'Not Assigned'
                    ? `👷 ${inst.technicianName}`
                    : <span className="italic">Not Assigned</span>
                  }
                </span>
                <span className="text-[10px] font-bold" style={{ color: STATUS_COLORS[inst.status] || '#94a3b8' }}>{inst.progress}%</span>
              </div>
              {/* Progress bar */}
              <div className="mt-1.5 h-1 rounded-full bg-[var(--border-base)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${inst.progress}%`, backgroundColor: STATUS_COLORS[inst.status] || '#94a3b8' }}
                />
              </div>
              <p className="text-[9px] text-[var(--text-muted)] mt-1.5 group-hover:text-[var(--primary)] transition-colors">Click to view details →</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Installation Dashboard with Advanced 3D Animated Charts ───────────────────
const InstallationDashboard = ({ logs }) => {
  const [dateRange, setDateRange] = useState('all'); // '7days', '30days', '90days', 'all', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Filter logs based on date range
  const filteredLogs = useMemo(() => {
    const now = new Date();
    let startDate = null;
    
    if (dateRange === '7days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === '30days') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateRange === '90days') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (dateRange === 'custom' && customStartDate) {
      startDate = new Date(customStartDate);
      if (customEndDate) {
        const endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
        return logs.filter(l => {
          const logDate = new Date(l.createdAt || l._created || Date.now());
          return logDate >= startDate && logDate <= endDate;
        });
      }
    }
    
    if (startDate) {
      return logs.filter(l => {
        const logDate = new Date(l.createdAt || l._created || Date.now());
        return logDate >= startDate;
      });
    }
    
    return logs; // 'all' or no filter
  }, [logs, dateRange, customStartDate, customEndDate]);
  // Calculate comprehensive stats
  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const completed = filteredLogs.filter(l => l.status === 'Completed').length;
    const inProgress = filteredLogs.filter(l => l.status === 'In Progress').length;
    const pending = filteredLogs.filter(l => l.status === 'Pending Assign' || l.status === 'Pending').length;
    const delayed = filteredLogs.filter(l => l.status === 'Delayed').length;
    const unassigned = filteredLogs.filter(l => !l.technicianId || l.technicianName === 'Not Assigned' || l.technicianName === 'TBD').length;
    const avgProgress = total > 0 ? Math.round(filteredLogs.reduce((sum, l) => sum + l.progress, 0) / total) : 0;
    
    // Technician performance
    const techMap = {};
    filteredLogs.forEach(l => {
      if (l.technicianName && l.technicianName !== 'Not Assigned' && l.technicianName !== 'TBD') {
        if (!techMap[l.technicianName]) techMap[l.technicianName] = { name: l.technicianName, total: 0, completed: 0, avgProgress: 0, progressSum: 0 };
        techMap[l.technicianName].total++;
        if (l.status === 'Completed') techMap[l.technicianName].completed++;
        techMap[l.technicianName].progressSum += l.progress;
      }
    });
    const technicianStats = Object.values(techMap).map(t => ({
      ...t,
      avgProgress: t.total > 0 ? Math.round(t.progressSum / t.total) : 0,
      completionRate: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);
    
    // Trend data (last 7 days)
    const today = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLogs = filteredLogs.filter(l => {
        const logDate = new Date(l.createdAt || l._created || Date.now()).toISOString().slice(0, 10);
        return logDate === dateStr;
      });
      last7Days.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: dateStr,
        created: dayLogs.length,
        completed: dayLogs.filter(l => l.status === 'Completed').length
      });
    }
    
    // Status distribution for pie chart
    const statusDist = [
      { name: 'Completed', value: completed, color: '#22c55e' },
      { name: 'In Progress', value: inProgress, color: '#f59e0b' },
      { name: 'Pending', value: pending, color: '#6366f1' },
      { name: 'Delayed', value: delayed, color: '#ef4444' }
    ].filter(s => s.value > 0);
    
    return { total, completed, inProgress, pending, delayed, unassigned, avgProgress, technicianStats, trendData: last7Days, statusDist };
  }, [filteredLogs]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Date Range Filter */}
      <div className="glass-card p-4 rounded-2xl border border-[var(--border-base)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <CalendarDays size={20} className="text-[var(--primary)]" />
            <span className="text-sm font-bold text-[var(--text-primary)]">Filter by Date:</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setDateRange('7days')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dateRange === '7days'
                    ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30'
                    : 'bg-[var(--bg-muted)] text-[var(--text-muted)] hover:bg-[var(--primary)]/10'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setDateRange('30days')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dateRange === '30days'
                    ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30'
                    : 'bg-[var(--bg-muted)] text-[var(--text-muted)] hover:bg-[var(--primary)]/10'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setDateRange('90days')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dateRange === '90days'
                    ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30'
                    : 'bg-[var(--bg-muted)] text-[var(--text-muted)] hover:bg-[var(--primary)]/10'
                }`}
              >
                Last 90 Days
              </button>
              <button
                onClick={() => setDateRange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dateRange === 'all'
                    ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30'
                    : 'bg-[var(--bg-muted)] text-[var(--text-muted)] hover:bg-[var(--primary)]/10'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setDateRange('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dateRange === 'custom'
                    ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30'
                    : 'bg-[var(--bg-muted)] text-[var(--text-muted)] hover:bg-[var(--primary)]/10'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-40 text-xs py-2"
                placeholder="Start Date"
              />
              <span className="text-[var(--text-muted)]">to</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-40 text-xs py-2"
                placeholder="End Date"
              />
            </div>
          )}
          <div className="text-xs text-[var(--text-muted)] font-medium">
            Showing: <span className="text-[var(--primary)] font-bold">{filteredLogs.length}</span> of <span className="text-[var(--primary)] font-bold">{logs.length}</span> installations
          </div>
        </div>
      </div>

      {/* Charts Row 1 - Status & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution - 3D Donut Chart */}
        <div className="glass-card p-6 rounded-2xl border border-[var(--border-base)] animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center">
              <PieChartIcon size={20} className="text-[var(--primary)]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Status Distribution</h3>
              <p className="text-xs text-[var(--text-muted)]">Real-time installation status breakdown</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.6}/>
                </linearGradient>
                <linearGradient id="colorInProgress" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.6}/>
                </linearGradient>
                <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.6}/>
                </linearGradient>
                <linearGradient id="colorDelayed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
              <Pie
                data={stats.statusDist}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={110}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {stats.statusDist.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#color${entry.name.replace(/\s/g, '')})`} stroke="var(--bg-surface)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-base)',
                  borderRadius: 12,
                  fontSize: 13,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, marginTop: 20 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 7-Day Trend - Area Chart with Gradient */}
        <div className="glass-card p-6 rounded-2xl border border-[var(--border-base)] animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Weekly Trend</h3>
              <p className="text-xs text-[var(--text-muted)]">Installation activity over last 7 days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.trendData}>
              <defs>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-base)',
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              />
              <Area type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCreated)" name="Created" />
              <Area type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" name="Completed" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 - Performance & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Technician Performance - Horizontal Bar Chart */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-[var(--border-base)] animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <BarChart3 size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Technician Performance</h3>
              <p className="text-xs text-[var(--text-muted)]">Workload distribution and efficiency</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={stats.technicianStats.slice(0, 8)} layout="horizontal" barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-primary)', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-base)',
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="total" name="Total Jobs" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Completion Rate - Radial Progress */}
        <div className="glass-card p-6 rounded-2xl border border-[var(--border-base)] animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Activity size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Quick Stats</h3>
              <p className="text-xs text-[var(--text-muted)]">Key performance indicators</p>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--text-muted)]">Overall Completion</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</span>
              </div>
              <div className="h-3 rounded-full bg-[var(--border-base)] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-1000" style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--text-muted)]">Avg Progress</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">{stats.avgProgress}%</span>
              </div>
              <div className="h-3 rounded-full bg-[var(--border-base)] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-1000" style={{ width: `${stats.avgProgress}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--text-muted)]">Unassigned</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">{stats.unassigned}</span>
              </div>
              <div className="h-3 rounded-full bg-[var(--border-base)] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-1000" style={{ width: `${stats.total > 0 ? (stats.unassigned / stats.total) * 100 : 0}%` }} />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-base)]">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--primary)]">{stats.technicianStats.length}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Active Techs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{stats.technicianStats.filter(t => t.completionRate === 100).length}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">100% Complete</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity - Timeline */}
      <div className="glass-card p-6 rounded-2xl border border-[var(--border-base)] animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Clock size={20} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Recent Installations</h3>
            <p className="text-xs text-[var(--text-muted)]">Latest installation activity</p>
          </div>
        </div>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {logs.slice(0, 10).map((log, idx) => (
            <div key={log._id || log.id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-muted)]/50 hover:bg-[var(--primary)]/5 transition-all cursor-pointer group">
              <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--primary)]/20 transition-all">
                <Wrench size={20} className="text-[var(--primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-[var(--primary)]">{log.installationId || log.id}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: (INSTALL_STAGES.find(s => s.id === log.status)?.bg || '#94a3b822'), color: INSTALL_STAGES.find(s => s.id === log.status)?.color || '#94a3b8' }}>{log.status}</span>
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{log.customerName || 'Customer'}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <MapPin size={10} /> {log.siteAddress || 'Site'}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <User size={10} /> {log.technicianName || 'Not Assigned'}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-bold text-[var(--text-primary)]">{log.progress}%</div>
                <div className="w-20 h-1.5 rounded-full bg-[var(--border-base)] mt-1 overflow-hidden">
                  <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: `${log.progress}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const InstallationPage = () => {
  const { can, user, role } = usePermissions();
  const { logCreate, logUpdate, logStatusChange } = useAuditLog('installation');
  const { installationTasks } = useSettings();
  const isTechnician = user?.role?.toLowerCase() === 'technician' || user?.role?.toLowerCase() === 'employee' || user?.dataScope === 'ASSIGNED';
  console.log('[DEBUG] User role:', user?.role, 'dataScope:', user?.dataScope, 'isTechnician:', isTechnician);
  const [view, setView] = useState(isTechnician ? 'table' : 'dashboard'); // Default to dashboard for non-technicians
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize || 25);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const handleSort = useCallback(({ key, dir }) => setSort({ key, dir }), []);

  // sync settings cache
  useEffect(()=>{ setTasksCache(installationTasks || []); }, [installationTasks]);

  // Check overdue installations on page load
  useEffect(() => {
    const checkOverdue = async () => {
      try {
        const result = await apiClient.post('/installations/check-overdue');
        if (result.data?.updated > 0) {
          toast.info(`${result.data.updated} installation(s) marked as delayed`);
          refetch();
        }
      } catch (err) {
        console.error('Failed to check overdue:', err);
      }
    };
    checkOverdue();
  }, []);

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
    technicianName: (l.technicianName && l.technicianName !== 'TBD') ? l.technicianName : (l.technician && l.technician !== 'TBD' ? l.technician : 'Not Assigned'),
    tasks: (l.tasks && l.tasks.length) ? l.tasks : (getTasksFromSettings().map(t=>({ ...t, done:false }))),
    progress: calculateProgress(l.tasks || getTasksFromSettings()),
  })), [installationsRaw]);

  // simple KPIs
  const active = logs.filter(l=>l.status==='In Progress').length;
  const completed = logs.filter(l=>l.status==='Completed').length;
  const pending = logs.filter(l=>l.status==='Pending').length;
  const unassigned = logs.filter(l=>!l.technicianId && (!l.technicianName || l.technicianName === 'Not Assigned' || l.technicianName === 'TBD')).length;
  const avgProg = logs.length ? Math.round(logs.reduce((a,b)=>a+b.progress,0)/logs.length) : 0;

  // Kanban helpers
  const handleMove = async (id, toStatus) => {
    const log = logs.find(x => x.installationId === id || x.id === id || x._id === id);
    if (!log) return;
    
    // Check permission: either has edit permission OR is technician/assigned user
    const isTechnicianByRole = user?.role?.toLowerCase() === 'technician';
    const isAssignedUser = log.technicianId === user?.id || 
                           log.technicianId === user?._id ||
                           log.assignedTo === user?.id ||
                           log.assignedTo === user?._id;
    const canUpdate = can('installation','edit') || isTechnicianByRole || isAssignedUser;
    
    if (!canUpdate) return toast.error('Permission denied');
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
      await refetch();
      // Update selected state if modal is open for this installation
      if (selected && (selected._id === id || selected.id === id)) {
        setSelected({ ...selected, status: toStatus });
      }
      logStatusChange(log, log.status, toStatus);
    } catch (err) {
      toast.error(err.message || 'Failed to move');
    }
  };

  // table pagination/filter/sort
  const filtered = useMemo(() => {
    let result = logs.filter(l => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (l.installationId||'').toString().toLowerCase().includes(s)
        || (l.customerName||'').toLowerCase().includes(s)
        || (l.siteAddress||'').toLowerCase().includes(s)
        || (l.technicianName||'').toLowerCase().includes(s);
    });
    if (sort.key) {
      result = [...result].sort((a, b) => {
        const av = a[sort.key] ?? '';
        const bv = b[sort.key] ?? '';
        const cmp = typeof av === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [logs, search, sort]);
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
    
    // Check if all tasks are now done → auto-complete
    const allNowDone = updatedTasks.length > 0 && updatedTasks.every(t => t.done);
    const isUnchecking = t.done === true; // Task was done, now being unchecked
    const isProjectCompleted = selected.status?.toLowerCase() === 'completed';
    const shouldRevertStatus = isUnchecking && isProjectCompleted;
    const shouldAutoComplete = allNowDone && !isProjectCompleted;

    try {
      // First update the tasks
      const resp = await apiClient.patch(`/installations/${selected._id || selected.id}/tasks`, { tasks: updatedTasks });

      if (shouldAutoComplete) {
        // Auto-move to Completed when all tasks are done
        await apiClient.patch(`/installations/${selected._id || selected.id}/status`, { status: 'Completed' });
        setSelected({ ...resp.data, status: 'Completed' });
        toast.success('All tasks done — Installation marked as Completed!');
      } else if (shouldRevertStatus) {
        // If project was completed and task unchecked, revert status to In Progress
        await apiClient.patch(`/installations/${selected._id || selected.id}/status`, { status: 'In Progress' });
        setSelected({ ...resp.data, status: 'In Progress' });
        toast.success('Task unchecked — Installation reverted to In Progress');
      } else {
        setSelected(resp.data);
      }
      
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
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkAssignIds, setBulkAssignIds] = useState([]);
  const [bulkAssignForm, setBulkAssignForm] = useState({ department: '', technicianId: '', technicianName: '', dueDate: '' });
  const [bulkAssignDept, setBulkAssignDept] = useState('');
  
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
          instList = [r];
        }
        
        console.log('Installations:', instList);
        
        // Filter only Pending installations
        const pendingList = instList.filter(inst => inst.status === 'Pending' || inst.status === undefined);
        return pendingList;
      } catch(err) {
        console.error('Installations fetch error:', err);
        return [];
      }
    },
    enabled: showAdd
  });
  
  // Fetch departments from HRM
  const { data: hrmDepartments=[] } = useQuery({
    queryKey: ['hrm-departments'],
    queryFn: async () => {
      try {
        const r = await apiClient.get('/hrm/departments');
        const list = r?.data?.data || r?.data || r || [];
        return Array.isArray(list) ? list : [];
      } catch(err) {
        console.error('Departments fetch error:', err);
        return [];
      }
    },
    enabled: showAdd || showEdit || showBulkAssign,
  });

  // Fetch employees from HRM
  const { data: employees=[] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => { 
      try {
        const r = await apiClient.get('/hrm/employees'); 
        let empList = [];
        if (Array.isArray(r)) {
          empList = r;
        } else if (r && typeof r === 'object') {
          empList = r.data?.data || r.data || [];
        }
        return empList;
      } catch(err) {
        console.error('Employees fetch error:', err);
        return [];
      }
    },
    enabled: showAdd || showEdit || showBulkAssign,
  });

  // Departments list from HRM (fallback: extract from employees)
  const departments = useMemo(() => {
    if (hrmDepartments.length > 0) {
      return hrmDepartments.filter(d => d.name).map(d => ({ id: d._id || d.id, name: d.name }));
    }
    // fallback: extract unique department names from employees
    return [...new Set(employees.map(e => e.department).filter(Boolean))]
      .map(name => ({ id: name, name }));
  }, [hrmDepartments, employees]);

  // Filter employees by selected department name
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
      <PageHeader title="Installation" subtitle="Site installation logs, checklist and photos" tabs={isTechnician ? [{id:'table',label:'List',icon:List}] : [{id:'dashboard',label:'Dashboard',icon:LayoutDashboard},{id:'kanban',label:'Kanban',icon:LayoutGrid},{id:'table',label:'Table',icon:List},{id:'calendar',label:'Calendar',icon:CalendarDays}]} activeTab={view} onTabChange={setView} actions={can('installation','create') ? [{ type: 'button', label: 'Assign', icon: Plus, variant: 'primary', onClick: () => setShowAdd(true) }] : []} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total Installations" value={logs.length} icon={Wrench} color="solar" />
        <KPICard label="Active" value={active} icon={Wrench} color="amber" />
        <KPICard label="Completed" value={completed} icon={CheckCircle} color="emerald" />
        <KPICard label="Unassigned" value={unassigned} icon={User} color="accent" />
      </div>

      <div className="flex items-center justify-between">
        {view !== 'table' && view !== 'dashboard' && (
          <Input placeholder="Search installations…" value={search} onChange={e=>setSearch(e.target.value)} className="w-80" />
        )}
      </div>

      {view === 'dashboard' && (
        <InstallationDashboard logs={logs} />
      )}
      
      {view === 'kanban' && (
        <InstallKanbanBoard items={logs} onCardClick={setSelected} onDrop={handleMove} canEdit={can('installation', 'edit')} />
      )}

      {view === 'table' && (
        <DataTable
          columns={COLUMNS}
          data={paginated}
          rowKey="_id"
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          search={search}
          onSearch={setSearch}
          sort={sort}
          onSort={handleSort}
          selectedRows={selectedRows}
          onSelectRows={setSelectedRows}
          emptyText="No installation logs found."
          onRowClick={(row) => setSelected(row)}
          bulkActions={[
            ...(can('installation','export') || can('installation','view') ? [{
              label: 'Export',
              icon: Download,
              onClick: (ids) => {
                const rows = ids.length > 0
                  ? paginated.filter(r => ids.includes(r._id || r.id))
                  : paginated;
                const csv = [
                  ['Installation ID','Project','Customer','Site','Technician','Status','Progress','Due Date'],
                  ...rows.map(r => [
                    r.installationId, typeof r.projectId === 'object' ? (r.projectId?.projectId || '-') : (r.projectId || '-'),
                    r.customerName, r.siteAddress, r.technicianName, r.status, `${r.progress}%`,
                    r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString() : '-',
                  ])
                ].map(row => row.map(v => `"${v || ''}"`).join(',')).join('\n');
                const a = document.createElement('a');
                a.href = 'data:text/csv,' + encodeURIComponent(csv);
                a.download = 'installations.csv';
                a.click();
                toast.success(`Exported ${rows.length} installations`);
              }
            }] : []),
            ...(can('installation','assign') || can('installation','edit') ? [{
              label: 'Assign',
              icon: UserPlus,
              onClick: (ids) => {
                setBulkAssignIds(ids);
                setBulkAssignForm({ department: '', technicianId: '', technicianName: '', dueDate: '' });
                setBulkAssignDept('');
                setShowBulkAssign(true);
              }
            }, {
              label: 'Unassign',
              icon: UserMinus,
              onClick: async (ids) => {
                if (!window.confirm(`Unassign technician from ${ids.length} installation(s)?`)) return;
                try {
                  await Promise.all(ids.map(id =>
                    apiClient.patch(`/installations/${id}`, {
                      technicianId: null,
                      technicianName: 'Not Assigned',
                      assignedTo: null,
                      department: '',
                      status: 'Pending Assign',
                    })
                  ));
                  setSelectedRows(new Set());
                  refetch();
                  toast.success(`Unassigned ${ids.length} installation(s)`);
                } catch(err) { toast.error(err.message || 'Unassign failed'); }
              }
            }] : []),
          ]}
          rowActions={[
            { label: 'View', icon: Eye, onClick: (row) => setSelected(row) },
            ...(can('installation','edit') ? [{ label: 'Edit', icon: Edit, onClick: (row) => { setEditForm(row); setShowEdit(true); } }] : []),
            ...(can('installation','assign') || can('installation','edit') ? [{
              label: 'Unassign',
              icon: UserMinus,
              show: (row) => !!(row.technicianId || (row.technicianName && row.technicianName !== 'Not Assigned')),
              onClick: async (row) => {
                if (!window.confirm(`Unassign technician from ${row.installationId}?`)) return;
                try {
                  await apiClient.patch(`/installations/${row._id || row.id}`, {
                    technicianId: null,
                    technicianName: 'Not Assigned',
                    assignedTo: null,
                    department: '',
                    status: 'Pending Assign',
                  });
                  refetch();
                  toast.success(`Unassigned from ${row.installationId}`);
                } catch(err) { toast.error(err.message || 'Unassign failed'); }
              }
            }] : []),
            ...(can('installation','delete') ? [{ label: 'Delete', icon: Trash2, danger: true, onClick: async (row) => {
              if (!window.confirm('Delete this installation?')) return;
              try {
                await apiClient.delete(`/installations/${row._id || row.id}`);
                refetch();
                toast.success('Installation deleted');
              } catch(err) { toast.error('Delete failed'); }
            }}] : []),
          ]}
        />
      )}

      {view === 'calendar' && (
        <InstallationCalendar logs={logs} onOpenInstallation={setSelected} />
      )}

      {/* Bulk Assign Modal */}
      <Modal
        open={showBulkAssign}
        onClose={() => { setShowBulkAssign(false); setBulkAssignDept(''); }}
        title={`Bulk Assign — ${bulkAssignIds.length} Installation${bulkAssignIds.length !== 1 ? 's' : ''}`}
        footer={
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" onClick={() => { setShowBulkAssign(false); setBulkAssignDept(''); }}>Cancel</Button>
            <Button
              disabled={!bulkAssignForm.technicianId}
              onClick={async () => {
                try {
                  await Promise.all(bulkAssignIds.map(id =>
                    apiClient.patch(`/installations/${id}`, {
                      technicianId: bulkAssignForm.technicianId,
                      technicianName: bulkAssignForm.technicianName,
                      department: bulkAssignForm.department,
                      ...(bulkAssignForm.dueDate ? { scheduledDate: bulkAssignForm.dueDate, dueDate: bulkAssignForm.dueDate } : {}),
                      status: 'In Progress',
                    })
                  ));
                  setShowBulkAssign(false);
                  setSelectedRows(new Set());
                  refetch();
                  toast.success(`Assigned ${bulkAssignIds.length} installation(s) to ${bulkAssignForm.technicianName}`);
                } catch(err) { toast.error(err.message || 'Assign failed'); }
              }}
            >
              <UserPlus size={14} /> Assign
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1">

          {/* Selected installations preview */}
          <div className="rounded-lg bg-[var(--bg-muted,var(--bg-surface))] border border-[var(--border-base)] p-3">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Selected Installations</p>
            <div className="flex flex-wrap gap-1.5">
              {bulkAssignIds.map(id => {
                const inst = paginated.find(r => (r._id || r.id) === id);
                return (
                  <span key={id} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-mono">
                    {inst?.installationId || id}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Department + Technician */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Assign To</label>
            <div className="grid grid-cols-2 gap-3">
              <select
                className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                value={bulkAssignDept}
                onChange={e => {
                  setBulkAssignDept(e.target.value);
                  setBulkAssignForm(p => ({ ...p, department: e.target.value, technicianId: '', technicianName: '' }));
                }}
              >
                <option value="">{departments.length > 0 ? 'Select Department' : 'No Departments'}</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
              <select
                className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                value={bulkAssignForm.technicianId}
                disabled={!bulkAssignDept}
                onChange={e => {
                  const emp = employees.find(x => (x._id || x.id) === e.target.value);
                  const name = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || '' : '';
                  setBulkAssignForm(p => ({ ...p, technicianId: e.target.value, technicianName: name }));
                }}
              >
                <option value="">{bulkAssignDept ? 'Select Technician' : 'Select Dept First'}</option>
                {employees.filter(e => e.department === bulkAssignDept).map(emp => (
                  <option key={emp._id || emp.id} value={emp._id || emp.id}>
                    {`${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Due Date</label>
            <Input
              type="datetime-local"
              step={1}
              value={bulkAssignForm.dueDate}
              onChange={e => setBulkAssignForm(p => ({ ...p, dueDate: e.target.value }))}
              className="py-2.5"
            />
          </div>

        </div>
      </Modal>

      {/* New Log Modal */}
      <Modal open={showAdd} onClose={()=>{setShowAdd(false); setSelectedDept('');}} title="Assign Installation" footer={
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="ghost" onClick={()=>{setShowAdd(false); setSelectedDept('');}}>
            Cancel
          </Button>
          <Button onClick={createInstallation} disabled={!newForm.technicianId}>
            <Plus size={14} /> Assign
          </Button>
        </div>
      }>
        <div className="space-y-4 py-1">

          {/* Section: Installation */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Pending Installation</label>
            <select
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
              value={newForm.installationId}
              onChange={e=>{
                const inst = pendingInstallations.find(i => (i._id || i.id) === e.target.value);
                setNewForm(p=>({...p, installationId: e.target.value, customerName: inst?.customerName || '', site: inst?.site || ''}));
              }}
            >
              <option value="">{pendingInstallations.length > 0 ? 'Select Pending Installation' : 'No Pending Installations'}</option>
              {pendingInstallations.map(inst => (
                <option key={inst._id || inst.id} value={inst._id || inst.id}>
                  {inst.customerName || 'Unknown'} — {inst.site || 'No Site'}
                </option>
              ))}
            </select>
          </div>

          {/* Section: Assign To */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Assign To</label>
            <div className="grid grid-cols-2 gap-3">
              <select
                className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                value={selectedDept}
                onChange={e=>{
                  setSelectedDept(e.target.value);
                  setNewForm(p=>({...p, department: e.target.value, technicianId:'', technicianName:''}));
                }}
              >
               <option value="">{departments.length > 0 ? 'Select Department' : 'No Departments'}</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>

              <select
                className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                value={newForm.technicianId}
                disabled={!selectedDept}
                onChange={e=>{
                  const emp = employees.find(emp => emp._id === e.target.value || emp.id === e.target.value);
                  setNewForm(p=>({...p, technicianId: e.target.value, technicianName: emp?.name || emp?.firstName + ' ' + emp?.lastName || ''}));
                }}
              >
                <option value="">{selectedDept ? 'Select Technician' : 'Select Dept First'}</option>
                {technicians.map(tech => (
                  <option key={tech._id || tech.id} value={tech._id || tech.id}>
                    {tech.name || `${tech.firstName || ''} ${tech.lastName || ''}`.trim()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Site Address</label>
              <Input value={newForm.site} placeholder="Enter site address" onChange={e=>setNewForm(p=>({...p,site:e.target.value}))} className="py-2.5" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Due Date</label>
              <Input type="datetime-local" step={1} value={newForm.dueDate || newForm.scheduledDate} onChange={e=>setNewForm(p=>({...p,dueDate:e.target.value,scheduledDate:e.target.value}))} className="py-2.5" />
            </div>
          </div>

          {/* Section: Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Notes</label>
            <textarea
              placeholder="Add any notes or special instructions... (Optional)"
              value={newForm.notes}
              onChange={e=>setNewForm(p=>({...p,notes:e.target.value}))}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] resize-none transition-colors"
            />
          </div>

          {/* Default Task Checklist */}
          {getTasksFromSettings().length > 0 && (
            <div className="rounded-lg bg-[var(--bg-muted,var(--bg-surface))] border border-[var(--border-base)] p-3 space-y-1.5">
              <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Default Task Checklist</div>
              <ul className="space-y-1">
                {getTasksFromSettings().map((t,i)=>(
                  <li key={i} className="flex items-center gap-2 text-xs text-[var(--text-primary)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shrink-0" />
                    {t.name}{t.photoRequired && <span className="text-[var(--text-muted)]">(photo required)</span>}
                  </li>
                ))}
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
              <div className="glass-card p-2"><div className="text-[var(--text-muted)]">Site</div><div className="font-semibold">{selected.siteAddress || selected.site || '-'}</div></div>
              <div className="glass-card p-2 col-span-2"><div className="text-[var(--text-muted)]">Technician</div><div className="font-semibold" style={{color: (selected.technicianName && selected.technicianName !== 'TBD') ? 'var(--text-primary)' : 'var(--text-muted)'}}>{ (selected.technicianName && selected.technicianName !== 'TBD') ? selected.technicianName : 'Not Assigned' }</div></div>
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
                
                {/* Complete Project Button - only clickable when all tasks done */}
                {(() => {
                  const tasks = mergeWithSettingsTasks(selected.tasks) || [];
                  const allTasksDone = tasks.length > 0 && tasks.every(t => t.done);
                  const isCompleted = selected.status?.toLowerCase() === 'completed';
                  
                  return (
                    <button
                      onClick={() => {
                        if (allTasksDone && !isCompleted) {
                          const confirmed = window.confirm('Are you sure you want to mark this project as Completed?');
                          if (confirmed) {
                            handleMove(selected._id, 'Completed');
                          }
                        }
                      }}
                      disabled={!allTasksDone || isCompleted}
                      className={`w-full mt-3 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        allTasksDone && !isCompleted
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isCompleted && allTasksDone ? 'Marked as Completed ✓' : allTasksDone ? 'Complete Project' : 'Complete All Tasks First'}
                    </button>
                  );
                })()}
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
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
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
                value={editForm.status || 'Pending Assign'}
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
