// Solar OS – EPC Edition — AdminPage.js
import React, { useState, useMemo, useRef } from 'react';
import {
  Shield, Users, Activity, AlertTriangle, CheckCircle, XCircle,
  Settings, Database, Zap, TrendingUp, TrendingDown, Clock,
  Calendar, Filter, Download, Upload, RefreshCw, Eye, Edit,
  Trash2, Plus, Search, LayoutGrid, List, BarChart3, PieChart,
  FileText, Mail, Phone, MapPin, Star, Award, Target, MoreVertical,
  Bell, Lock, UserCheck, UserX, Key, LogOut, ChevronDown, ChevronUp,
  BarChart2, LineChart as LineChartIcon, PieChart as PieChartIcon,
  AreaChart as AreaChartIcon, Radar as RadarIcon, Globe, Cpu, HardDrive, Wifi,
  Smartphone, Monitor, Server, Cloud, ShieldCheck, AlertOctagon,
  Briefcase, Building, Wallet, ShoppingCart, Wrench, ClipboardCheck,
  Truck, Package, Sun, Battery, ZapOff, Wind, Thermometer,
  DollarSign, Receipt, CreditCard, Banknote, PiggyBank, TrendingUp as TrendUp,
  Users2, UserPlus, UserMinus, GraduationCap, Crown, BadgeCheck,
  Flame, Heart, Brain, Gauge, Headphones
} from 'lucide-react';
import {
  USERS, PROJECTS, LEADS, INVENTORY, TICKETS, QUOTATIONS,
  VENDORS, PURCHASE_ORDERS, PIPELINE_STAGES
} from '../data/mockData';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import { KPICard } from '../components/ui/KPICard';
import { Avatar } from '../components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import DataTable from '../components/ui/DataTable';
import { CURRENCY, APP_CONFIG } from '../config/app.config';
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, ScatterChart, Scatter, Treemap, RadialBarChart, RadialBar
} from 'recharts';

const fmt = CURRENCY.format;

