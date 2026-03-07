import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, DollarSign, Target, Download, RefreshCw, Zap, Award, ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle, Sparkles, Funnel, PieChart as PieChartIcon, Brain, Activity, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { leadsApi } from '../../services/leadsApi';

// Format currency
const fmt = (val) => {
  if (!val || val === 0) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
  return `₹${val.toLocaleString()}`;
};

// Format number
const formatNumber = (num) => {
  if (!num) return '0';
  return num.toLocaleString();
};

// Loading skeleton
const SkeletonCard = () => (
  <div className="glass-card p-4 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)]" />
      <div className="w-12 h-4 rounded bg-[var(--bg-elevated)]" />
    </div>
    <div className="mt-3 space-y-2">
      <div className="w-20 h-3 rounded bg-[var(--bg-elevated)]" />
      <div className="w-16 h-6 rounded bg-[var(--bg-elevated)]" />
    </div>
  </div>
);

const SkeletonChart = () => (
  <div className="glass-card p-5 animate-pulse">
    <div className="w-32 h-4 rounded bg-[var(--bg-elevated)] mb-4" />
    <div className="h-48 bg-[var(--bg-elevated)] rounded" />
  </div>
);

// KPI Card Component
const KPICard = ({ title, value, change, trend, icon: Icon, color, loading, subtitle }) => {
  if (loading) return <SkeletonCard />;
  
  const TrendIcon = trend === 'up' ? ArrowUpRight : ArrowDownRight;
  const trendColor = trend === 'up' ? 'text-emerald-500' : 'text-red-500';
  const changeText = change ? `${Math.abs(change)}%` : '0%';
  
  return (
    <div className="glass-card p-4 hover:scale-[1.02] transition-transform cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}20, ${color}10)` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {change !== undefined && (
          <div className="flex items-center gap-1">
            <TrendIcon size={12} className={trendColor} />
            <span className={`text-[10px] font-bold ${trendColor}`}>{changeText}</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{title}</p>
        <p className="text-xl font-black text-[var(--text-primary)]">{value}</p>
        {subtitle && <p className="text-[9px] text-[var(--text-muted)]">{subtitle}</p>}
      </div>
    </div>
  );
};

