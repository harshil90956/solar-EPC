import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Area, AreaChart, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Users, DollarSign, Download, RefreshCw, 
  ArrowUpRight, ArrowDownRight, CheckCircle2, Sparkles, 
  AlertCircle, Zap, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, Target, Activity, UserCheck
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { leadsApi } from '../../services/leadsApi';

const fmt = (val) => {
  if (!val || val === 0) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
  return `₹${val.toLocaleString()}`;
};

const formatNumber = (num) => {
  if (!num || num === 0) return '0';
  return num.toLocaleString();
};

const titleCase = (s) => {
  if (!s) return '';
  return String(s).split(/\s|_/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

// eslint-disable-next-line no-unused-vars
const STAGE_COLORS = {
  new: { color: '#3B82F6', gradient: 'from-blue-500 to-blue-600' },
  contacted: { color: '#6366F1', gradient: 'from-indigo-500 to-indigo-600' },
  qualified: { color: '#8B5CF6', gradient: 'from-violet-500 to-violet-600' },
  proposal: { color: '#A855F7', gradient: 'from-purple-500 to-purple-600' },
  negotiation: { color: '#F59E0B', gradient: 'from-amber-500 to-amber-600' },
  won: { color: '#22C55E', gradient: 'from-emerald-500 to-emerald-600' },
  lost: { color: '#EF4444', gradient: 'from-red-500 to-red-600' },
  followup: { color: '#14B8A6', gradient: 'from-teal-500 to-teal-600' },
  customer: { color: '#10B981', gradient: 'from-green-500 to-green-600' }
};

// Live Indicator Component
const LiveIndicator = ({ isLive }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
    <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
    <span className="text-xs font-semibold text-emerald-700">{isLive ? 'Live Data' : 'Offline'}</span>
  </div>
);

// Loading skeleton for cards
const SkeletonCard = () => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="w-12 h-12 rounded-lg bg-gray-200" />
      <div className="w-16 h-5 rounded bg-gray-200" />
    </div>
    <div className="mt-4 space-y-2">
      <div className="w-24 h-3 rounded bg-gray-200" />
      <div className="w-20 h-7 rounded bg-gray-200" />
    </div>
  </div>
);

// Loading skeleton for charts
const SkeletonChart = () => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
    <div className="w-40 h-5 rounded bg-gray-200 mb-6" />
    <div className="h-64 bg-gray-200 rounded-lg" />
  </div>
);

