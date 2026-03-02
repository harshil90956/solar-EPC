// Solar OS – Lead Management Module (Premium Enterprise Edition)
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
  Gauge, Targeted, FilterX, SearchX, UserPlus, UserMinus
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Treemap, ComposedChart, ScatterChart, Scatter
} from 'recharts';
import { LEADS, PIPELINE_STAGES, USERS } from '../data/mockData';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea, FormField } from '../components/ui/Input';
import DataTable from '../components/ui/DataTable';
import FilterSystem from '../components/ui/FilterSystem';
import ImportExport from '../components/ui/ImportExport';
import { useAuditLog } from '../hooks/useAuditLog';
import { CURRENCY } from '../config/app.config';
import CanAccess from '../components/CanAccess';

const fmt = CURRENCY.format;

const CRM_FIELDS = [
  { id: 'name', label: 'Lead Name', type: 'text', required: true },
  { id: 'company', label: 'Company', type: 'text' },
  { id: 'email', label: 'Email', type: 'email' },
  { id: 'phone', label: 'Phone', type: 'tel' },
  { id: 'stage', label: 'Stage', type: 'select', options: PIPELINE_STAGES },
  { id: 'value', label: 'Deal Value', type: 'number' },
  { id: 'source', label: 'Source', type: 'select', options: ['Website', 'Referral', 'Campaign', 'Ads'] },
];

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
const DashboardKPI = ({ title, value, change, icon: Icon, color, subtitle, trend }) => (
  <div className="glass-card p-4 flex items-center gap-3 hover:scale-[1.02] transition-transform cursor-pointer">
    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}20, ${color}10)` }}>
      <Icon size={20} style={{ color }} />
    </div>
    <div className="flex-1">
      <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider">{title}</p>
      <p className="text-xl font-black text-[var(--text-primary)]">{value}</p>
      {subtitle && <p className="text-[9px] text-[var(--text-muted)]">{subtitle}</p>}
      <div className="flex items-center gap-1 mt-1">
        {change !== undefined && (
          <p className={`text-[10px] font-bold ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </p>
        )}
        {trend && (
          <div className="flex items-center gap-0.5">
            {trend === 'up' && <TrendingUp size={10} className="text-emerald-500" />}
            {trend === 'down' && <TrendingDown size={10} className="text-red-500" />}
            {trend === 'stable' && <ArrowRight size={10} className="text-amber-500" />}
          </div>
        )}
      </div>
    </div>
  </div>
);

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
  const data = [
    { metric: 'Total Leads', current: 450, previous: 380, change: 18.4, target: 500 },
    { metric: 'Conversion Rate', current: 24.5, previous: 22.1, change: 10.9, target: 30 },
    { metric: 'Avg Deal Size', current: 285000, previous: 262000, change: 8.8, target: 350000 },
    { metric: 'Pipeline Value', current: 12800000, previous: 9800000, change: 30.6, target: 15000000 },
    { metric: 'Sales Cycle', current: 45, previous: 52, change: -13.5, target: 35 },
    { metric: 'Win Rate', current: 28.3, previous: 25.7, change: 10.1, target: 35 }
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

const StagePill = ({ stageId }) => {
  const s = PIPELINE_STAGES.find(p => p.id === stageId) || { label: stageId, color: '#94a3b8' };
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}25` }}>{s.label}</span>;
};

const SourceBadge = ({ source }) => (
  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)]">{source}</span>
);

const ScoreBadge = ({ score }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${score >= 75 ? 'text-emerald-500 bg-emerald-500/10' : score >= 50 ? 'text-amber-500 bg-amber-500/10' : 'text-red-500 bg-red-500/10'}`}>{score ?? 0}pts</span>
);

