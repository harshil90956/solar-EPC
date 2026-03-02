// AdminDashboard.js — Admin Control Center (Aligned with Module Design Standards)
import React, { useState, useEffect, useRef } from 'react';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Users, Briefcase, DollarSign, Zap, Shield, BarChart3, Settings, Crown,
    TrendingUp, Activity, CheckCircle, AlertTriangle,
    Clock, Eye, Target, Monitor, Database, Server,
    RefreshCw, Download, Calendar, Bell, Search, MoreHorizontal,
    Star, Award, Gauge, Building, LayoutDashboard, LayoutGrid,
    Plus, Edit2, Trash2, FileText, ArrowUpRight, Filter
} from 'lucide-react';
import ReminderWidget from '../Reminder/ReminderWidget';
import {
    ChartCard, DashTooltip,
    fmtCurrency, fmtPct, CHART_COLORS, chartAxisStyle, ROLE_COLORS
} from './DashboardShell';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const ADMIN_KANBAN_STAGES = [
    { id: 'pending_approval', label: 'Pending Approval', color: '#f59e0b', icon: Clock, bg: '#f59e0b20' },
    { id: 'in_review', label: 'In Review', color: '#3b82f6', icon: Eye, bg: '#3b82f620' },
    { id: 'escalated', label: 'Escalated', color: '#ef4444', icon: AlertTriangle, bg: '#ef444420' },
    { id: 'approved', label: 'Approved', color: '#10b981', icon: CheckCircle, bg: '#10b98120' }
];

const MOCK_ADMIN_ITEMS = [
    { id: 1, title: 'New Project Approval Request', type: 'Project', requester: 'Sales Team', value: 285000, stage: 'pending_approval', priority: 'high', date: '2h ago' },
    { id: 2, title: 'Budget Increase - Ahmedabad Project', type: 'Finance', requester: 'PM Team', value: 50000, stage: 'in_review', priority: 'medium', date: '4h ago' },
    { id: 3, title: 'Vendor Payment Above Threshold', type: 'Finance', requester: 'Procurement', value: 850000, stage: 'pending_approval', priority: 'high', date: '1h ago' },
    { id: 4, title: 'Design Change Request', type: 'Design', requester: 'Engineering', value: 25000, stage: 'escalated', priority: 'urgent', date: '30m ago' },
    { id: 5, title: 'Compliance Certificate', type: 'Compliance', requester: 'Service', value: 0, stage: 'approved', priority: 'low', date: '1d ago' },
    { id: 6, title: 'Large Equipment Purchase', type: 'Procurement', requester: 'Store', value: 1200000, stage: 'in_review', priority: 'high', date: '3h ago' },
    { id: 7, title: 'Customer Credit Extension', type: 'Finance', requester: 'Sales Team', value: 450000, stage: 'escalated', priority: 'urgent', date: '45m ago' },
    { id: 8, title: 'Project Milestone Completion', type: 'Project', requester: 'PM Team', value: 180000, stage: 'approved', priority: 'medium', date: '2d ago' }
];

// Comprehensive Admin KPI Cards - Executive Dashboard Metrics (Aligned with Module Standards)
const ADMIN_KPIS = [
    // Financial Metrics
    totalRevenue: 48000000,
    monthlyRevenue: 4200000,
    quarterlyRevenue: 12600000,
    yearlyGrowth: 18.4,
    avgProjectValue: 285000,
    totalProfit: 15200000,
    profitMargin: 31.7,
    
    // Project Metrics
    activeProjects: 35,
    completedProjects: 186,
    totalProjects: 221,
    onTimeDelivery: 94.2,
    projectSuccessRate: 96.3,
    
    // Customer & Capacity
    totalCustomers: 1248,
    newCustomersThisMonth: 32,
    customerRetention: 89.5,
    capacityInstalled: 4200, // kWp
    capacityThisMonth: 580,
    
    // System Health & Operations  
    systemUptime: 99.8,
    activeUsers: 47,
    totalUsers: 156,
    pendingApprovals: 12,
    openTickets: 24,
    resolvedTickets: 342,
    avgResponseTime: 2.3, // seconds
    customerSatisfaction: 4.7,
    
    // Department Metrics
    totalEmployees: 89,
    activeTeams: 9,
    productivityScore: 87.4,
    departmentEfficiency: 91.2,
};