// ── Admin Analytics Data ────────────────────────────────────────────────────────
const generateAnalyticsData = () => {
  const now = new Date();
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      projects: Math.floor(Math.random() * 20) + 10,
      revenue: Math.floor(Math.random() * 500000) + 200000,
      users: Math.floor(Math.random() * 15) + 5,
      tickets: Math.floor(Math.random() * 30) + 10
    };
  });

  const departmentData = [
    { name: 'Sales', value: 35, color: '#3b82f6' },
    { name: 'Projects', value: 25, color: '#22c55e' },
    { name: 'Finance', value: 20, color: '#f59e0b' },
    { name: 'Operations', value: 15, color: '#8b5cf6' },
    { name: 'Support', value: 5, color: '#ef4444' }
  ];

  const userActivityData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    active: Math.floor(Math.random() * 50) + 10,
    new: Math.floor(Math.random() * 10) + 1
  }));

  const projectStatusData = [
    { status: 'Planning', count: PROJECTS.filter(p => p.status === 'Planning').length, color: '#6b7280' },
    { status: 'In Progress', count: PROJECTS.filter(p => p.status === 'In Progress').length, color: '#3b82f6' },
    { status: 'Completed', count: PROJECTS.filter(p => p.status === 'Completed').length, color: '#22c55e' },
    { status: 'On Hold', count: PROJECTS.filter(p => p.status === 'On Hold').length, color: '#f59e0b' }
  ];

  // Role-based analytics data
  const roleAnalytics = [
    { role: 'Admin', deals: 0, revenue: 0, tasks: 45, performance: 98 },
    { role: 'Manager', deals: 12, revenue: 2500000, tasks: 78, performance: 92 },
    { role: 'Sales', deals: 45, revenue: 8500000, tasks: 120, performance: 88 },
    { role: 'Projects', deals: 0, revenue: 0, tasks: 156, performance: 94 },
    { role: 'Finance', deals: 0, revenue: 0, tasks: 89, performance: 96 },
    { role: 'Support', deals: 0, revenue: 0, tasks: 234, performance: 90 },
  ];

  // Reminder analytics
  const reminderStats = [
    { type: 'Follow-up', count: 145, completed: 120, pending: 25 },
    { type: 'Meeting', count: 89, completed: 75, pending: 14 },
    { type: 'Deadline', count: 67, completed: 55, pending: 12 },
    { type: 'Task', count: 234, completed: 198, pending: 36 },
    { type: 'Alert', count: 45, completed: 40, pending: 5 },
  ];

  // Geographic data
  const geoData = [
    { region: 'Maharashtra', users: 45, projects: 23, revenue: 4500000 },
    { region: 'Gujarat', users: 32, projects: 18, revenue: 3200000 },
    { region: 'Rajasthan', users: 28, projects: 15, revenue: 2800000 },
    { region: 'Karnataka', users: 35, projects: 20, revenue: 3500000 },
    { region: 'Tamil Nadu', users: 22, projects: 12, revenue: 2200000 },
    { region: 'Delhi NCR', users: 38, projects: 25, revenue: 4800000 },
  ];

  // Security events
  const securityEvents = [
    { type: 'Login Success', count: 1250, severity: 'low' },
    { type: 'Failed Login', count: 45, severity: 'medium' },
    { type: 'Password Reset', count: 23, severity: 'low' },
    { type: 'Suspicious Activity', count: 8, severity: 'high' },
    { type: 'Permission Change', count: 15, severity: 'medium' },
    { type: 'Data Export', count: 67, severity: 'low' },
  ];

  // Device usage
  const deviceUsage = [
    { name: 'Desktop', value: 55, color: '#3b82f6' },
    { name: 'Mobile', value: 30, color: '#22c55e' },
    { name: 'Tablet', value: 10, color: '#f59e0b' },
    { name: 'Other', value: 5, color: '#6b7280' },
  ];

  return {
    last6Months,
    departmentData,
    userActivityData,
    projectStatusData,
    roleAnalytics,
    reminderStats,
    geoData,
    securityEvents,
    deviceUsage
  };
};

const analyticsData = generateAnalyticsData();

