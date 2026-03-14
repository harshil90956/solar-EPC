import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, DollarSign, Download, RefreshCw, Award, ArrowUpRight, ArrowDownRight, CheckCircle2, Sparkles, Funnel, PieChart as PieChartIcon, AlertCircle, Layers, Zap, Target, UserCheck, TrendingDown, Activity } from 'lucide-react';
import { Button } from '../ui/Button';
import { leadsApi } from '../../services/leadsApi';

const fmt = (val) => {
  if (!val || val === 0) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
  return `₹${val.toLocaleString()}`;
};

const formatNumber = (num) => {
  if (!num) return '0';
  return num.toLocaleString();
};

const titleCase = (s) => {
  if (!s) return '';
  return String(s).split(/\s|_/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

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

const SkeletonCard = () => (
  <div className="glass-card p-5 animate-pulse rounded-2xl">
    <div className="flex items-start justify-between">
      <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)]" />
      <div className="w-14 h-5 rounded bg-[var(--bg-elevated)]" />
    </div>
    <div className="mt-4 space-y-2">
      <div className="w-24 h-3 rounded bg-[var(--bg-elevated)]" />
      <div className="w-20 h-7 rounded bg-[var(--bg-elevated)]" />
    </div>
  </div>
);

const SkeletonChart = () => (
  <div className="glass-card p-6 animate-pulse rounded-2xl">
    <div className="w-40 h-5 rounded bg-[var(--bg-elevated)] mb-5" />
    <div className="h-56 bg-[var(--bg-elevated)] rounded-xl" />
  </div>
);

