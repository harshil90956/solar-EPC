import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, TrendingDown, DollarSign, Target, Activity, Download, RefreshCw, Zap, Award, Clock, ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle, Sparkles, Funnel, PieChart as PieChartIcon, Brain } from 'lucide-react';
import { Button } from '../ui/Button';

// Mock Data
const kpiData = [
  { title: 'Total Leads', value: '2,847', change: 12.5, trend: 'up', icon: Users, color: '#3b82f6' },
  { title: 'New Today', value: '24', change: -5.2, trend: 'down', icon: Sparkles, color: '#10b981' },
  { title: 'Qualified', value: '892', change: 8.3, trend: 'up', icon: Target, color: '#f59e0b' },
  { title: 'Converted', value: '456', change: 15.7, trend: 'up', icon: CheckCircle2, color: '#22c55e' }
];

const funnelStages = [
  { name: 'New Lead', count: 2847, percentage: 100, color: '#3b82f6' },
  { name: 'Contacted', count: 1954, percentage: 68.6, color: '#6366f1' },
  { name: 'Qualified', count: 892, percentage: 31.3, color: '#8b5cf6' },
  { name: 'Site Visit', count: 623, percentage: 21.9, color: '#a855f7' },
  { name: 'Negotiation', count: 389, percentage: 13.7, color: '#d946ef' },
  { name: 'Closed Won', count: 456, percentage: 16.0, color: '#22c55e' }
];

const leadSources = [
  { name: 'Website', value: 856, color: '#3b82f6' },
  { name: 'Facebook', value: 634, color: '#1877f2' },
  { name: 'Google Ads', value: 523, color: '#4285f4' },
  { name: 'Referral', value: 412, color: '#22c55e' },
  { name: 'Walk-in', value: 298, color: '#f59e0b' },
  { name: 'Partner', value: 245, color: '#8b5cf6' }
];

const monthlyData = [
  { month: 'Jan', generated: 245, converted: 42 },
  { month: 'Feb', generated: 289, converted: 51 },
  { month: 'Mar', generated: 324, converted: 58 },
  { month: 'Apr', generated: 298, converted: 49 },
  { month: 'May', generated: 356, converted: 67 },
  { month: 'Jun', generated: 412, converted: 78 }
];

const salesAgents = [
  { id: '1', name: 'Rahul Sharma', leadsAssigned: 245, leadsConverted: 68, conversionRate: 27.8, rank: 1 },
  { id: '2', name: 'Priya Patel', leadsAssigned: 198, leadsConverted: 52, conversionRate: 26.3, rank: 2 },
  { id: '3', name: 'Amit Kumar', leadsAssigned: 234, leadsConverted: 58, conversionRate: 24.8, rank: 3 },
  { id: '4', name: 'Sneha Reddy', leadsAssigned: 176, leadsConverted: 41, conversionRate: 23.3, rank: 4 },
  { id: '5', name: 'Vikram Singh', leadsAssigned: 189, leadsConverted: 43, conversionRate: 22.8, rank: 5 }
];

const recentActivities = [
  { id: '1', type: 'new_lead', title: 'New Lead Added', description: 'Sunil Mehta from Bangalore', timestamp: '5 min ago' },
  { id: '2', type: 'stage_change', title: 'Moved to Site Visit', description: 'Anita Desai scheduled', timestamp: '12 min ago' },
  { id: '3', type: 'won', title: 'Deal Closed Won!', description: 'Vijay Enterprises - ₹2.4L', timestamp: '1 hour ago' }
];

const insights = [
  { type: 'positive', message: 'Conversion rate improved by 12%' },
  { type: 'positive', message: 'Google Ads highest quality leads' },
  { type: 'neutral', message: 'Best conversion after site visit' },
  { type: 'negative', message: 'Response time increased' }
];

const KPICard = ({ data }) => {
  const Icon = data.icon;
  const TrendIcon = data.trend === 'up' ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="glass-card p-4 hover:scale-[1.02] transition-transform cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${data.color}20, ${data.color}10)` }}>
          <Icon size={18} style={{ color: data.color }} />
        </div>
        <div className="flex items-center gap-1">
          <TrendIcon size={12} className={data.trend === 'up' ? 'text-emerald-500' : 'text-red-500'} />
          <span className={`text-[10px] font-bold ${data.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
            {Math.abs(data.change)}%
          </span>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{data.title}</p>
        <p className="text-xl font-black text-[var(--text-primary)]">{data.value}</p>
      </div>
    </div>
  );
};

const FunnelChart = () => (
  <div className="glass-card p-5">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold text-[var(--text-primary)]">Sales Funnel</h3>
      <Funnel size={16} className="text-[var(--text-muted)]" />
    </div>
    <div className="space-y-2">
      {funnelStages.map((stage, index) => (
        <div key={stage.name}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-[var(--text-primary)]">{stage.name}</span>
            <span className="text-xs font-bold text-[var(--accent)]">{stage.count}</span>
          </div>
          <div className="w-full bg-[var(--bg-elevated)] rounded-full h-5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${stage.percentage}%`, background: stage.color, opacity: 1 - (index * 0.1) }}>
              <span className="text-[9px] font-bold text-white">{stage.percentage}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SourceChart = () => (
  <div className="glass-card p-5">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold text-[var(--text-primary)]">Lead Sources</h3>
      <PieChartIcon size={16} className="text-[var(--text-muted)]" />
    </div>
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={leadSources} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
          {leadSources.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-base)', borderRadius: '8px' }} />
      </PieChart>
    </ResponsiveContainer>
    <div className="grid grid-cols-2 gap-2 mt-3">
      {leadSources.slice(0, 4).map(s => (
        <div key={s.name} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
          <span className="text-[var(--text-muted)]">{s.name}</span>
          <span className="font-medium ml-auto">{s.value}</span>
        </div>
      ))}
    </div>
  </div>
);

