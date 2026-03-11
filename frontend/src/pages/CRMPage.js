
// Solar OS – Lead Management Module (Premium Enterprise Edition)
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Phone, Mail, MapPin, TrendingUp, Users, Zap, Eye,
  BarChart2, Search, Download, Filter, MoreVertical, AlertCircle,
  X, MessageSquare, Calendar, Flame, Thermometer, Snowflake,
  Building2, DollarSign, LayoutDashboard, List, Bell,
  ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Target,
  Edit2, Trash2, SortAsc, SortDesc, ChevronsUpDown, CheckCircle2,
  XCircle, Clock, Star, Activity, Tag, RefreshCw, Lead,
  Funnel, TrendingDown, UserCheck, AlertTriangle, Award, PieChart as PieChartIcon,
  CalendarDays, FileText, MessageSquareQuote, PhoneCall, Video,
  MailOpen, Send, CheckSquare, Square, ArrowRight, Sparkles,
  Brain, ZapOff, BatteryCharging, Wind, Sun, Moon, Cloud,
  Gauge, Targeted, FilterX, SearchX, UserPlus, UserMinus,
  Save, GitCommit, ChevronDown, Info
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Treemap, ComposedChart, ScatterChart, Scatter
} from 'recharts';
import { USERS } from '../data/mockData';
import { leadsApi } from '../services/leadsApi';
import { surveysApi } from '../services/surveysApi';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea, FormField } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import { format, subMonths } from 'date-fns';
import FilterSystem from '../components/ui/FilterSystem';
import ImportExport from '../components/ui/ImportExport';
import LeadTracker from '../components/LeadTracker';
import { useAuditLog } from '../hooks/useAuditLog';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import { CURRENCY } from '../config/app.config';
import CanAccess, { CanCreate, CanEdit, CanDelete, CanView } from '../components/CanAccess';
import { toast } from '../components/ui/Toast';
import LeadAnalyticsDashboard from '../components/dashboard/LeadAnalyticsDashboard.js';

// UserSelect component for lead assignment
const UserSelect = ({ value, onChange, placeholder }) => {
  const { users } = useAuth();

  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder || 'Select user...'}</option>
      {(users || []).map(user => (
        <option key={user.id} value={user.id}>
          {user.name} ({user.role})
        </option>
      ))}
    </Select>
  );
};

const fmt = CURRENCY.format;

const SOURCES = ['All', 'Website', 'Referral', 'Campaign', 'Ads', 'Walk-in', 'Cold Call', 'Partner', 'Event', 'Social Media'];
const CITIES = ['All', 'Ahmedabad', 'Surat', 'Rajkot', 'Baroda', 'Mumbai', 'Pune', 'Delhi', 'Bangalore', 'Chennai'];
const LEAD_SCORE_FACTORS = {
  budget: { high: 25, medium: 15, low: 5 },
  timeline: { urgent: 20, normal: 10, delayed: 5 },
  authority: { decision_maker: 20, influencer: 10, user: 5 },
  need: { critical: 25, important: 15, nice_to_have: 10 },
  competition: { low: 15, medium: 10, high: 5 }
};

const avatarColor = (name = '') => {
  const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#22c55e', '#06b6d4', '#ec4899'];
  return colors[(name.charCodeAt(0) || 0) % colors.length];
};

// ── Advanced Dashboard Components ──────────────────────────────────────────────
const EmptyState = ({ onAddLead }) => (
  <div className="glass-card p-8 flex flex-col items-center justify-center text-center">
    <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-base)] flex items-center justify-center mb-4">
      <Users size={24} className="text-[var(--text-muted)]" />
    </div>
    <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">No Leads Available</h3>
    <p className="text-xs text-[var(--text-muted)] mb-4 max-w-sm">
      Import or add leads to see analytics. Once you have leads, this dashboard will show your sales funnel, pipeline value, and conversion metrics.
    </p>
    <div className="flex items-center gap-2">
      <CanCreate module="crm">
        <Button variant="outline" onClick={onAddLead}>
          <Plus size={14} className="mr-1" /> Add Lead
        </Button>
      </CanCreate>
    </div>
  </div>
);

// ── Standardized KPI Card using KPICard component ─────────────────────────────
const DashboardKPI = ({ title, value, change, icon: Icon, color, subtitle, trend }) => {
  // Map color hex to variant names
  const colorMap = {
    '#22c55e': 'emerald',
    '#3b82f6': 'blue',
    '#f59e0b': 'amber',
    '#ef4444': 'red',
    '#8b5cf6': 'purple',
    '#06b6d4': 'indigo'
  };
  const variant = colorMap[color] || 'blue';

  return (
    <KPICard
      label={title}
      value={value}
      sub={subtitle}
      icon={Icon}
      variant={variant}
      trend={change !== undefined ? `${Math.abs(change)}%` : undefined}
      trendUp={change >= 0}
    />
  );
};