// ── Admin User Kanban Stages ────────────────────────────────────────────────────────
const ADMIN_USER_STAGES = [
  { id: 'Active', label: 'Active', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { id: 'Inactive', label: 'Inactive', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  { id: 'Pending', label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { id: 'Suspended', label: 'Suspended', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
];

// ── User Management Columns ─────────────────────────────────────────────────────
const USER_COLUMNS = [
  {
    key: 'id',
    header: 'User ID',
    render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span>
  },
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    render: (v, row) => (
      <div className="flex items-center gap-2">
        <Avatar name={v} size="xs" />
        <div>
          <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span>
          <div className="text-[9px] text-[var(--text-muted)]">{row.email}</div>
        </div>
      </div>
    )
  },
  { key: 'role', header: 'Role', render: v => <span className="px-2 py-1 rounded-full text-[9px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">{v}</span> },
  { key: 'department', header: 'Department', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
  {
    key: 'status',
    header: 'Status',
    render: v => (
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${v === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <span className="text-xs">{v}</span>
      </div>
    )
  },
  { key: 'lastLogin', header: 'Last Login', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
];

// ── System Activity Columns ─────────────────────────────────────────────────────
const ACTIVITY_COLUMNS = [
  { key: 'timestamp', header: 'Time', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'user', header: 'User', render: v => <span className="text-xs font-medium text-[var(--text-primary)]">{v}</span> },
  { key: 'action', header: 'Action', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
  { key: 'module', header: 'Module', render: v => <span className="px-2 py-1 rounded-full text-[9px] font-medium bg-purple-500/10 text-purple-500 border border-purple-500/20">{v}</span> },
  { key: 'ip', header: 'IP Address', render: v => <span className="text-xs font-mono text-[var(--text-faint)]">{v}</span> },
];

// ── Performance Metrics Columns ─────────────────────────────────────────────────
const PERFORMANCE_COLUMNS = [
  { key: 'metric', header: 'Metric', render: v => <span className="text-xs font-medium text-[var(--text-primary)]">{v}</span> },
  { key: 'current', header: 'Current', render: v => <span className="text-xs font-bold text-[var(--text-primary)]">{v}</span> },
  { key: 'target', header: 'Target', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  {
    key: 'trend',
    header: 'Trend',
    render: v => (
      <div className="flex items-center gap-1">
        {v > 0 ? <TrendingUp size={12} className="text-emerald-500" /> : <TrendingDown size={12} className="text-red-500" />}
        <span className={`text-xs font-medium ${v > 0 ? 'text-emerald-500' : 'text-red-500'}`}>{Math.abs(v)}%</span>
      </div>
    )
  },
];

// ── Sample Data Generation ───────────────────────────────────────────────────────
const generateSystemUsers = () => [
  { id: 'USR001', name: 'Admin User', email: 'admin@solar-os.com', role: 'Super Admin', department: 'IT', status: 'Active', lastLogin: '2 hours ago' },
  { id: 'USR002', name: 'John Smith', email: 'john@solar-os.com', role: 'Manager', department: 'Sales', status: 'Active', lastLogin: '1 day ago' },
  { id: 'USR003', name: 'Sarah Johnson', email: 'sarah@solar-os.com', role: 'Executive', department: 'Projects', status: 'Active', lastLogin: '3 hours ago' },
  { id: 'USR004', name: 'Mike Wilson', email: 'mike@solar-os.com', role: 'User', department: 'Finance', status: 'Inactive', lastLogin: '5 days ago' },
  { id: 'USR005', name: 'Emily Davis', email: 'emily@solar-os.com', role: 'Manager', department: 'Operations', status: 'Active', lastLogin: '30 minutes ago' },
  { id: 'USR006', name: 'Raj Patel', email: 'raj@solar-os.com', role: 'User', department: 'Sales', status: 'Pending', lastLogin: 'Never' },
  { id: 'USR007', name: 'Priya Sharma', email: 'priya@solar-os.com', role: 'User', department: 'Support', status: 'Suspended', lastLogin: '10 days ago' },
  { id: 'USR008', name: 'Amit Kumar', email: 'amit@solar-os.com', role: 'Manager', department: 'Procurement', status: 'Active', lastLogin: '1 hour ago' },
  { id: 'USR009', name: 'Neha Gupta', email: 'neha@solar-os.com', role: 'User', department: 'Sales', status: 'Active', lastLogin: '4 hours ago' },
  { id: 'USR010', name: 'Vikram Singh', email: 'vikram@solar-os.com', role: 'User', department: 'Projects', status: 'Active', lastLogin: '2 hours ago' },
  { id: 'USR011', name: 'Anita Desai', email: 'anita@solar-os.com', role: 'User', department: 'Finance', status: 'Active', lastLogin: '6 hours ago' },
  { id: 'USR012', name: 'Suresh Reddy', email: 'suresh@solar-os.com', role: 'User', department: 'Operations', status: 'Inactive', lastLogin: '3 days ago' },
];

const generateSystemActivity = () => [
  { timestamp: '10:45 AM', user: 'John Smith', action: 'Created new quotation', module: 'Sales', ip: '192.168.1.100' },
  { timestamp: '10:42 AM', user: 'Sarah Johnson', action: 'Updated project status', module: 'Projects', ip: '192.168.1.101' },
  { timestamp: '10:38 AM', user: 'Admin User', action: 'Added new user', module: 'Admin', ip: '192.168.1.102' },
  { timestamp: '10:35 AM', user: 'Mike Wilson', action: 'Generated financial report', module: 'Finance', ip: '192.168.1.103' },
  { timestamp: '10:30 AM', user: 'Emily Davis', action: 'Modified inventory', module: 'Operations', ip: '192.168.1.104' },
  { timestamp: '10:25 AM', user: 'Raj Patel', action: 'Viewed lead details', module: 'CRM', ip: '192.168.1.105' },
  { timestamp: '10:20 AM', user: 'Amit Kumar', action: 'Approved purchase order', module: 'Procurement', ip: '192.168.1.106' },
  { timestamp: '10:15 AM', user: 'Priya Sharma', action: 'Resolved support ticket', module: 'Service', ip: '192.168.1.107' },
  { timestamp: '10:10 AM', user: 'Neha Gupta', action: 'Updated lead status', module: 'Sales', ip: '192.168.1.108' },
  { timestamp: '10:05 AM', user: 'Vikram Singh', action: 'Completed site survey', module: 'Survey', ip: '192.168.1.109' },
  { timestamp: '10:00 AM', user: 'Anita Desai', action: 'Processed payment', module: 'Finance', ip: '192.168.1.110' },
  { timestamp: '09:55 AM', user: 'Suresh Reddy', action: 'Updated inventory count', module: 'Inventory', ip: '192.168.1.111' },
];

const generatePerformanceMetrics = () => [
  { metric: 'System Uptime', current: '99.9%', target: '99.5%', trend: 0.4 },
  { metric: 'Response Time', current: '245ms', target: '300ms', trend: -12.5 },
  { metric: 'Error Rate', current: '0.1%', target: '0.5%', trend: -80.0 },
  { metric: 'User Satisfaction', current: '4.8/5', target: '4.5/5', trend: 6.7 },
  { metric: 'Ticket Resolution', current: '2.3 hours', target: '4 hours', trend: -42.5 },
  { metric: 'API Availability', current: '99.95%', target: '99.9%', trend: 0.05 },
  { metric: 'Database Perf', current: '98%', target: '95%', trend: 3.2 },
  { metric: 'Cache Hit Rate', current: '92%', target: '90%', trend: 2.2 },
];

const SYSTEM_USERS = generateSystemUsers();
const SYSTEM_ACTIVITY = generateSystemActivity();
const PERFORMANCE_METRICS = generatePerformanceMetrics();

// ── Admin User Kanban Card ────────────────────────────────────────────────────────
const AdminUserCard = ({ user, onDragStart, onClick }) => {
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-[var(--primary)]/40 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Avatar name={user.name} size="xs" />
          <div>
            <span className="text-xs font-semibold text-[var(--text-primary)]">{user.name}</span>
            <div className="text-[9px] text-[var(--text-muted)]">{user.email}</div>
          </div>
        </div>
        <MoreVertical size={12} className="text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)]" />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-1 rounded-full text-[9px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
          {user.role}
        </span>
        <span className="text-[9px] text-[var(--text-muted)]">{user.department}</span>
      </div>
      <div className="flex items-center justify-between text-[9px] text-[var(--text-faint)]">
        <span>Last login: {user.lastLogin}</span>
        <div className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
      </div>
    </div>
  );
};

// ── Admin User Kanban Board ────────────────────────────────────────────────────────
const AdminUserKanbanBoard = ({ users, onStageChange, onCardClick }) => {
  const draggingId = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  const handleDragStart = (e, userId) => {
    draggingId.current = userId;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    setDragOver(stageId);
  };

  const handleDrop = (e, stageId) => {
    e.preventDefault();
    if (draggingId.current && stageId) {
      onStageChange(draggingId.current, stageId);
    }
    setDragOver(null);
    draggingId.current = null;
  };

  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex gap-3 min-w-max">
        {ADMIN_USER_STAGES.map(stage => {
          const stageUsers = users.filter(user => user.status === stage.id);

          return (
            <div key={stage.id} className="w-80 flex-shrink-0">
              <div className="glass-card p-4">
                {/* Stage Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">{stage.label}</h4>
                    <span className="text-xs text-[var(--text-muted)]">{stageUsers.length}</span>
                  </div>
                  <MoreVertical size={12} className="text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)]" />
                </div>

                {/* User Cards */}
                <div className="space-y-3 min-h-[400px]">
                  {stageUsers.map(user => (
                    <AdminUserCard
                      key={user.id}
                      user={user}
                      onDragStart={handleDragStart}
                      onClick={() => onCardClick(user)}
                    />
                  ))}
                  {stageUsers.length === 0 && (
                    <div className="text-center py-8 text-[var(--text-faint)] text-xs">
                      No users in this stage
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Admin Dashboard Component ───────────────────────────────────────────────────
const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [userSearch, setUserSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userView, setUserView] = useState('kanban'); // Add Kanban view state
  const [systemUsers, setSystemUsers] = useState(SYSTEM_USERS); // Add state for users

  // Handle user stage change for Kanban
  const handleUserStageChange = (userId, newStatus) => {
    setSystemUsers(prev => prev.map(user =>
      user.id === userId ? { ...user, status: newStatus } : user
    ));
  };

  // Calculate comprehensive admin metrics
  const adminMetrics = useMemo(() => ({
    totalUsers: systemUsers.length,
    activeUsers: systemUsers.filter(u => u.status === 'Active').length,
    pendingUsers: systemUsers.filter(u => u.status === 'Pending').length,
    suspendedUsers: systemUsers.filter(u => u.status === 'Suspended').length,
    totalProjects: PROJECTS.length,
    activeProjects: PROJECTS.filter(p => p.status === 'In Progress').length,
    completedProjects: PROJECTS.filter(p => p.status === 'Completed').length,
    totalRevenue: QUOTATIONS.filter(q => q.status === 'Won').reduce((sum, q) => sum + q.value, 0),
    totalLeads: LEADS.length,
    hotLeads: LEADS.filter(l => l.status === 'Hot' || l.score > 80).length,
    openTickets: TICKETS.filter(t => t.status === 'Open').length,
    resolvedTickets: TICKETS.filter(t => t.status === 'Resolved').length,
    lowStock: INVENTORY.filter(i => i.available <= i.minStock).length,
    systemHealth: 99.9,
    alerts: 3,
    reminders: 580,
    securityScore: 98,
  }), [systemUsers]);

  const filteredUsers = useMemo(() =>
    systemUsers.filter(user =>
      user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.role.toLowerCase().includes(userSearch.toLowerCase())
    ), [userSearch, systemUsers]);

  const paginatedUsers = filteredUsers.slice((userPage - 1) * userPageSize, userPage * userPageSize);

  const USER_ACTIONS = [
    { label: 'View Details', icon: Eye, onClick: row => setSelectedUser(row) },
    { label: 'Edit User', icon: Edit, onClick: row => console.log('Edit user:', row) },
    { label: 'Reset Password', icon: RefreshCw, onClick: () => console.log('Reset password') },
    { label: 'Deactivate', icon: XCircle, onClick: () => console.log('Deactivate user') },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="heading-page">Admin Control Center</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            System administration · User management · Performance monitoring · Security oversight · Advanced analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => console.log('Export data')}>
            <Download size={13} /> Export Report
          </Button>
          <Button variant="ghost" onClick={() => console.log('System backup')}>
            <Database size={13} /> Backup
          </Button>
          <Button onClick={() => setShowAddUser(true)}>
            <Plus size={13} /> Add User
          </Button>
        </div>
      </div>

      {/* Advanced KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <KPICard
          title="Total Users"
          value={adminMetrics.totalUsers}
          icon={Users}
          trend={+12}
          trendLabel="this month"
          color="blue"
        />
        <KPICard
          title="Active Users"
          value={adminMetrics.activeUsers}
          icon={UserCheck}
          trend={+8}
          trendLabel="online now"
          color="emerald"
        />
        <KPICard
          title="Active Projects"
          value={adminMetrics.activeProjects}
          icon={Target}
          trend={+5}
          trendLabel="vs last week"
          color="cyan"
        />
        <KPICard
          title="Total Revenue"
          value={fmt(adminMetrics.totalRevenue)}
          icon={Wallet}
          trend={+15}
          trendLabel="this month"
          color="amber"
        />
        <KPICard
          title="System Health"
          value={`${adminMetrics.systemHealth}%`}
          icon={ShieldCheck}
          trend={+0.2}
          trendLabel="uptime"
          color="purple"
        />
        <KPICard
          title="Security Score"
          value={`${adminMetrics.securityScore}/100`}
          icon={Lock}
          trend={+2}
          trendLabel="vs last month"
          color="red"
        />
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Briefcase size={20} className="text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Total Leads</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{adminMetrics.totalLeads}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Flame size={20} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Hot Leads</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{adminMetrics.hotLeads}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Bell size={20} className="text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Reminders</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{adminMetrics.reminders}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Low Stock</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{adminMetrics.lowStock}</p>
          </div>
        </div>
      </div>
      {/* AI Insights Banner */}
      <div className="ai-banner">
        <Brain size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="text-[var(--accent-light)] font-semibold">AI Intelligence:</span>{' '}
          System performance is optimal with 99.9% uptime. User activity increased by 15% this week.
          3 hot leads require immediate attention. Security posture is excellent with zero critical vulnerabilities.
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users ({adminMetrics.totalUsers})</TabsTrigger>
          <TabsTrigger value="roles">Roles & Analytics</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-5">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Revenue & Projects Trend */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Revenue & Projects Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={analyticsData.last6Months}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="projects" stroke="#22c55e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Department Distribution */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Department Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPieChart>
                  <Pie
                    data={analyticsData.departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {analyticsData.departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {analyticsData.departmentData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="capitalize">{item.name}</span>
                    </div>
                    <span className="font-bold">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Activity & Project Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* User Activity Heatmap */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">24-Hour User Activity</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={analyticsData.userActivityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                  <Tooltip />
                  <Area type="monotone" dataKey="active" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Project Status Overview */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Project Status Overview</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analyticsData.projectStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-blue-500" />
                <span className="text-xs font-medium text-[var(--text-secondary)]">User Engagement</span>
              </div>
              <p className="text-xl font-bold text-[var(--text-primary)]">87%</p>
              <p className="text-xs text-[var(--text-muted)]">Active this week</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target size={14} className="text-emerald-500" />
                <span className="text-xs font-medium text-[var(--text-secondary)]">Project Success</span>
              </div>
              <p className="text-xl font-bold text-[var(--text-primary)]">94%</p>
              <p className="text-xs text-[var(--text-muted)]">On-time delivery</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={14} className="text-cyan-500" />
                <span className="text-xs font-medium text-[var(--text-secondary)]">Security Score</span>
              </div>
              <p className="text-xl font-bold text-[var(--text-primary)]">A+</p>
              <p className="text-xs text-[var(--text-muted)]">Grade rating</p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-amber-500" />
                <span className="text-xs font-medium text-[var(--text-secondary)]">System Load</span>
              </div>
              <p className="text-xl font-bold text-[var(--text-primary)]">42%</p>
              <p className="text-xs text-[var(--text-muted)]">Average usage</p>
            </div>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="h-8 text-xs w-64"
              />
              <Select className="h-8 text-xs w-32">
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="user">User</option>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <div className="view-toggle-pill">
                <button
                  onClick={() => setUserView('kanban')}
                  className={`view-toggle-btn ${userView === 'kanban' ? 'active' : ''}`}
                  title="Kanban view"
                >
                  <LayoutGrid size={13} />
                </button>
                <button
                  onClick={() => setUserView('table')}
                  className={`view-toggle-btn ${userView === 'table' ? 'active' : ''}`}
                  title="Table view"
                >
                  <List size={13} />
                </button>
              </div>
              <Button variant="ghost" size="sm">
                <Download size={12} /> Export
              </Button>
              <Button size="sm" onClick={() => setShowAddUser(true)}>
                <Plus size={12} /> Add User
              </Button>
            </div>
          </div>

          {userView === 'kanban' ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--text-muted)]">Drag users between columns to update their status</p>
                <Input
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="h-8 text-xs w-52"
                />
              </div>
              <AdminUserKanbanBoard
                users={filteredUsers}
                onStageChange={handleUserStageChange}
                onCardClick={setSelectedUser}
              />
            </>
          ) : (
            <DataTable
              columns={USER_COLUMNS}
              data={paginatedUsers}
              rowActions={USER_ACTIONS}
              pagination={{
                page: userPage,
                pageSize: userPageSize,
                total: filteredUsers.length,
                onChange: setUserPage,
                onPageSizeChange: setUserPageSize
              }}
              emptyMessage="No users found."
            />
          )}
        </TabsContent>

        {/* Roles & Analytics Tab */}
        <TabsContent value="roles" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Role Performance Chart */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <RadarIcon size={16} className="text-[var(--accent)]" />
                Performance by Role
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={analyticsData.roleAnalytics}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="role" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis tick={{ fontSize: 8 }} />
                  <Radar name="Performance" dataKey="performance" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Radar name="Tasks" dataKey="tasks" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Role Distribution */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Role Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    data={[
                      { name: 'Admin', value: 5, color: '#ef4444' },
                      { name: 'Manager', value: 12, color: '#f59e0b' },
                      { name: 'Sales', value: 25, color: '#3b82f6' },
                      { name: 'Projects', value: 18, color: '#22c55e' },
                      { name: 'Support', value: 15, color: '#8b5cf6' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[
                      { name: 'Admin', value: 5, color: '#ef4444' },
                      { name: 'Manager', value: 12, color: '#f59e0b' },
                      { name: 'Sales', value: 25, color: '#3b82f6' },
                      { name: 'Projects', value: 18, color: '#22c55e' },
                      { name: 'Support', value: 15, color: '#8b5cf6' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Overview */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Department Overview</h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { dept: 'Sales', users: 25, active: 22, revenue: 4500000, icon: Briefcase },
                { dept: 'Projects', users: 18, active: 17, revenue: 3200000, icon: Target },
                { dept: 'Finance', users: 8, active: 8, revenue: 0, icon: Wallet },
                { dept: 'Operations', users: 15, active: 14, revenue: 0, icon: Wrench },
                { dept: 'Support', users: 15, active: 13, revenue: 0, icon: Headphones },
              ].map((dept, index) => (
                <div key={index} className="p-4 bg-[var(--bg-elevated)] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <dept.icon size={14} className="text-[var(--accent)]" />
                    <span className="text-xs font-bold text-[var(--text-primary)]">{dept.dept}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Users:</span>
                      <span className="font-medium">{dept.users}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Active:</span>
                      <span className="font-medium text-emerald-500">{dept.active}</span>
                    </div>
                    {dept.revenue > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-muted)]">Revenue:</span>
                        <span className="font-medium">{fmt(dept.revenue)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Reminders Tab */}
        <TabsContent value="reminders" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Reminder Statistics */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Reminder Statistics</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analyticsData.reminderStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="type" tick={{ fontSize: 9 }} stroke="var(--text-muted)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                  <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Reminder by Type */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Reminder Types</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPieChart>
                  <Pie
                    data={analyticsData.reminderStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="type"
                  >
                    {analyticsData.reminderStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* Upcoming Reminders */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Upcoming (24h)</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {[
                  { title: 'Follow up with Ramesh Joshi', time: '2 hours', type: 'Follow-up', priority: 'high' },
                  { title: 'Team standup meeting', time: '4 hours', type: 'Meeting', priority: 'medium' },
                  { title: 'Submit GST returns', time: '8 hours', type: 'Deadline', priority: 'high' },
                  { title: 'Review project proposal', time: '12 hours', type: 'Task', priority: 'medium' },
                  { title: 'Call vendor for delivery', time: '16 hours', type: 'Follow-up', priority: 'low' },
                ].map((reminder, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-[var(--bg-elevated)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${reminder.priority === 'high' ? 'bg-red-500' :
                        reminder.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                      <div>
                        <p className="text-xs font-medium text-[var(--text-primary)]">{reminder.title}</p>
                        <p className="text-[9px] text-[var(--text-muted)]">{reminder.type} • {reminder.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Reminder Analytics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Reminders', value: 580, change: '+12%', icon: Bell },
              { label: 'Completed Today', value: 45, change: '+8%', icon: CheckCircle },
              { label: 'Pending', value: 89, change: '-5%', icon: Clock },
              { label: 'Overdue', value: 12, change: '-15%', icon: AlertTriangle },
            ].map((stat, index) => (
              <div key={index} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--text-muted)]">{stat.label}</span>
                  <stat.icon size={14} className="text-[var(--accent)]" />
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</span>
                  <span className={`text-xs ${stat.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Security Overview</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">Security Score</span>
                  <span className="text-sm font-bold text-emerald-500">A+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">Failed Logins</span>
                  <span className="text-sm font-bold text-amber-500">3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">Active Sessions</span>
                  <span className="text-sm font-bold text-blue-500">24</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">Security Updates</span>
                  <span className="text-sm font-bold text-emerald-500">Current</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Recent Security Events</h3>
              <div className="space-y-2">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs font-medium text-amber-500">Failed Login Attempt</p>
                  <p className="text-[9px] text-[var(--text-muted)]">IP: 192.168.1.50 - 2 mins ago</p>
                </div>
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs font-medium text-blue-500">Password Reset</p>
                  <p className="text-[9px] text-[var(--text-muted)]">User: john@solar-os.com - 1 hour ago</p>
                </div>
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-xs font-medium text-emerald-500">Security Update</p>
                  <p className="text-[9px] text-[var(--text-muted)]">System patched - 3 hours ago</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Access Control</h3>
              <div className="space-y-3">
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Shield size={12} /> Manage Permissions
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Users size={12} /> User Roles
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Activity size={12} /> Audit Logs
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Settings size={12} /> Security Settings
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add User Modal */}
      <Modal
        open={showAddUser}
        onClose={() => setShowAddUser(false)}
        title="Add New User"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowAddUser(false)}>Cancel</Button>
            <Button onClick={() => setShowAddUser(false)}>
              <Plus size={12} /> Add User
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Name">
            <Input placeholder="Enter full name" />
          </FormField>
          <FormField label="Email">
            <Input type="email" placeholder="Enter email address" />
          </FormField>
          <FormField label="Role">
            <Select>
              <option value="">Select role</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="user">User</option>
            </Select>
          </FormField>
          <FormField label="Department">
            <Select>
              <option value="">Select department</option>
              <option value="sales">Sales</option>
              <option value="projects">Projects</option>
              <option value="finance">Finance</option>
              <option value="operations">Operations</option>
            </Select>
          </FormField>
        </div>
      </Modal>

      {/* User Details Modal */}
      <Modal
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="User Details"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setSelectedUser(null)}>Close</Button>
            <Button onClick={() => console.log('Save changes')}>
              <Edit size={12} /> Edit User
            </Button>
          </div>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={selectedUser.name} size="lg" />
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{selectedUser.name}</h3>
                <p className="text-xs text-[var(--text-muted)]">{selectedUser.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Role</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{selectedUser.role}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Department</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{selectedUser.department}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Status</p>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${selectedUser.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium text-[var(--text-primary)]">{selectedUser.status}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Last Login</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{selectedUser.lastLogin}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div >
  );
};

export default AdminPage;