const TrendChart = () => (
  <div className="glass-card p-5">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold text-[var(--text-primary)]">Monthly Trend</h3>
      <TrendingUp size={16} className="text-emerald-500" />
    </div>
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={monthlyData}>
        <defs>
          <linearGradient id="gen" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
          <linearGradient id="conv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} stroke="var(--border-subtle)" />
        <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} stroke="var(--border-subtle)" />
        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-base)', borderRadius: '8px' }} />
        <Area type="monotone" dataKey="generated" stroke="#3b82f6" fill="url(#gen)" strokeWidth={2} />
        <Area type="monotone" dataKey="converted" stroke="#22c55e" fill="url(#conv)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const AgentLeaderboard = () => (
  <div className="glass-card p-5">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold text-[var(--text-primary)]">Top Performers</h3>
      <Award size={16} className="text-amber-500" />
    </div>
    <div className="space-y-3">
      {salesAgents.map((agent, index) => (
        <div key={agent.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-elevated)]">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-200 text-slate-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
            {agent.rank}
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-xs font-bold">
            {agent.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[var(--text-primary)] truncate">{agent.name}</p>
            <p className="text-[9px] text-[var(--text-muted)]">{agent.leadsConverted}/{agent.leadsAssigned}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-[var(--accent)]">{agent.conversionRate}%</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ActivityTimeline = () => (
  <div className="glass-card p-5">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold text-[var(--text-primary)]">Recent Activity</h3>
      <Clock size={16} className="text-[var(--text-muted)]" />
    </div>
    <div className="space-y-3">
      {recentActivities.map((activity, index) => (
        <div key={activity.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`p-1.5 rounded-full ${activity.type === 'new_lead' ? 'text-blue-500 bg-blue-500/10' : activity.type === 'won' ? 'text-green-500 bg-green-500/10' : 'text-amber-500 bg-amber-500/10'}`}>
              {activity.type === 'new_lead' ? <Users size={14} /> : activity.type === 'won' ? <CheckCircle2 size={14} /> : <ArrowUpRight size={14} />}
            </div>
            {index < recentActivities.length - 1 && <div className="w-px h-full bg-[var(--border-base)] mt-1" />}
          </div>
          <div className="flex-1 pb-3">
            <p className="text-xs font-medium text-[var(--text-primary)]">{activity.title}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{activity.description}</p>
            <p className="text-[9px] text-[var(--text-muted)] mt-1">{activity.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SmartInsights = () => (
  <div className="glass-card p-5 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-rose-500/5 border-amber-500/20">
    <div className="flex items-center gap-2 mb-3">
      <Sparkles size={16} className="text-amber-500" />
      <h3 className="text-sm font-bold text-[var(--text-primary)]">Smart Insights</h3>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {insights.map((insight, i) => (
        <div key={i} className={`p-3 rounded-lg ${insight.type === 'positive' ? 'bg-emerald-500/10 border border-emerald-500/20' : insight.type === 'negative' ? 'bg-red-500/10 border border-red-500/20' : 'bg-blue-500/10 border border-blue-500/20'}`}>
          <p className="text-[10px] text-[var(--text-primary)] leading-tight">{insight.message}</p>
        </div>
      ))}
    </div>
  </div>
);

const LeadAnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="glass-card p-4 h-24" />)}
        </div>
        <div className="glass-card p-5 h-64" />
      </div>
    );
  }

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
          <Button variant="outline" size="sm"><RefreshCw size={12} className="mr-1" /> Refresh</Button>
          <Button variant="outline" size="sm"><Download size={12} className="mr-1" /> Export</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiData.map(kpi => <KPICard key={kpi.title} data={kpi} />)}
      </div>

      {/* Insights */}
      <SmartInsights />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FunnelChart />
        <SourceChart />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendChart />
        <AgentLeaderboard />
      </div>
    </div>
  );
};

export default LeadAnalyticsDashboard;