const KPICard = ({ title, value, change, trend, icon: Icon, color, loading, subtitle, sparkline, onClick }) => {
  if (loading) return <SkeletonCard />;
  
  const TrendIcon = trend === 'up' ? ArrowUpRight : ArrowDownRight;
  const trendColor = trend === 'up' ? 'text-emerald-500' : 'text-red-500';
  const trendBg = trend === 'up' ? 'bg-emerald-500/10' : 'bg-red-500/10';
  const changeText = change ? `${Math.abs(change)}%` : null;
  
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
      style={{ 
        background: `linear-gradient(135deg, ${color}08, ${color}04)`,
        border: `1px solid ${color}20`
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      {/* Background glow effect */}
      <div 
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-40"
        style={{ background: color }}
      />
      
      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      
      <div className="relative flex items-start justify-between gap-3">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
        >
          <Icon size={22} className="text-white" />
        </div>
        <div className="flex flex-col items-end gap-1">
          {changeText && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${trendBg}`}>
              <TrendIcon size={12} className={trendColor} />
              <span className={`text-[10px] font-bold ${trendColor}`}>{changeText}</span>
            </div>
          )}
          <div className="w-24 h-10 mt-1">
            {Array.isArray(sparkline) && sparkline.length > 1 ? (
              <AreaChart width={96} height={40} data={sparkline}>
                <defs>
                  <linearGradient id={`kpi-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={color} fill={`url(#kpi-${title})`} strokeWidth={2} dot={false} />
              </AreaChart>
            ) : null}
          </div>
        </div>
      </div>
      <div className="relative mt-4">
        <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-medium">{title}</p>
        <p className="text-2xl font-black text-[var(--text-primary)] leading-tight mt-1">{value}</p>
        {subtitle && <p className="text-[10px] text-[var(--text-muted)] mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

const SolarPipeline = ({ data, loading }) => {
  if (loading) return <SkeletonChart />;
  
  // Default stages if no data
  const defaultStages = [
    { stage: 'new', count: 0, value: 0 },
    { stage: 'contacted', count: 0, value: 0 },
    { stage: 'qualified', count: 0, value: 0 },
    { stage: 'proposal', count: 0, value: 0 },
    { stage: 'negotiation', count: 0, value: 0 },
    { stage: 'won', count: 0, value: 0 },
    { stage: 'lost', count: 0, value: 0 }
  ];
  
  // Merge with actual data
  const mergedData = defaultStages.map(defaultStage => {
    const actualStage = data?.find(d => d.stage?.toLowerCase() === defaultStage.stage);
    return actualStage || defaultStage;
  }).filter(d => d.count > 0 || data?.length === 0); // Show all if no data, else show only with counts

  const displayData = (data && data.length > 0) ? mergedData.filter(d => d.count > 0) : defaultStages;
  const maxCount = Math.max(...displayData.map(d => d.count || 0), 1);
  const totalValue = displayData.reduce((sum, d) => sum + (d.value || 0), 0);
  const totalLeads = displayData.reduce((sum, d) => sum + (d.count || 0), 0);

  return (
    <div className="glass-card p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Layers size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Solar Pipeline</h3>
            <p className="text-[10px] text-[var(--text-muted)]">{totalLeads} leads · {fmt(totalValue)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalLeads > 0 && (
            <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-500">
              {displayData.length} stages active
            </span>
          )}
        </div>
      </div>

      {totalLeads === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-3">
            <Funnel size={24} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">No leads in pipeline yet</p>
          <p className="text-[10px] text-[var(--text-faint)] mt-1">Add leads to see pipeline breakdown</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayData.map((stage, index) => {
            const percentage = ((stage.count || 0) / maxCount) * 100;
            const stageKey = stage.stage?.toLowerCase() || 'new';
            const colors = STAGE_COLORS[stageKey] || { color: '#6B7280' };
            
            return (
              <div key={`pipeline-${index}`} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.color }} />
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{titleCase(stage.stage)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--text-muted)] font-medium">{fmt(stage.value || 0)}</span>
                    <span className="text-xs font-bold text-[var(--text-primary)] w-6 text-right">{formatNumber(stage.count)}</span>
                  </div>
                </div>
                <div className="w-full bg-[var(--bg-elevated)] rounded-full h-6 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2 relative overflow-hidden"
                    style={{ 
                      width: `${Math.max(percentage, percentage > 0 ? 4 : 0)}%`,
                      background: `linear-gradient(90deg, ${colors.color}, ${colors.color}dd)`
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    {percentage > 15 && (
                      <span className="text-[10px] font-bold text-white relative z-10">{percentage.toFixed(0)}%</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const LeadConversionChart = ({ data, loading }) => {
  if (loading) return <SkeletonChart />;
  
  const defaultData = [
    { name: 'Won', value: 0, color: '#22C55E', icon: CheckCircle2 },
    { name: 'In Progress', value: 0, color: '#3B82F6', icon: Layers },
    { name: 'Lost', value: 0, color: '#EF4444', icon: TrendingDown },
    { name: 'New', value: 0, color: '#6B7280', icon: Users }
  ];

  if (data && data.length > 0) {
    data.forEach(stage => {
      const stageName = stage.stage?.toLowerCase() || '';
      const count = stage.count || 0;
      if (stageName === 'won' || stageName === 'customer') defaultData[0].value += count;
      else if (stageName === 'lost') defaultData[2].value += count;
      else if (stageName === 'new') defaultData[3].value += count;
      else defaultData[1].value += count;
    });
  }

  const total = defaultData.reduce((sum, d) => sum + d.value, 0);
  const wonRate = total > 0 ? ((defaultData[0].value / total) * 100).toFixed(1) : 0;
  const hasData = total > 0;

  return (
    <div className="glass-card p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <PieChartIcon size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Lead Conversion</h3>
            <p className="text-[10px] text-[var(--text-muted)]">{hasData ? `${total} total leads` : 'No leads yet'}</p>
          </div>
        </div>
        {hasData && (
          <div className="text-right">
            <span className="text-2xl font-black text-emerald-500">{wonRate}%</span>
            <p className="text-[9px] text-[var(--text-muted)]">Win Rate</p>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-3">
            <PieChartIcon size={24} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">No conversion data available</p>
          <p className="text-[10px] text-[var(--text-faint)] mt-1">Add leads to track conversion</p>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative w-36 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={defaultData.filter(d => d.value > 0)} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={45} 
                  outerRadius={65} 
                  paddingAngle={3} 
                  dataKey="value"
                  stroke="none"
                  animationDuration={800}
                >
                  {defaultData.filter(d => d.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-[var(--text-primary)]">{defaultData[0].value}</span>
              <span className="text-[9px] text-[var(--text-muted)]">Won</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            {defaultData.map((item, index) => {
              const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
              const Icon = item.icon;
              return (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-elevated)]/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                      <Icon size={14} style={{ color: item.color }} />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-primary)] w-8 text-right">{item.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const MonthlyTrendChart = ({ data, loading }) => {
  if (loading) return <SkeletonChart />;
  
  const hasData = data && data.length > 0 && data.some(d => (d.created || 0) > 0 || (d.won || 0) > 0);
  
  if (!hasData) {
    return (
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Monthly Trend</h3>
            <p className="text-[10px] text-[var(--text-muted)]">Last 12 months</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-3">
            <TrendingUp size={24} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">No trend data available</p>
          <p className="text-[10px] text-[var(--text-faint)] mt-1">Add leads over time to see trends</p>
        </div>
      </div>
    );
  }

  const chartData = data.map(item => ({ month: item.month || '', created: item.created || 0, won: item.won || 0, value: item.value || 0 }));
  const totalCreated = chartData.reduce((sum, d) => sum + d.created, 0);
  const totalWon = chartData.reduce((sum, d) => sum + d.won, 0);

  return (
    <div className="glass-card p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Monthly Trend</h3>
            <p className="text-[10px] text-[var(--text-muted)]">{totalCreated} new · {totalWon} won</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-[var(--text-muted)]">New</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[var(--text-muted)]">Won</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="trendNew" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
            <linearGradient id="trendWon" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/><stop offset="95%" stopColor="#22C55E" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} stroke="var(--border-subtle)" axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} stroke="var(--border-subtle)" axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-base)', borderRadius: '12px', fontSize: '12px' }} />
          <Area type="monotone" dataKey="created" stroke="#3B82F6" fill="url(#trendNew)" strokeWidth={2} name="New Leads" animationDuration={1000} />
          <Area type="monotone" dataKey="won" stroke="#22C55E" fill="url(#trendWon)" strokeWidth={2} name="Won" animationDuration={1000} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const TopPerformers = ({ data, loading }) => {
  const agents = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    const normalized = list.map((a) => {
      const leadsHandled = Number(a?.leadsHandled ?? a?.leadsAssigned ?? a?.leads ?? 0);
      const converted = Number(a?.converted ?? a?.leadsConverted ?? a?.won ?? 0);
      const conversionRate = Number(a?.conversionRate ?? (leadsHandled > 0 ? (converted / leadsHandled) * 100 : 0));
      return { id: a?.id ?? a?._id ?? a?.userId ?? a?.email ?? a?.name, name: a?.name ?? a?.fullName ?? a?.email ?? '', leadsHandled, converted, conversionRate };
    }).filter((a) => {
      const name = String(a?.name || '').trim().toLowerCase();
      const isPlaceholderName = name === '' || name === 'unknown' || name === 'no data';
      const hasStats = (a.leadsHandled || 0) > 0 || (a.converted || 0) > 0;
      return hasStats && !isPlaceholderName;
    }).sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0));
    return normalized.slice(0, 5);
  }, [data]);

  if (loading) return <SkeletonChart />;

  const hasAgents = agents && agents.length > 0;

  return (
    <div className="glass-card p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Award size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Top Performers</h3>
            <p className="text-[10px] text-[var(--text-muted)]">{hasAgents ? `${agents.length} agents` : 'No data'}</p>
          </div>
        </div>
        {hasAgents && (
          <div className="text-right">
            <span className="text-lg font-bold text-amber-500">#{agents.length}</span>
            <p className="text-[9px] text-[var(--text-muted)]">Ranked</p>
          </div>
        )}
      </div>

      {!hasAgents ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-3">
            <UserCheck size={24} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">No performers yet</p>
          <p className="text-[10px] text-[var(--text-faint)] mt-1">Assign leads to agents to see rankings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent, index) => {
            const initial = String(agent.name || '?').trim().slice(0, 1).toUpperCase();
            const rate = Number.isFinite(agent.conversionRate) ? agent.conversionRate : 0;
            const rankColors = [
              'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-500/30',
              'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-lg shadow-slate-400/30',
              'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-500/30'
            ];
            const rankClass = index < 3 ? rankColors[index] : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]';
            
            return (
              <div key={`${agent.id || 'agent'}-${index}`} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)]/30 hover:bg-[var(--bg-elevated)]/60 transition-all duration-300 group">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${rankClass}`}>
                  {index + 1}
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center text-sm font-bold shadow-md">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">{agent.name || 'Unknown'}</p>
                  <p className="text-[9px] text-[var(--text-muted)]">{formatNumber(agent.converted)} converted · {formatNumber(agent.leadsHandled)} total</p>
                  <div className="mt-1.5 h-1.5 w-full bg-[var(--bg-base)] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, rate))}%` }} />
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${rate >= 50 ? 'bg-emerald-500/10 text-emerald-500' : rate >= 30 ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    {rate.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const QuickStats = ({ kpis, loading }) => {
  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] animate-pulse">
          <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)]" />
          <div className="flex-1">
            <div className="w-16 h-2 rounded bg-[var(--bg-elevated)] mb-1" />
            <div className="w-12 h-4 rounded bg-[var(--bg-elevated)]" />
          </div>
        </div>
      ))}
    </div>
  );
  
  const stats = [
    { 
      label: 'Pipeline Value', 
      value: fmt(kpis?.pipelineValue || 0), 
      icon: DollarSign, 
      color: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    { 
      label: 'Avg Deal Size', 
      value: fmt(kpis?.avgDealSize || 0), 
      icon: Target, 
      color: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    { 
      label: 'Response Time', 
      value: '< 2h', 
      icon: Activity, 
      color: 'from-violet-500 to-purple-600',
      textColor: 'text-violet-500',
      bgColor: 'bg-violet-500/10'
    },
    { 
      label: 'Active Agents', 
      value: formatNumber(kpis?.activeAgents || 0), 
      icon: UserCheck, 
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] hover:border-[var(--border-base)] hover:bg-[var(--bg-elevated)] transition-all duration-300 group">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <stat.icon size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{stat.label}</p>
            <p className="text-sm font-bold text-[var(--text-primary)] truncate">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const LeadAnalyticsDashboard = ({ onAddLead, onNavigate }) => {
  const queryOpts = { refetchInterval: 30000, staleTime: 30000 };
  const { data: kpisRaw, isLoading: kpisLoading, error: kpisError, refetch: refetchKpis } = useQuery({
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
    queryKey: ['leads-dashboard', 'top-performers'],
    queryFn: async () => { const response = await leadsApi.getDashboardTopPerformers(); return response?.data || response; },
    ...queryOpts,
  });
  const kpis = kpisRaw;
  const funnel = funnelRaw;
  const monthly = monthlyRaw;
  const performers = performersRaw;
  const isLoading = kpisLoading || funnelLoading || monthlyLoading || performersLoading;
  const hasError = kpisError;
  const hasNoLeads = !kpis || !kpis.totalLeads || kpis.totalLeads === 0;
  const handleRefresh = () => { refetchKpis(); };
  const monthlySpark = useMemo(() => {
    const m = monthly?.months || [];
    return (Array.isArray(m) ? m : []).map((x) => ({ v: Number(x.created || 0) }));
  }, [monthly]);
  const wonSpark = useMemo(() => {
    const m = monthly?.months || [];
    return (Array.isArray(m) ? m : []).map((x) => ({ v: Number(x.won || 0) }));
  }, [monthly]);
  if (hasError && !kpis) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">CRM Dashboard</h1>
            <p className="text-sm text-[var(--text-muted)]">Lead analytics & performance</p>
          </div>
        </div>
        <div className="glass-card p-8 flex flex-col items-center justify-center text-center rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Failed to Load Data</h3>
          <Button variant="outline" onClick={handleRefresh}><RefreshCw size={14} className="mr-2" /> Retry</Button>
        </div>
      </div>
    );
  }
  if (hasNoLeads && !isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">CRM Dashboard</h1>
            <p className="text-sm text-[var(--text-muted)]">Lead analytics & performance</p>
          </div>
        </div>
        <div className="glass-card p-8 flex flex-col items-center justify-center text-center rounded-2xl">
          <div className="w-20 h-20 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-base)] flex items-center justify-center mb-4">
            <Users size={32} className="text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">No Leads Available</h3>
          <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md">Import or add leads to see analytics. Once you have leads, this dashboard will show your sales funnel, pipeline value, and conversion metrics.</p>
          <Button variant="outline" onClick={onAddLead}><Zap size={14} className="mr-2" /> Add Lead</Button>
        </div>
      </div>
    );
  }
  const kpiData = kpis ? [
    { title: 'Total Leads', value: formatNumber(kpis.totalLeads), change: kpis.deltas?.totalLeadsPct, trend: (kpis.deltas?.totalLeadsPct || 0) >= 0 ? 'up' : 'down', icon: Users, color: '#3B82F6', subtitle: 'All time leads', sparkline: monthlySpark, onClick: () => {} },
    { title: 'New Leads', value: formatNumber(kpis.newLeads), change: undefined, trend: 'up', icon: Sparkles, color: '#8B5CF6', subtitle: 'Today', sparkline: monthlySpark, onClick: () => {} },
    { title: 'Converted', value: formatNumber(kpis.convertedLeads), change: kpis.deltas?.convertedLeadsPct, trend: (kpis.deltas?.convertedLeadsPct || 0) >= 0 ? 'up' : 'down', icon: CheckCircle2, color: '#22C55E', subtitle: `${kpis.conversionRate || 0}% conversion`, sparkline: wonSpark, onClick: () => {} },
    { title: 'Lost Leads', value: formatNumber(kpis.lostLeads), change: undefined, trend: 'down', icon: TrendingDown, color: '#EF4444', subtitle: 'Status: Lost', sparkline: monthlySpark, onClick: () => {} },
  ] : [];

  return (
    <div className="space-y-5 p-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">CRM Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)]">Lead analytics & performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Data
          </span>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="rounded-xl hover:bg-[var(--bg-elevated)] transition-colors">
            <RefreshCw size={14} className="mr-2" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl hover:bg-[var(--bg-elevated)] transition-colors">
            <Download size={14} className="mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? 
          [...Array(4)].map((_, i) => <SkeletonCard key={i} />) : 
          kpiData.map((kpi, idx) => (
            <div key={kpi.title} className="animate-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
              <KPICard {...kpi} loading={false} />
            </div>
          ))
        }
      </div>

      {/* Quick Stats */}
      {!isLoading && (
        <div className="animate-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '400ms' }}>
          <QuickStats kpis={kpis} loading={kpisLoading} />
        </div>
      )}

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: '500ms' }}>
          <SolarPipeline data={funnel?.stages} loading={funnelLoading} />
        </div>
        <div className="animate-in slide-in-from-right-4 duration-500" style={{ animationDelay: '600ms' }}>
          <LeadConversionChart data={funnel?.stages} loading={funnelLoading} />
        </div>
      </div>

      {/* Bottom Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: '700ms' }}>
          <MonthlyTrendChart data={monthly?.months} loading={monthlyLoading} />
        </div>
        <div className="animate-in slide-in-from-right-4 duration-500" style={{ animationDelay: '800ms' }}>
          <TopPerformers data={performers?.performers} loading={performersLoading} />
        </div>
      </div>
    </div>
  );
};

export default LeadAnalyticsDashboard;