const ScoreDistributionChart = ({ buckets }) => {
  const data = (buckets || []).map(b => ({ score: b.bucket, count: b.count }));
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Score Distribution</h3>
        <Brain size={16} className="text-[var(--text-muted)]" />
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="score" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-base)',
              borderRadius: '8px',
              fontSize: '11px',
            }}
          />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const FunnelChart = ({ stages }) => {
  const stageLabel = (k) => {
    const map = {
      new: 'New',
      contacted: 'Contacted',
      qualified: 'Qualified',
      proposal: 'Proposal',
      negotiation: 'Negotiation',
      won: 'Won',
      lost: 'Lost',
    };
    return map[k] || k;
  };

  const max = Math.max(1, ...(stages || []).map(s => s.count || 0));
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Sales Funnel</h3>
        <Funnel size={16} className="text-[var(--text-muted)]" />
      </div>
      <div className="space-y-2">
        {(stages || []).map((s) => {
          const pct = Math.round(((s.count || 0) / max) * 100);
          return (
            <div key={s.stage} className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[var(--text-primary)]">{stageLabel(s.stage)}</span>
                <span className="text-xs font-bold text-[var(--accent)]">{s.count}</span>
              </div>
              <div className="w-full bg-[var(--bg-elevated)] rounded-full h-6 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SourcePerformanceChart = ({ sources }) => {
  const data = (sources || []).map(s => ({ source: s.source, leads: s.leads, value: s.value }));
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Lead Sources</h3>
        <PieChartIcon size={16} className="text-[var(--text-muted)]" />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="source" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-base)',
              borderRadius: '8px',
              fontSize: '11px',
            }}
          />
          <Bar yAxisId="left" dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const TrendCharts = ({ months }) => {
  const data = months || [];
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Leads & Pipeline Trend (Last 12 months)</h3>
        <TrendingUp size={16} className="text-emerald-500" />
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-base)',
              borderRadius: '8px',
              fontSize: '11px',
            }}
          />
          <Bar yAxisId="left" dataKey="leads" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          <Area yAxisId="right" type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const ConversionFunnel = () => {
  const data = [
    { stage: 'Leads', count: 450, conversion: 100 },
    { stage: 'Qualified', count: 280, conversion: 62 },
    { stage: 'Proposal', count: 165, conversion: 37 },
    { stage: 'Negotiation', count: 95, conversion: 21 },
    { stage: 'Closed Won', count: 58, conversion: 13 }
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Conversion Funnel</h3>
        <Funnel size={16} className="text-[var(--text-muted)]" />
      </div>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={item.stage} className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--text-primary)]">{item.stage}</span>
              <span className="text-xs font-bold text-[var(--accent)]">{item.count} ({item.conversion}%)</span>
            </div>
            <div className="w-full bg-[var(--bg-elevated)] rounded-full h-6 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{
                  width: `${item.conversion}%`,
                  background: `linear-gradient(90deg, #3b82f6, #8b5cf6)`,
                  opacity: 1 - (index * 0.15)
                }}
              >
                <span className="text-[10px] font-bold text-white">{item.conversion}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LeadSourceAnalytics = () => {
  const data = [
    { source: 'Website', leads: 145, value: 2400000, conversion: 18 },
    { source: 'Referral', leads: 89, value: 1800000, conversion: 32 },
    { source: 'Campaign', leads: 76, value: 1200000, conversion: 12 },
    { source: 'Ads', leads: 65, value: 980000, conversion: 8 },
    { source: 'Partner', leads: 42, value: 1500000, conversion: 28 },
    { source: 'Event', leads: 33, value: 780000, conversion: 22 }
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Lead Source Performance</h3>
        <PieChartIcon size={16} className="text-[var(--text-muted)]" />
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="source" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-base)',
              borderRadius: '8px',
              fontSize: '11px'
            }}
          />
          <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="conversion" fill="#22c55e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const SalesPipelineChart = () => {
  const data = [
    { month: 'Jan', qualified: 45, proposal: 28, negotiation: 15, closed: 8 },
    { month: 'Feb', qualified: 52, proposal: 32, negotiation: 18, closed: 12 },
    { month: 'Mar', qualified: 48, proposal: 35, negotiation: 22, closed: 15 },
    { month: 'Apr', qualified: 61, proposal: 42, negotiation: 28, closed: 18 },
    { month: 'May', qualified: 58, proposal: 38, negotiation: 25, closed: 22 },
    { month: 'Jun', qualified: 72, proposal: 48, negotiation: 32, closed: 28 }
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Sales Pipeline Trend</h3>
        <TrendingUp size={16} className="text-emerald-500" />
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-base)',
              borderRadius: '8px',
              fontSize: '11px'
            }}
          />
          <Area type="monotone" dataKey="qualified" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
          <Area type="monotone" dataKey="proposal" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
          <Area type="monotone" dataKey="negotiation" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
          <Area type="monotone" dataKey="closed" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const LeadScoreDistribution = () => {
  const data = [
    { score: '0-20', count: 45, color: '#ef4444' },
    { score: '21-40', count: 78, color: '#f59e0b' },
    { score: '41-60', count: 124, color: '#eab308' },
    { score: '61-80', count: 156, color: '#22c55e' },
    { score: '81-100', count: 47, color: '#3b82f6' }
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Lead Score Distribution</h3>
        <Brain size={16} className="text-[var(--text-muted)]" />
      </div>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.score} className="flex items-center gap-3">
            <span className="text-xs font-medium text-[var(--text-muted)] w-12">{item.score}</span>
            <div className="flex-1 bg-[var(--bg-elevated)] rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.count / 156) * 100}%`,
                  backgroundColor: item.color
                }}
              />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] w-8 text-right">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ActivityHeatmap = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['9AM', '11AM', '1PM', '3PM', '5PM', '7PM'];

  const data = hours.map(hour => ({
    hour,
    ...days.reduce((acc, day) => ({
      ...acc,
      [day]: Math.floor(Math.random() * 100)
    }), {})
  }));

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Activity Heatmap</h3>
        <Activity size={16} className="text-[var(--text-muted)]" />
      </div>
      <div className="space-y-2">
        {data.map((row) => (
          <div key={row.hour} className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-muted)] w-8">{row.hour}</span>
            <div className="flex gap-1 flex-1">
              {days.map((day) => (
                <div
                  key={day}
                  className="flex-1 h-6 rounded"
                  style={{
                    backgroundColor: `rgba(59, 130, 246, ${row[day] / 100})`,
                    opacity: row[day] > 0 ? 1 : 0.1
                  }}
                  title={`${day} ${row.hour}: ${row[day]} activities`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3">
        {days.map((day) => (
          <span key={day} className="text-[9px] text-[var(--text-muted)]">{day[0]}</span>
        ))}
      </div>
    </div>
  );
};

// ── Comprehensive Reports Components ───────────────────────────────────────────
const PerformanceReport = () => {
  const { data: overviewRaw } = useQuery({
    queryKey: ['leads-dashboard-overview', 'reports'],
    queryFn: async () => {
      const res = await leadsApi.getDashboardOverview();
      return res?.data?.data || res?.data || res;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const overview = overviewRaw;
  const totalLeads = Number(overview?.totalLeads || 0);
  const conversionRate = Number(overview?.conversionRate || 0);
  const pipelineValue = Number(overview?.pipelineValue || 0);
  const convertedLeads = Number(overview?.convertedLeads || 0);

  const avgDealSize = totalLeads > 0 ? Math.round(pipelineValue / totalLeads) : 0;
  const winRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  const data = [
    { metric: 'Total Leads', current: totalLeads, previous: totalLeads, change: 0, target: Math.max(totalLeads, 1) },
    { metric: 'Conversion Rate', current: conversionRate, previous: conversionRate, change: 0, target: 30 },
    { metric: 'Avg Deal Size', current: avgDealSize, previous: avgDealSize, change: 0, target: Math.max(avgDealSize, 1) },
    { metric: 'Pipeline Value', current: pipelineValue, previous: pipelineValue, change: 0, target: Math.max(pipelineValue, 1) },
    { metric: 'Sales Cycle', current: 0, previous: 0, change: 0, target: 35 },
    { metric: 'Win Rate', current: winRate, previous: winRate, change: 0, target: 35 }
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Performance Overview</h3>
        <BarChart2 size={16} className="text-[var(--text-muted)]" />
      </div>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.metric} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)]">
            <div className="flex-1">
              <p className="text-xs font-medium text-[var(--text-primary)]">{item.metric}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {item.metric.includes('Rate') || item.metric.includes('Size') || item.metric.includes('Value') ?
                    (item.metric.includes('Rate') ? `${item.current}%` : fmt(item.current)) :
                    item.current}
                </span>
                <span className={`text-[10px] font-bold ${item.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {item.change >= 0 ? '↑' : '↓'} {Math.abs(item.change)}%
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-[var(--text-muted)]">Target</p>
              <p className="text-xs font-bold text-[var(--accent)]">
                {item.metric.includes('Rate') || item.metric.includes('Size') || item.metric.includes('Value') ?
                  (item.metric.includes('Rate') ? `${item.target}%` : fmt(item.target)) :
                  item.target}
              </p>
            </div>
            <div className="ml-3">
              <div className="w-12 h-2 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${(item.current / item.target) >= 0.9 ? 'bg-emerald-500' :
                    (item.current / item.target) >= 0.7 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                  style={{ width: `${Math.min((item.current / item.target) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MonthlyLeadsChart = () => (
  <div className="glass-card p-5">
    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Monthly Lead Trend</h3>
    <div className="h-40 flex items-end gap-2">
      {[18, 24, 31, 27, 42, 38, 51, 45, 62, 55, 70, 80].map((v, i) => (
        <div key={i} className="flex-1 rounded-t-lg" style={{ height: `${(v / 80) * 100}%`, background: 'linear-gradient(to top, #3b82f620, #3b82f6)' }} />
      ))}
    </div>
    <div className="flex justify-between text-[9px] text-[var(--text-faint)] mt-2 font-medium">
      {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map(m => <span key={m}>{m}</span>)}
    </div>
  </div>
);

const SLADot = ({ breached }) => (
  <div className={`w-2 h-2 rounded-full ${breached ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} title={breached ? 'SLA Breached' : 'On Time'} />
);

const StagePill = ({ stageId, stageMap }) => {
  const s = stageMap?.[stageId] || { label: stageId, color: '#94a3b8' };
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}25` }}>{s.label}</span>;
};

const SourceBadge = ({ source }) => (
  <span className="px-1.5 py-0.5 rounded-md text-[11px] font-normal bg-[#F3F4F6] text-[#374151]">{source}</span>
);

const ScoreBadge = ({ score }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${score >= 75 ? 'text-emerald-500 bg-emerald-500/10' : score >= 50 ? 'text-amber-500 bg-amber-500/10' : 'text-red-500 bg-red-500/10'}`}>{score ?? 0}pts</span>
);

const LeadTrendReport = () => {
  const { data: trendRaw } = useQuery({
    queryKey: ['leads-dashboard-trend', 'reports'],
    queryFn: async () => {
      const res = await leadsApi.getDashboardTrend();
      return res?.data?.data || res?.data || res;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const monthlyData = (trendRaw?.months || []).map((m) => ({
    month: m.month,
    leads: m.leads || 0,
    converted: 0,
    value: m.value || 0,
  }));

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Lead Generation Trends</h3>
        <TrendingUp size={16} className="text-emerald-500" />
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={monthlyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-base)',
              borderRadius: '8px',
              fontSize: '11px'
            }}
          />
          <Bar yAxisId="left" dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="left" dataKey="converted" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const SourcePerformanceReport = () => {
  const { data: sourceRaw } = useQuery({
    queryKey: ['leads-dashboard-source', 'reports'],
    queryFn: async () => {
      const res = await leadsApi.getDashboardSource();
      return res?.data?.data || res?.data || res;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const data = (sourceRaw?.sources || []).map((s) => ({
    source: s.source,
    leads: s.leads || 0,
    conversion: 0,
    cost: 0,
    roi: 0,
  }));

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Source Performance Analysis</h3>
        <PieChartIcon size={16} className="text-[var(--text-muted)]" />
      </div>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.source} className="p-3 rounded-lg bg-[var(--bg-elevated)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--text-primary)]">{item.source}</span>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${item.roi > 1000 ? 'bg-emerald-500/10 text-emerald-500' :
                item.roi > 500 ? 'bg-amber-500/10 text-amber-500' :
                  'bg-red-500/10 text-red-500'
                }`}>
                {item.roi}% ROI
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">Leads</p>
                <p className="text-xs font-bold text-[var(--text-primary)]">{item.leads}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">Conv.</p>
                <p className="text-xs font-bold text-emerald-500">{item.conversion}%</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">Cost</p>
                <p className="text-xs font-bold text-red-500">{fmt(item.cost)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">Revenue</p>
                <p className="text-xs font-bold text-emerald-500">{fmt(item.cost * item.roi / 100)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SalesTeamReport = () => {
  const { data: trendRaw } = useQuery({
    queryKey: ['leads-dashboard-trend', 'reports', 'agents'],
    queryFn: async () => {
      const res = await leadsApi.getDashboardTrend();
      return res?.data?.data || res?.data || res;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const teamData = (trendRaw?.agents || []).map((a) => ({
    name: a.name,
    leads: a.leadsAssigned || 0,
    converted: a.leadsConverted || 0,
    value: 0,
    score: Math.round(a.conversionRate || 0),
  }));

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Sales Team Performance</h3>
        <Users size={16} className="text-[var(--text-muted)]" />
      </div>
      <div className="space-y-3">
        {teamData.map((member, index) => (
          <div key={member.name} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hovered)] transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold text-xs">
              {member.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[var(--text-primary)]">{member.name}</p>
              <p className="text-[9px] text-[var(--text-muted)]">{member.leads} leads • {member.converted} converted</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-[var(--accent)]">{fmt(member.value)}</p>
              <div className="flex items-center gap-1 justify-end">
                <Brain size={8} className="text-[var(--text-muted)]" />
                <span className="text-[9px] font-bold text-emerald-500">{member.score}pts</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-[var(--text-muted)]">Rank</p>
              <p className="text-xs font-black text-emerald-500">#{index + 1}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CRMPage = () => {
  const [view, setView] = useState('leads');
  const [activeLeads, setActiveLeads] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalLeads, setTotalLeads] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showTrackerDrawer, setShowTrackerDrawer] = useState(false);
  const [trackerLeadId, setTrackerLeadId] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [activityData, setActivityData] = useState([]);

  const editingLeadOriginalRef = useRef(null);

  // Lead Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningLeadIds, setAssigningLeadIds] = useState([]);
  const [selectedAssignUser, setSelectedAssignUser] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  const normalizeStageKey = (lead) => (lead?.statusKey || lead?.status || 'new').toString().toLowerCase();
  const getLeadId = (lead) => String(lead?._id || lead?.id || '');
  const dragRef = useRef(null);
  const removeById = (arr, id) => {
    const targetId = String(id);
    let removed = null;
    const next = [];
    for (const item of arr || []) {
      if (!removed && getLeadId(item) === targetId) {
        removed = item;
        continue;
      }
      next.push(item);
    }
    return { next, removed };
  };
  const insertAt = (arr, index, item) => {
    const list = Array.isArray(arr) ? arr : [];
    const i = Math.max(0, Math.min(Number.isFinite(index) ? index : list.length, list.length));
    return [...list.slice(0, i), item, ...list.slice(i)];
  };
  const reorderLeadInActiveLeads = ({ prev, leadId, destStageKey, destIndex, destStageLeadIds }) => {
    const { next: withoutDragged, removed } = removeById(prev || [], leadId);
    if (!removed) return prev;

    const updated = { ...removed, statusKey: destStageKey, status: destStageKey };

    const ids = Array.isArray(destStageLeadIds) ? destStageLeadIds : [];
    const beforeId = ids[destIndex];

    if (beforeId) {
      const insertBeforeIdx = withoutDragged.findIndex((l) => getLeadId(l) === String(beforeId));
      if (insertBeforeIdx !== -1) {
        return insertAt(withoutDragged, insertBeforeIdx, updated);
      }
    }

    let lastIdxInStage = -1;
    for (let i = 0; i < withoutDragged.length; i++) {
      if (normalizeStageKey(withoutDragged[i]) === String(destStageKey).toLowerCase()) lastIdxInStage = i;
    }
    return insertAt(withoutDragged, lastIdxInStage === -1 ? withoutDragged.length : lastIdxInStage + 1, updated);
  };
  const [actionLoading, setActionLoading] = useState(false);
  const [showScoreEditModal, setShowScoreEditModal] = useState(false);
  const [scoreEditingLead, setScoreEditingLead] = useState(null);
  const [newScore, setNewScore] = useState('');

  // Score Boost Modal State
  const [showScoreBoostModal, setShowScoreBoostModal] = useState(false);
  const [scoreBoostLeadIds, setScoreBoostLeadIds] = useState([]);
  const [scoreBoostValue, setScoreBoostValue] = useState(10);
  const [scoreBoostLoading, setScoreBoostLoading] = useState(false);

  const overviewQ = useQuery({
    queryKey: ['leads-dashboard-overview'],
    queryFn: () => leadsApi.getDashboardOverview(),
    enabled: view === 'dashboard',
  });

  const funnelQ = useQuery({
    queryKey: ['leads-dashboard-funnel'],
    queryFn: () => leadsApi.getDashboardFunnel(),
    enabled: view === 'dashboard',
  });

  const sourceQ = useQuery({
    queryKey: ['leads-dashboard-source'],
    queryFn: () => leadsApi.getDashboardSource(),
    enabled: view === 'dashboard',
  });

  const trendQ = useQuery({
    queryKey: ['leads-dashboard-trend'],
    queryFn: () => leadsApi.getDashboardTrend(),
    enabled: view === 'dashboard',
  });
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const sortDropdownRef = useRef(null);
  const columnsDropdownRef = useRef(null);
  // Date Range Filter State
  const [dateRangeFilter, setDateRangeFilter] = useState({
    type: 'last7days', // today, yesterday, last7days, last30days, thisMonth, lastMonth, custom
    startDate: null,
    endDate: null
  });
  const [showDateRangeDropdown, setShowDateRangeDropdown] = useState(false);
  const dateRangeRef = useRef(null);
  // Date range preset options
  const dateRangeOptions = [
    { id: 'today', label: 'Today', days: 0 },
    { id: 'yesterday', label: 'Yesterday', days: 1 },
    { id: 'last7days', label: 'Last 7 Days', days: 7 },
    { id: 'last30days', label: 'Last 30 Days', days: 30 },
    { id: 'thisMonth', label: 'This Month', days: null },
    { id: 'lastMonth', label: 'Last Month', days: null },
    { id: 'custom', label: 'Custom Range', days: null },
  ];

  const [automationRules, setAutomationRules] = useState([
    { id: 1, name: 'High Value Alert', condition: 'value > 500000', action: 'notify_manager', enabled: true },
    { id: 2, name: 'SLA Follow-up', condition: 'days_inactive > 3', action: 'send_email', enabled: true },
    { id: 3, name: 'Score Boost', condition: 'source == referral', action: 'add_10_points', enabled: false }
  ]);

  const [activeFilters, setActiveFilters] = useState([]);
  const [quickFilter, setQuickFilter] = useState(null);

  // Advanced filter states - arrays for multiple values
  const [filterStages, setFilterStages] = useState([]); // multiple stages
  const [filterScoreRanges, setFilterScoreRanges] = useState([]); // multiple score ranges
  const [filterValueRanges, setFilterValueRanges] = useState([]); // multiple value ranges
  const [filterSources, setFilterSources] = useState([]); // multiple sources

  // Temp states for adding new values
  const [tempStage, setTempStage] = useState('');
  const [tempScoreMin, setTempScoreMin] = useState('');
  const [tempScoreMax, setTempScoreMax] = useState('');
  const [tempValueMin, setTempValueMin] = useState('');
  const [tempValueMax, setTempValueMax] = useState('');
  const [tempSource, setTempSource] = useState('');

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    email: true,
    statusKey: true,
    score: true,
    value: true,
    automation: true,
    source: true
  });

  const { logCreate, logUpdate, logDelete } = useAuditLog('CRM');
  const { can } = usePermissions();
  const { user } = useAuth();

  // Get user's data scope for visibility indicator
  const userDataScope = user?.dataScope || 'ASSIGNED';

  const statusMap = useMemo(() => {
    const map = {};
    (statusOptions || []).forEach(s => {
      map[s.key] = { label: s.label, color: s.color };
    });
    return map;
  }, [statusOptions]);

  const crmFields = useMemo(() => {
    return [
      { id: 'name', label: 'Lead Name', type: 'text', required: true },
      { id: 'company', label: 'Company', type: 'text' },
      { id: 'email', label: 'Email', type: 'email' },
      { id: 'phone', label: 'Phone', type: 'tel' },
      { id: 'statusKey', label: 'Stage', type: 'select', options: (statusOptions || []).map(s => ({ id: s.key, label: s.label, color: s.color })) },
      { id: 'value', label: 'Deal Value', type: 'number' },
      { id: 'source', label: 'Source', type: 'select', options: ['Website', 'Referral', 'Campaign', 'Ads'] },
    ];
  }, [statusOptions]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('[DEBUG] Fetching status options...');
        const res = await leadsApi.getStatusOptions();
        console.log('[DEBUG] Status options response:', res);
        const list = res?.data?.data || res?.data || [];
        console.log('[DEBUG] Extracted list:', list);
        if (!mounted) return;
        setStatusOptions(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error('[DEBUG] Error fetching status options:', e);
        if (!mounted) return;
        setStatusOptions([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Helper function to get date range based on preset - MUST be defined before fetchLeads
  const getDateRangeFromPreset = useCallback((preset) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate, endDate;

    switch (preset) {
      case 'today':
        startDate = today;
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last7days':
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last30days':
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'thisMonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (dateRangeFilter.startDate && dateRangeFilter.endDate) {
          startDate = new Date(dateRangeFilter.startDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(dateRangeFilter.endDate);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
      default:
        // Default to last 7 days
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate };
  }, [dateRangeFilter.startDate, dateRangeFilter.endDate]);

  // Fetch leads from API with filters
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pageSize,
        search: debouncedSearch,
      };

      // Wire existing UI filters to backend where supported (single-value)
      if (Array.isArray(filterStages) && filterStages.length === 1) {
        params.statusKey = filterStages[0];
      }
      if (Array.isArray(filterSources) && filterSources.length === 1) {
        params.source = filterSources[0];
      }
      if (Array.isArray(filterScoreRanges) && filterScoreRanges.length === 1) {
        const r = filterScoreRanges[0];
        if (r?.min !== '' && r?.min !== undefined) params.minScore = r.min;
        if (r?.max !== '' && r?.max !== undefined) params.maxScore = r.max;
      }
      if (Array.isArray(filterValueRanges) && filterValueRanges.length === 1) {
        const r = filterValueRanges[0];
        if (r?.min !== '' && r?.min !== undefined) params.minValue = r.min;
        if (r?.max !== '' && r?.max !== undefined && r?.max !== '∞') params.maxValue = r.max;
      }

      // Add date range filter
      const { startDate, endDate } = getDateRangeFromPreset(dateRangeFilter.type);
      if (startDate && endDate) {
        params.startDate = startDate.toISOString();
        params.endDate = endDate.toISOString();
      }

      // Only add sort params if sort key is valid
      if (sort.key) {
        params.sortBy = sort.key;
        params.sortOrder = sort.dir;
      }
      // Add quick filter
      if (quickFilter) {
        params.quickFilter = quickFilter;
      }
      const result = await leadsApi.getAll(params);

      // Backend returns: { success, data: [], total, page, pages }
      const leadsData = Array.isArray(result?.data) ? result.data : (result?.data?.data || result?.data || []);
      console.log('[DEBUG] Raw leads from API:', leadsData.slice(0, 3).map(l => ({ name: l.name, status: l.status, statusKey: l.statusKey })));
      const totalCount = Number(result?.total || result?.data?.total || 0);
      const currentPage = Number(result?.page || page || 1);
      const totalPages = Number(result?.pages || 1);

      if (currentPage > totalPages && totalPages > 0) {
        setPage(totalPages);
        return;
      }

      setActiveLeads(leadsData);
      setTotalLeads(totalCount);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      setError('Failed to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, sort.key, sort.dir, quickFilter, dateRangeFilter.type, getDateRangeFromPreset, filterStages, filterSources, filterScoreRanges, filterValueRanges]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Row Actions with real API calls
  const handleViewLead = (lead) => {
    setSelectedLead(lead);
  };

  const handleViewTracker = (lead) => {
    setTrackerLeadId(lead._id);
    setShowTrackerDrawer(true);
  };

  const handleEditLead = (lead) => {
    editingLeadOriginalRef.current = lead;
    setEditingLead(lead);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLead) return;
    try {
      setActionLoading(true);

      const originalAssignedTo = (editingLeadOriginalRef.current || {})?.assignedTo;

      // Handle lead assignment if changed
      if (editingLead.assignedTo && editingLead.assignedTo !== originalAssignedTo) {
        await leadsApi.assignLead(editingLead._id, editingLead.assignedTo);
      }

      // Only send allowed fields to API
      const updateData = {
        name: editingLead.name,
        company: editingLead.company,
        email: editingLead.email,
        phone: editingLead.phone,
        source: editingLead.source,
        city: editingLead.city,
        statusKey: editingLead.statusKey,
        value: editingLead.value,
        notes: editingLead.notes,
      };
      await leadsApi.update(editingLead._id, updateData);
      logUpdate(editingLead);
      setShowEditModal(false);
      setEditingLead(null);
      fetchLeads(); // Refresh list
      // If detail modal is open, refresh it
      if (selectedLead && selectedLead._id === editingLead._id) {
        const updated = await leadsApi.getById(editingLead._id);
        setSelectedLead(updated?.data?.data || updated?.data || updated);
      }
    } catch (err) {
      console.error('Failed to update lead:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update lead');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicateLead = async (lead) => {
    try {
      setActionLoading(true);
      const duplicated = await leadsApi.duplicate(lead._id);
      logCreate(duplicated?.data?.data || duplicated?.data || duplicated);
      fetchLeads(); // Refresh list
    } catch (err) {
      console.error('Failed to duplicate lead:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveLead = async (lead) => {
    try {
      setActionLoading(true);
      await leadsApi.archive(lead._id);
      logUpdate({ ...lead, archived: true });
      fetchLeads(); // Refresh list
      if (selectedLead && selectedLead._id === lead._id) {
        setSelectedLead(null); // Close detail modal
      }
    } catch (err) {
      console.error('Failed to archive lead:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLead = async (lead) => {
    try {
      setActionLoading(true);
      await leadsApi.delete(lead._id);
      logDelete(lead);
      toast.success(`Lead "${lead.name}" deleted successfully`);
      setActiveLeads((prev) => (Array.isArray(prev) ? prev.filter((l) => l?._id !== lead._id) : prev));
      setTotalLeads((prev) => Math.max(0, Number(prev || 0) - 1));
      fetchLeads(); // Refresh list
      if (selectedLead && selectedLead._id === lead._id) {
        setSelectedLead(null); // Close detail modal
      }
    } catch (err) {
      console.error('Failed to delete lead:', err);
      toast.error(err?.response?.data?.message || 'Failed to delete lead');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecalculateScore = async (lead) => {
    setScoreEditingLead(lead);
    setNewScore(String(lead.score || 0));
    setShowScoreEditModal(true);
  };

  const handleSaveScore = async () => {
    if (!scoreEditingLead) return;
    try {
      setActionLoading(true);
      const scoreValue = parseInt(newScore) || 0;
      // Include all required fields for MongoDB validation
      const response = await leadsApi.update(scoreEditingLead._id, {
        score: scoreValue,
        name: scoreEditingLead.name,
        leadId: scoreEditingLead.leadId,
        phone: scoreEditingLead.phone || '',
        email: scoreEditingLead.email || '',
        source: scoreEditingLead.source || '',
        statusKey: scoreEditingLead.statusKey || 'new'
      });
      console.log('[handleSaveScore] Update response:', response);
      logUpdate({ ...scoreEditingLead, score: scoreValue });
      setScoreEditingLead(null);
      setShowScoreEditModal(false);
      await fetchLeads(); // Refresh and wait
      console.log('[handleSaveScore] Leads refreshed');
    } catch (err) {
      console.error('Failed to update score:', err);
      setScoreEditingLead(null);
      setShowScoreEditModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Flip action - Move lead to survey stage and create survey
  const handleFlipToSurvey = async (lead) => {
    if (!window.confirm(`Flip lead "${lead.name}" to Site Survey Scheduled? This will create a pending survey.`)) return;
    try {
      setActionLoading(true);

      // Update lead stage to 'survey'
      await leadsApi.updateStage(lead._id || lead.id, 'survey');

      // Create a pending survey for this lead
      const surveyData = {
        customerName: lead.name,
        engineer: lead.assignedTo || 'Unassigned',
        site: lead.company || lead.city || 'TBD',
        scheduledDate: lead.nextFollowUp || new Date().toISOString().split('T')[0],
        estimatedKw: parseInt(lead.kw?.replace('kW', '')) || 0,
        status: 'pending',
        sourceLeadId: lead._id || lead.id,
        notes: `Flipped from CRM. Source: ${lead.source}, City: ${lead.city}, Phone: ${lead.phone}`
      };

      await surveysApi.create(surveyData);

      logUpdate({ ...lead, stage: 'survey' });
      fetchLeads(); // Refresh list
      toast.success(`Lead "${lead.name}" flipped to Site Survey Scheduled`);
    } catch (err) {
      console.error('Failed to flip lead:', err);
      toast.error('Failed to flip lead: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewTimeline = async (lead) => {
    try {
      setActionLoading(true);
      const result = await leadsApi.getTimeline(lead._id);
      setTimelineData(result.data || result || []);
      setShowTimelineModal(true);
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewActivity = async (lead) => {
    try {
      setActionLoading(true);
      setActivityLeadId(lead._id);
      const result = await leadsApi.getTimeline(lead._id);
      setActivityData(result.data || result || []);
      setShowActivityModal(true);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle save new activity
  const handleSaveActivity = async () => {
    if (!newActivityNote.trim() || !activityLeadId) return;
    try {
      setActionLoading(true);
      await leadsApi.addActivity(activityLeadId, {
        type: 'note',
        note: newActivityNote.trim(),
        by: 'User'
      });
      setNewActivityNote('');
      // Refresh activity data
      const result = await leadsApi.getTimeline(activityLeadId);
      setActivityData(result.data || result || []);
    } catch (err) {
      console.error('Failed to add activity:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Actions
  const handleBulkExport = async (selectedIds) => {
    if (!guardExport()) return;
    if (!selectedIds || selectedIds.length === 0) {
      toast.error('Please select leads to export');
      return;
    }
    try {
      setActionLoading(true);
      toast.loading('Exporting leads...', { id: 'export' });
      
      const result = await leadsApi.exportCSV(selectedIds);
      const { csv, filename } = result.data || result;
      
      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`${selectedIds.length} leads exported successfully`, { id: 'export' });
    } catch (err) {
      console.error('Export failed:', err);
      toast.error(err?.response?.data?.message || 'Failed to export leads', { id: 'export' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async (selectedIds) => {
    try {
      setActionLoading(true);
      await leadsApi.bulkDelete(selectedIds);
      logDelete({ ids: selectedIds });
      toast.success(`${selectedIds.length} leads deleted successfully`);
      setActiveLeads((prev) => (Array.isArray(prev) ? prev.filter((l) => !selectedIds.includes(l?._id)) : prev));
      setTotalLeads((prev) => Math.max(0, Number(prev || 0) - Number(selectedIds?.length || 0)));
      fetchLeads();
      setSelected(new Set());
    } catch (err) {
      console.error('Failed to bulk delete:', err);
      toast.error(err?.response?.data?.message || 'Failed to delete leads');
    } finally {
      setActionLoading(false);
    }
  };

  // Lead Assignment Handlers
  const handleOpenAssignModal = async (leadIds) => {
    setAssigningLeadIds(Array.isArray(leadIds) ? leadIds : [leadIds]);
    setSelectedAssignUser('');
    setSelectedRole('');
    setFilteredUsers([]);
    setShowAssignModal(true);

    // Load roles when modal opens
    try {
      setRolesLoading(true);
      const result = await leadsApi.getRoles();
      const rolesData = result.data?.data || result.data || [];
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setAssigningLeadIds([]);
    setSelectedAssignUser('');
    setSelectedRole('');
    setFilteredUsers([]);
  };

  // Score Boost Handlers
  const handleOpenScoreBoostModal = (leadIds) => {
    setScoreBoostLeadIds(Array.isArray(leadIds) ? leadIds : [leadIds]);
    setScoreBoostValue(10);
    setShowScoreBoostModal(true);
  };

  const handleCloseScoreBoostModal = () => {
    setShowScoreBoostModal(false);
    setScoreBoostLeadIds([]);
    setScoreBoostValue(10);
  };

  const handleScoreBoost = async () => {
    if (!scoreBoostValue || scoreBoostLeadIds.length === 0) return;

    try {
      setScoreBoostLoading(true);
      await leadsApi.bulkScore(scoreBoostLeadIds, scoreBoostValue);
      toast.success(`${scoreBoostLeadIds.length} leads boosted by ${scoreBoostValue} points`);
      fetchLeads();
      handleCloseScoreBoostModal();
    } catch (err) {
      console.error('Failed to boost scores:', err);
      toast.error(err?.response?.data?.message || 'Failed to boost scores');
    } finally {
      setScoreBoostLoading(false);
    }
  };

  const handleRoleChange = async (roleId) => {
    setSelectedRole(roleId);
    setSelectedAssignUser('');
    setFilteredUsers([]);

    if (!roleId) return;

    // Fetch users by selected role
    try {
      setUsersLoading(true);
      const result = await leadsApi.getUsersByRole(roleId);
      const usersData = result.data?.data || result.data || [];
      setFilteredUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error('Failed to fetch users by role:', err);
      setFilteredUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleAssignLeads = async () => {
    if (!selectedAssignUser || assigningLeadIds.length === 0) return;

    try {
      setAssignLoading(true);

      if (assigningLeadIds.length === 1) {
        // Single lead assignment
        await leadsApi.assignLead(assigningLeadIds[0], selectedAssignUser);
        toast.success('Lead assigned successfully');
      } else {
        // Bulk assignment
        await leadsApi.bulkAssign(assigningLeadIds, selectedAssignUser);
        toast.success(`${assigningLeadIds.length} leads assigned successfully`);
      }

      // Refresh leads table
      fetchLeads();

      // Clear selection if bulk assign
      if (assigningLeadIds.length > 1) {
        setSelected(new Set());
      }

      handleCloseAssignModal();
    } catch (err) {
      console.error('Failed to assign leads:', err);
      toast.error(err?.response?.data?.message || 'Failed to assign leads');
    } finally {
      setAssignLoading(false);
    }
  };

  // Add Lead
  const [newLead, setNewLead] = useState({
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    source: '',
    city: '',
    notes: '',
    statusKey: 'new'
  });

  // Reset newLead when Add Lead modal opens
  useEffect(() => {
    if (showAddModal) {
      setNewLead({
        firstName: '',
        lastName: '',
        company: '',
        email: '',
        phone: '',
        source: '',
        city: '',
        notes: '',
        statusKey: 'new'
      });
    }
  }, [showAddModal]);

  const handleCreateLead = async () => {
    try {
      setActionLoading(true);
      // Combine first and last name into name field
      const leadData = {
        name: `${newLead.firstName} ${newLead.lastName}`.trim(),
        company: newLead.company,
        email: newLead.email,
        phone: newLead.phone,
        source: newLead.source,
        city: newLead.city,
        notes: newLead.notes,
        statusKey: newLead.statusKey
      };
      const created = await leadsApi.create(leadData);
      const newLeadData = created.data || created;
      logCreate(newLeadData);
      toast.success(`Lead "${leadData.name}" created successfully`);
      setShowAddModal(false);
      setNewLead({ firstName: '', lastName: '', company: '', email: '', phone: '', source: '', city: '', notes: '', statusKey: 'new' });
      fetchLeads(); // Refresh list
    } catch (err) {
      console.error('Failed to create lead:', err);
      toast.error(err?.response?.data?.message || 'Failed to create lead');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper function to format time as "X HRS AGO" or "JUST NOW"
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'JUST NOW';
    if (diffMins < 60) return `${diffMins} MINS AGO`;
    if (diffHours < 24) return `${diffHours} HRS AGO`;
    if (diffDays < 7) return `${diffDays} DAYS AGO`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // State for new activity input
  const [newActivityNote, setNewActivityNote] = useState('');
  const [activityLeadId, setActivityLeadId] = useState(null);
  const handleCallLead = (lead) => {
    if (lead.phone) {
      window.location.href = `tel:${lead.phone}`;
    } else {
      // Alert removed as per user request - no alerts on lead pages
    }
  };

  const guardDelete = () => {
    if (!can('crm', 'delete')) {
      toast.error('Permission denied: Cannot delete leads');
      return false;
    }
    return true;
  };

  const guardEdit = () => {
    if (!can('crm', 'edit')) {
      toast.error('Permission denied: Cannot edit leads');
      return false;
    }
    return true;
  };

  const guardExport = () => {
    if (!can('crm', 'export')) {
      toast.error('Permission denied: Cannot export leads');
      return false;
    }
    return true;
  };

  const rowSelectionActions = [() => {
    if (!can('crm', 'export')) {
      toast.error('Permission denied: Cannot export leads');
      return false;
    }
    return true;
  }];

  // Apply automation rules
  const applyAutomationRules = useCallback((lead) => {
    const results = [];

    automationRules.forEach(rule => {
      if (!rule.enabled) return;

      let conditionMet = false;

      if (rule.condition.includes('value >')) {
        const threshold = parseInt(rule.condition.split(' > ')[1]);
        conditionMet = lead.value > threshold;
      } else if (rule.condition.includes('days_inactive >')) {
        const threshold = parseInt(rule.condition.split(' > ')[1]);
        const lastActivity = lead.activities?.[0]?.timestamp;
        if (lastActivity) {
          const daysSince = Math.floor((new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24));
          conditionMet = daysSince > threshold;
        }
      } else if (rule.condition.includes('source ==')) {
        const source = rule.condition.split(' == ')[1].replace(/'/g, '');
        conditionMet = lead.source === source;
      }

      if (conditionMet) {
        results.push(rule);
      }
    });

    return results;
  }, [automationRules]);

  // Advanced lead scoring algorithm
  const calculateLeadScore = (lead) => {
    let score = 0;

    // Budget scoring
    if (lead.value >= 500000) score += LEAD_SCORE_FACTORS.budget.high;
    else if (lead.value >= 200000) score += LEAD_SCORE_FACTORS.budget.medium;
    else score += LEAD_SCORE_FACTORS.budget.low;

    // Timeline scoring
    const daysSinceCreated = Math.floor((new Date() - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated <= 7) score += LEAD_SCORE_FACTORS.timeline.urgent;
    else if (daysSinceCreated <= 30) score += LEAD_SCORE_FACTORS.timeline.normal;
    else score += LEAD_SCORE_FACTORS.timeline.delayed;

    // Source scoring
    if (lead.source === 'Referral') score += 15;
    else if (lead.source === 'Partner') score += 12;
    else if (lead.source === 'Website') score += 8;

    // Engagement scoring
    if (lead.activities && lead.activities.length > 0) {
      const recentActivities = lead.activities.filter(a => {
        const activityDate = new Date(a.timestamp);
        const daysSince = Math.floor((new Date() - activityDate) / (1000 * 60 * 60 * 24));
        return daysSince <= 7;
      });
      score += Math.min(recentActivities.length * 5, 20);
    }

    return Math.min(score, 100);
  };

  // Enhanced leads with scores and automation
  const enhancedLeads = useMemo(() => {
    const unique = new Map();
    for (const lead of activeLeads || []) {
      unique.set(String(lead._id || lead.id), lead);
    }
    return Array.from(unique.values()).map(lead => ({
      ...lead,
      // Ensure statusKey is set - use backend statusKey, status, or default to 'new'
      statusKey: lead.statusKey || lead.status || 'new',
      // Use backend score if available, otherwise calculate
      score: lead.score !== undefined ? lead.score : calculateLeadScore(lead),
      automation: applyAutomationRules(lead),
      slaBreached: lead.activities?.[0] ?
        Math.floor((new Date() - new Date(lead.activities[0].timestamp)) / (1000 * 60 * 60 * 24)) > 3 : false
    }));
  }, [activeLeads, applyAutomationRules]);

  // Apply filters to leads
  const filteredLeads = useMemo(() => {
    let result = enhancedLeads;

    // Quick filter
    if (quickFilter) {
      switch (quickFilter) {
        case 'highScore':
          result = result.filter(l => l.score > 75);
          break;
        case 'slaBreached':
          result = result.filter(l => l.slaBreached);
          break;
        case 'highValue':
          result = result.filter(l => l.value > 500000);
          break;
        case 'referral':
          result = result.filter(l => l.source === 'Referral');
          break;
        case 'automation':
          result = result.filter(l => l.automation && l.automation.length > 0);
          break;
        case 'recent':
          result = result.filter(l => {
            const daysSince = Math.floor((new Date() - new Date(l.createdAt)) / (1000 * 60 * 60 * 24));
            return daysSince <= 7;
          });
          break;
      }
    }

    // Multiple Stage filters (OR logic)
    if (filterStages.length > 0) {
      result = result.filter(lead => {
        const leadStatus = (lead.statusKey || lead.status || 'new').toString().toLowerCase();
        return filterStages.some(stage => leadStatus === stage.toLowerCase());
      });
    }

    // Multiple Score ranges (OR logic)
    if (filterScoreRanges.length > 0) {
      result = result.filter(lead => {
        const score = Number(lead.score) || 0;
        return filterScoreRanges.some(range => {
          const min = range.min !== '' ? Number(range.min) : -Infinity;
          const max = range.max !== '' ? Number(range.max) : Infinity;
          return score >= min && score <= max;
        });
      });
    }

    // Multiple Value ranges (OR logic)
    if (filterValueRanges.length > 0) {
      result = result.filter(lead => {
        const value = Number(lead.value) || 0;
        return filterValueRanges.some(range => {
          const min = range.min !== '' ? Number(range.min) : -Infinity;
          const max = range.max !== '' ? Number(range.max) : Infinity;
          return value >= min && value <= max;
        });
      });
    }

    // Multiple Source filters (OR logic)
    if (filterSources.length > 0) {
      result = result.filter(lead =>
        filterSources.some(source =>
          lead.source?.toLowerCase() === source.toLowerCase()
        )
      );
    }

    return result;
  }, [enhancedLeads, quickFilter, filterStages, filterScoreRanges, filterValueRanges, filterSources]);

  // Sort handler for DataTable
  const handleSort = useCallback(({ key, dir }) => {
    setSort({ key, dir });
  }, []);

  // Multi-value filter management
  const addStageFilter = () => {
    if (tempStage && !filterStages.includes(tempStage)) {
      setFilterStages([...filterStages, tempStage]);
      setTempStage('');
    }
  };
  const removeStageFilter = (stage) => setFilterStages(filterStages.filter(s => s !== stage));

  const addScoreRange = () => {
    if (tempScoreMin || tempScoreMax) {
      const newRange = { min: tempScoreMin || '0', max: tempScoreMax || '100', id: Date.now() };
      setFilterScoreRanges([...filterScoreRanges, newRange]);
      setTempScoreMin('');
      setTempScoreMax('');
    }
  };
  const removeScoreRange = (id) => setFilterScoreRanges(filterScoreRanges.filter(r => r.id !== id));

  const addValueRange = () => {
    if (tempValueMin || tempValueMax) {
      const newRange = { min: tempValueMin || '0', max: tempValueMax || '∞', id: Date.now() };
      setFilterValueRanges([...filterValueRanges, newRange]);
      setTempValueMin('');
      setTempValueMax('');
    }
  };
  const removeValueRange = (id) => setFilterValueRanges(filterValueRanges.filter(r => r.id !== id));

  const addSourceFilter = () => {
    if (tempSource && !filterSources.includes(tempSource)) {
      setFilterSources([...filterSources, tempSource]);
      setTempSource('');
    }
  };
  const removeSourceFilter = (source) => setFilterSources(filterSources.filter(s => s !== source));

  const clearAllFilters = () => {
    setFilterStages([]);
    setFilterScoreRanges([]);
    setFilterValueRanges([]);
    setFilterSources([]);
  };

  // Get formatted date range for display
  const getDateRangeLabel = useCallback(() => {
    const option = dateRangeOptions.find(opt => opt.id === dateRangeFilter.type);
    if (option) {
      if (dateRangeFilter.type === 'custom' && dateRangeFilter.startDate && dateRangeFilter.endDate) {
        return `${format(new Date(dateRangeFilter.startDate), 'MMM dd')} - ${format(new Date(dateRangeFilter.endDate), 'MMM dd')}`;
      }
      return option.label;
    }
    return 'Last 7 Days';
  }, [dateRangeFilter, dateRangeOptions]);

  // Reset date range filter
  const resetDateRangeFilter = () => {
    setDateRangeFilter({
      type: 'last7days',
      startDate: null,
      endDate: null
    });
    setPage(1);
  };
  const sortedLeads = useMemo(() => {
    // Sorting is handled by backend via `fetchLeads` params.
    // Keep local list order as received.
    return filteredLeads;
  }, [filteredLeads]);

  const columns = useMemo(() => {
    const allColumns = [
      {
        key: 'name', header: 'Lead', sortable: true, width: '220px',
        render: (val, row) => (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-[11px] shrink-0">
              {val[0]}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[13px] text-[var(--text-primary)] truncate">{val}</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{row.company || 'Individual'}</p>
            </div>
          </div>
        )
      },
      { key: 'email', header: 'Email', sortable: true, width: '180px' },
      {
        key: 'statusKey', header: 'Stage', sortable: true, width: '120px',
        render: (val, row) => {
          // Handle legacy data that might have 'stage' instead of 'statusKey'
          const statusValue = val || row.stage || 'new';
          const stage = statusMap?.[statusValue] || { label: statusValue, color: '#94a3b8' };
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ color: stage.color, background: `${stage.color}15`, border: `1px solid ${stage.color}25` }}>
              {stage.label || 'New'}
            </span>
          );
        }
      },
      {
        key: 'score', header: 'Score', sortable: true, width: '80px',
        render: (val) => (
          <span className={`text-[11px] font-bold ${val >= 75 ? 'text-emerald-500' :
            val >= 50 ? 'text-amber-500' : 'text-red-500'
            }`}>{val || 0}pts</span>
        )
      },
      {
        key: 'value', header: 'Value', sortable: true, width: '100px',
        render: (val) => <span className="font-semibold text-[13px] text-[var(--accent)]">{fmt(val || 0)}</span>
      },
      {
        key: 'automation', header: 'Auto', sortable: false, width: '70px',
        render: (val) => (
          val && val.length > 0 ? (
            <span className="text-[10px] text-amber-500 font-medium">{val.length} Active</span>
          ) : (
            <span className="text-[10px] text-[var(--text-muted)]">—</span>
          )
        )
      },
      { key: 'source', header: 'Source', width: '100px' },
      {
        key: 'assignedTo',
        header: 'Assigned To',
        width: '120px',
        render: (val, row) => {
          // Show assigned user name or 'Unassigned'
          const assignedName = val?.name || val || row.assignedToName || 'Unassigned';
          return (
            <span className="text-[11px] text-[var(--text-secondary)] truncate">
              {assignedName}
            </span>
          );
        }
      },
    ];
    return allColumns.filter(col => visibleColumns[col.key] !== false);
  }, [visibleColumns, statusMap]);

  const handleImport = async ({ file, mapping }) => {
    if (!file) {
      toast.error('Please select a file to import');
      return;
    }
    
    try {
      setActionLoading(true);
      toast.loading('Importing leads...', { id: 'import' });

      // Use backend API for import
      const result = await leadsApi.importLeads(file);
      const payload = result?.data?.data || result?.data || result;
      const { inserted, updated, failed, errors } = payload || {};
      
      // Log import activity
      logCreate({ id: 'import', name: `Imported ${inserted || 0} leads from ${file.name}` });
      
      // Show result
      if ((failed || 0) === 0) {
        toast.success(`${inserted || 0} leads imported, ${updated || 0} updated successfully`, { id: 'import' });
      } else {
        toast.success(`${inserted || 0} imported, ${updated || 0} updated, ${failed || 0} failed`, { id: 'import' });
        if (errors && errors.length > 0) {
          console.error('Import errors:', errors);
        }
      }
      
      fetchLeads(); // Refresh list
    } catch (err) {
      console.error('Import failed:', err);
      toast.error(err?.response?.data?.message || 'Failed to import leads', { id: 'import' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = (format) => {
    const dataToExport = sortedLeads;
    const headers = ['Name', 'Company', 'Email', 'Phone', 'Stage', 'Source', 'Value', 'Score', 'City'];
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(lead => [
        `"${lead.name || ''}"`,
        `"${lead.company || ''}"`,
        `"${lead.email || ''}"`,
        `"${lead.phone || ''}"`,
        `"${statusMap?.[lead.statusKey]?.label || lead.statusKey || ''}"`,
        `"${lead.source || ''}"`,
        lead.value || 0,
        lead.score || 0,
        `"${lead.city || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Alert removed as per user request - no alerts on lead pages
  };

  const toggleColumn = (colKey) => {
    setVisibleColumns(prev => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  const applySort = (key) => {
    setSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
    setShowSortDropdown(false);
  };

  return (
    <div className="animate-fade-in space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <PageHeader
          title="CRM Module"
          subtitle="Rulebook Compliant Lead Management"
          tabs={[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'leads', label: 'Leads', icon: List },
            { id: 'kanban', label: 'Kanban', icon: LayoutDashboard },
          ]}
          activeTab={view}
          onTabChange={setView}
        />

        {/* Data Visibility Indicator */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-medium ${userDataScope === 'ALL'
          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
          <Eye size={12} />
          <span>
            {userDataScope === 'ALL' ? 'Showing: All Leads' : 'Showing: Assigned Leads Only'}
          </span>
        </div>
      </div>

      {/* ── Date Filters ── */}
      {view === 'dashboard' && (
        <div className="glass-card p-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Date Range:</span>
              <Input
                type="date"
                value={dateRange.start}
                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="h-7 text-xs w-32"
              />
              <span className="text-xs text-[var(--text-muted)]">to</span>
              <Input
                type="date"
                value={dateRange.end}
                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="h-7 text-xs w-32"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Year:</span>
              <Select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="h-7 text-xs w-24"
              >
                {[2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Month:</span>
              <Select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="h-7 text-xs w-28"
              >
                {[
                  { value: 1, label: 'January' },
                  { value: 2, label: 'February' },
                  { value: 3, label: 'March' },
                  { value: 4, label: 'April' },
                  { value: 5, label: 'May' },
                  { value: 6, label: 'June' },
                  { value: 7, label: 'July' },
                  { value: 8, label: 'August' },
                  { value: 9, label: 'September' },
                  { value: 10, label: 'October' },
                  { value: 11, label: 'November' },
                  { value: 12, label: 'December' },
                ].map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </Select>
            </div>
            <div className="ml-auto flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateRange({
                    start: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
                    end: format(new Date(), 'yyyy-MM-dd')
                  });
                  setSelectedYear(new Date().getFullYear());
                  setSelectedMonth(new Date().getMonth() + 1);
                }}
              >
                <RefreshCw size={12} /> Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Advanced Dashboard ── */}
      {view === 'dashboard' && (
        <LeadAnalyticsDashboard />
      )}

      {/* ── Kanban Board View ── */}
      {view === 'kanban' && (
        <div className="space-y-4">
          {(() => { console.log('[KANBAN DEBUG] statusOptions:', statusOptions); console.log('[KANBAN DEBUG] enhancedLeads first 3:', enhancedLeads.slice(0, 3).map(l => ({ name: l.name, statusKey: l.statusKey, status: l.status }))); return null; })()}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Pipeline Kanban Board</h3>
              <span className="text-xs text-[var(--text-muted)]">{enhancedLeads.length} total leads</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[10px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hovered)] transition-colors">
                <FilterX size={10} className="inline mr-1" /> Clear Filters
              </button>
              <button className="px-3 py-1 rounded-lg bg-[var(--primary)] text-white text-[10px] font-medium hover:opacity-90 transition-opacity">
                <Plus size={10} className="inline mr-1" /> Add Stage
              </button>
            </div>
          </div>

          <div className="overflow-x-auto pb-3">
            <div className="flex gap-4 min-w-max">
              {(statusOptions || []).map((stage) => {
                // Filter leads that match this stage's key - handle both statusKey and status fields
                // Use case-insensitive comparison to handle status value mismatches
                const stageLeads = enhancedLeads.filter(lead => {
                  const leadStatus = normalizeStageKey(lead);
                  return leadStatus === stage.key.toLowerCase();
                });
                const totalValue = stageLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
                const stageLeadIds = stageLeads.map(l => getLeadId(l));

                return (
                  <div key={stage.key}
                    className={`flex flex-col w-64 rounded-[14px] border border-[#F1F5F9] bg-[#F8FAFC] p-2.5 transition-colors`}
                    onDragOver={e => { e.preventDefault(); }}
                    onDragEnter={() => {
                      if (!dragRef.current) return;
                      dragRef.current.destStageKey = stage.key;
                      dragRef.current.destIndex = stageLeadIds.length;
                    }}
                    onDrop={(e) => {
                      if (!can('crm', 'edit')) {
                        toast.error('Permission denied: Cannot change lead status');
                        return;
                      }
                      const drag = dragRef.current;
                      const fallbackId = e.dataTransfer.getData('leadId');
                      const leadId = drag?.leadId || fallbackId;
                      if (!leadId) return;

                      const targetStageKey = drag?.destStageKey || stage.key;
                      let destIndex = Number.isFinite(drag?.destIndex) ? drag.destIndex : stageLeadIds.length;
                      destIndex = Math.max(0, Math.min(destIndex, stageLeadIds.length));

                      const sourceStageKey = drag?.sourceStageKey;
                      const sourceIndex = drag?.sourceIndex;
                      if (sourceStageKey && String(sourceStageKey).toLowerCase() === String(targetStageKey).toLowerCase()) {
                        if (Number.isFinite(sourceIndex) && sourceIndex < destIndex) {
                          destIndex = Math.max(0, destIndex - 1);
                        }
                      }

                      const snapshot = drag?.originalActiveLeads || activeLeads;
                      setActiveLeads((prev) =>
                        reorderLeadInActiveLeads({
                          prev,
                          leadId,
                          destStageKey: targetStageKey,
                          destIndex,
                          destStageLeadIds: stageLeadIds.filter((id) => String(id) !== String(leadId)),
                        })
                      );

                      const apiStage = String(targetStageKey).toUpperCase();
                      leadsApi
                        .update(leadId, { stage: apiStage })
                        .then(() => {
                          logUpdate({ id: leadId, statusKey: targetStageKey });
                          dragRef.current = null;
                        })
                        .catch((err) => {
                          console.error('Stage update failed:', err);
                          toast.error('Stage update failed');
                          setActiveLeads(snapshot);
                          dragRef.current = null;
                          fetchLeads();
                        });
                    }}
                  >
                    <div className="pb-2.5 mb-2 border-b border-[#F1F5F9]">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                          <span className="text-[13px] font-semibold text-[#374151]">{stage.label}</span>
                        </div>
                        <span className="rounded-full bg-[#F3F4F6] text-[11px] px-2 py-0.5 text-[#374151] font-medium">{stageLeads.length}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF] pl-4">
                        <span>{stageLeads.length} leads</span><span>·</span><span>{fmt(totalValue)}</span>
                      </div>
                    </div>
                    <div
                      className="flex flex-col gap-2.5 flex-1 min-h-[120px]"
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (!dragRef.current) return;
                        dragRef.current.destStageKey = stage.key;

                        const cards = Array.from(e.currentTarget.querySelectorAll('[data-kanban-card="true"]'));
                        const y = e.clientY;

                        let nextIndex = cards.length;
                        for (let i = 0; i < cards.length; i++) {
                          const rect = cards[i].getBoundingClientRect();
                          const midpoint = rect.top + rect.height / 2;
                          if (y < midpoint) {
                            nextIndex = i;
                            break;
                          }
                        }

                        dragRef.current.destIndex = nextIndex;
                      }}
                    >
                      {stageLeads.map((lead, idx) => (
                        <div
                          key={lead._id || lead.id || `lead-${Math.random()}`}
                          data-kanban-card="true"
                          draggable
                          onDragStart={(e) => {
                            const leadId = getLeadId(lead);
                            e.currentTarget.classList.add('opacity-95', 'scale-[1.02]');
                            dragRef.current = {
                              leadId,
                              sourceStageKey: stage.key,
                              sourceIndex: idx,
                              destStageKey: stage.key,
                              destIndex: idx,
                              originalActiveLeads: activeLeads,
                            };
                            e.dataTransfer.setData('leadId', leadId);
                          }}
                          onDragEnd={(e) => {
                            e.currentTarget.classList.remove('opacity-95', 'scale-[1.02]');
                          }}
                          onDragEnter={() => {
                            if (!dragRef.current) return;
                            dragRef.current.destStageKey = stage.key;
                            dragRef.current.destIndex = idx;
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (!dragRef.current) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const midpoint = rect.top + rect.height / 2;
                            const insertAfter = e.clientY > midpoint;
                            dragRef.current.destStageKey = stage.key;
                            dragRef.current.destIndex = insertAfter ? (idx + 1) : idx;
                          }}
                          className="rounded-xl bg-white border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-[0_6px_12px_rgba(0,0,0,0.08)] hover:border-[#D1D5DB]"
                          onClick={() => { setTrackerLeadId(lead._id || lead.id); setShowTrackerDrawer(true); }}
                        >
                          {/* Lead Header */}
                          <div className="flex items-start justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-semibold text-[12px]">
                                {lead.name[0]}
                              </div>
                              <div>
                                <p className="text-[14px] font-semibold text-[#111827]">{lead.name}</p>
                                <p className="text-[12px] font-normal text-[#6B7280]">{lead.company || 'Individual'}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {lead.slaBreached && (
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="SLA Breached" />
                              )}
                              {lead.automation && lead.automation.length > 0 && (
                                <Sparkles size={10} className="text-amber-500" title={`${lead.automation.length} automation rules active`} />
                              )}
                            </div>
                          </div>

                          {/* Lead Details */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-semibold text-[#F97316]">{fmt(lead.value || 0)}</span>
                              <div className="flex items-center gap-1">
                                <Brain size={8} className="text-[var(--text-muted)]" />
                                <span className="text-[12px] font-medium text-[#10B981]">{lead.score || 0}pts</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <SourceBadge source={lead.source} />
                              <span className="text-[11px] text-[#9CA3AF]">•</span>
                              <span className="text-[11px] text-[#9CA3AF]">{lead.kw || lead.systemSize || '0'}kW</span>
                            </div>

                            {lead.activities && lead.activities.length > 0 && (
                              <div className="flex items-center gap-1 text-[11px] text-[#9CA3AF]">
                                <Clock size={8} />
                                <span>Last: {lead.activities[lead.activities.length - 1].ts}</span>
                              </div>
                            )}

                            {/* Assigned User */}
                            {lead.assignedTo && (
                              <div className="flex items-center gap-1 text-[11px] text-[#6B7280]">
                                <UserCheck size={8} />
                                <span>Assigned: {lead.assignedTo?.name || lead.assignedTo}</span>
                              </div>
                            )}

                            {/* Tags */}
                            {lead.tags && lead.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {lead.tags.slice(0, 2).map((tag, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 rounded text-[8px] bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                                    {tag}
                                  </span>
                                ))}
                                {lead.tags.length > 2 && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] text-[var(--text-muted)]">+{lead.tags.length - 2}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {stageLeads.length === 0 && (
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
        </div>
      )}

      {/* ── Leads Table View ── */}
      {view === 'leads' && (
        <div className="space-y-4">
          {/* Action Buttons & Filter Toggle */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={showAdvancedFilters ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : ''}
              >
                <Filter size={14} className="mr-1" />
                {showAdvancedFilters ? 'Hide Filters' : 'Advanced Filters'}
              </Button>

              {/* Date Range Picker */}
              <div className="relative" ref={dateRangeRef}>
                <Button
                  variant="outline"
                  onClick={() => setShowDateRangeDropdown(!showDateRangeDropdown)}
                  className={showDateRangeDropdown ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : ''}
                >
                  <Calendar size={14} className="mr-1" />
                  {getDateRangeLabel()}
                  <ChevronDown size={12} className="ml-1" />
                </Button>

                {showDateRangeDropdown && (
                  <div className="absolute left-0 top-full mt-2 w-56 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] shadow-lg z-50">
                    <div className="p-2">
                      <p className="text-[10px] text-[var(--text-muted)] px-2 py-1 uppercase tracking-wider">Date Range</p>
                      {dateRangeOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setDateRangeFilter(prev => ({
                              ...prev,
                              type: option.id,
                              ...(option.id !== 'custom' ? { startDate: null, endDate: null } : {})
                            }));
                            // Don't close dropdown for custom - show date inputs
                            if (option.id !== 'custom') {
                              setShowDateRangeDropdown(false);
                              setPage(1); // Reset pagination
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded text-xs flex items-center justify-between hover:bg-[var(--bg-hovered)] ${dateRangeFilter.type === option.id
                            ? 'text-[var(--primary)] font-bold bg-[var(--primary)]/10'
                            : 'text-[var(--text-secondary)]'
                            }`}
                        >
                          {option.label}
                          {dateRangeFilter.type === option.id && <CheckCircle2 size={12} />}
                        </button>
                      ))}

                      {/* Custom Range Inputs */}
                      {dateRangeFilter.type === 'custom' && (
                        <div className="mt-2 pt-2 border-t border-[var(--border-base)] px-2">
                          <p className="text-[10px] text-[var(--text-muted)] mb-2">Custom Range</p>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[var(--text-muted)] w-10">From:</span>
                              <Input
                                type="date"
                                value={dateRangeFilter.startDate || ''}
                                onChange={(e) => setDateRangeFilter(prev => ({ ...prev, startDate: e.target.value }))}
                                className="h-7 text-xs flex-1"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[var(--text-muted)] w-10">To:</span>
                              <Input
                                type="date"
                                value={dateRangeFilter.endDate || ''}
                                onChange={(e) => setDateRangeFilter(prev => ({ ...prev, endDate: e.target.value }))}
                                className="h-7 text-xs flex-1"
                              />
                            </div>
                            <Button
                              size="sm"
                              className="w-full mt-1"
                              onClick={() => {
                                if (dateRangeFilter.startDate && dateRangeFilter.endDate) {
                                  setShowDateRangeDropdown(false);
                                  setPage(1);
                                }
                              }}
                              disabled={!dateRangeFilter.startDate || !dateRangeFilter.endDate}
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Reset Filter Button */}
              {dateRangeFilter.type !== 'last7days' && (
                <button
                  onClick={resetDateRangeFilter}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-xs text-[var(--text-muted)] hover:bg-[var(--bg-hovered)] transition-colors flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Reset
                </button>
              )}

              {(filterStages.length > 0 || filterScoreRanges.length > 0 || filterValueRanges.length > 0 || filterSources.length > 0) && (
                <button
                  onClick={clearAllFilters}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-xs text-[var(--text-muted)] hover:bg-[var(--bg-hovered)] transition-colors flex items-center gap-1"
                >
                  <FilterX size={12} /> Clear All
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {can('crm', 'create') && (
                <Button variant="outline" onClick={() => setShowAddModal(true)}><Plus size={14} /> Add Lead</Button>
              )}
              <ImportExport moduleName="Leads" fields={crmFields} onImport={handleImport} onExport={handleExport} />
            </div>
          </div>

          {/* Date Range Status Message */}
          {dateRangeFilter.type !== 'custom' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600">
              <Info size={14} />
              <span>
                Showing leads from the <strong>{getDateRangeLabel()}</strong>.
                Use the date filter to view older leads.
              </span>
            </div>
          )}
          {dateRangeFilter.type === 'custom' && dateRangeFilter.startDate && dateRangeFilter.endDate && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600">
              <CheckCircle2 size={14} />
              <span>
                Showing leads from <strong>{format(new Date(dateRangeFilter.startDate), 'MMM dd')} - {format(new Date(dateRangeFilter.endDate), 'MMM dd')}</strong>
              </span>
            </div>
          )}

          {/* Advanced Filters Panel - Compact Single Row */}
          {showAdvancedFilters && (
            <div className="glass-card p-4 rounded-lg border border-[var(--border-base)] w-full">
              <div className="flex flex-wrap items-start gap-4">
                {/* Stage Filter */}
                <div className="space-y-1 flex-1 min-w-[220px]">
                  <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Stage</label>
                  <div className="flex items-center gap-1.5">
                    <Select value={tempStage} onChange={(e) => setTempStage(e.target.value)} className="flex-1 text-sm">
                      <option value="">Select</option>
                      {(statusOptions || []).map(s => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </Select>
                    <Button size="sm" className="px-2" onClick={addStageFilter} disabled={!tempStage}><Plus size={12} /></Button>
                  </div>
                  {filterStages.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {filterStages.map(stage => (
                        <span key={stage} className="px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] flex items-center gap-1">
                          {statusMap[stage]?.label || stage}
                          <button onClick={() => removeStageFilter(stage)} className="hover:text-red-500"><X size={8} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Source Filter */}
                <div className="space-y-1 flex-1 min-w-[220px]">
                  <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Source</label>
                  <div className="flex items-center gap-1.5">
                    <Select value={tempSource} onChange={(e) => setTempSource(e.target.value)} className="flex-1 text-sm">
                      <option value="">Select</option>
                      {SOURCES.filter(s => s !== 'All').map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                    <Button size="sm" className="px-2" onClick={addSourceFilter} disabled={!tempSource}><Plus size={12} /></Button>
                  </div>
                  {filterSources.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {filterSources.map(source => (
                        <span key={source} className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-[10px] flex items-center gap-1">
                          {source}
                          <button onClick={() => removeSourceFilter(source)} className="hover:text-red-500"><X size={8} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Score Range */}
                <div className="space-y-1 flex-1 min-w-[200px]">
                  <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Score</label>
                  <div className="flex items-center gap-1.5">
                    <Input type="number" placeholder="Min" value={tempScoreMin} onChange={(e) => setTempScoreMin(e.target.value)} className="h-8 text-sm w-20 px-2" />
                    <span className="text-[var(--text-muted)] text-sm">-</span>
                    <Input type="number" placeholder="Max" value={tempScoreMax} onChange={(e) => setTempScoreMax(e.target.value)} className="h-8 text-sm w-20 px-2" />
                    <Button size="sm" className="px-2" onClick={addScoreRange} disabled={!tempScoreMin && !tempScoreMax}><Plus size={12} /></Button>
                  </div>
                  {filterScoreRanges.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {filterScoreRanges.map(range => (
                        <span key={range.id} className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] flex items-center gap-1">
                          {range.min}-{range.max}
                          <button onClick={() => removeScoreRange(range.id)} className="hover:text-red-500"><X size={8} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Value Range */}
                <div className="space-y-1 flex-1 min-w-[200px]">
                  <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Value ₹</label>
                  <div className="flex items-center gap-1.5">
                    <Input type="number" placeholder="Min" value={tempValueMin} onChange={(e) => setTempValueMin(e.target.value)} className="h-8 text-sm w-20 px-2" />
                    <span className="text-[var(--text-muted)] text-sm">-</span>
                    <Input type="number" placeholder="Max" value={tempValueMax} onChange={(e) => setTempValueMax(e.target.value)} className="h-8 text-sm w-20 px-2" />
                    <Button size="sm" className="px-2" onClick={addValueRange} disabled={!tempValueMin && !tempValueMax}><Plus size={12} /></Button>
                  </div>
                  {filterValueRanges.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {filterValueRanges.map(range => (
                        <span key={range.id} className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] flex items-center gap-1">
                          {range.min}-{range.max}
                          <button onClick={() => removeValueRange(range.id)} className="hover:text-red-500"><X size={8} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Results Count */}
              <div className="flex justify-end pt-2 mt-2 border-t border-[var(--border-base)]">
                <span className="text-[10px] text-[var(--text-muted)]">
                  {totalLeads} leads found
                </span>
              </div>
            </div>
          )}
          <DataTable
            columns={columns}
            data={sortedLeads}
            rowKey="_id"
            total={totalLeads}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSort={handleSort}
            toolbar={(
              <div className="flex items-center gap-2">
                <div className="relative" ref={sortDropdownRef}>
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className={`h-8 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-2 ${showSortDropdown ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[var(--bg-elevated)] border-[var(--border-base)] text-[var(--text-muted)] hover:bg-[var(--bg-hovered)]'}`}
                  >
                    {sort.dir === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />}
                    Sort
                  </button>
                  {showSortDropdown && (
                    <div className="absolute left-0 top-full mt-2 w-48 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] shadow-lg z-50">
                      <div className="p-2">
                        <p className="text-[10px] text-[var(--text-muted)] px-2 py-1">Sort by</p>
                        {[
                          { key: 'name', label: 'Lead Name' },
                          { key: 'email', label: 'Email' },
                          { key: 'statusKey', label: 'Stage' },
                          { key: 'score', label: 'Lead Score' },
                          { key: 'value', label: 'Deal Value' },
                          { key: 'source', label: 'Source' }
                        ].map((col) => (
                          <button
                            key={col.key}
                            onClick={() => applySort(col.key)}
                            className={`w-full text-left px-3 py-2 rounded text-xs flex items-center justify-between hover:bg-[var(--bg-hovered)] ${sort.key === col.key ? 'text-[var(--primary)] font-bold' : 'text-[var(--text-secondary)]'}`}
                          >
                            {col.label}
                            {sort.key === col.key && (
                              sort.dir === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            onRowClick={(row) => { handleViewLead(row); }}
            search={search}
            onSearch={setSearch}
            selectedRows={selected}
            onSelectRows={setSelected}
            bulkActions={[
              ...(can('crm', 'export') ? [{
                label: 'Export',
                icon: Download,
                onClick: (selectedIds) => {
                  if (guardExport()) handleBulkExport(selectedIds);
                }
              }] : []),
              ...(can('crm', 'edit') ? [{ label: 'Score Boost', icon: Brain, onClick: (selectedIds) => { if (guardEdit()) handleOpenScoreBoostModal(selectedIds); } }] : []),
              ...(can('crm', 'assign') ? [{ label: 'Assign', icon: UserCheck, onClick: (selectedIds) => handleOpenAssignModal(selectedIds) }] : []),
              ...(can('crm', 'delete') ? [{ label: 'Delete', icon: Trash2, onClick: (selectedIds) => { if (guardDelete()) handleBulkDelete(selectedIds); }, danger: true }] : []),
            ]}
            rowActions={[
              { label: 'View', icon: Eye, onClick: handleViewLead },
              { label: 'Lead Tracker', icon: Target, onClick: handleViewTracker },
              { label: 'Edit', icon: Edit2, onClick: handleEditLead },
              { label: 'Assign Lead', icon: UserCheck, onClick: (lead) => handleOpenAssignModal([lead._id || lead.id]), showWhen: () => can('crm', 'assign') },
              { label: 'Flip to Survey', icon: Zap, onClick: handleFlipToSurvey },
              { label: 'Score', icon: Brain, onClick: handleRecalculateScore },
              { label: 'Delete', icon: Trash2, onClick: handleDeleteLead, danger: true },
              { label: 'Activity Log', icon: Activity, onClick: handleViewActivity },
            ]}
          />
        </div>
      )
      }
      {/* ADD LEAD MODAL */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Lead"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleCreateLead} disabled={actionLoading}>
              {actionLoading ? 'Creating...' : <><Plus size={13} /> Create Lead</>}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First Name">
              <Input
                placeholder="Enter first name"
                value={newLead.firstName || ''}
                onChange={(e) => setNewLead({ ...newLead, firstName: e.target.value })}
              />
            </FormField>
            <FormField label="Last Name">
              <Input
                placeholder="Enter last name"
                value={newLead.lastName || ''}
                onChange={(e) => setNewLead({ ...newLead, lastName: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="Company">
            <Input
              placeholder="Company name (optional)"
              value={newLead.company}
              onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email">
              <Input
                type="email"
                placeholder="email@example.com"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
              />
            </FormField>
            <FormField label="Phone">
              <Input
                placeholder="+91 98765 43210"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Source">
              <Select
                value={newLead.source}
                onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
              >
                <option value="">Select source</option>
                {SOURCES.filter(s => s !== 'All').map(s => <option key={s}>{s}</option>)}
              </Select>
            </FormField>
            <FormField label="City">
              <Select
                value={newLead.city}
                onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
              >
                <option value="">Select city</option>
                {CITIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea
              placeholder="Additional notes..."
              rows={3}
              value={newLead.notes}
              onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
            />
          </FormField>
          <FormField label="Status">
            <Select
              value={newLead.statusKey}
              onChange={(e) => setNewLead({ ...newLead, statusKey: e.target.value })}
            >
              {(statusOptions || []).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
          </FormField>
        </div>
      </Modal>

      {/* LEAD DETAIL MODAL */}
      {
        selectedLead && (
          <Modal
            open={!!selectedLead}
            onClose={() => setSelectedLead(null)}
            title={`Lead Details — ${selectedLead.name}`}
            footer={
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setSelectedLead(null)}>Close</Button>
                {can('crm', 'edit') && (
                  <Button variant="outline" onClick={() => handleEditLead(selectedLead)}><Edit2 size={13} /> Edit</Button>
                )}
                <Button onClick={() => handleCallLead(selectedLead)}><Phone size={13} /> Call Lead</Button>
              </div>
            }
          >
            <div className="space-y-4">
              {/* Hero section */}
              <div className="flex items-start gap-4 pb-4 border-b border-[var(--border-base)]">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${avatarColor(selectedLead.name)}30, ${avatarColor(selectedLead.name)}10)`,
                    color: avatarColor(selectedLead.name),
                    border: `2px solid ${avatarColor(selectedLead.name)}35`,
                  }}
                >
                  {selectedLead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">{selectedLead.name}</h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                        <Building2 size={11} /> {selectedLead.company || 'Individual'}
                      </p>
                    </div>
                    <SLADot breached={selectedLead.slaBreached} />
                  </div>
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <StagePill stageId={selectedLead.statusKey} stageMap={statusMap} />
                    <SourceBadge source={selectedLead.source} />
                    <ScoreBadge score={selectedLead.score} />
                  </div>
                  {selectedLead.tags && selectedLead.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Tag size={10} className="text-[var(--text-muted)]" />
                      {selectedLead.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-muted)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  ['Email', selectedLead.email, Mail, 'blue'],
                  ['Phone', selectedLead.phone, Phone, 'emerald'],
                  ['City', `${selectedLead.city || '—'}, ${selectedLead.state || ''}`, MapPin, 'purple'],
                  ['Source', selectedLead.source, BarChart2, 'amber'],
                  ['Pipeline Value', fmt(selectedLead.value || 0), DollarSign, 'green'],
                  ['System Size', `${selectedLead.kw || selectedLead.capacity || '0 kW'}`, Zap, 'yellow'],
                  ['Roof Area', `${selectedLead.roofArea || '—'} m²`, Activity, 'cyan'],
                  ['Monthly Bill', fmt(selectedLead.monthlyBill || 0), TrendingUp, 'pink'],
                ].map(([label, val, Icon, colorKey]) => {
                  const colorMap = { blue: '#3b82f6', emerald: '#10b981', purple: '#a855f7', amber: '#f59e0b', green: '#22c55e', yellow: '#eab308', cyan: '#06b6d4', pink: '#ec4899' };
                  const c = colorMap[colorKey] || '#3b82f6';
                  return (
                    <div key={label} className="rounded-xl p-3 border border-[var(--border-subtle)]" style={{ background: 'var(--bg-elevated)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: `${c}15` }}>
                          <Icon size={11} style={{ color: c }} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
                      </div>
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{val}</p>
                    </div>
                  );
                })}
              </div>

              {/* Recent Activity */}
              {selectedLead.activities && selectedLead.activities.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Recent Activity</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {selectedLead.activities.slice(0, 4).map((act, idx) => (
                      <div key={act.id || `activity-${idx}`} className="flex gap-2.5 text-xs">
                        <div className="w-6 h-6 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-base)] flex items-center justify-center shrink-0 mt-0.5">
                          {act.type === 'call' && <Phone size={10} className="text-emerald-400" />}
                          {act.type === 'email' && <Mail size={10} className="text-blue-400" />}
                          {act.type === 'whatsapp' && <MessageSquare size={10} className="text-emerald-400" />}
                          {act.type === 'note' && <Activity size={10} className="text-amber-400" />}
                          {act.type === 'stage_change' && <GitCommit size={10} className="text-purple-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--text-secondary)] leading-relaxed">{act.note}</p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{act.ts} · {act.by}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )
      }

      {/* EDIT LEAD MODAL */}
      {showEditModal && editingLead && (
        <Modal
          open={showEditModal}
          onClose={() => { setShowEditModal(false); setEditingLead(null); }}
          title={`Edit Lead — ${editingLead.name}`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setShowEditModal(false); setEditingLead(null); }}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={actionLoading}>
                {actionLoading ? 'Saving...' : <><Save size={13} /> Save Changes</>}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Name">
                <Input
                  value={editingLead.name}
                  onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                />
              </FormField>
              <FormField label="Company">
                <Input
                  value={editingLead.company || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, company: e.target.value })}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Email">
                <Input
                  type="email"
                  value={editingLead.email || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                />
              </FormField>
              <FormField label="Phone">
                <Input
                  value={editingLead.phone || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Stage">
                <Select
                  value={editingLead.statusKey || editingLead.status || editingLead.stage || 'new'}
                  onChange={(e) => setEditingLead({ ...editingLead, statusKey: e.target.value, status: e.target.value })}
                >
                  {(statusOptions || []).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </Select>
              </FormField>
              <FormField label="Source">
                <Select
                  value={editingLead.source}
                  onChange={(e) => setEditingLead({ ...editingLead, source: e.target.value })}
                >
                  {SOURCES.filter(s => s !== 'All').map(s => <option key={s}>{s}</option>)}
                </Select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Value (₹)">
                <Input
                  type="number"
                  value={editingLead.value || 0}
                  onChange={(e) => setEditingLead({ ...editingLead, value: parseInt(e.target.value) || 0 })}
                />
              </FormField>
              <FormField label="City">
                <Input
                  value={editingLead.city || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, city: e.target.value })}
                />
              </FormField>
            </div>
            <FormField label="Notes">
              <Textarea
                rows={3}
                value={editingLead.notes || ''}
                onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
              />
            </FormField>

            {/* Lead Assignment - Only show if user has assign permission */}
            {can('crm', 'assign') && (
              <FormField label="Assigned To">
                <UserSelect
                  value={editingLead.assignedTo || ''}
                  onChange={(userId) => setEditingLead({ ...editingLead, assignedTo: userId })}
                  placeholder="Select user to assign..."
                />
              </FormField>
            )}
          </div>
        </Modal>
      )}

      {/* ACTIVITY LOG SIDEBAR DRAWER */}
      {showActivityModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => { setShowActivityModal(false); setNewActivityNote(''); setActivityLeadId(null); }}
          />
          {/* Sidebar Drawer */}
          <div className="fixed right-0 top-[36.5px] bottom-0 w-[450px] bg-white border-l border-[var(--border-base)] z-50 shadow-2xl flex flex-col" style={{ transform: 'translateX(0)', transition: 'transform 0.3s ease-out' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-base)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Activity Log</h3>
              <button
                onClick={() => { setShowActivityModal(false); setNewActivityNote(''); setActivityLeadId(null); }}
                className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
              >
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Activity Timeline */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {activityData.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] py-4">No activities found.</p>
                ) : (
                  activityData.map((event, idx) => (
                    <div key={idx} className="flex gap-3 text-sm border-l-2 border-[var(--border-subtle)] pl-3 py-1">
                      <div className="w-6 h-6 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center shrink-0">
                        {event.type === 'call' && <Phone size={12} className="text-emerald-400" />}
                        {event.type === 'email' && <Mail size={12} className="text-blue-400" />}
                        {event.type === 'stage_change' && <GitCommit size={12} className="text-purple-400" />}
                        {event.type === 'created' && <UserPlus size={12} className="text-green-400" />}
                        {event.type === 'note' && <FileText size={12} className="text-amber-400" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-[var(--text-primary)]">{event.note}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{formatTimeAgo(event.timestamp)} · {event.by}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add New Activity Input */}
            <div className="border-t border-[var(--border-base)] p-4 bg-[var(--bg-elevated)]">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Add Activity</p>
              <div className="flex gap-2">
                <textarea
                  value={newActivityNote}
                  onChange={(e) => setNewActivityNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveActivity();
                    }
                  }}
                  placeholder="Enter Activity"
                  rows={3}
                  className="flex-1 px-3 py-2 text-sm bg-[var(--bg-base)] border border-[var(--border-base)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                />
              </div>
              <div className="flex justify-end mt-3">
                <Button
                  onClick={handleSaveActivity}
                  disabled={actionLoading || !newActivityNote.trim()}
                  size="sm"
                >
                  {actionLoading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* LEAD TRACKER SIDEBAR DRAWER */}
      {showTrackerDrawer && trackerLeadId && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/1 z-40 transition-opacity"
            onClick={() => { setShowTrackerDrawer(false); setTrackerLeadId(null); }}
          />
          {/* Sidebar Drawer */}
          <div className="fixed right-0 top-[36.5px] bottom-0 w-[450px] bg-white border-l border-[var(--border-base)] z-50 shadow-2xl flex flex-col" style={{ transform: 'translateX(0)', transition: 'transform 0.3s ease-out' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-base)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Lead Tracker</h3>
              <button
                onClick={() => { setShowTrackerDrawer(false); setTrackerLeadId(null); }}
                className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
              >
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Lead Tracker Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <LeadTracker
                leadId={trackerLeadId}
                statusOptions={statusOptions}
                onStageChange={fetchLeads}
              />
            </div>
          </div>
        </>
      )}

      {/* SCORE EDIT MODAL */}
      {showScoreEditModal && scoreEditingLead && (
        <Modal
          open={showScoreEditModal}
          onClose={() => { setShowScoreEditModal(false); setScoreEditingLead(null); }}
          title={`Edit Score — ${scoreEditingLead.name}`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setShowScoreEditModal(false); setScoreEditingLead(null); }}>Cancel</Button>
              <Button onClick={handleSaveScore} disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Update Score'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)]">
              <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-lg">
                {scoreEditingLead.name[0]}
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">{scoreEditingLead.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{scoreEditingLead.company || 'Individual'}</p>
              </div>
            </div>
            <FormField label="Score (0-100)">
              <Input
                type="number"
                min="0"
                max="100"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                placeholder="Enter score between 0 and 100"
              />
            </FormField>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setNewScore('0')}>0</Button>
              <Button variant="secondary" size="sm" onClick={() => setNewScore('25')}>25</Button>
              <Button variant="secondary" size="sm" onClick={() => setNewScore('50')}>50</Button>
              <Button variant="secondary" size="sm" onClick={() => setNewScore('75')}>75</Button>
              <Button variant="secondary" size="sm" onClick={() => setNewScore('100')}>100</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ASSIGN LEADS MODAL */}
      {showAssignModal && (
        <Modal
          open={showAssignModal}
          onClose={handleCloseAssignModal}
          title={`Assign Leads (${assigningLeadIds.length})`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={handleCloseAssignModal}>Cancel</Button>
              <Button onClick={handleAssignLeads} disabled={assignLoading || !selectedAssignUser}>
                {assignLoading ? 'Assigning...' : <><UserCheck size={13} /> Assign</>}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              Select a role and user to assign {assigningLeadIds.length === 1 ? 'this lead' : `these ${assigningLeadIds.length} leads`} to:
            </p>

            {/* Role Selection */}
            <FormField label="Role">
              <Select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                disabled={rolesLoading}
              >
                <option value="">{rolesLoading ? 'Loading roles...' : 'Select Role'}</option>
                {roles.map((role) => (
                  <option key={role._id || role.id} value={role._id || role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </FormField>

            {/* User Selection (filtered by role) */}
            <FormField label="User">
              <Select
                value={selectedAssignUser}
                onChange={(e) => setSelectedAssignUser(e.target.value)}
                disabled={!selectedRole || usersLoading}
              >
                <option value="">
                  {!selectedRole
                    ? 'Select role first'
                    : usersLoading
                      ? 'Loading users...'
                      : 'Select User'
                  }
                </option>
                {filteredUsers.map((user) => (
                  <option key={user._id || user.id} value={user._id || user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </Modal>
      )}

      {/* SCORE BOOST MODAL */}
      {showScoreBoostModal && (
        <Modal
          open={showScoreBoostModal}
          onClose={handleCloseScoreBoostModal}
          title={`Score Boost (${scoreBoostLeadIds.length})`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={handleCloseScoreBoostModal}>Cancel</Button>
              <Button onClick={handleScoreBoost} disabled={scoreBoostLoading || !scoreBoostValue}>
                {scoreBoostLoading ? 'Boosting...' : <><Brain size={13} /> Boost Score</>}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              Increase score by {scoreBoostValue} points for {scoreBoostLeadIds.length === 1 ? 'this lead' : `these ${scoreBoostLeadIds.length} leads`}:
            </p>
            <FormField label="Score Increase">
              <Input
                type="number"
                min="1"
                max="100"
                value={scoreBoostValue}
                onChange={(e) => setScoreBoostValue(parseInt(e.target.value) || 0)}
                placeholder="Enter score increase"
              />
            </FormField>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setScoreBoostValue(5)}>+5</Button>
              <Button variant="secondary" size="sm" onClick={() => setScoreBoostValue(10)}>+10</Button>
              <Button variant="secondary" size="sm" onClick={() => setScoreBoostValue(15)}>+15</Button>
              <Button variant="secondary" size="sm" onClick={() => setScoreBoostValue(20)}>+20</Button>
              <Button variant="secondary" size="sm" onClick={() => setScoreBoostValue(25)}>+25</Button>
            </div>
          </div>
        </Modal>
      )}

    </div >
  );
};



export default CRMPage;

