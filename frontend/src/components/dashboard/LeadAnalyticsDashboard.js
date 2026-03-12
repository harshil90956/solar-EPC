import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, DollarSign, Download, RefreshCw, Award, ArrowUpRight, ArrowDownRight, CheckCircle2, Sparkles, Funnel, PieChart as PieChartIcon, AlertCircle, Layers, Zap } from 'lucide-react';
import { Button } from '../ui/Button';
import Modal from '../ui/Modal';
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

const titleCase = (s) => {
  if (!s) return '';
  return String(s)
    .split(/\s|_/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
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
const KPICard = ({ title, value, change, trend, icon: Icon, color, loading, subtitle, sparkline, onClick }) => {
  if (loading) return <SkeletonCard />;
  
  const TrendIcon = trend === 'up' ? ArrowUpRight : ArrowDownRight;
  const trendColor = trend === 'up' ? 'text-emerald-500' : 'text-red-500';
  const changeText = change ? `${Math.abs(change)}%` : '0%';
  const cardStyle = {
    background: `linear-gradient(135deg, ${color}14, ${color}06)`,
    borderColor: `${color}30`,
  };
  
  return (
    <div
      className="glass-card p-4 hover:scale-[1.02] transition-transform cursor-pointer min-h-[98px]"
      style={cardStyle}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: `linear-gradient(135deg, ${color}24, ${color}12)` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div className="flex flex-col items-end gap-1 min-w-[84px]">
          <div className="h-4 flex items-center justify-end">
            {change !== undefined ? (
              <div className="flex items-center gap-1">
                <TrendIcon size={12} className={trendColor} />
                <span className={`text-[10px] font-bold ${trendColor}`}>{changeText}</span>
              </div>
            ) : (
              <span className="text-[10px] opacity-0">0%</span>
            )}
          </div>
          <div className="w-20 h-8">
            {Array.isArray(sparkline) && sparkline.length > 1 ? (
              <AreaChart width={80} height={32} data={sparkline}>
                <defs>
                  <linearGradient id={`kpi-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={color} fill={`url(#kpi-${title})`} strokeWidth={2} dot={false} />
              </AreaChart>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{title}</p>
        <p className="text-xl font-black text-[var(--text-primary)] leading-tight">{value}</p>
        <div className="h-3">
          {subtitle ? <p className="text-[9px] text-[var(--text-muted)]">{subtitle}</p> : null}
        </div>
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
          const prev = index > 0 ? (data[index - 1]?.count || 0) : null;
          const conv = prev && prev > 0 ? Math.round(((stage.count || 0) / prev) * 100) : null;
          return (
            <div key={stage.stage || index}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate">{titleCase(stage.stage)}</span>
                  {conv !== null && (
                    <span className="text-[10px] text-[var(--text-muted)]">{conv}%</span>
                  )}
                </div>
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

  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#64748b'];
  
  const chartData = data.map((item, index) => ({
    name: item.source || 'Unknown',
    value: item.leads || item.count || 0,
    pct: item.pct,
    color: colors[index % colors.length],
  }));

  const total = chartData.reduce((sum, d) => sum + (d.value || 0), 0);

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
      <div className="space-y-2 mt-3">
        {chartData.map((s) => {
          const pct = total > 0 ? Math.round(((s.value || 0) / total) * 100) : 0;
          return (
            <div key={s.name} className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[var(--text-muted)] truncate">{s.name}</span>
              <span className="ml-auto text-[var(--text-muted)]">{pct}%</span>
              <span className="font-medium">{formatNumber(s.value)}</span>
            </div>
          );
        })}
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
    created: item.created || 0,
    won: item.won || 0,
  }));

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Monthly Trend</h3>
        <TrendingUp size={16} className="text-emerald-500" />
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <defs>
            <linearGradient id="created" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} stroke="var(--border-subtle)" />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} stroke="var(--border-subtle)" />
          <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-base)', borderRadius: '8px' }} />
          <Area type="monotone" dataKey="created" stroke="#3b82f6" fill="url(#created)" strokeWidth={2} name="Created" />
          <Line type="monotone" dataKey="won" stroke="#22c55e" strokeWidth={2} dot={false} name="Won" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Agent Leaderboard Component
const AgentLeaderboard = ({ data, loading }) => {
  const agents = useMemo(() => {
    const list = Array.isArray(data) ? data : [];

    const normalized = list
      .map((a) => {
        const leadsHandled = Number(a?.leadsHandled ?? a?.leadsAssigned ?? a?.leads ?? 0);
        const converted = Number(a?.converted ?? a?.leadsConverted ?? a?.won ?? 0);
        const conversionRate = Number(a?.conversionRate ?? (leadsHandled > 0 ? (converted / leadsHandled) * 100 : 0));
        return {
          id: a?.id ?? a?._id ?? a?.userId ?? a?.email ?? a?.name,
          name: a?.name ?? a?.fullName ?? a?.email ?? '',
          leadsHandled,
          converted,
          conversionRate,
        };
      })
      .filter((a) => {
        const name = String(a?.name || '').trim().toLowerCase();
        const isPlaceholderName = name === '' || name === 'unknown' || name === 'no data';
        const hasStats = (a.leadsHandled || 0) > 0 || (a.converted || 0) > 0;
        return hasStats && !isPlaceholderName;
      })
      .sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0));

    return normalized.slice(0, 5);
  }, [data]);

  if (loading) return <SkeletonChart />;

  if (!agents || agents.length === 0) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Top Performers</h3>
          <Award size={16} className="text-amber-500" />
        </div>
        <div className="flex items-center justify-center min-h-[160px]">
          <p className="text-xs text-[var(--text-muted)]">No performer data available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Top Performers</h3>
        <Award size={16} className="text-amber-500" />
      </div>
      <div className="space-y-3">
        {agents.map((agent, index) => {
          const rankBg = index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-200 text-slate-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]';
          const initial = String(agent.name || '?').trim().slice(0, 1).toUpperCase();
          const rate = Number.isFinite(agent.conversionRate) ? agent.conversionRate : 0;
          return (
            <div key={`${agent.id || 'agent'}-${index}`} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-elevated)]">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rankBg}`}>
                {index + 1}
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-xs font-bold">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{agent.name || 'Unknown'}</p>
                <p className="text-[9px] text-[var(--text-muted)]">{formatNumber(agent.converted)}/{formatNumber(agent.leadsHandled)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-[var(--accent)]">{rate.toFixed(0)}%</p>
              </div>
            </div>
          );
        })}
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
const LeadAnalyticsDashboard = ({ onAddLead, onNavigate }) => {
  const queryOpts = { refetchInterval: 30000, staleTime: 30000 };
  const [kpiDialogOpen, setKpiDialogOpen] = useState(false);
  const [kpiDialogConfig, setKpiDialogConfig] = useState({ title: 'Leads', statusKey: undefined, statusKeys: undefined, mode: 'all' });

  const { data: kpisRaw, isLoading: kpisLoading, error: kpisError, refetch: refetchKpis } = useQuery({
    queryKey: ['leads-dashboard', 'kpis'],
    queryFn: async () => {
      const response = await leadsApi.getDashboardKpis();
      return response?.data || response;
    },
    ...queryOpts,
  });

  const { data: funnelRaw, isLoading: funnelLoading } = useQuery({
    queryKey: ['leads-dashboard', 'funnel'],
    queryFn: async () => {
      const response = await leadsApi.getDashboardFunnel();
      return response?.data || response;
    },
    ...queryOpts,
  });

  const { data: sourcesRaw, isLoading: sourcesLoading } = useQuery({
    queryKey: ['leads-dashboard', 'sources'],
    queryFn: async () => {
      const response = await leadsApi.getDashboardSources();
      return response?.data || response;
    },
    ...queryOpts,
  });

  const { data: monthlyRaw, isLoading: monthlyLoading } = useQuery({
    queryKey: ['leads-dashboard', 'monthly'],
    queryFn: async () => {
      const response = await leadsApi.getDashboardMonthly();
      return response?.data || response;
    },
    ...queryOpts,
  });

  const { data: performersRaw, isLoading: performersLoading } = useQuery({
    queryKey: ['leads-dashboard', 'top-performers'],
    queryFn: async () => {
      const response = await leadsApi.getDashboardTopPerformers();
      return response?.data || response;
    },
    ...queryOpts,
  });

  const { data: kpiLeadsRaw, isLoading: kpiLeadsLoading, error: kpiLeadsError } = useQuery({
    queryKey: ['leads-dashboard', 'kpi-leads', kpiDialogConfig?.mode || 'all', kpiDialogConfig?.statusKey || 'all', kpiDialogConfig?.statusKeys || ''],
    enabled: kpiDialogOpen,
    queryFn: async () => {
      const params = { page: 1, limit: 50 };
      if (kpiDialogConfig?.mode === 'today') {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        params.startDate = todayStart.toISOString();
        params.endDate = tomorrowStart.toISOString();
      } else if (kpiDialogConfig?.statusKeys) {
        params.statusKeys = kpiDialogConfig.statusKeys;
      } else if (kpiDialogConfig?.statusKey) {
        params.statusKey = kpiDialogConfig.statusKey;
      }
      const result = await leadsApi.getAll(params);
      return result;
    },
    staleTime: 30000,
  });

  const kpis = kpisRaw;
  const funnel = funnelRaw;
  const sources = sourcesRaw;
  const monthly = monthlyRaw;
  const performers = performersRaw;

  const isLoading = kpisLoading || funnelLoading || sourcesLoading || monthlyLoading || performersLoading;
  const hasError = kpisError;
  const hasNoLeads = !kpis || !kpis.totalLeads || kpis.totalLeads === 0;

  const handleRefresh = () => {
    refetchKpis();
  };

  const openKpiDialog = (title, statusKey) => {
    setKpiDialogConfig({ title, statusKey, statusKeys: undefined, mode: statusKey ? 'status' : 'all' });
    setKpiDialogOpen(true);
  };

  const openKpiDialogMultiStatus = (title, statusKeys) => {
    setKpiDialogConfig({ title, statusKey: undefined, statusKeys, mode: 'status' });
    setKpiDialogOpen(true);
  };

  const openKpiDialogToday = (title) => {
    setKpiDialogConfig({ title, statusKey: undefined, statusKeys: undefined, mode: 'today' });
    setKpiDialogOpen(true);
  };

  const kpiLeadsNormalized = useMemo(() => {
    const raw = kpiLeadsRaw;
    if (!raw) return { rows: [], total: undefined };
    if (Array.isArray(raw)) return { rows: raw, total: raw.length };
    const totalRaw = raw?.total ?? raw?.data?.total;
    const total = typeof totalRaw === 'number' ? totalRaw : (totalRaw !== undefined ? Number(totalRaw) : undefined);
    const rows = Array.isArray(raw?.data)
      ? raw.data
      : (Array.isArray(raw?.data?.data) ? raw.data.data : (raw?.data?.data || raw?.data || []));
    return { rows: Array.isArray(rows) ? rows : [], total };
  }, [kpiLeadsRaw]);

  const kpiLeads = kpiLeadsNormalized.rows;
  const kpiLeadsTotal = kpiLeadsNormalized.total;

  const kpiDialogDescription = useMemo(() => {
    const limit = 50;
    const total = typeof kpiLeadsTotal === 'number' && !Number.isNaN(kpiLeadsTotal) ? kpiLeadsTotal : undefined;
    const rangeText = total !== undefined ? `Showing top ${Math.min(limit, total)} of ${total} leads` : `Showing top ${limit} leads`;
    if (kpiDialogConfig?.mode === 'today') {
      return `Today • ${rangeText}`;
    }
    if (kpiDialogConfig?.mode === 'status' && kpiDialogConfig?.statusKey) {
      return `${titleCase(kpiDialogConfig.statusKey)} • ${rangeText}`;
    }
    return `All • ${rangeText}`;
  }, [kpiDialogConfig?.mode, kpiDialogConfig?.statusKey, kpiLeadsTotal]);

  const monthlySpark = useMemo(() => {
    const m = monthly?.months || [];
    return (Array.isArray(m) ? m : []).map((x) => ({ v: Number(x.created || 0) }));
  }, [monthly]);

  const wonSpark = useMemo(() => {
    const m = monthly?.months || [];
    return (Array.isArray(m) ? m : []).map((x) => ({ v: Number(x.won || 0) }));
  }, [monthly]);

  const generateInsights = useMemo(() => {
    const insights = [];

    const conv = Number(kpis?.conversionRate || 0);
    if (conv > 0 && conv < 5) {
      insights.push({ type: 'negative', message: `Conversion rate is low (${conv}%). Review follow-ups.` });
    } else if (conv >= 15) {
      insights.push({ type: 'positive', message: `Strong conversion rate (${conv}%). Keep momentum.` });
    }

    const stale = Number(kpis?.staleLeads7d || 0);
    if (stale > 0) {
      insights.push({ type: 'negative', message: `${formatNumber(stale)} pipeline leads not contacted in 7 days` });
    }

    const thisMonthCreated = Number(monthly?.months?.[monthly?.months?.length - 1]?.created || 0);
    if (thisMonthCreated > 0) {
      insights.push({ type: 'positive', message: `${formatNumber(thisMonthCreated)} new leads this month` });
    }

    const pv = Number(kpis?.pipelineValue || 0);
    if (pv > 0) {
      insights.push({ type: 'neutral', message: `${fmt(pv)} pipeline value` });
    }

    return insights.slice(0, 4);
  }, [kpis, monthly]);

  if (hasError && !kpis) {
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
  const kpiData = kpis ? [
    {
      title: 'Total Leads',
      value: formatNumber(kpis.totalLeads),
      change: kpis.deltas?.totalLeadsPct,
      trend: (kpis.deltas?.totalLeadsPct || 0) >= 0 ? 'up' : 'down',
      icon: Users,
      color: '#3b82f6',
      subtitle: 'All leads',
      sparkline: monthlySpark,
      onClick: () => openKpiDialog('All Leads', undefined),
    },
    {
      title: 'New Leads',
      value: formatNumber(kpis.newLeads),
      change: undefined,
      trend: 'up',
      icon: Sparkles,
      color: '#8b5cf6',
      subtitle: 'Today',
      sparkline: monthlySpark,
      onClick: () => openKpiDialogToday("Today's Leads"),
    },
    {
      title: 'Converted / Won',
      value: formatNumber(kpis.convertedLeads),
      change: kpis.deltas?.convertedLeadsPct,
      trend: (kpis.deltas?.convertedLeadsPct || 0) >= 0 ? 'up' : 'down',
      icon: CheckCircle2,
      color: '#22c55e',
      subtitle: `${formatNumber(kpis.conversionRate)}% conversion`,
      sparkline: wonSpark,
      onClick: () => openKpiDialogMultiStatus('Won / Converted', 'won,customer'),
    },
    {
      title: 'Lost Leads',
      value: formatNumber(kpis.lostLeads),
      change: undefined,
      trend: 'down',
      icon: AlertCircle,
      color: '#ef4444',
      subtitle: 'Status: Lost',
      sparkline: monthlySpark,
      onClick: () => openKpiDialog('Lost Leads', 'lost'),
    },
  ] : [];

  return (
    <div className="space-y-4 p-4">
      <Modal
        open={kpiDialogOpen}
        onClose={() => setKpiDialogOpen(false)}
        title={kpiDialogConfig?.title || 'Leads'}
        description={kpiDialogDescription}
        size="xl"
        footer={
          <Button variant="outline" size="sm" onClick={() => setKpiDialogOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-3">
          {kpiLeadsError && (
            <div className="text-sm text-red-500">
              {kpiLeadsError?.message || 'Failed to load leads'}
            </div>
          )}
          {kpiLeadsLoading ? (
            <div className="text-sm text-[var(--text-muted)]">Loading...</div>
          ) : (
            <div className="overflow-auto rounded-lg border border-[var(--border-base)]">
              <table className="min-w-full text-xs">
                <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  <tr>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Phone</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-right p-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {kpiLeads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-[var(--text-muted)]">No leads found</td>
                    </tr>
                  ) : (
                    kpiLeads.map((l, idx) => (
                      <tr key={`${l?._id || l?.leadId || 'lead'}-${idx}`} className="border-t border-[var(--border-base)]">
                        <td className="p-2 font-semibold text-[var(--text-primary)]">
                          {l?.name || l?.customerName || l?.leadName || '—'}
                        </td>
                        <td className="p-2 text-[var(--text-muted)]">{l?.phone || l?.mobile || '—'}</td>
                        <td className="p-2 text-[var(--text-muted)]">{l?.email || '—'}</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                            {titleCase(l?.statusKey || l?.status || 'unknown')}
                          </span>
                        </td>
                        <td className="p-2 text-right text-[var(--text-muted)]">{fmt(Number(l?.value || 0))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

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
      <SmartInsights insights={generateInsights} loading={kpisLoading} />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FunnelChart data={funnel?.stages} loading={funnelLoading} />
        <SourceChart data={sources?.sources} loading={sourcesLoading} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendChart data={monthly?.months} loading={monthlyLoading} />
        <AgentLeaderboard data={performers?.performers} loading={performersLoading} />
      </div>
    </div>
  );
};

export default LeadAnalyticsDashboard;