const REVENUE_TREND_DATA = [
    { month: 'Sep', revenue: 3200000, profit: 1280000, projects: 28, growth: 8.5 },
    { month: 'Oct', revenue: 3600000, profit: 1580000, projects: 31, growth: 12.5 },
    { month: 'Nov', revenue: 3950000, profit: 1775000, projects: 33, growth: 9.7 },
    { month: 'Dec', revenue: 4100000, profit: 1845000, projects: 35, growth: 3.8 },
    { month: 'Jan', revenue: 3850000, profit: 1617000, projects: 32, growth: -6.1 },
    { month: 'Feb', revenue: 4200000, profit: 1890000, projects: 35, growth: 9.1 },
];

const DEPARTMENT_PERFORMANCE = [
    { department: 'Sales', target: 100, actual: 118, efficiency: 95, satisfaction: 4.8 },
    { department: 'Survey', target: 100, actual: 105, efficiency: 88, satisfaction: 4.6 },
    { department: 'Design', target: 100, actual: 112, efficiency: 92, satisfaction: 4.7 },
    { department: 'PM', target: 100, actual: 94, efficiency: 87, satisfaction: 4.5 },
    { department: 'Finance', target: 100, actual: 108, efficiency: 96, satisfaction: 4.9 },
    { department: 'Service', target: 100, actual: 102, efficiency: 89, satisfaction: 4.4 },
];

const PROJECT_STATUS_DATA = [
    { name: 'Completed', value: 186, color: '#10b981' },
    { name: 'In Progress', value: 35, color: '#3b82f6' },
    { name: 'Planning', value: 12, color: '#f59e0b' },
    { name: 'On Hold', value: 4, color: '#ef4444' },
];

const SYSTEM_HEALTH_DATA = [
    { metric: 'CPU Usage', value: 45, status: 'good', target: 80 },
    { metric: 'Memory Usage', value: 62, status: 'warning', target: 85 },
    { metric: 'Disk Space', value: 34, status: 'good', target: 90 },
    { metric: 'Network Load', value: 28, status: 'excellent', target: 70 },
    { metric: 'Database Load', value: 51, status: 'good', target: 75 },
    { metric: 'API Response', value: 98, status: 'excellent', target: 95 },
];

const GEOGRAPHICAL_DATA = [
    { region: 'Gujarat', projects: 45, revenue: 18500000, growth: 15.2 },
    { region: 'Rajasthan', projects: 38, revenue: 12800000, growth: 22.8 },
    { region: 'Maharashtra', projects: 32, revenue: 11200000, growth: 8.5 },
    { region: 'Karnataka', projects: 28, revenue: 8900000, growth: 18.7 },
    { region: 'Others', projects: 21, revenue: 6400000, growth: 12.3 },
];

const REAL_TIME_ALERTS = [
    { id: 1, type: 'critical', message: 'High-priority project deadline approaching', time: '2 mins ago', role: 'PM' },
    { id: 2, type: 'warning', message: 'Inventory stock below threshold', time: '5 mins ago', role: 'Store' },
    { id: 3, type: 'info', message: 'New customer inquiry received', time: '8 mins ago', role: 'Sales' },
    { id: 4, type: 'success', message: 'Project milestone achieved ahead of schedule', time: '12 mins ago', role: 'PM' },
    { id: 5, type: 'warning', message: 'Payment follow-up required', time: '18 mins ago', role: 'Finance' },
];