// KPI Card Component with live data indicator
const KPICard = ({ title, value, change, trend, icon: Icon, color, loading, subtitle }) => {
  if (loading) return <SkeletonCard />;
  
  const TrendIcon = trend === 'up' ? ArrowUpRight : ArrowDownRight;
  const trendColor = trend === 'up' ? 'text-emerald-500' : 'text-red-500';
  const trendBg = trend === 'up' ? 'bg-emerald-50' : 'bg-red-50';
  
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon size={24} style={{ color }} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${trendBg}`}>
            <TrendIcon size={14} className={trendColor} />
            <span className={`text-xs font-semibold ${trendColor}`}>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

// Chart Date Filter Component (for individual charts)
const ChartDateFilter = ({ dateRange, onDateRangeChange, size = 'sm' }) => {
  const filters = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'quarter', label: 'Quarter' },
    { key: 'year', label: 'Year' },
  ];

  const baseClasses = size === 'sm' 
    ? 'px-2 py-1 text-xs' 
    : 'px-3 py-1.5 text-sm';

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onDateRangeChange(filter.key)}
          className={`${baseClasses} rounded-md font-medium transition-all ${
            dateRange === filter.key
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

// Error State
// eslint-disable-next-line no-unused-vars
const ErrorState = ({ onRetry }) => (
  <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
    <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
      <AlertCircle size={40} className="text-red-500" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Data</h3>
    <p className="text-gray-500 mb-6">
      There was an error loading the dashboard data. Please try again.
    </p>
    {onRetry && (
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw size={16} className="mr-2" /> Retry
      </Button>
    )}
  </div>
);

// Empty State
const EmptyState = ({ onAddLead }) => (
  <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
      <Users size={40} className="text-gray-400" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Leads Available</h3>
    <p className="text-gray-500 mb-6 max-w-md mx-auto">
      Import or add leads to see analytics. Once you have leads, this dashboard will show your sales funnel, pipeline value, and conversion metrics.
    </p>
    {onAddLead && (
      <Button variant="outline" onClick={onAddLead}>
        <Zap size={16} className="mr-2" /> Add Lead
      </Button>
    )}
  </div>
);

// Filter leads by date range
const filterLeadsByDateRange = (leads, dateRange) => {
  if (!leads || !Array.isArray(leads) || dateRange === 'all') return leads;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const getStartDate = () => {
    switch (dateRange) {
      case 'today':
        return today;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return weekStart;
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return null;
    }
  };

  const startDate = getStartDate();
  if (!startDate) return leads;

  return leads.filter(lead => {
    const leadDate = new Date(lead.createdAt || lead.created_at || lead.date || lead.created);
    return leadDate >= startDate;
  });
};

// Sales Funnel 2D Bar Chart with Individual Date Filter
const FunnelChart = ({ data, loading, leads = [] }) => {
  const [dateRange, setDateRange] = useState('all');

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return data;
    if (dateRange === 'all' || !leads.length) return data;
    
    const filteredLeads = filterLeadsByDateRange(leads, dateRange);
    const stageCounts = {};
    filteredLeads.forEach(lead => {
      const stage = lead.statusKey || lead.status || 'new';
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    });
    
    return data.map(stage => ({
      ...stage,
      count: stageCounts[stage.stage] || 0
    })).filter(s => s.count > 0);
  }, [data, leads, dateRange]);

  if (loading) return <SkeletonChart />;
  
  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Sales Funnel</h3>
          <ChartDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-400">No funnel data available</p>
        </div>
      </div>
    );
  }

  const chartData = filteredData.map((stage, index) => ({
    name: titleCase(stage.stage),
    leads: stage.count || 0,
    value: stage.value || 0,
    fill: ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#22c55e', '#ef4444'][index % 7]
  }));

  const totalLeads = chartData.reduce((sum, d) => sum + d.leads, 0);
  const totalValue = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sales Funnel</h3>
          <p className="text-sm text-gray-500 mt-1">{totalLeads} leads · {fmt(totalValue)}</p>
        </div>
        <ChartDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fontSize: 12, fill: '#374151' }} 
              axisLine={false} 
              tickLine={false}
              width={70}
            />
            <Tooltip 
              cursor={{ fill: '#f3f4f6' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                      <p className="font-semibold text-gray-900">{data.name}</p>
                      <p className="text-sm text-gray-600">Leads: {data.leads}</p>
                      <p className="text-sm text-gray-600">Value: {fmt(data.value)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="leads" radius={[0, 4, 4, 0]} barSize={28}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
        {chartData.slice(0, 3).map((stage, idx) => (
          <div key={idx} className="text-center">
            <p className="text-xs text-gray-500">{stage.name}</p>
            <p className="text-lg font-bold" style={{ color: stage.fill }}>{stage.leads}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Lead Sources 2D Chart with Individual Date Filter
const SourceChart = ({ data, loading, leads = [] }) => {
  const [dateRange, setDateRange] = useState('all');

  const filteredData = useMemo(() => {
    if (!leads || !Array.isArray(leads)) return data;
    if (dateRange === 'all') return data;
    
    const filteredLeads = filterLeadsByDateRange(leads, dateRange);
    const sourceCounts = {};
    filteredLeads.forEach(lead => {
      const source = lead.source || 'Unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    
    return Object.entries(sourceCounts).map(([source, count]) => ({
      source,
      leads: count
    }));
  }, [data, leads, dateRange]);

  if (loading) return <SkeletonChart />;
  
  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Lead Sources</h3>
          <ChartDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-400">No source data available</p>
        </div>
      </div>
    );
  }

  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b'];
  
  const chartData = filteredData.map((item, index) => ({
    name: titleCase(item.source || 'Unknown'),
    leads: item.leads || item.count || 0,
    fill: colors[index % colors.length]
  }));

  const total = chartData.reduce((sum, d) => sum + d.leads, 0);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Lead Sources</h3>
          <p className="text-sm text-gray-500 mt-1">{total} total leads</p>
        </div>
        <ChartDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      <div className="flex items-center gap-6">
        <div className="w-40 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={chartData} 
                cx="50%" 
                cy="50%" 
                innerRadius={45} 
                outerRadius={70} 
                paddingAngle={2}
                dataKey="leads"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0];
                    const pct = total > 0 ? Math.round((data.value / total) * 100) : 0;
                    return (
                      <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-100">
                        <p className="font-semibold text-sm">{data.name}</p>
                        <p className="text-xs text-gray-600">{data.value} leads ({pct}%)</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2">
          {chartData.map((source, index) => {
            const pct = total > 0 ? Math.round((source.leads / total) * 100) : 0;
            return (
              <div key={index} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.fill }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{source.name}</span>
                    <span className="text-sm font-semibold text-gray-900">{source.leads}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                    <div 
                      className="h-full rounded-full" 
                      style={{ width: `${pct}%`, backgroundColor: source.fill }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-500 w-8">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Monthly Trend 2D Area Chart with Individual Date Filter
const TrendChart = ({ data, loading }) => {
  const [dateRange, setDateRange] = useState('all');

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return data;
    if (dateRange === 'all') return data;
    
    // eslint-disable-next-line no-unused-vars
    const now = new Date();
    let monthsToShow = 12;
    
    switch (dateRange) {
      case 'today':
      case 'week':
      case 'month':
        monthsToShow = 1;
        break;
      case 'quarter':
        monthsToShow = 3;
        break;
      case 'year':
        monthsToShow = 12;
        break;
      default:
        monthsToShow = 12;
    }
    
    return data.slice(-monthsToShow);
  }, [data, dateRange]);

  if (loading) return <SkeletonChart />;
  
  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Trend</h3>
          <ChartDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-400">No trend data available</p>
        </div>
      </div>
    );
  }

  const chartData = filteredData.map(item => ({
    month: item.month || '',
    created: item.created || 0,
    won: item.won || 0,
  }));

  const totalCreated = chartData.reduce((sum, d) => sum + d.created, 0);
  const totalWon = chartData.reduce((sum, d) => sum + d.won, 0);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Monthly Trend</h3>
          <p className="text-sm text-gray-500 mt-1">{totalCreated} new · {totalWon} won</p>
        </div>
        <ChartDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fill: '#6b7280' }} 
              axisLine={false} 
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#6b7280' }} 
              axisLine={false} 
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
            <Area 
              type="monotone" 
              dataKey="created" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorCreated)" 
              strokeWidth={2}
              name="New Leads"
            />
            <Area 
              type="monotone" 
              dataKey="won" 
              stroke="#22c55e" 
              fillOpacity={1} 
              fill="url(#colorWon)" 
              strokeWidth={2}
              name="Won"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Top Performers Component with Individual Date Filter
const AgentLeaderboard = ({ data, loading, leads = [] }) => {
  const [dateRange, setDateRange] = useState('all');

  const agents = useMemo(() => {
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      const list = Array.isArray(data) ? data : [];
      return list
        .map((a) => ({
          id: a?.id ?? a?._id ?? a?.userId ?? a?.email ?? a?.name,
          name: a?.name ?? a?.fullName ?? a?.email ?? 'Unknown',
          leads: Number(a?.leadsHandled ?? a?.leadsAssigned ?? a?.leads ?? 0),
          converted: Number(a?.converted ?? a?.leadsConverted ?? a?.won ?? 0),
          rate: Number(a?.conversionRate ?? 0)
        }))
        .filter(a => a.leads > 0)
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 5);
    }
    
    const filteredLeads = filterLeadsByDateRange(leads, dateRange);
    const agentStats = {};
    filteredLeads.forEach(lead => {
      const agentId = lead.assignedTo?._id || lead.assignedTo || lead.createdBy?._id || lead.createdBy || 'unassigned';
      const agentName = lead.assignedTo?.name || lead.assignedTo?.firstName || lead.createdBy?.name || lead.createdBy?.firstName || 'Unknown';
      
      if (!agentStats[agentId]) {
        agentStats[agentId] = {
          id: agentId,
          name: agentName,
          leads: 0,
          converted: 0
        };
      }
      
      agentStats[agentId].leads++;
      
      const status = (lead.statusKey || lead.status || '').toLowerCase();
      if (status === 'won' || status === 'customer' || status === 'converted') {
        agentStats[agentId].converted++;
      }
    });
    
    return Object.values(agentStats)
      .map(agent => ({
        ...agent,
        rate: agent.leads > 0 ? Math.round((agent.converted / agent.leads) * 100) : 0
      }))
      .filter(a => a.leads > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);
  }, [data, leads, dateRange]);

  if (loading) return <SkeletonChart />;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
          <p className="text-sm text-gray-500 mt-1">By conversion rate</p>
        </div>
        <ChartDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      {agents.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-400">No performer data available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {agents.map((agent, index) => {
            const rankColors = [
              'bg-amber-100 text-amber-700',
              'bg-gray-100 text-gray-700', 
              'bg-orange-100 text-orange-700'
            ];
            const rankClass = index < 3 ? rankColors[index] : 'bg-gray-50 text-gray-500';
            const initial = agent.name.charAt(0).toUpperCase();

            return (
              <div key={agent.id || index} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${rankClass}`}>
                  {index + 1}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                  {initial}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(agent.rate, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{agent.rate.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{agent.converted}</p>
                  <p className="text-xs text-gray-500">won</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Calendar Component - Similar to Attendance Calendar
const LeadCalendar = ({ leads, loading }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const leadsByDate = useMemo(() => {
    if (!leads || !Array.isArray(leads)) return {};
    const grouped = {};
    leads.forEach(lead => {
      const date = lead.createdAt || lead.created_at || lead.date;
      if (date) {
        const dateObj = new Date(date);
        const dateKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(lead);
      }
    });
    return grouped;
  }, [leads]);

  const getLeadsForDate = (day) => {
    const dateKey = `${year}-${month}-${day}`;
    return leadsByDate[dateKey] || [];
  };

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const totalLeadsThisMonth = useMemo(() => {
    return Object.values(leadsByDate).flat().filter(lead => {
      const date = new Date(lead.createdAt || lead.created_at || lead.date);
      return date.getMonth() === month && date.getFullYear() === year;
    }).length;
  }, [leadsByDate, month, year]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="w-32 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" />
            <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" />
            <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
          {Array(35).fill(0).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-20 bg-gray-50 rounded-lg" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateLeads = getLeadsForDate(day);
    const hasLeads = dateLeads.length > 0;
    const isSelected = selectedDate === day;
    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

    days.push(
      <div
        key={day}
        className={`h-20 p-2 rounded-lg border-2 cursor-pointer transition-all overflow-hidden ${
          isSelected ? 'border-blue-500 bg-blue-50' : 
          isToday ? 'border-orange-400 bg-orange-50' :
          hasLeads ? 'border-amber-300 bg-amber-50 hover:border-amber-400' : 
          'border-gray-200 bg-white hover:border-gray-300'
        }`}
        onClick={() => setSelectedDate(isSelected ? null : day)}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-bold ${
            isToday ? 'text-orange-600' : 
            hasLeads ? 'text-amber-700' : 'text-gray-700'
          }`}>
            {day}
          </span>
          {hasLeads && (
            <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
              {dateLeads.length}
            </span>
          )}
        </div>
        
        <div className="space-y-0.5">
          {dateLeads.slice(0, 2).map((lead, idx) => (
            <div key={idx} className="text-xs truncate text-gray-600 bg-white/80 px-1 py-0.5 rounded">
              {lead.name || lead.customerName || 'Lead'}
            </div>
          ))}
          {dateLeads.length > 2 && (
            <div className="text-xs text-gray-500 px-1">
              +{dateLeads.length - 2} more
            </div>
          )}
        </div>
      </div>
    );
  }

  const selectedDateLeads = selectedDate ? getLeadsForDate(selectedDate) : [];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <select 
            value={month}
            onChange={(e) => setCurrentMonth(new Date(year, parseInt(e.target.value), 1))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {monthNames.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setCurrentMonth(new Date(parseInt(e.target.value), month, 1))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            {totalLeadsThisMonth} records this month
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-orange-500">
            {monthNames[month]} {year}
          </h3>
          <div className="flex gap-1 ml-4">
            <button
              onClick={prevMonth}
              className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="h-10 flex items-center justify-center text-sm font-bold text-gray-600 bg-gray-100 rounded-lg">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days}
      </div>

      {selectedDate && selectedDateLeads.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-bold text-gray-900 mb-3">
            Leads on {monthNames[month]} {selectedDate}, {year} ({selectedDateLeads.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedDateLeads.map((lead, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                    {(lead.name || lead.customerName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {lead.name || lead.customerName || 'Unknown Lead'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {lead.statusKey || lead.status || 'new'} • {lead.phone || lead.mobile || 'No phone'}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {fmt(lead.value || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Smart Insights Component
const SmartInsights = ({ insights, loading, kpis }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-amber-500" />
          <h3 className="text-base font-semibold text-gray-900">Smart Insights</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { 
      label: 'Pipeline Value', 
      value: fmt(kpis?.pipelineValue || 0), 
      icon: DollarSign, 
      color: 'from-emerald-500 to-teal-600'
    },
    { 
      label: 'Avg Deal Size', 
      value: fmt(kpis?.avgDealSize || 0), 
      icon: Target, 
      color: 'from-blue-500 to-indigo-600'
    },
    { 
      label: 'Response Time', 
      value: '< 2h', 
      icon: Activity, 
      color: 'from-violet-500 to-purple-600'
    },
    { 
      label: 'Active Agents', 
      value: formatNumber(kpis?.activeAgents || 0), 
      icon: UserCheck, 
      color: 'from-amber-500 to-orange-600'
    }
  ];

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} className="text-amber-500" />
        <h3 className="text-base font-semibold text-gray-900">Smart Insights</h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0`}>
              <stat.icon size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-sm font-bold text-gray-900 truncate">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Dashboard Component with Live Data, Calendar and Individual Chart Filters
const LeadAnalyticsDashboard = ({ onAddLead }) => {
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  
  const queryOpts = { 
    refetchInterval: 30000, // Refresh every 30 seconds for live data
    staleTime: 30000 
  };

  // Fetch all dashboard data
  // eslint-disable-next-line no-unused-vars
  const { data: kpisRaw, isLoading: kpisLoading, error: kpisError, refetch: refetchKpis } = useQuery({
    // eslint-disable-next-line no-unused-vars
    queryKey: ['leads-dashboard', 'kpis'],
    queryFn: async () => { const response = await leadsApi.getDashboardKpis(); return response?.data || response; },
    ...queryOpts,
  });
  const { data: funnelRaw, isLoading: funnelLoading } = useQuery({
    queryKey: ['leads-dashboard', 'funnel'],
    queryFn: async () => { const response = await leadsApi.getDashboardFunnel(); return response?.data || response; },
    ...queryOpts,
  });
  const { data: monthlyRaw, isLoading: monthlyLoading } = useQuery({
    queryKey: ['leads-dashboard', 'monthly'],
    queryFn: async () => { const response = await leadsApi.getDashboardMonthly(); return response?.data || response; },
    ...queryOpts,
  });
  const { data: performersRaw, isLoading: performersLoading } = useQuery({
    queryKey: ['leads-dashboard', 'performers'],
    queryFn: async () => {
      const response = await leadsApi.getDashboardTopPerformers();
      return response?.data || response;
    },
    ...queryOpts,
  });

  const { data: sourcesRaw, isLoading: sourcesLoading } = useQuery({
    queryKey: ['leads-dashboard', 'sources'],
    queryFn: async () => { const response = await leadsApi.getDashboardSources(); return response?.data || response; },
    ...queryOpts,
  });

  // Fetch leads for calendar and filtering
  const { data: leadsRaw, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads-dashboard', 'all-leads'],
    queryFn: async () => {
      const response = await leadsApi.getAll({ limit: 1000 });
      return response?.data || response || [];
    },
    ...queryOpts,
  });

  // Update last updated time when data refreshes
  useEffect(() => {
    if (kpisRaw) {
      setLastUpdated(new Date());
      setIsLive(true);
    }
  }, [kpisRaw]);

  const kpis = kpisRaw || {};
  const funnel = funnelRaw || {};
  const sources = sourcesRaw || {};
  const monthly = monthlyRaw || {};
  const performers = performersRaw || {};
  const leads = leadsRaw || [];

  const isLoading = kpisLoading || funnelLoading || sourcesLoading || monthlyLoading || performersLoading;
  const hasNoLeads = !kpis.totalLeads || kpis.totalLeads === 0;

  const handleRefresh = () => {
    refetchKpis();
    setLastUpdated(new Date());
  };

  // Prepare KPI data
  const kpiData = [
    {
      title: 'Total Leads',
      value: formatNumber(kpis.totalLeads || 0),
      change: kpis.deltas?.totalLeadsPct,
      trend: (kpis.deltas?.totalLeadsPct || 0) >= 0 ? 'up' : 'down',
      icon: Users,
      color: '#3b82f6',
      subtitle: 'All time leads'
    },
    {
      title: 'New Today',
      value: formatNumber(kpis.newLeads || 0),
      change: undefined,
      trend: 'up',
      icon: Sparkles,
      color: '#8b5cf6',
      subtitle: "Today's new leads"
    },
    {
      title: 'Converted',
      value: formatNumber(kpis.convertedLeads || 0),
      change: kpis.deltas?.convertedLeadsPct,
      trend: (kpis.deltas?.convertedLeadsPct || 0) >= 0 ? 'up' : 'down',
      icon: CheckCircle2,
      color: '#22c55e',
      subtitle: `${kpis.conversionRate || 0}% conversion rate`
    },
    {
      title: 'Pipeline Value',
      value: fmt(kpis.pipelineValue || 0),
      change: undefined,
      trend: 'up',
      icon: DollarSign,
      color: '#f59e0b',
      subtitle: 'Total pipeline value'
    }
  ];

  if (hasNoLeads && !isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Real-time sales analytics</p>
          </div>
          <LiveIndicator isLive={isLive} />
        </div>

        <EmptyState onAddLead={onAddLead} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LiveIndicator isLive={isLive} />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowCalendar(true)}
          >
            <CalendarIcon size={14} className="mr-2" />
            Calendar View
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw size={14} className="mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download size={14} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Calendar Modal */}
      <Modal
        open={showCalendar}
        onClose={() => setShowCalendar(false)}
        title="Lead Calendar"
        size="xl"
      >
        <LeadCalendar 
          leads={leads} 
          loading={leadsLoading}
        />
      </Modal>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading 
          ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
          : kpiData.map((kpi, index) => (
              <KPICard key={index} {...kpi} loading={false} />
            ))
        }
      </div>

      {/* Smart Insights */}
      <SmartInsights insights={[]} loading={isLoading} kpis={kpis} />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FunnelChart data={funnel.stages} loading={funnelLoading} leads={leads} />
        <SourceChart data={sources.sources} loading={sourcesLoading} leads={leads} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart data={monthly.months} loading={monthlyLoading} />
        <AgentLeaderboard data={performers.performers} loading={performersLoading} leads={leads} />
      </div>
    </div>
  );
};

export default LeadAnalyticsDashboard;
