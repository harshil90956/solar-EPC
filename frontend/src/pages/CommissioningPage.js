// Solar OS – EPC Edition — CommissioningPage.js
import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle, Cpu, Sun, FileSignature, Award, Zap, Plus, AlertTriangle,
  LayoutGrid, List, BarChart3, TrendingUp, Filter, Download,
  Users, Clock, Activity, RefreshCw, Battery, Gauge, Bell, Wrench,
  Calendar, PieChart, TrendingDown, ArrowUpRight, ArrowDownRight, ZapIcon
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import DraggableKanban from '../components/ui/DraggableKanban';
import CommissioningDashboard from '../components/dashboard/CommissioningDashboard';
import { APP_CONFIG } from '../config/app.config';
import { usePermissions } from '../hooks/usePermissions';
import { useAuditLog } from '../hooks/useAuditLog';
import { toast } from '../components/ui/Toast';
import { api } from '../lib/apiClient';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1';
const TENANT_ID = 'solarcorp';

const NEUTRAL = 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-muted)]';
const STATUS_MAP = {
  Active: { label: 'Active', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  Pending: { label: 'Pending', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  'In Progress': { label: 'In Progress', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  Completed: { label: 'Completed', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  Cancelled: { label: 'Cancelled', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  Flagged: { label: 'Flagged', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const CommBadge = ({ value }) => {
  const meta = STATUS_MAP[value] ?? { label: value, color: NEUTRAL };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>{meta.label}</span>;
};

const COMMISSIONING_COLUMNS = [
  { key: 'customer', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
  { key: 'employee', header: 'Employee', sortable: true, render: v => <span className="text-xs text-[var(--text-secondary)]">{v || '—'}</span> },
  { key: 'projectId', header: 'Project', render: v => <span className="text-xs font-mono text-[var(--text-secondary)]">{v}</span> },
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

// Progress Bar Component
const ProgressBar = ({ value, max = 100, color = 'bg-emerald-500', size = 'md' }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const heightClass = size === 'sm' ? 'h-1.5' : size === 'md' ? 'h-2' : 'h-3';
  return (
    <div className={`w-full ${heightClass} bg-[var(--bg-elevated)] rounded-full overflow-hidden`}>
      <div className={`${color} ${heightClass} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
    </div>
  );
};

// Trend Chart Component
const TrendChart = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.total), 1);
  return (
    <div className="flex items-end gap-2 h-32 px-2">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex flex-col gap-0.5">
            <div className="bg-emerald-500/80 rounded-t-sm w-full transition-all duration-500" style={{ height: `${(item.completed / maxValue) * 100}px` }} />
            <div className="bg-amber-500/60 rounded-t-sm w-full transition-all duration-500" style={{ height: `${(item.pending / maxValue) * 100}px` }} />
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">{item._id.month}/{item._id.year.toString().slice(2)}</span>
        </div>
      ))}
    </div>
  );
};

// Donut Chart Component
const DonutChart = ({ data, colors = ['bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-red-500'] }) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  let currentAngle = 0;
  return (
    <div className="relative w-32 h-32">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {data.map((item, index) => {
          const percentage = (item.count / total) * 100;
          const angle = (percentage / 100) * 360;
          const startAngle = currentAngle;
          currentAngle += angle;
          const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
          const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
          const x2 = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180);
          const y2 = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180);
          const largeArc = angle > 180 ? 1 : 0;
          return (
            <path key={index} d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`} className={colors[index % colors.length]} opacity="0.8" />
          );
        })}
        <circle cx="50" cy="50" r="25" className="fill-[var(--bg-primary)]" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-[var(--text-primary)]">{total}</span>
      </div>
    </div>
  );
};

/* ── Main Page ── */
const CommissioningPage = () => {
  const { can } = usePermissions();
  const { logCreate, logStatusChange } = useAuditLog('commissioning');

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

  // State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('dashboard');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [systems, setSystems] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [commissioningLoading, setCommissioningLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [commissioningError, setCommissioningError] = useState(null);
  const [projectTypeFilter, setProjectTypeFilter] = useState('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    projectId: '', employee: '', date: '', percentage: '',
    inverterSerialNo: '', panelBatchNo: '', panelWarranty: '',
    inverterWarranty: '', installWarranty: '', notes: ''
  });

  // Fetch Dashboard Data
  const fetchDashboardData = async () => {
    try {
      setDashboardLoading(true);
      const params = new URLSearchParams({ tenantId: TENANT_ID });
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      if (projectTypeFilter !== 'All') params.append('projectType', projectTypeFilter);

      const response = await fetch(`${API_BASE_URL}/commissioning/dashboard?${params}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');

      const data = await response.json();

      // Always use calculated data from systems as primary source
      if (systems.length > 0) {
        const calculatedData = calculateDashboardFromSystems(systems);
        setDashboardData(calculatedData);
      } else if (data.summary?.total) {
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      // Fallback: calculate from systems data
      if (systems.length > 0) {
        const calculatedData = calculateDashboardFromSystems(systems);
        setDashboardData(calculatedData);
      }
    } finally {
      setDashboardLoading(false);
    }
  };

  // Calculate dashboard data from systems when API fails
  const calculateDashboardFromSystems = (systemsData) => {
    const now = new Date();
    const months = [];

    // Generate last 6 months labels
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        label: `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`
      });
    }

    // Calculate monthly trends from commissioning dates
    const monthlyTrends = months.map(m => {
      const monthSystems = systemsData.filter(s => {
        if (!s.commissionDate) return false;
        const date = new Date(s.commissionDate);
        return date.getMonth() + 1 === m.month && date.getFullYear() === m.year;
      });

      return {
        _id: { month: m.month, year: m.year },
        completed: monthSystems.filter(s => s.status === 'Active' || s.status === 'Completed').length,
        pending: monthSystems.filter(s => s.status === 'Pending').length,
        inProgress: monthSystems.filter(s => s.status === 'In Progress').length,
        count: monthSystems.length
      };
    });

    // Calculate status distribution
    const statusCounts = {};
    systemsData.forEach(s => {
      const status = s.status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({ _id: status, count }));

    // Calculate performance metrics
    const systemsWithPR = systemsData.filter(s => s.pr > 0);
    const avgPR = systemsWithPR.length > 0
      ? systemsWithPR.reduce((sum, s) => sum + s.pr, 0) / systemsWithPR.length
      : 0;

    // Generate weekly data for performance chart
    const weeklyData = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekLabel = `Week ${4 - i}`;

      const weekSystems = systemsData.filter(s => {
        if (!s.commissionDate) return false;
        const date = new Date(s.commissionDate);
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        return diffDays >= i * 7 && diffDays < (i + 1) * 7;
      });

      const weekPRs = weekSystems.filter(s => s.pr > 0).map(s => s.pr);
      weeklyData.push({
        week: weekLabel,
        systems: weekSystems.length,
        avgPR: weekPRs.length > 0 ? weekPRs.reduce((a, b) => a + b, 0) / weekPRs.length : avgPR
      });
    }

    // Calculate summary
    const summary = {
      total: systemsData.length,
      completed: systemsData.filter(s => s.status === 'Active' || s.status === 'Completed').length,
      pending: systemsData.filter(s => s.status === 'Pending').length,
      inProgress: systemsData.filter(s => s.status === 'In Progress').length
    };

    // Calculate employee stats
    const employeeMap = {};
    systemsData.forEach(s => {
      const emp = s.employee || 'Unknown';
      if (!employeeMap[emp]) {
        employeeMap[emp] = { totalProjects: 0, prSum: 0, count: 0 };
      }
      employeeMap[emp].totalProjects++;
      if (s.pr > 0) {
        employeeMap[emp].prSum += s.pr;
        employeeMap[emp].count++;
      }
    });
    const employeeStats = Object.entries(employeeMap).map(([name, data]) => ({
      _id: name,
      totalProjects: data.totalProjects,
      avgPR: data.count > 0 ? data.prSum / data.count : 0
    }));

    // Recent activity from systems
    const recentActivity = systemsData
      .filter(s => s.commissionDate)
      .sort((a, b) => new Date(b.commissionDate) - new Date(a.commissionDate))
      .slice(0, 5)
      .map(s => ({
        projectId: { customerName: s.customer },
        status: s.status,
        updatedAt: s.commissionDate
      }));

    return {
      summary,
      monthlyTrends,
      statusDistribution,
      performanceMetrics: {
        avgPR,
        totalCapacity: systemsData.reduce((sum, s) => sum + (s.systemSize || 0), 0),
        weeklyData
      },
      recentActivity,
      employeeStats
    };
  };

  // Fetch Commissioning Data
  const fetchCommissioningData = async () => {
    try {
      setCommissioningLoading(true);
      const response = await fetch(`${API_BASE_URL}/commissioning?tenantId=${TENANT_ID}`);
      if (!response.ok) throw new Error('Failed to fetch commissioning data');

      const data = await response.json();
      const commissioningArray = Array.isArray(data) ? data : (data.data || []);

      const transformedData = commissioningArray.map(c => ({
        id: c._id || c.id,
        projectId: c.projectIdString,
        customer: c.projectId?.customerName || 'Unknown',
        employee: c.employee || '—',
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

  // Export Data
  const handleExport = () => {
    const csvContent = [
      ['ID', 'Customer', 'Employee', 'Project', 'Site', 'Size (kW)', 'PR %', 'Status', 'Commission Date'].join(','),
      ...filtered.map(s => [s.id, s.customer, s.employee, s.projectId, s.site, s.systemSize, s.pr, s.status, s.commissionDate].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissioning-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Report exported successfully');
  };

  useEffect(() => {
    fetchCommissioningData();
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (viewMode === 'dashboard') {
      fetchDashboardData();
    }
  }, [viewMode]);

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, projectTypeFilter]);

  // Recalculate dashboard whenever systems data changes
  useEffect(() => {
    if (systems.length > 0) {
      const calculatedData = calculateDashboardFromSystems(systems);
      setDashboardData(calculatedData);
    }
  }, [systems]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setProjectsLoading(true);
        const res = await api.get('/projects', { tenantId: TENANT_ID });
        const data = res?.data ?? res;
        setProjects(Array.isArray(data) ? data : (data?.data || []));
      } catch (err) {
        console.error('Error fetching projects:', err);
      } finally {
        setProjectsLoading(false);
      }
    };

    const fetchEmployees = async () => {
      try {
        setEmployeesLoading(true);
        const res = await api.get('/hrm/employees', { tenantId: TENANT_ID });
        const data = res?.data ?? res;
        setEmployees(Array.isArray(data) ? data : (data?.data || []));
      } catch (err) {
        console.error('Error fetching employees:', err);
      } finally {
        setEmployeesLoading(false);
      }
    };

    fetchProjects();
    fetchEmployees();
  }, []);

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

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
          projectId: form.projectId, employee: form.employee, date: form.date,
          percentage: parseFloat(form.percentage), inverterSerialNo: form.inverterSerialNo,
          panelBatchNo: form.panelBatchNo, panelWarranty: form.panelWarranty,
          inverterWarranty: form.inverterWarranty, installWarranty: form.installWarranty,
          notes: form.notes, status: 'Completed'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create commissioning: ${errorText}`);
      }

      toast.success('Commissioning completed successfully!');
      setShowAdd(false);
      setForm({ projectId: '', employee: '', date: '', percentage: '', inverterSerialNo: '', panelBatchNo: '', panelWarranty: '', inverterWarranty: '', installWarranty: '', notes: '' });
      await fetchCommissioningData();
      await fetchDashboardData();
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
  const inProgress = systems.filter(c => c.status === 'In Progress').length;
  const avgPR = systems.filter(c => c.pr !== null).reduce((a, c, _, arr) => a + c.pr / arr.length, 0).toFixed(1);
  const totalKW = systems.filter(c => c.status === 'Active').reduce((a, c) => a + c.systemSize, 0);

  const ROW_ACTIONS = [
    { label: 'View Details', icon: FileSignature, onClick: row => setSelected(row) },
    { label: 'Run Tests', icon: Cpu, onClick: (row) => { if (guardEdit()) console.log('Run Tests', row); } },
    { label: 'Generate Certificate', icon: Award, onClick: (row) => { if (guardApprove()) console.log('Generate Certificate', row); } },
  ];

  // Advanced Circular Progress Component
  const CircularProgress = ({ value, max = 100, size = 70, strokeWidth = 8, color = '#10b981', label, sublabel }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = Math.min((value / max) * 100, 100);
    const dashoffset = circumference - (progress / 100) * circumference;

    const gradientId = `gradient-${color.replace('#', '')}`;

    return (
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg className="transform -rotate-90" width={size} height={size}>
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                <stop offset="100%" stopColor={color} stopOpacity="1" />
              </linearGradient>
            </defs>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={`url(#${gradientId})`}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-white">{value}%</span>
          </div>
        </div>
        {label && <p className="text-xs text-gray-400 mt-2 font-medium">{label}</p>}
        {sublabel && <p className="text-[10px] text-gray-500">{sublabel}</p>}
      </div>
    );
  };

  // Dashboard View Component with Heavy Advanced Charts
  const DashboardView = () => {
    if (dashboardLoading) {
      return (
        <div className="glass-card p-8 text-center">
          <div className="animate-pulse text-[var(--text-muted)]">Loading dashboard...</div>
        </div>
      );
    }

    if (!dashboardData) {
      return (
        <div className="glass-card p-8 text-center text-red-500">
          <p>Failed to load dashboard data</p>
        </div>
      );
    }

    const { summary, monthlyTrends, statusDistribution, performanceMetrics, recentActivity, employeeStats, warrantyAlerts } = dashboardData;

    // Gradient configurations
    const ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;

    const gradientEmerald = ctx?.createLinearGradient(0, 0, 0, 300);
    gradientEmerald?.addColorStop(0, 'rgba(16, 185, 129, 0.9)');
    gradientEmerald?.addColorStop(1, 'rgba(16, 185, 129, 0.1)');

    const gradientBlue = ctx?.createLinearGradient(0, 0, 0, 300);
    gradientBlue?.addColorStop(0, 'rgba(59, 130, 246, 0.9)');
    gradientBlue?.addColorStop(1, 'rgba(59, 130, 246, 0.1)');

    // Area Chart Data - Monthly Trends with Gradients
    const areaChartData = {
      labels: monthlyTrends?.map(m => `${m._id.month}/${m._id.year.toString().slice(2)}`) || [],
      datasets: [
        {
          label: 'Completed',
          data: monthlyTrends?.map(m => m.completed) || [],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        },
        {
          label: 'Pending',
          data: monthlyTrends?.map(m => m.pending) || [],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        }
      ]
    };

    const areaChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: { usePointStyle: true, padding: 15, font: { size: 11 }, color: '#333' }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 13 },
          bodyFont: { size: 12 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#ddd', drawBorder: false },
          ticks: { font: { size: 11 }, color: '#333' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 }, color: '#333' }
        }
      }
    };

    // Donut Chart Data with Center Label
    const donutData = {
      labels: statusDistribution?.map(s => s._id) || [],
      datasets: [{
        data: statusDistribution?.map(s => s.count) || [],
        backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 8
      }]
    };

    const donutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, padding: 12, font: { size: 11 }, color: '#64748b' }
        }
      }
    };

    // Combo Chart - Bar + Line with Dual Axis
    const comboChartData = {
      labels: performanceMetrics?.weeklyData?.map(w => w.week) || ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [
        {
          type: 'bar',
          label: 'Systems',
          data: performanceMetrics?.weeklyData?.map(w => w.systems) || [0, 0, 0, 0],
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: '#3b82f6',
          borderWidth: 2,
          borderRadius: 6,
          yAxisID: 'y',
        },
        {
          type: 'line',
          label: 'Avg PR %',
          data: performanceMetrics?.weeklyData?.map(w => w.avgPR) || [0, 0, 0, 0],
          borderColor: '#10b981',
          backgroundColor: '#10b981',
          borderWidth: 3,
          pointRadius: 6,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.4,
          yAxisID: 'y1',
        }
      ]
    };

    const comboOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'end', labels: { usePointStyle: true, padding: 15, font: { size: 11 }, color: '#64748b' } },
        tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 12, cornerRadius: 8 }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: '#e2e8f0', drawBorder: false },
          ticks: { font: { size: 11 }, color: '#64748b' }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { font: { size: 11 }, color: '#64748b' },
          min: 60,
          max: 100
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 }, color: '#64748b' }
        }
      }
    };

    // Calculate metrics from dashboardData with fallback to systems data
    const summaryData = summary?.total ? summary : {
      total: systems.length,
      completed: systems.filter(s => s.status === 'Completed' || s.status === 'Active').length,
      pending: systems.filter(s => s.status === 'Pending').length,
      inProgress: systems.filter(s => s.status === 'In Progress').length,
    };

    const completionRate = summaryData.total ? Math.round((summaryData.completed / summaryData.total) * 100) : 0;
    const onTrackCount = systems.filter(s => s.pr >= 78).length;
    const belowTargetCount = systems.filter(s => s.pr < 78 && s.pr > 0).length;

    // Use dashboard data for KPI cards (with systems fallback)
    const totalKW = Math.round(performanceMetrics?.totalCapacity || systems.reduce((a, s) => a + (s.systemSize || 0), 0));
    const avgPR = (performanceMetrics?.avgPR || (systems.filter(s => s.pr).reduce((a, s, _, arr) => a + s.pr / arr.length, 0) || 0)).toFixed(1);

    return (
      <div className="space-y-5">
        {/* Standardized KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          <KPICard
            label="Total Systems"
            value={summaryData.total || 0}
            sub={`${summaryData.completed || 0} completed`}
            icon={Sun}
            variant="blue"
          />
          <KPICard
            label="Capacity"
            value={`${totalKW} kW`}
            sub="Pipeline"
            icon={Gauge}
            variant="amber"
          />
          <KPICard
            label="Avg PR"
            value={`${avgPR}%`}
            sub="Performance"
            icon={Activity}
            variant="indigo"
          />
        </div>

        {/* Compact Charts Row - Area + Stacked Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-400" />
                Commissioning Trends
              </h3>
              <div className="flex gap-2 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Done</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span>Pending</span>
              </div>
            </div>
            <div className="h-48">
              {monthlyTrends?.length > 0 ? (
                <Line data={areaChartData} options={areaChartOptions} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <TrendingUp size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">No commissioning data available</p>
                  <p className="text-xs mt-1 opacity-75">Add commissioning records to see trends</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
              <Filter size={16} className="text-purple-400" />
              Pipeline Funnel
            </h3>
            {/* Stacked Funnel Chart - Live Data */}
            <div className="relative">
              {/* Legend - Based on actual status distribution */}
              <div className="flex justify-center gap-2 mb-2 text-[10px] flex-wrap">
                {statusDistribution?.map((status, idx) => (
                  <span key={idx} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded" style={{ backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'][idx % 5] }}></span>
                    {status._id}
                  </span>
                )) || (
                    <>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-400"></span>Active</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400"></span>Pending</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400"></span>Completed</span>
                    </>
                  )}
              </div>
              {/* SVG Funnel with Live Data */}
              <svg viewBox="0 0 400 250" className="w-full h-44">
                <defs>
                  {/* Gradients for each stage */}
                  <linearGradient id="funnel1" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" /><stop offset="50%" stopColor="#60a5fa" stopOpacity="0.9" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0.9" /></linearGradient>
                  <linearGradient id="funnel2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" /><stop offset="50%" stopColor="#fbbf24" stopOpacity="0.9" /><stop offset="100%" stopColor="#f59e0b" stopOpacity="0.9" /></linearGradient>
                  <linearGradient id="funnel3" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" stopOpacity="0.9" /><stop offset="50%" stopColor="#34d399" stopOpacity="0.9" /><stop offset="100%" stopColor="#10b981" stopOpacity="0.9" /></linearGradient>
                  <linearGradient id="funnel4" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" /><stop offset="50%" stopColor="#a78bfa" stopOpacity="0.9" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.9" /></linearGradient>
                </defs>
                {/* Calculate funnel widths based on actual data */}
                {(() => {
                  const total = summary?.total || 1;
                  const completed = summary?.completed || 0;
                  const pending = summary?.pending || 0;
                  const inProgress = summary?.inProgress || 0;
                  const active = (summary?.inProgress || 0) + (summary?.pending || 0);

                  // Calculate widths (max width is 360, min is 60)
                  const w1 = Math.max(60, (total / total) * 360);
                  const w2 = Math.max(60, (active / total) * 360);
                  const w3 = Math.max(60, (inProgress / total) * 360);
                  const w4 = Math.max(60, (completed / total) * 360);

                  const x1 = (400 - w1) / 2;
                  const x2 = (400 - w2) / 2;
                  const x3 = (400 - w3) / 2;
                  const x4 = (400 - w4) / 2;

                  return (
                    <>
                      {/* Stage 1 - Total */}
                      <path d={`M ${x1},20 Q 200,20 ${400 - x1},20 L ${400 - x2},70 Q 200,70 ${x2},70 Z`} fill="url(#funnel1)" />
                      {/* Stage 2 - Active */}
                      <path d={`M ${x2},70 Q 200,70 ${400 - x2},70 L ${400 - x3},120 Q 200,120 ${x3},120 Z`} fill="url(#funnel2)" />
                      {/* Stage 3 - In Progress */}
                      <path d={`M ${x3},120 Q 200,120 ${400 - x3},120 L ${400 - x4},170 Q 200,170 ${x4},170 Z`} fill="url(#funnel3)" />
                      {/* Stage 4 - Completed */}
                      <path d={`M ${x4},170 Q 200,170 ${400 - x4},170 L ${200 + w4 / 4},210 Q 200,210 ${200 - w4 / 4},210 Z`} fill="url(#funnel4)" />

                      {/* Values on right */}
                      <text x={400 - x1 + 10} y="45" fontSize="12" fill="#6b7280" textAnchor="start">{total}</text>
                      <text x={400 - x2 + 10} y="95" fontSize="12" fill="#6b7280" textAnchor="start">{active}</text>
                      <text x={400 - x3 + 10} y="145" fontSize="12" fill="#6b7280" textAnchor="start">{inProgress}</text>
                      <text x={200 + w4 / 4 + 10} y="190" fontSize="12" fill="#6b7280" textAnchor="start">{completed}</text>

                      {/* Labels */}
                      <text x="10" y="45" fontSize="10" fill="#9ca3af" textAnchor="start">Total</text>
                      <text x="10" y="95" fontSize="10" fill="#9ca3af" textAnchor="start">Active</text>
                      <text x="10" y="145" fontSize="10" fill="#9ca3af" textAnchor="start">In Progress</text>
                      <text x="10" y="190" fontSize="10" fill="#9ca3af" textAnchor="start">Done</text>
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>
        </div>

        {/* Compact Combo Chart */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-400" />
              Performance Analysis
            </h3>
          </div>
          <div className="h-48">
            {performanceMetrics?.weeklyData?.length > 0 ? (
              <Bar data={comboChartData} options={comboOptions} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <BarChart3 size={32} className="mb-2 opacity-50" />
                <p className="text-sm">No performance data available</p>
                <p className="text-xs mt-1 opacity-75">Add commissioning records with PR values</p>
              </div>
            )}
          </div>
        </div>

        {/* Compact Circular Progress + Mini Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="glass-card p-4 rounded-xl">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Gauge size={16} className="text-emerald-400" />
              Performance Metrics
            </h3>
            <div className="grid grid-cols-4 gap-3">
              <CircularProgress value={completionRate} color="#3b82f6" label="Done" sublabel={`${summary?.completed || 0}/${summary?.total || 0}`} />
              <CircularProgress value={parseInt(avgPR) || 0} color="#10b981" label="Avg PR" sublabel="Target: 78%" />
              <CircularProgress value={summary?.total ? Math.round((onTrackCount / summary?.total) * 100) : 0} color="#8b5cf6" label="On Track" sublabel={`${onTrackCount || 0} sys`} />
              <CircularProgress value={summary?.total ? Math.round((belowTargetCount / summary?.total) * 100) : 0} color="#ef4444" label="Below" sublabel={`${belowTargetCount || 0} sys`} />
            </div>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Filter size={16} className="text-amber-400" />
              Pipeline
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Initiated', value: summary?.total || 0, color: 'bg-blue-500', width: summary?.total ? 100 : 0 },
                { label: 'Progress', value: summary?.inProgress || 0, color: 'bg-indigo-500', width: summary?.inProgress ? Math.round((summary.inProgress / summary.total) * 100) : 0 },
                { label: 'Pending', value: summary?.pending || 0, color: 'bg-purple-500', width: summary?.pending ? Math.round((summary.pending / summary.total) * 100) : 0 },
                { label: 'Done', value: summary?.completed || 0, color: 'bg-emerald-500', width: summary?.completed ? Math.round((summary.completed / summary.total) * 100) : 0 },
              ].map((stage, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-16 text-xs text-[var(--text-muted)]">{stage.label}</div>
                  <div className="flex-1">
                    <div className="h-6 bg-[var(--bg-elevated)] rounded-lg overflow-hidden">
                      <div className={`h-full ${stage.color} rounded-lg flex items-center justify-end pr-2`} style={{ width: `${stage.width}%` }}>
                        <span className="text-white text-xs font-bold">{stage.value}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Employee Performance & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="glass-card p-4 rounded-xl">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Users size={16} className="text-purple-400" />
              Top Performers
            </h3>
            <div className="space-y-3">
              {employeeStats?.length > 0 ? employeeStats.slice(0, 4).map((emp, idx, arr) => {
                const maxProjects = Math.max(...arr.map(e => e.totalProjects));
                const widthPercent = maxProjects ? (emp.totalProjects / maxProjects) * 100 : 0;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center text-sm font-bold text-blue-400">
                      {emp._id?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'NA'}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--text-primary)] font-medium">{emp._id || 'Unknown'}</span>
                        <span className="text-emerald-400 font-bold">{emp.avgPR?.toFixed(1) || 0}% PR</span>
                      </div>
                      <div className="h-2.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full" style={{ width: `${widthPercent}%` }} />
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{emp.totalProjects} projects completed</p>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center text-[var(--text-muted)] py-4">
                  <p className="text-sm">No employee data available</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Activity size={16} className="text-blue-400" />
              Recent Activity
            </h3>
            <div className="space-y-3 max-h-52 overflow-y-auto">
              {recentActivity?.length > 0 ? recentActivity.slice(0, 5).map((activity, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)]/50 hover:bg-[var(--bg-elevated)] transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.status === 'Completed' ? 'bg-emerald-500/20' : activity.status === 'Pending' ? 'bg-amber-500/20' : 'bg-blue-500/20'}`}>
                    <div className={`w-3 h-3 rounded-full ${activity.status === 'Completed' ? 'bg-emerald-400' : activity.status === 'Pending' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] truncate font-medium">{activity.projectId?.customerName || 'Unknown'}</p>
                    <p className="text-xs text-[var(--text-muted)]">{activity.status} • {new Date(activity.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center text-[var(--text-muted)] py-4">
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header with Title Left, Buttons Right */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Commissioning</h1>
          <p className="text-xs text-[var(--text-muted)]">System commissioning · checklist · performance ratio · warranty tracking</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[var(--bg-elevated)] rounded-lg p-1 border border-[var(--border-base)]">
            <button onClick={() => setViewMode('dashboard')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'dashboard' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
              <BarChart3 size={16} /> Dashboard
            </button>
            <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
              <LayoutGrid size={16} /> Kanban
            </button>
            <button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
              <List size={16} /> Table
            </button>
          </div>

          <Button variant="primary" onClick={() => { if (guardCreate()) setShowAdd(true); }}>
            <Plus size={16} /> New Record
          </Button>
        </div>
      </div>

      {/* Secondary Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${showFilters ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]' : 'bg-[var(--bg-elevated)] border-[var(--border-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
          <Filter size={16} /> Filters
        </button>

        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <Download size={16} /> Export
        </button>

        <button onClick={() => { fetchCommissioningData(); fetchDashboardData(); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="glass-card p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Status</label>
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Project Type</label>
              <Select value={projectTypeFilter} onChange={e => setProjectTypeFilter(e.target.value)}>
                <option value="All">All Types</option>
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Industrial">Industrial</option>
                <option value="Government">Government</option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Start Date</label>
              <Input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">End Date</label>
              <Input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} />
            </div>
          </div>
        </div>
      )}

      <div className="ai-banner">
        <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="text-[var(--accent-light)] font-semibold">AI Insight:</span>{' '}
          CA001 (Prakash Agarwal) performing at 79.2% PR — 1.2% above target. CA002 (Joshi Industries) pending installation completion. CA003 (Suresh Bhatt) is 3/7 checklist items done.
        </p>
      </div>

      {/* Content */}
      {commissioningLoading && viewMode !== 'dashboard' ? (
        <div className="glass-card p-8 text-center">
          <div className="animate-pulse text-[var(--text-muted)]">Loading commissioning data...</div>
        </div>
      ) : commissioningError ? (
        <div className="glass-card p-8 text-center text-red-500">
          <p>Error loading commissioning data: {commissioningError}</p>
        </div>
      ) : (
        <>
          {viewMode === 'dashboard' && (
            <CommissioningDashboard
              data={dashboardData}
              systems={systems}
              onProjectClick={(project) => setSelected(project)}
            />
          )}
          {viewMode === 'table' && (
            <DataTable columns={COMMISSIONING_COLUMNS} data={paginated} total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={s => { setPageSize(s); setPage(1); }} rowActions={ROW_ACTIONS} emptyText="No commissioning records found." />
          )}
          {viewMode === 'kanban' && (
            <DraggableKanban data={filtered} onStatusChange={(cardId, newStatus) => handleStageChange(cardId, newStatus)} onCardClick={(item) => setSelected(item)} />
          )}
        </>
      )}

      {/* Commission Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); fetchCommissioningData(); }} title="Commission System"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => { setShowAdd(false); fetchCommissioningData(); }}>Cancel</Button>
          <Button onClick={handleCreateCommissioning} disabled={submitting || !form.projectId || !form.date || !form.percentage || !form.inverterSerialNo || !form.panelBatchNo}>
            {submitting ? 'Saving...' : <><CheckCircle size={13} /> Complete Commissioning</>}
          </Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Project">
            <Select value={form.projectId} onChange={e => handleFormChange('projectId', e.target.value)} disabled={projectsLoading}>
              <option value="">{projectsLoading ? 'Loading projects...' : 'Select Project'}</option>
              {projects.map(p => (
                <option key={p.projectId} value={p.projectId}>{p.projectId} – {p.customerName} {p.systemSize}kW</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Employee">
            <Select value={form.employee} onChange={e => handleFormChange('employee', e.target.value)} disabled={employeesLoading}>
              <option value="">{employeesLoading ? 'Loading employees...' : 'Select Employee'}</option>
              {employees.map(e => (
                <option key={e._id || e.id} value={`${e.firstName} ${e.lastName}`.trim()}>
                  {`${e.firstName} ${e.lastName}`.trim()} {e.department ? `(${e.department})` : ''}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Commission Date">
              <Input type="date" value={form.date} onChange={e => handleFormChange('date', e.target.value)} />
            </FormField>
            <FormField label="Performance Ratio (%)">
              <Input type="number" placeholder="78.5" value={form.percentage} onChange={e => handleFormChange('percentage', e.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Inverter Serial No.">
              <Input placeholder="SMA-50K-…" value={form.inverterSerialNo} onChange={e => handleFormChange('inverterSerialNo', e.target.value)} />
            </FormField>
            <FormField label="Panel Batch No.">
              <Input placeholder="TSP-B2025-LOT-…" value={form.panelBatchNo} onChange={e => handleFormChange('panelBatchNo', e.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Panel Warranty Till">
              <Input type="date" value={form.panelWarranty} onChange={e => handleFormChange('panelWarranty', e.target.value)} />
            </FormField>
            <FormField label="Inverter Warranty Till">
              <Input type="date" value={form.inverterWarranty} onChange={e => handleFormChange('inverterWarranty', e.target.value)} />
            </FormField>
            <FormField label="Install Warranty Till">
              <Input type="date" value={form.installWarranty} onChange={e => handleFormChange('installWarranty', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Notes (Optional)">
            <Input placeholder="Add any additional notes..." value={form.notes} onChange={e => handleFormChange('notes', e.target.value)} />
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
              {[['Certificate ID', selected.id], ['Customer', selected.customer], ['Employee', selected.employee || '—'], ['Site', selected.site],
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