// Comprehensive Admin KPI Cards - Executive Dashboard Metrics
const ADMIN_KPIS = [
    { 
        label: 'Total Revenue (YTD)', 
        value: fmtCurrency(ADMIN_OVERVIEW_DATA.totalRevenue), 
        sub: `${fmtCurrency(ADMIN_OVERVIEW_DATA.monthlyRevenue)} this month`,
        icon: DollarSign, 
        accent: ROLE_COLORS.finance.primary, 
        trend: `+${ADMIN_OVERVIEW_DATA.yearlyGrowth}% YoY`, 
        trendUp: true 
    },
    { 
        label: 'Active Projects', 
        value: ADMIN_OVERVIEW_DATA.activeProjects.toString(), 
        sub: `${ADMIN_OVERVIEW_DATA.completedProjects} completed • ${fmtPct(ADMIN_OVERVIEW_DATA.projectSuccessRate)} success rate`,
        icon: Briefcase, 
        accent: ROLE_COLORS.pm.primary, 
        trend: '+5 this month', 
        trendUp: true 
    },
    { 
        label: 'Total Customers', 
        value: ADMIN_OVERVIEW_DATA.totalCustomers.toLocaleString(), 
        sub: `${ADMIN_OVERVIEW_DATA.newCustomersThisMonth} new this month • ${fmtPct(ADMIN_OVERVIEW_DATA.customerRetention)} retention`,
        icon: Users, 
        accent: ROLE_COLORS.sales.primary, 
        trend: `+${ADMIN_OVERVIEW_DATA.newCustomersThisMonth} this month`, 
        trendUp: true 
    },
    { 
        label: 'Capacity Installed', 
        value: `${(ADMIN_OVERVIEW_DATA.capacityInstalled / 1000).toFixed(1)} MWp`, 
        sub: `${ADMIN_OVERVIEW_DATA.capacityThisMonth} kWp this month`,
        icon: Zap, 
        accent: '#f59e0b', 
        trend: `+${ADMIN_OVERVIEW_DATA.capacityThisMonth} kWp`, 
        trendUp: true 
    },
    { 
        label: 'Profit Margin', 
        value: `${ADMIN_OVERVIEW_DATA.profitMargin}%`, 
        sub: `${fmtCurrency(ADMIN_OVERVIEW_DATA.totalProfit)} total profit`,
        icon: TrendingUp, 
        accent: ROLE_COLORS.finance.secondary, 
        trend: '+2.3% improved', 
        trendUp: true 
    },
    { 
        label: 'System Performance', 
        value: `${ADMIN_OVERVIEW_DATA.systemUptime}%`, 
        sub: `${ADMIN_OVERVIEW_DATA.avgResponseTime}s avg response • ${ADMIN_OVERVIEW_DATA.activeUsers}/${ADMIN_OVERVIEW_DATA.totalUsers} online`,
        icon: Monitor, 
        accent: ROLE_COLORS.admin.primary, 
        trend: '+99.2% uptime', 
        trendUp: true 
    },
    { 
        label: 'Team Productivity', 
        value: `${ADMIN_OVERVIEW_DATA.productivityScore}%`, 
        sub: `${ADMIN_OVERVIEW_DATA.totalEmployees} employees • ${ADMIN_OVERVIEW_DATA.activeTeams} active teams`,
        icon: Target, 
        accent: ROLE_COLORS.admin.secondary, 
        trend: '+4.1% efficiency', 
        trendUp: true 
    },
    { 
        label: 'Customer Satisfaction', 
        value: `${ADMIN_OVERVIEW_DATA.customerSatisfaction}/5.0`, 
        sub: `${ADMIN_OVERVIEW_DATA.resolvedTickets} tickets resolved • 95% recommend us`,
        icon: CheckCircle, 
        accent: ROLE_COLORS.service.primary, 
        trend: '+0.2 this quarter', 
        trendUp: true 
    }
];