// Funnel Chart Component
const FunnelChart = ({ data, loading }) => {
  if (loading) return <SkeletonChart />;
  if (!data || data.length === 0) return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Sales Funnel</h3>
      <p className="text-sm text-[var(--text-muted)] text-center py-10">No funnel data available</p>
    </div>
  );

  const maxCount = Math.max(...data.map(d => d.count || 0));
  const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#22c55e', '#ef4444'];
  
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Sales Funnel</h3>
        <Funnel size={16} className="text-[var(--text-muted)]" />
      </div>
      <div className="space-y-2">
        {data.map((stage, index) => {
          const percentage = maxCount > 0 ? ((stage.count || 0) / maxCount * 100) : 0;
          return (
            <div key={stage.stage || index}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[var(--text-primary)]">{stage.stage}</span>
                <span className="text-xs font-bold text-[var(--accent)]">{formatNumber(stage.count)}</span>
              </div>
              <div className="w-full bg-[var(--bg-elevated)] rounded-full h-5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${percentage}%`, background: colors[index % colors.length] }}>
                  <span className="text-[9px] font-bold text-white">{percentage.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Source Chart Component
const SourceChart = ({ data, loading }) => {
  if (loading) return <SkeletonChart />;
  if (!data || data.length === 0) return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Lead Sources</h3>
      <p className="text-sm text-[var(--text-muted)] text-center py-10">No source data available</p>
    </div>
  );

  const colors = ['#3b82f6', '#1877f2', '#4285f4', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#0077b5'];
  
  const chartData = data.map((item, index) => ({
    name: item.source || 'Unknown',
    value: item.leads || item.count || 0,
    color: colors[index % colors.length]
  }));

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Lead Sources</h3>
        <PieChartIcon size={16} className="text-[var(--text-muted)]" />
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-base)', borderRadius: '8px' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {chartData.slice(0, 4).map(s => (
          <div key={s.name} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[var(--text-muted)] truncate">{s.name}</span>
            <span className="font-medium ml-auto">{formatNumber(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Trend Chart Component
const TrendChart = ({ data, loading }) => {
  if (loading) return <SkeletonChart />;
  if (!data || data.length === 0) return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Monthly Trend</h3>
      <p className="text-sm text-[var(--text-muted)] text-center py-10">No trend data available</p>
    </div>
  );

  const chartData = data.map(item => ({
    month: item.month || '',
    generated: item.new || 0,
    converted: item.won || 0,
    lost: item.lost || 0
  }));

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Monthly Trend</h3>
        <TrendingUp size={16} className="text-emerald-500" />
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="gen" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
            <linearGradient id="conv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} stroke="var(--border-subtle)" />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} stroke="var(--border-subtle)" />
          <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-base)', borderRadius: '8px' }} />
          <Area type="monotone" dataKey="generated" stroke="#3b82f6" fill="url(#gen)" strokeWidth={2} name="New Leads" />
          <Area type="monotone" dataKey="converted" stroke="#22c55e" fill="url(#conv)" strokeWidth={2} name="Converted" />
          <Line type="monotone" dataKey="lost" stroke="#ef4444" strokeWidth={2} dot={false} name="Lost" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Agent Leaderboard Component
const AgentLeaderboard = ({ data, loading }) => {
  if (loading) return <SkeletonChart />;
  
  const agents = data && data.length > 0 ? data : [
    { id: '1', name: 'No Data Available', leadsAssigned: 0, leadsConverted: 0, conversionRate: 0, rank: 1 }
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Top Performers</h3>
        <Award size={16} className="text-amber-500" />
      </div>
      <div className="space-y-3">
        {agents.map((agent, index) => (
          <div key={agent.id || index} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-elevated)]">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-200 text-slate-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
              {agent.rank || index + 1}
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-xs font-bold">
              {(agent.name || '?')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">{agent.name || 'Unknown'}</p>
              <p className="text-[9px] text-[var(--text-muted)]">{formatNumber(agent.leadsConverted)}/{formatNumber(agent.leadsAssigned)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-[var(--accent)]">{(agent.conversionRate || 0).toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Smart Insights Component
const SmartInsights = ({ insights, loading }) => {
  if (loading) return (
    <div className="glass-card p-5 animate-pulse">
      <div className="w-32 h-4 rounded bg-[var(--bg-elevated)] mb-3" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded bg-[var(--bg-elevated)]" />)}
      </div>
    </div>
  );

  const defaultInsights = [
    { type: 'positive', message: 'Dashboard loaded successfully' },
    { type: 'neutral', message: 'Real-time data connection active' }
  ];

  const displayInsights = insights && insights.length > 0 ? insights : defaultInsights;

  return (
    <div className="glass-card p-5 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-rose-500/5 border-amber-500/20">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-amber-500" />
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Smart Insights</h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {displayInsights.map((insight, i) => (
          <div key={i} className={`p-3 rounded-lg ${insight.type === 'positive' ? 'bg-emerald-500/10 border border-emerald-500/20' : insight.type === 'negative' ? 'bg-red-500/10 border border-red-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
            <p className="text-[10px] text-[var(--text-primary)] leading-tight">{insight.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Empty State
const EmptyState = ({ onAddLead }) => (
  <div className="glass-card p-8 flex flex-col items-center justify-center text-center">
    <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-base)] flex items-center justify-center mb-4">
      <Users size={24} className="text-[var(--text-muted)]" />
    </div>
    <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">No Leads Available</h3>
    <p className="text-xs text-[var(--text-muted)] mb-4 max-w-sm">
      Import or add leads to see analytics. Once you have leads, this dashboard will show your sales funnel, pipeline value, and conversion metrics.
    </p>
    {onAddLead && (
      <Button variant="outline" onClick={onAddLead}>
        <Zap size={14} className="mr-1" /> Add Lead
      </Button>
    )}
  </div>
);

// Error State
const ErrorState = ({ onRetry }) => (
  <div className="glass-card p-8 flex flex-col items-center justify-center text-center">
    <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
      <AlertCircle size={24} className="text-red-500" />
    </div>
    <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Failed to Load Data</h3>
    <p className="text-xs text-[var(--text-muted)] mb-4">
      There was an error loading the dashboard data. Please try again.
    </p>
    {onRetry && (
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw size={14} className="mr-1" /> Retry
      </Button>
    )}
  </div>
);

// Main Dashboard Component
const LeadAnalyticsDashboard = ({ onAddLead }) => {
  // Fetch all dashboard data
  const { data: overviewRaw, isLoading: overviewLoading, error: overviewError, refetch: refetchOverview } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: async () => {
      const response = await leadsApi.getDashboardOverview();
      console.log('[DEBUG] Raw API response:', response);
      // Handle both wrapped and unwrapped responses
      const data = response.data || response;
      console.log('[DEBUG] Processed data:', data);
      return data;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const { data: funnelRaw, isLoading: funnelLoading } = useQuery({
    queryKey: ['dashboard', 'funnel'],
    queryFn: async () => {
      const response = await leadsApi.getDashboardFunnel();
      return response.data || response;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const { data: sourceRaw, isLoading: sourceLoading } = useQuery({
    queryKey: ['dashboard', 'source'],
    queryFn: async () => {
      const response = await leadsApi.getDashboardSource();
      return response.data || response;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const { data: trendRaw, isLoading: trendLoading } = useQuery({
    queryKey: ['dashboard', 'trend'],
    queryFn: async () => {
      const response = await leadsApi.getDashboardTrend();
      return response.data || response;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Extract data from responses
  const overview = overviewRaw;
  const funnel = funnelRaw;
  const source = sourceRaw;
  const trend = trendRaw;

  const isLoading = overviewLoading || funnelLoading || sourceLoading || trendLoading;
  const hasError = overviewError;
  const hasNoLeads = !overview || !overview.totalLeads || overview.totalLeads === 0;
  
  console.log('[DEBUG] overview:', overview);
  console.log('[DEBUG] hasNoLeads:', hasNoLeads, 'isLoading:', isLoading, 'totalLeads:', overview?.totalLeads);

  const handleRefresh = () => {
    refetchOverview();
  };

  // Generate insights from real data
  const generateInsights = () => {
    const insights = [];
    
    if (overview) {
      if (overview.conversionRate > 20) {
        insights.push({ type: 'positive', message: `Conversion rate is ${overview.conversionRate.toFixed(1)}% - Excellent!` });
      } else if (overview.conversionRate < 10) {
        insights.push({ type: 'negative', message: `Conversion rate is ${overview.conversionRate.toFixed(1)}% - Needs attention` });
      }
      
      if (overview.newLeadsThisMonth > 0) {
        insights.push({ type: 'positive', message: `${overview.newLeadsThisMonth} new leads this month` });
      }
      
      if (overview.pipelineValue > 0) {
        insights.push({ type: 'neutral', message: `${fmt(overview.pipelineValue)} pipeline value` });
      }
    }
    
    if (funnel?.stages) {
      const wonStage = funnel.stages.find(s => s.stage === 'Closed Won');
      if (wonStage?.count > 0) {
        insights.push({ type: 'positive', message: `${wonStage.count} deals closed won` });
      }
    }
    
    if (insights.length === 0) {
      insights.push({ type: 'neutral', message: 'Dashboard connected to real-time data' });
    }
    
    return insights.slice(0, 4);
  };

  if (hasError && !overview) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-[var(--text-primary)]">Lead Analytics Dashboard</h1>
        </div>
        <ErrorState onRetry={handleRefresh} />
      </div>
    );
  }

  if (hasNoLeads && !isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-[var(--text-primary)]">Lead Analytics Dashboard</h1>
            <p className="text-xs text-[var(--text-muted)]">Real-time solar sales performance</p>
          </div>
        </div>
        <EmptyState onAddLead={onAddLead} />
      </div>
    );
  }

  // Prepare KPI data - only 4 cards
  const kpiData = overview ? [
    { title: 'Total Leads', value: formatNumber(overview.totalLeads), change: overview.totalLeadsChange, trend: overview.totalLeadsTrend || 'up', icon: Users, color: '#3b82f6', subtitle: 'All leads' },
    { title: 'Dead Leads', value: formatNumber(overview.lostLeads), change: overview.lostChange, trend: 'down', icon: XCircle, color: '#ef4444', subtitle: 'Closed lost' },
    { title: 'Converted', value: formatNumber(overview.convertedLeads), change: overview.conversionRate, trend: 'up', icon: CheckCircle2, color: '#22c55e', subtitle: `${overview.conversionRate?.toFixed(1) || 0}% rate` },
    { title: 'Total Value', value: fmt(overview.pipelineValue), change: overview.pipelineChange, trend: overview.pipelineTrend || 'up', icon: DollarSign, color: '#8b5cf6', subtitle: 'Pipeline' }
  ] : [];

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[var(--text-primary)]">Lead Analytics Dashboard</h1>
          <p className="text-xs text-[var(--text-muted)]">Real-time solar sales performance</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw size={12} className="mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download size={12} className="mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* KPI Cards - 4 cards in one row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
        ) : (
          kpiData.map(kpi => <KPICard key={kpi.title} {...kpi} loading={false} />)
        )}
      </div>

      {/* Insights */}
      <SmartInsights insights={generateInsights()} loading={overviewLoading} />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FunnelChart data={funnel?.stages} loading={funnelLoading} />
        <SourceChart data={source?.sources} loading={sourceLoading} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendChart data={trend?.months} loading={trendLoading} />
        <AgentLeaderboard data={trend?.agents} loading={trendLoading} />
      </div>
    </div>
  );
};

export default LeadAnalyticsDashboard;