const LeadTrendReport = () => {
  const monthlyData = [
    { month: 'Jan', leads: 45, converted: 12, value: 2400000 },
    { month: 'Feb', leads: 52, converted: 15, value: 3200000 },
    { month: 'Mar', leads: 48, converted: 11, value: 2800000 },
    { month: 'Apr', leads: 61, converted: 18, value: 4100000 },
    { month: 'May', leads: 58, converted: 16, value: 3800000 },
    { month: 'Jun', leads: 72, converted: 22, value: 5200000 }
  ];

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
  const data = [
    { source: 'Website', leads: 145, conversion: 18.2, cost: 285000, roi: 742 },
    { source: 'Referral', leads: 89, conversion: 32.1, cost: 45000, roi: 3890 },
    { source: 'Campaign', leads: 76, conversion: 12.4, cost: 180000, roi: 267 },
    { source: 'Ads', leads: 65, conversion: 8.3, cost: 220000, roi: 98 },
    { source: 'Partner', leads: 42, conversion: 28.6, cost: 85000, roi: 1653 },
    { source: 'Event', leads: 33, conversion: 22.1, cost: 120000, roi: 423 }
  ];

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
  const teamData = [
    { name: 'Rahul Sharma', leads: 45, converted: 12, value: 2400000, score: 85 },
    { name: 'Priya Patel', leads: 38, converted: 14, value: 1800000, score: 92 },
    { name: 'Amit Kumar', leads: 32, converted: 8, value: 1500000, score: 78 },
    { name: 'Sneha Reddy', leads: 28, converted: 10, value: 1200000, score: 88 },
    { name: 'Vikram Singh', leads: 25, converted: 6, value: 980000, score: 72 }
  ];

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
  const [view, setView] = useState('dashboard');
  const [activeLeads, setActiveLeads] = useState(LEADS);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [kanbanView, setKanbanView] = useState(false);
  const [leadScoring, setLeadScoring] = useState(true);
  const [reportsView, setReportsView] = useState(false);
  const [automationRules, setAutomationRules] = useState([
    { id: 1, name: 'High Value Alert', condition: 'value > 500000', action: 'notify_manager', enabled: true },
    { id: 2, name: 'SLA Follow-up', condition: 'days_inactive > 3', action: 'send_email', enabled: true },
    { id: 3, name: 'Score Boost', condition: 'source == referral', action: 'add_10_points', enabled: false }
  ]);

  const { logCreate, logUpdate, logDelete } = useAuditLog('CRM');

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
    return activeLeads.map(lead => ({
      ...lead,
      score: calculateLeadScore(lead),
      automation: applyAutomationRules(lead),
      slaBreached: lead.activities?.[0] ?
        Math.floor((new Date() - new Date(lead.activities[0].timestamp)) / (1000 * 60 * 60 * 24)) > 3 : false
    }));
  }, [activeLeads, applyAutomationRules]);

  const columns = useMemo(() => [
    {
      key: 'name', header: 'Lead', sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-xs">
            {val[0]}
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">{val}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{row.company || 'Individual'}</p>
          </div>
        </div>
      )
    },
    { key: 'email', header: 'Email', sortable: true },
    {
      key: 'stage', header: 'Stage', sortable: true,
      render: (val) => {
        const stage = PIPELINE_STAGES.find(s => s.id === val) || { label: val, color: '#94a3b8' };
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: stage.color, background: `${stage.color}15`, border: `1px solid ${stage.color}25` }}>
            {stage.label}
          </span>
        );
      }
    },
    {
      key: 'score', header: 'Score', sortable: true,
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Brain size={10} className="text-[var(--text-muted)]" />
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${val >= 75 ? 'text-emerald-500 bg-emerald-500/10' :
              val >= 50 ? 'text-amber-500 bg-amber-500/10' :
                'text-red-500 bg-red-500/10'
              }`}>{val || 0}pts</span>
          </div>
        </div>
      )
    },
    {
      key: 'value', header: 'Value', sortable: true,
      render: (val) => <span className="font-bold text-[var(--accent)]">{fmt(val || 0)}</span>
    },
    {
      key: 'automation', header: 'Automation', sortable: false,
      render: (val) => (
        <div className="flex items-center gap-1">
          {val && val.length > 0 ? (
            <>
              <Sparkles size={12} className="text-amber-500" />
              <span className="text-[10px] text-amber-500 font-bold">{val.length} Active</span>
            </>
          ) : (
            <span className="text-[10px] text-[var(--text-muted)]">None</span>
          )}
        </div>
      )
    },
    { key: 'source', header: 'Source' },
  ], []);

  const handleImport = ({ file, mapping }) => {
    console.log('Importing from', file.name, 'with mapping', mapping);
    // Mock success
    logCreate({ id: 'import', name: `Import from ${file.name}` });
  };

  const handleExport = (format) => {
    console.log('Exporting as', format);
  };

  return (
    <div className="animate-fade-in space-y-5">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="heading-page">CRM Module</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Rulebook Compliant Lead Management</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="view-toggle-pill">
            <button onClick={() => setView('dashboard')} className={`view-toggle-btn ${view === 'dashboard' ? 'active' : ''}`}>
              <LayoutDashboard size={14} /> Dashboard
            </button>
            <button onClick={() => setView('table')} className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`}>
              <List size={14} /> Leads
            </button>
            <button onClick={() => setKanbanView(!kanbanView)} className={`view-toggle-btn ${kanbanView ? 'active' : ''}`}>
              <LayoutDashboard size={14} /> Kanban
            </button>
            <button onClick={() => setReportsView(!reportsView)} className={`view-toggle-btn ${reportsView ? 'active' : ''}`}>
              <BarChart2 size={14} /> Reports
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)]">
            <Brain size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">Scoring</span>
            <button
              onClick={() => setLeadScoring(!leadScoring)}
              className={`w-8 h-4 rounded-full transition-colors ${leadScoring ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
            >
              <div className={`w-3 h-3 bg-white rounded-full transition-transform ${leadScoring ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
            </button>
          </div>
          <ImportExport moduleName="Leads" fields={CRM_FIELDS} onImport={handleImport} onExport={handleExport} />
          <Button onClick={() => setShowAddModal(true)}><Plus size={14} /> Add Lead</Button>
        </div>
      </div>

      {/* ── Advanced Dashboard ── */}
      {view === 'dashboard' && (
        <div className="space-y-6">
          {/* Executive Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardKPI
              title="Total Leads"
              value={LEADS.length}
              change={12.5}
              icon={Users}
              color="#3b82f6"
              subtitle="This month"
              trend="up"
            />
            <DashboardKPI
              title="Pipeline Value"
              value={fmt(LEADS.reduce((s, l) => s + (l.value || 0), 0))}
              change={8.2}
              icon={DollarSign}
              color="#22c55e"
              subtitle="Total value"
              trend="up"
            />
            <DashboardKPI
              title="Conversion Rate"
              value="24%"
              change={2.1}
              icon={Target}
              color="#a855f7"
              subtitle="Lead to close"
              trend="up"
            />
            <DashboardKPI
              title="Avg Deal Size"
              value={fmt(LEADS.reduce((s, l) => s + (l.value || 0), 0) / LEADS.length || 0)}
              change={-3.4}
              icon={TrendingUp}
              color="#f59e0b"
              subtitle="Per deal"
              trend="down"
            />
          </div>

          {/* Advanced Analytics Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ConversionFunnel />
            <LeadSourceAnalytics />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <SalesPipelineChart />
            </div>
            <div className="space-y-4">
              <LeadScoreDistribution />
              <ActivityHeatmap />
            </div>
          </div>

          {/* Risk Alerts & Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Alerts */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={16} className="text-red-500" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Risk Alerts</h3>
                <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">3 Active</span>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={12} className="text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-red-500">SLA Breached (5 leads)</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">No activity for &gt;3 days. Immediate follow-up required.</p>
                      <button className="text-[10px] text-red-500 font-bold mt-2 hover:underline">Take Action →</button>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <Clock size={12} className="text-amber-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-amber-500">Quotation Delay (12 leads)</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">Average wait for quote approval is 48h.</p>
                      <button className="text-[10px] text-amber-500 font-bold mt-2 hover:underline">Review Queue →</button>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <div className="flex items-start gap-2">
                    <TrendingDown size={12} className="text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-blue-500">Conversion Drop</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">15% decrease in qualified-to-proposal rate this week.</p>
                      <button className="text-[10px] text-blue-500 font-bold mt-2 hover:underline">View Analysis →</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award size={16} className="text-emerald-500" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Top Performers</h3>
                <span className="ml-auto text-[10px] text-[var(--text-muted)]">This Month</span>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Rahul Sharma', leads: 45, conversion: 28, value: 2400000, avatar: 'RS' },
                  { name: 'Priya Patel', leads: 38, conversion: 32, value: 1800000, avatar: 'PP' },
                  { name: 'Amit Kumar', leads: 32, conversion: 25, value: 1500000, avatar: 'AK' }
                ].map((performer, index) => (
                  <div key={performer.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      {performer.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">{performer.name}</p>
                      <p className="text-[9px] text-[var(--text-muted)]">{performer.leads} leads · {performer.conversion}% conv.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-[var(--accent)]">{fmt(performer.value)}</p>
                      <p className="text-[9px] text-emerald-500">#{index + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Comprehensive Reports View ── */}
      {reportsView && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">CRM Analytics & Reports</h3>
              <p className="text-xs text-[var(--text-muted)]">Comprehensive insights and performance metrics</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[10px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hovered)] transition-colors">
                <Download size={10} className="inline mr-1" /> Export PDF
              </button>
              <button className="px-3 py-1 rounded-lg bg-[var(--primary)] text-white text-[10px] font-medium hover:opacity-90 transition-opacity">
                <CalendarDays size={10} className="inline mr-1" /> Schedule Report
              </button>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <PerformanceReport />
            <LeadTrendReport />
          </div>

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SourcePerformanceReport />
            <SalesTeamReport />
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target size={16} className="text-emerald-500" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Conversion Funnel</h3>
              </div>
              <div className="space-y-3">
                {[
                  { stage: 'Lead → Qualified', rate: 62, trend: 'up' },
                  { stage: 'Qualified → Proposal', rate: 59, trend: 'stable' },
                  { stage: 'Proposal → Negotiation', rate: 58, trend: 'down' },
                  { stage: 'Negotiation → Closed', rate: 61, trend: 'up' }
                ].map((item) => (
                  <div key={item.stage} className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-muted)]">{item.stage}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-primary)]">{item.rate}%</span>
                      {item.trend === 'up' && <TrendingUp size={10} className="text-emerald-500" />}
                      {item.trend === 'down' && <TrendingDown size={10} className="text-red-500" />}
                      {item.trend === 'stable' && <ArrowRight size={10} className="text-amber-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-amber-500" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Response Times</h3>
              </div>
              <div className="space-y-3">
                {[
                  { metric: 'First Response', current: '2.3 hrs', target: '1 hr', status: 'warning' },
                  { metric: 'Quote Delivery', current: '18 hrs', target: '24 hrs', status: 'good' },
                  { metric: 'Follow-up', current: '4.2 days', target: '3 days', status: 'warning' },
                  { metric: 'Closing Time', current: '45 days', target: '35 days', status: 'critical' }
                ].map((item) => (
                  <div key={item.metric} className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-muted)]">{item.metric}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-primary)]">{item.current}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full ${item.status === 'good' ? 'bg-emerald-500/10 text-emerald-500' :
                        item.status === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award size={16} className="text-purple-500" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Top Achievements</h3>
              </div>
              <div className="space-y-3">
                {[
                  { achievement: 'Highest Deal Size', value: fmt(2400000), person: 'Rahul Sharma' },
                  { achievement: 'Best Conversion', value: '32.1%', person: 'Priya Patel' },
                  { achievement: 'Most Leads', value: '45', person: 'Rahul Sharma' },
                  { achievement: 'Fast Response', value: '1.2 hrs', person: 'Sneha Reddy' }
                ].map((item) => (
                  <div key={item.achievement} className="p-2 rounded-lg bg-[var(--bg-elevated)]">
                    <p className="text-xs font-medium text-[var(--text-primary)]">{item.achievement}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-bold text-[var(--accent)]">{item.value}</span>
                      <span className="text-[9px] text-[var(--text-muted)]">{item.person}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Kanban Board View ── */}
      {kanbanView && !reportsView && (
        <div className="space-y-4">
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
            <div className="flex gap-3 min-w-max">
              {PIPELINE_STAGES.map((stage) => {
                const stageLeads = enhancedLeads.filter(lead => lead.stage === stage.id);
                const totalValue = stageLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);

                return (
                  <div key={stage.id}
                    className={`flex flex-col w-64 rounded-xl border transition-colors`}
                    onDragOver={e => { e.preventDefault(); }}
                    onDrop={(e) => {
                      const leadId = e.dataTransfer.getData('leadId');
                      if (leadId) {
                        const lead = enhancedLeads.find(l => l.id === leadId);
                        if (lead) {
                          const newLeads = activeLeads.map(l => l.id === leadId ? { ...l, stage: stage.id } : l);
                          setActiveLeads(newLeads);
                        }
                      }
                    }}
                  >
                    <div className="p-2.5 border-b border-[var(--border-base)]">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                          <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
                        </div>
                        <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                          style={{ background: `${stage.color}20`, color: stage.color }}>{stageLeads.length}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-[var(--text-muted)] pl-4">
                        <span>{stageLeads.length} leads</span><span>·</span><span>{fmt(totalValue)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 p-2 flex-1 min-h-[120px]">
                      {stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => { e.dataTransfer.setData('leadId', lead.id); }}
                          className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-[var(--primary)]/40 transition-all"
                          onClick={() => setSelectedLead(lead)}
                        >
                          {/* Lead Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                                {lead.name[0]}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-[var(--text-primary)]">{lead.name}</p>
                                <p className="text-[9px] text-[var(--text-muted)]">{lead.company || 'Individual'}</p>
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
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[var(--accent)]">{fmt(lead.value || 0)}</span>
                              <div className="flex items-center gap-1">
                                <Brain size={8} className="text-[var(--text-muted)]" />
                                <span className={`text-[9px] font-black ${lead.score >= 75 ? 'text-emerald-500' :
                                  lead.score >= 50 ? 'text-amber-500' :
                                    'text-red-500'
                                  }`}>{lead.score || 0}pts</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <SourceBadge source={lead.source} />
                              <span className="text-[9px] text-[var(--text-muted)]">•</span>
                              <span className="text-[9px] text-[var(--text-muted)]">{lead.kw || lead.systemSize || '0'}kW</span>
                            </div>

                            {lead.activities && lead.activities.length > 0 && (
                              <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]">
                                <Clock size={8} />
                                <span>Last: {lead.activities[lead.activities.length - 1].ts}</span>
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

      {/* ── Advanced Filtering and Search ── */}
      {view === 'table' && !kanbanView && !reportsView && (
        <div className="space-y-4">
          {/* Advanced Search Bar */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
                <Input
                  placeholder="Search leads by name, email, company, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <button className="px-4 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hovered)] transition-colors flex items-center gap-2">
                <Filter size={14} />
                Advanced Filters
                <span className="px-2 py-0.5 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold">3</span>
              </button>
              <button className="px-4 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hovered)] transition-colors flex items-center gap-2">
                <SortAsc size={14} />
                Sort
              </button>
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs text-[var(--text-muted)] font-medium">Quick Filters:</span>
              {[
                { label: 'High Score (>75)', filter: 'score > 75', color: 'emerald' },
                { label: 'SLA Breached', filter: 'sla_breached = true', color: 'red' },
                { label: 'High Value (>5L)', filter: 'value > 500000', color: 'blue' },
                { label: 'Referral Source', filter: 'source = referral', color: 'purple' },
                { label: 'Active Automation', filter: 'automation_count > 0', color: 'amber' },
                { label: 'Last 7 Days', filter: 'created_days <= 7', color: 'cyan' }
              ].map((filter) => (
                <button
                  key={filter.label}
                  className={`px-3 py-1 rounded-full text-[10px] font-medium border transition-colors ${'border-' + filter.color + '-500/30 text-' + filter.color + '-600 bg-' + filter.color + '-50 hover:bg-' + filter.color + '-100'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <FilterSystem
            fields={[
              ...CRM_FIELDS,
              { id: 'score', label: 'Lead Score', type: 'number' },
              { id: 'slaBreached', label: 'SLA Breached', type: 'boolean' },
              { id: 'automationCount', label: 'Automation Rules', type: 'number' },
              { id: 'createdDays', label: 'Days Since Created', type: 'number' },
              { id: 'lastActivity', label: 'Last Activity', type: 'date' }
            ]}
            onApply={(f) => console.log('Advanced Filters Applied:', f)}
            presets={[
              { name: 'Hot Leads', filters: [{ field: 'score', operator: 'gt', value: '75', logic: 'AND' }] },
              { name: 'High Value', filters: [{ field: 'value', operator: 'gt', value: '500000', logic: 'AND' }] },
              {
                name: 'At Risk', filters: [
                  { field: 'slaBreached', operator: 'eq', value: 'true', logic: 'AND' },
                  { field: 'score', operator: 'lt', value: '50', logic: 'OR' }
                ]
              },
              { name: 'Recent', filters: [{ field: 'createdDays', operator: 'lt', value: '7', logic: 'AND' }] },
              {
                name: 'Referral Power', filters: [
                  { field: 'source', operator: 'eq', value: 'Referral', logic: 'AND' },
                  { field: 'value', operator: 'gt', value: '200000', logic: 'AND' }
                ]
              }
            ]}
          />

          <DataTable
            columns={columns}
            data={enhancedLeads.slice((page - 1) * pageSize, page * pageSize)}
            total={enhancedLeads.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            search={search}
            onSearch={setSearch}
            selectedRows={selected}
            onSelectRows={setSelected}
            bulkActions={[
              { label: 'Export', icon: Download, onClick: (rows) => console.log('Exporting', rows) },
              { label: 'Assign', icon: Users, onClick: (rows) => console.log('Assigning', rows) },
              { label: 'Score Boost', icon: Brain, onClick: (rows) => console.log('Boosting scores', rows) },
              { label: 'Delete', icon: Trash2, onClick: (rows) => console.log('Soft Deleting', rows), danger: true },
            ]}
            rowActions={[
              { label: 'Edit', icon: Edit2, onClick: (r) => console.log('Edit', r) },
              { label: 'Duplicate', icon: RefreshCw, onClick: (r) => console.log('Duplicate', r) },
              { label: 'Score', icon: Brain, onClick: (r) => console.log('Recalculate score', r) },
              { label: 'Archive', icon: Building2, onClick: (r) => console.log('Archive', r) },
              { label: 'Delete', icon: Trash2, onClick: (r) => { logDelete(r); console.log('Delete', r); }, danger: true },
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
            <Button onClick={() => setShowAddModal(false)}><Plus size={13} /> Create Lead</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First Name"><Input placeholder="Enter first name" /></FormField>
            <FormField label="Last Name"><Input placeholder="Enter last name" /></FormField>
          </div>
          <FormField label="Company"><Input placeholder="Company name (optional)" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email"><Input type="email" placeholder="email@example.com" /></FormField>
            <FormField label="Phone"><Input placeholder="+91 98765 43210" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Source">
              <Select>
                <option value="">Select source</option>
                {SOURCES.filter(s => s !== 'All').map(s => <option key={s}>{s}</option>)}
              </Select>
            </FormField>
            <FormField label="City">
              <Select>
                <option value="">Select city</option>
                {CITIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Notes"><Textarea placeholder="Additional notes..." rows={3} /></FormField>
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
                <Button variant="outline"><Edit2 size={13} /> Edit</Button>
                <Button><Phone size={13} /> Call Lead</Button>
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
                    <StagePill stageId={selectedLead.stage} />
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
                    {selectedLead.activities.slice(0, 4).map(act => (
                      <div key={act.id} className="flex gap-2.5 text-xs">
                        <div className="w-6 h-6 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-base)] flex items-center justify-center shrink-0 mt-0.5">
                          {act.type === 'call' && <Phone size={10} className="text-emerald-400" />}
                          {act.type === 'email' && <Mail size={10} className="text-blue-400" />}
                          {act.type === 'whatsapp' && <MessageSquare size={10} className="text-emerald-400" />}
                          {act.type === 'note' && <Activity size={10} className="text-amber-400" />}
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

    </div >
  );
};

export default CRMPage;