const AdminDashboard = ({ onNavigate }) => {
    const [selectedTimeRange, setSelectedTimeRange] = useState('6M');
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState('All');
    
    // Simulated real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            // Simulate real-time data updates
            setRefreshing(true);
            setTimeout(() => setRefreshing(false), 500);
        }, 30000); // Update every 30 seconds
        
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
            {/* Perfect Header Design */}
            <div className="relative overflow-hidden">
                {/* Gradient Background with Geometric Patterns */}
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)] via-blue-600 to-indigo-700" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-black/20" />
                
                {/* Animated Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-yellow-400/10 rounded-full blur-2xl" />
                    <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-xl animate-bounce" style={{animationDuration: '3s'}} />
                </div>

                <div className="relative z-10 px-6 py-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            {/* Enhanced Header Content */}
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
                                        <Crown size={32} className="text-white drop-shadow-sm" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="flex items-center gap-4">
                                        <h1 className="text-3xl font-black text-white drop-shadow-sm">
                                            Admin Control Center
                                        </h1>
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 rounded-full shadow-lg">
                                                SUPER ADMIN
                                            </span>
                                            <span className="px-3 py-1 text-xs font-semibold bg-white/20 text-white border border-white/30 rounded-full backdrop-blur-sm">
                                                v2.0
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-white/90 text-sm font-medium">
                                        🎯 Complete Organizational Control • 📊 Real-time Analytics • ⚡ Unified System Overview
                                    </p>
                                    
                                    {/* Live Stats Bar */}
                                    <div className="flex items-center gap-6 text-xs text-white/80 mt-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                            <span>System Online</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users size={12} />
                                            <span>{ADMIN_OVERVIEW_DATA.activeUsers} Active Users</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Activity size={12} />
                                            <span>{ADMIN_OVERVIEW_DATA.systemUptime}% Uptime</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={12} />
                                            <span>Last sync: {new Date().toLocaleTimeString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Enhanced Control Panel */}
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Time Range Selector */}
                                <div className="flex items-center gap-2 px-4 py-3 bg-white/15 backdrop-blur-md border border-white/20 rounded-xl shadow-lg hover:bg-white/20 transition-all">
                                    <Calendar size={16} className="text-white/80" />
                                    <select 
                                        value={selectedTimeRange} 
                                        onChange={(e) => setSelectedTimeRange(e.target.value)}
                                        className="bg-transparent text-sm font-semibold text-white border-0 focus:ring-0 cursor-pointer"
                                    >
                                        <option value="1M" className="text-slate-900 bg-white">Last Month</option>
                                        <option value="3M" className="text-slate-900 bg-white">Last 3 Months</option>
                                        <option value="6M" className="text-slate-900 bg-white">Last 6 Months</option>
                                        <option value="1Y" className="text-slate-900 bg-white">Last Year</option>
                                    </select>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setRefreshing(!refreshing)}
                                        className={`p-3 bg-white/15 backdrop-blur-md border border-white/20 rounded-xl shadow-lg hover:bg-white/25 hover:scale-105 transition-all ${refreshing ? 'animate-spin' : ''}`}
                                        title="Refresh Dashboard"
                                    >
                                        <RefreshCw size={16} className="text-white" />
                                    </button>
                                    
                                    <button 
                                        className="p-3 bg-white/15 backdrop-blur-md border border-white/20 rounded-xl shadow-lg hover:bg-white/25 hover:scale-105 transition-all"
                                        title="Export Data"
                                    >
                                        <Download size={16} className="text-white" />
                                    </button>
                                    
                                    <button 
                                        className="p-3 bg-white/15 backdrop-blur-md border border-white/20 rounded-xl shadow-lg hover:bg-white/25 hover:scale-105 transition-all"
                                        title="Dashboard Settings"
                                    >
                                        <Settings size={16} className="text-white" />
                                    </button>
                                    
                                    <button 
                                        className="p-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all font-semibold"
                                        title="Quick Actions"
                                    >
                                        <MoreHorizontal size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Dashboard Content */}
            <div className="relative z-10 -mt-6 px-6 pb-12">
                <div className="max-w-7xl mx-auto space-y-8">
                    
                    {/* Premium Executive KPIs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {ADMIN_KPIS.map((kpi, index) => (
                            <div key={kpi.label} className="group relative">
                                {/* Enhanced KPI Card */}
                                <div className="relative overflow-hidden bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-50/50 dark:to-slate-900/50" />
                                    
                                    {/* Background Icon */}
                                    <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <kpi.icon size={40} style={{ color: kpi.accent }} />
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-4">
                                            <div 
                                                className="p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow"
                                                style={{ 
                                                    backgroundColor: kpi.accent + '15', 
                                                    border: `1px solid ${kpi.accent}30` 
                                                }}
                                            >
                                                <kpi.icon size={20} style={{ color: kpi.accent }} />
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-1">
                                                    <ArrowUpRight size={14} className="text-emerald-500" />
                                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                        {kpi.trend}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                {kpi.label}
                                            </h3>
                                            <p 
                                                className="text-2xl font-black leading-none group-hover:scale-105 transition-transform"
                                                style={{ color: kpi.accent }}
                                            >
                                                {kpi.value}
                                            </p>
                                            {kpi.sub && (
                                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                    {kpi.sub}
                                                </p>
                                            )}
                                        </div>
                                        
                                        {/* Progress Indicator */}
                                        <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-500 dark:text-slate-400">Performance</span>
                                                <span className="font-semibold" style={{ color: kpi.accent }}>
                                                    {index % 2 === 0 ? '↗️ Excellent' : '🔥 Outstanding'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Real-time System Status Dashboard */}
                    <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Monitor size={20} className="text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">System Health Monitor</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Real-time infrastructure performance metrics</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Live Updates</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {[
                                { 
                                    label: 'Active Users', 
                                    value: ADMIN_OVERVIEW_DATA.activeUsers.toString(), 
                                    icon: Users, 
                                    color: '#3b82f6', 
                                    status: 'excellent',
                                    subtitle: 'Online now'
                                },
                                { 
                                    label: 'System Uptime', 
                                    value: `${ADMIN_OVERVIEW_DATA.systemUptime}%`, 
                                    icon: Server, 
                                    color: '#10b981', 
                                    status: 'excellent',
                                    subtitle: '99.8% target'
                                },
                                { 
                                    label: 'Response Time', 
                                    value: `${ADMIN_OVERVIEW_DATA.avgResponseTime}s`, 
                                    icon: Zap, 
                                    color: '#8b5cf6', 
                                    status: 'good',
                                    subtitle: 'Average'
                                },
                                { 
                                    label: 'Open Tickets', 
                                    value: ADMIN_OVERVIEW_DATA.openTickets.toString(), 
                                    icon: AlertTriangle, 
                                    color: '#f59e0b', 
                                    status: 'attention',
                                    subtitle: 'Needs review'
                                },
                                { 
                                    label: 'Data Sync', 
                                    value: '100%', 
                                    icon: Database, 
                                    color: '#06b6d4', 
                                    status: 'excellent',
                                    subtitle: 'Synchronized'
                                },
                                { 
                                    label: 'Security', 
                                    value: 'Secure', 
                                    icon: Shield, 
                                    color: '#10b981', 
                                    status: 'excellent',
                                    subtitle: 'Protected'
                                }
                            ].map((metric, index) => (
                                <div key={metric.label} className="group p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/30 dark:to-slate-900/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <div 
                                            className="p-2 rounded-lg"
                                            style={{ backgroundColor: metric.color + '15' }}
                                        >
                                            <metric.icon size={16} style={{ color: metric.color }} />
                                        </div>
                                        <div 
                                            className={`w-2 h-2 rounded-full ${
                                                metric.status === 'excellent' ? 'bg-green-500 animate-pulse' :
                                                metric.status === 'good' ? 'bg-blue-500' :
                                                metric.status === 'attention' ? 'bg-yellow-500 animate-pulse' :
                                                'bg-red-500 animate-pulse'
                                            }`}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-lg font-bold" style={{ color: metric.color }}>
                                            {metric.value}
                                        </p>
                                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                            {metric.label}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {metric.subtitle}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Advanced Analytics Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* Revenue Analytics */}
                        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-6 shadow-lg">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/10 rounded-lg">
                                        <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Revenue Analytics</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Monthly performance with growth trends</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-green-600 dark:text-green-400">
                                        {fmtCurrency(ADMIN_OVERVIEW_DATA.monthlyRevenue)}
                                    </p>
                                    <p className="text-xs text-slate-500">This Month</p>
                                </div>
                            </div>
                            
                            <ResponsiveContainer width="100%" height={280}>
                                <ComposedChart data={REVENUE_TREND_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="revenueGradientPerfect" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                                    <XAxis dataKey="month" {...chartAxisStyle} />
                                    <YAxis yAxisId="revenue" orientation="left" tickFormatter={fmtCurrency} {...chartAxisStyle} width={60} />
                                    <Tooltip content={<DashTooltip formatter={(v) => fmtCurrency(v)} />} />
                                    <Area 
                                        yAxisId="revenue" 
                                        type="monotone" 
                                        dataKey="revenue" 
                                        stroke="#10b981" 
                                        strokeWidth={3} 
                                        fill="url(#revenueGradientPerfect)" 
                                    />
                                    <Line 
                                        yAxisId="revenue" 
                                        type="monotone" 
                                        dataKey="profit" 
                                        stroke="#3b82f6" 
                                        strokeWidth={2} 
                                        strokeDasharray="5 5" 
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Project Portfolio */}
                        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-6 shadow-lg">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <Briefcase size={20} className="text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Project Portfolio</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Current project status and distribution</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                        {PROJECT_STATUS_DATA.reduce((sum, item) => sum + item.value, 0)}
                                    </p>
                                    <p className="text-xs text-slate-500">Total Projects</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <div className="flex-shrink-0">
                                    <ResponsiveContainer width={180} height={180}>
                                        <PieChart>
                                            <Pie 
                                                data={PROJECT_STATUS_DATA} 
                                                cx="50%" cy="50%" 
                                                outerRadius={80} 
                                                innerRadius={45}
                                                dataKey="value" 
                                                paddingAngle={2}
                                            >
                                                {PROJECT_STATUS_DATA.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<DashTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                
                                <div className="flex-1 space-y-3">
                                    {PROJECT_STATUS_DATA.map((item) => (
                                        <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-3 h-3 rounded-full" 
                                                    style={{ backgroundColor: item.color }} 
                                                />
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    {item.name}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-lg font-bold" style={{ color: item.color }}>
                                                    {item.value}
                                                </span>
                                                <p className="text-xs text-slate-500">
                                                    {((item.value / PROJECT_STATUS_DATA.reduce((sum, p) => sum + p.value, 0)) * 100).toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Department Performance Dashboard */}
                    <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <Building size={20} className="text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Department Performance</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Cross-functional efficiency and achievement metrics</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Award size={16} className="text-yellow-500" />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Overall: 91.2%</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                            {DEPARTMENT_PERFORMANCE.map((dept, index) => (
                                <div key={dept.department} className="text-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/30 dark:to-slate-900/30 rounded-xl border border-slate-200/50 dark:border-slate-700/30 hover:shadow-lg transition-all duration-200">
                                    <div className="mb-3">
                                        <div 
                                            className="text-2xl font-black mb-1" 
                                            style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}
                                        >
                                            {dept.actual}%
                                        </div>
                                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                                            {dept.department}
                                        </div>
                                        <div className="flex items-center justify-center gap-1 text-xs">
                                            <Star size={10} className="text-yellow-500" />
                                            <span className="text-slate-600 dark:text-slate-400">{dept.satisfaction}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                            <div 
                                                className="h-1.5 rounded-full transition-all duration-500" 
                                                style={{ 
                                                    width: `${Math.min(dept.actual, 100)}%`,
                                                    backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                                                }}
                                            />
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            Efficiency: {dept.efficiency}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Performance Chart */}
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={DEPARTMENT_PERFORMANCE} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                                <XAxis dataKey="department" {...chartAxisStyle} />
                                <YAxis {...chartAxisStyle} />
                                <Tooltip content={<DashTooltip />} />
                                <Bar dataKey="target" name="Target" fill="#e2e8f0" />
                                <Bar dataKey="actual" name="Achievement" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Real-time Alerts & Activity Feed */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Alerts Panel */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-6 shadow-lg">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-500/10 rounded-lg">
                                        <Bell size={20} className="text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">System Alerts</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Real-time notifications and priority updates</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Live Feed</span>
                                </div>
                            </div>
                            
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {REAL_TIME_ALERTS.map((alert) => (
                                    <div 
                                        key={alert.id} 
                                        className={`flex items-start gap-4 p-4 rounded-xl border transition-all hover:shadow-md ${
                                            alert.type === 'critical' ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/30' :
                                            alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800/30' :
                                            alert.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/30' :
                                            'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/30'
                                        }`}
                                    >
                                        <div 
                                            className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                                                alert.type === 'critical' ? 'bg-red-500 animate-pulse' :
                                                alert.type === 'warning' ? 'bg-yellow-500' :
                                                alert.type === 'success' ? 'bg-green-500' :
                                                'bg-blue-500'
                                            }`}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-xs px-2 py-1 rounded-md font-semibold ${
                                                    alert.type === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-800/50 dark:text-red-200' :
                                                    alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/50 dark:text-yellow-200' :
                                                    alert.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-800/50 dark:text-green-200' :
                                                    'bg-blue-100 text-blue-800 dark:bg-blue-800/50 dark:text-blue-200'
                                                }`}>
                                                    {alert.role}
                                                </span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">{alert.time}</span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                                                {alert.message}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="space-y-6">
                            {/* Reminders Widget */}
                            <ReminderWidget onNavigateToReminders={() => onNavigate?.('reminders')} />
                            
                            {/* Quick Stats */}
                            <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-6 shadow-lg">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                                        <Gauge size={20} className="text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Quick Stats</h3>
                                </div>
                                
                                <div className="space-y-4">
                                    {[
                                        { label: 'Customer Satisfaction', value: `${ADMIN_OVERVIEW_DATA.customerSatisfaction}/5.0`, color: '#10b981', icon: '⭐' },
                                        { label: 'Team Productivity', value: `${ADMIN_OVERVIEW_DATA.productivityScore}%`, color: '#3b82f6', icon: '🚀' },
                                        { label: 'System Efficiency', value: `${ADMIN_OVERVIEW_DATA.departmentEfficiency}%`, color: '#8b5cf6', icon: '⚡' }
                                    ].map((stat) => (
                                        <div key={stat.label} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{stat.icon}</span>
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{stat.label}</span>
                                            </div>
                                            <span className="text-lg font-bold" style={{ color: stat.color }}>
                                                {stat.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
