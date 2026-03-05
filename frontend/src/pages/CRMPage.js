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
  Gauge, Targeted, FilterX, SearchX, UserPlus, UserMinus,
  Save, GitCommit
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Treemap, ComposedChart, ScatterChart, Scatter
} from 'recharts';
import { USERS } from '../data/mockData';
import { leadsApi } from '../services/leadsApi';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea, FormField } from '../components/ui/Input';
import DataTable from '../components/ui/DataTable';
import FilterSystem from '../components/ui/FilterSystem';
import ImportExport from '../components/ui/ImportExport';
import LeadTracker from '../components/LeadTracker';
import { useAuditLog } from '../hooks/useAuditLog';
import { usePermissions } from '../hooks/usePermissions';
import { CURRENCY } from '../config/app.config';
import CanAccess, { CanCreate, CanEdit } from '../components/CanAccess';
import { toast } from '../components/ui/Toast';

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

const StagePill = ({ stageId, stageMap }) => {
  const s = stageMap?.[stageId] || { label: stageId, color: '#94a3b8' };
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
  const [view, setView] = useState('leads');
  const [activeLeads, setActiveLeads] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalLeads, setTotalLeads] = useState(0);
  const [search, setSearch] = useState('');
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
  const [actionLoading, setActionLoading] = useState(false);
  const [showScoreEditModal, setShowScoreEditModal] = useState(false);
  const [scoreEditingLead, setScoreEditingLead] = useState(null);
  const [newScore, setNewScore] = useState('');
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [leadScoring, setLeadScoring] = useState(true);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const sortDropdownRef = useRef(null);
  const columnsDropdownRef = useRef(null);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [automationRules, setAutomationRules] = useState([
    { id: 1, name: 'High Value Alert', condition: 'value > 500000', action: 'notify_manager', enabled: true },
    { id: 2, name: 'SLA Follow-up', condition: 'days_inactive > 3', action: 'send_email', enabled: true },
    { id: 3, name: 'Score Boost', condition: 'source == referral', action: 'add_10_points', enabled: false }
  ]);

  const [activeFilters, setActiveFilters] = useState([]);
  const [quickFilter, setQuickFilter] = useState(null);
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

  // Fetch leads from API with filters
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pageSize,
        search,
      };
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
      // Handle nested response structure: { success: true, data: { data: [], total: 0 } }
      const leadsData = result.data?.data || result.data || [];
      const totalCount = result.data?.total || result.total || 0;
      setActiveLeads(leadsData);
      setTotalLeads(totalCount);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      setError('Failed to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, sort.key, sort.dir, quickFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Row Actions with real API calls
  const handleViewLead = (lead) => {
    setSelectedLead(lead);
  };

  const handleViewTracker = (lead) => {
    setTrackerLeadId(lead._id);
    setShowTrackerDrawer(true);
  };

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLead) return;
    try {
      setActionLoading(true);
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
        setSelectedLead(updated.data || updated);
      }
    } catch (err) {
      console.error('Failed to update lead:', err);
      // Alert removed as per user request - no alerts on lead pages
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicateLead = async (lead) => {
    try {
      setActionLoading(true);
      const duplicated = await leadsApi.duplicate(lead._id);
      logCreate(duplicated.data || duplicated);
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
    if (!window.confirm(`Are you sure you want to delete "${lead.name}"?`)) return;
    try {
      setActionLoading(true);
      await leadsApi.delete(lead._id);
      logDelete(lead);
      fetchLeads(); // Refresh list
      if (selectedLead && selectedLead._id === lead._id) {
        setSelectedLead(null); // Close detail modal
      }
    } catch (err) {
      console.error('Failed to delete lead:', err);
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
  const handleBulkExport = (selectedIds) => {
    const leadsToExport = sortedLeads.filter(l => selectedIds.includes(l._id));
    const headers = ['Name', 'Company', 'Email', 'Phone', 'Stage', 'Source', 'Value', 'Score', 'City'];
    const csvContent = [
      headers.join(','),
      ...leadsToExport.map(lead => [
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
  };

  const handleBulkDelete = async (selectedIds) => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} leads?`)) return;
    try {
      setActionLoading(true);
      await leadsApi.bulkDelete(selectedIds);
      logDelete({ ids: selectedIds });
      fetchLeads();
      setSelected(new Set());
    } catch (err) {
      console.error('Failed to bulk delete:', err);
    } finally {
      setActionLoading(false);
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
      logCreate(created.data || created);
      setShowAddModal(false);
      setNewLead({ firstName: '', lastName: '', company: '', email: '', phone: '', source: '', city: '', notes: '', statusKey: 'new' });
      fetchLeads(); // Refresh list
      // Toast removed as per user request - no alerts on lead pages
    } catch (err) {
      console.error('Failed to create lead:', err);
      // Alert removed as per user request - no alerts on lead pages
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
    
    // Advanced filters - only apply filters not sent to backend
    if (activeFilters.length > 0) {
      result = result.filter(lead => {
        return activeFilters.every(filter => {
          const value = lead[filter.field];
          const filterValue = filter.value;
          
          switch (filter.operator) {
            case 'equals':
            case 'eq':
              return String(value).toLowerCase() === String(filterValue).toLowerCase();
            case 'contains':
              return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
            case 'gt':
              return Number(value) > Number(filterValue);
            case 'lt':
              return Number(value) < Number(filterValue);
            case 'gte':
              return Number(value) >= Number(filterValue);
            case 'lte':
              return Number(value) <= Number(filterValue);
            default:
              return true;
          }
        });
      });
    }
    
    // Note: Search is handled by backend API - no client-side search filtering needed
    // This prevents double-filtering issues
    
    return result;
  }, [enhancedLeads, quickFilter, activeFilters]);

  // Sort handler for DataTable
  const handleSort = useCallback(({ key, dir }) => {
    setSort({ key, dir });
  }, []);

  // Apply sorting to filtered leads
  const sortedLeads = useMemo(() => {
    if (!sort.key) return filteredLeads;
    
    return [...filteredLeads].sort((a, b) => {
      let aVal = a[sort.key];
      let bVal = b[sort.key];
      
      // Handle null/undefined values
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';
      
      // String comparison
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return sort.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredLeads, sort]);

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
          <span className={`text-[11px] font-bold ${val >= 75 ? 'text-red-500' :
            val >= 50 ? 'text-amber-500' : 'text-emerald-500'
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
    ];
    return allColumns.filter(col => visibleColumns[col.key] !== false);
  }, [visibleColumns, statusMap]);

  const handleImport = async ({ file, mapping }) => {
    try {
      setActionLoading(true);
      
      // Parse CSV file
      const Papa = await import('papaparse');
      const text = await file.text();
      
      const { data } = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true
      });
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          // Combine first and last name from CSV
          const firstName = row[mapping.firstName] || row.firstName || row.firstname || row['First Name'] || row.first_name || '';
          const lastName = row[mapping.lastName] || row.lastName || row.lastname || row['Last Name'] || row.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim();
          
          // Map CSV columns to lead fields based on mapping
          const leadData = {
            name: fullName || row.name || row.Name || row.NAME || '',
            company: row[mapping.company] || row.company || row.Company || row.COMPANY || '',
            email: row[mapping.email] || row.email || row.Email || row.EMAIL || '',
            phone: row[mapping.phone] || row.phone || row.Phone || row.PHONE || row.mobile || '',
            source: row[mapping.source] || row.source || row.Source || row.SOURCE || 'Import',
            city: row[mapping.city] || row.city || row.City || row.CITY || '',
            statusKey: 'new',
            value: parseInt(row[mapping.value] || row.value || row.Value || row.VALUE || 0),
          };
          
          // Skip if name is missing
          if (!leadData.name) {
            errorCount++;
            errors.push(`Row ${i + 1}: Missing name`);
            continue;
          }
          
          // Create lead via API
          await leadsApi.create(leadData);
          successCount++;
        } catch (err) {
          errorCount++;
          errors.push(`Row ${i + 1}: ${err.message}`);
        }
      }
      
      // Log import activity
      logCreate({ id: 'import', name: `Imported ${successCount} leads from ${file.name}` });
      
      // Show result
      if (errorCount === 0) {
        // Alert removed as per user request - no alerts on lead pages
      } else {
        // Alert removed as per user request - no alerts on lead pages
      }
      
      fetchLeads(); // Refresh list
    } catch (err) {
      console.error('Import failed:', err);
      // Alert removed as per user request - no alerts on lead pages
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
            <button onClick={() => setView('leads')} className={`view-toggle-btn ${view === 'leads' ? 'active' : ''}`}>
              <List size={14} /> Leads
            </button>
            <button onClick={() => setView('kanban')} className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`}>
              <LayoutDashboard size={14} /> Kanban
            </button>
            <button onClick={() => setView('reports')} className={`view-toggle-btn ${view === 'reports' ? 'active' : ''}`}>
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
          <CanAccess module="crm" action="export">
            <ImportExport moduleName="Leads" fields={crmFields} onImport={handleImport} onExport={handleExport} />
          </CanAccess>
          <CanCreate module="crm">
            <Button onClick={() => setShowAddModal(true)}><Plus size={14} /> Add Lead</Button>
          </CanCreate>
        </div>
      </div>

      {/* ── Advanced Dashboard ── */}
      {view === 'dashboard' && (
        <div className="space-y-6">
          {/* Executive Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardKPI
              title="Total Leads"
              value={totalLeads}
              change={12.5}
              icon={Users}
              color="#3b82f6"
              subtitle="This month"
              trend="up"
            />
            <DashboardKPI
              title="Pipeline Value"
              value={fmt(activeLeads.reduce((s, l) => s + (l.value || 0), 0))}
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
              value={fmt(activeLeads.reduce((s, l) => s + (l.value || 0), 0) / (totalLeads || 1))}
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
      {view === 'reports' && (
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
      {view === 'kanban' && (
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
              {(statusOptions || []).map((stage) => {
                const stageLeads = enhancedLeads.filter(lead => lead.statusKey === stage.key);
                const totalValue = stageLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);

                return (
                  <div key={stage.key}
                    className={`flex flex-col w-64 rounded-xl border transition-colors`}
                    onDragOver={e => { e.preventDefault(); }}
                    onDrop={(e) => {
                      if (!can('crm', 'edit')) {
                        toast.error('Permission denied: Cannot change lead status');
                        return;
                      }
                      const leadId = e.dataTransfer.getData('leadId');
                      if (leadId) {
                        const lead = enhancedLeads.find(l => String(l._id || l.id) === String(leadId));
                        if (lead) {
                          const newLeads = activeLeads.map(l => String(l._id || l.id) === String(leadId) ? { ...l, statusKey: stage.key } : l);
                          setActiveLeads(newLeads);
                          leadsApi.update(lead._id || lead.id, { statusKey: stage.key })
                            .then(() => {
                              logUpdate({ id: leadId, statusKey: stage.key });
                              fetchLeads();
                            })
                            .catch(() => {
                              toast.error('Failed to change lead status');
                              fetchLeads();
                            });
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
                          key={lead._id || lead.id || `lead-${Math.random()}`}
                          draggable
                          onDragStart={(e) => { e.dataTransfer.setData('leadId', lead._id || lead.id); }}
                          className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-[var(--primary)]/40 transition-all"
                          onClick={() => { setTrackerLeadId(lead._id || lead.id); setShowTrackerDrawer(true); }}
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
                                <span className={`text-[9px] font-black ${lead.score >= 75 ? 'text-red-500' :
                                  lead.score >= 50 ? 'text-amber-500' :
                                    'text-emerald-500'
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

      {/* ── Leads Table View ── */}
      {view === 'leads' && (
        <div className="space-y-4">
          {/* Advanced Search Bar */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
                <Input
                  placeholder="Search anything - name, email, score, value, city, stage..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative" ref={sortDropdownRef}>
                <button 
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${showSortDropdown ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[var(--bg-elevated)] border-[var(--border-base)] text-[var(--text-muted)] hover:bg-[var(--bg-hovered)]'}`}
                >
                  {sort.dir === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />}
                  Sort
                </button>
                {showSortDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] shadow-lg z-50">
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
              <div className="relative" ref={columnsDropdownRef}>
                <button 
                  onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${showColumnsDropdown ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[var(--bg-elevated)] border-[var(--border-base)] text-[var(--text-muted)] hover:bg-[var(--bg-hovered)]'}`}
                >
                  <LayoutDashboard size={14} />
                  Columns
                </button>
                {showColumnsDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] shadow-lg z-50">
                    <div className="p-2">
                      <p className="text-[10px] text-[var(--text-muted)] px-2 py-1">Show/Hide Columns</p>
                      {[
                        { key: 'name', label: 'Lead' },
                        { key: 'email', label: 'Email' },
                        { key: 'statusKey', label: 'Stage' },
                        { key: 'score', label: 'Score' },
                        { key: 'value', label: 'Value' },
                        { key: 'automation', label: 'Automation' },
                        { key: 'source', label: 'Source' }
                      ].map((col) => (
                        <label
                          key={col.key}
                          className="flex items-center gap-2 px-3 py-2 rounded text-xs cursor-pointer hover:bg-[var(--bg-hovered)]"
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns[col.key] !== false}
                            onChange={() => toggleColumn(col.key)}
                            className="w-4 h-4 rounded border-[var(--border-base)]"
                          />
                          <span className={visibleColumns[col.key] !== false ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                            {col.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs text-[var(--text-muted)] font-medium">Quick Filters:</span>
              {[
                { label: 'High Score (>75)', id: 'highScore', color: 'emerald' },
                { label: 'SLA Breached', id: 'slaBreached', color: 'red' },
                { label: 'High Value (>5L)', id: 'highValue', color: 'blue' },
                { label: 'Referral Source', id: 'referral', color: 'purple' },
                { label: 'Active Automation', id: 'automation', color: 'amber' },
                { label: 'Last 7 Days', id: 'recent', color: 'cyan' }
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setQuickFilter(quickFilter === filter.id ? null : filter.id)}
                  className={`px-3 py-1 rounded-full text-[10px] font-medium border transition-all ${
                    quickFilter === filter.id 
                      ? `bg-${filter.color}-500 text-white border-${filter.color}-500` 
                      : `border-${filter.color}-500/30 text-${filter.color}-600 bg-${filter.color}-50 hover:bg-${filter.color}-100`
                  }`}
                >
                  {filter.label}
                </button>
              ))}
              {(quickFilter || activeFilters.length > 0 || search) && (
                <button
                  onClick={() => { setQuickFilter(null); setActiveFilters([]); setSearch(''); }}
                  className="px-3 py-1 rounded-full text-[10px] font-medium border border-gray-500/30 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <DataTable
            columns={columns}
            data={sortedLeads}
            rowKey="_id"
            total={sortedLeads.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSort={handleSort}
            onRowClick={(row) => { setTrackerLeadId(row._id); setShowTrackerDrawer(true); }}
            sort={sort}
            search={search}
            onSearch={setSearch}
            selectedRows={selected}
            onSelectRows={setSelected}
            bulkActions={[
              { label: 'Export', icon: Download, onClick: (selectedIds) => { 
                if (guardExport()) {
                  // Get actual row data from selected IDs (handle both string and ObjectId)
                  const selectedIdSet = new Set(selectedIds.map(id => String(id)));
                  const dataToExport = selectedIds.length > 0 
                    ? sortedLeads.filter(lead => selectedIdSet.has(String(lead._id)))
                    : sortedLeads;
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
                  alert(`Exported ${dataToExport.length} leads to CSV!`);
                }
              }},
              { label: 'Score Boost', icon: Brain, onClick: (rows) => { if (guardEdit()) console.log('Boosting scores', rows); } },
              { label: 'Delete', icon: Trash2, onClick: (rows) => { if (guardDelete()) console.log('Soft Deleting', rows); }, danger: true },
            ]}
            rowActions={[
              { label: 'View', icon: Eye, onClick: handleViewLead },
              { label: 'Edit', icon: Edit2, onClick: handleEditLead },
              { label: 'Score', icon: Brain, onClick: handleRecalculateScore },
              { label: 'Delete', icon: Trash2, onClick: handleDeleteLead, danger: true },
              { label: 'Activity Log', icon: Clock, onClick: handleViewActivity },
              { label: 'Tracker', icon: GitCommit, onClick: (lead) => { setTrackerLeadId(lead._id); setShowTrackerDrawer(true); } },
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
                value={newLead.firstName}
                onChange={(e) => setNewLead({...newLead, firstName: e.target.value})}
              />
            </FormField>
            <FormField label="Last Name">
              <Input 
                placeholder="Enter last name"
                value={newLead.lastName}
                onChange={(e) => setNewLead({...newLead, lastName: e.target.value})}
              />
            </FormField>
          </div>
          <FormField label="Company">
            <Input 
              placeholder="Company name (optional)"
              value={newLead.company}
              onChange={(e) => setNewLead({...newLead, company: e.target.value})}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email">
              <Input 
                type="email" 
                placeholder="email@example.com"
                value={newLead.email}
                onChange={(e) => setNewLead({...newLead, email: e.target.value})}
              />
            </FormField>
            <FormField label="Phone">
              <Input 
                placeholder="+91 98765 43210"
                value={newLead.phone}
                onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Source">
              <Select
                value={newLead.source}
                onChange={(e) => setNewLead({...newLead, source: e.target.value})}
              >
                <option value="">Select source</option>
                {SOURCES.filter(s => s !== 'All').map(s => <option key={s}>{s}</option>)}
              </Select>
            </FormField>
            <FormField label="City">
              <Select
                value={newLead.city}
                onChange={(e) => setNewLead({...newLead, city: e.target.value})}
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
              onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
            />
          </FormField>
          <FormField label="Status">
            <Select
              value={newLead.statusKey}
              onChange={(e) => setNewLead({...newLead, statusKey: e.target.value})}
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
                <Button variant="outline" onClick={() => handleEditLead(selectedLead)}><Edit2 size={13} /> Edit</Button>
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
                  onChange={(e) => setEditingLead({...editingLead, name: e.target.value})}
                />
              </FormField>
              <FormField label="Company">
                <Input 
                  value={editingLead.company || ''}
                  onChange={(e) => setEditingLead({...editingLead, company: e.target.value})}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Email">
                <Input 
                  type="email"
                  value={editingLead.email || ''}
                  onChange={(e) => setEditingLead({...editingLead, email: e.target.value})}
                />
              </FormField>
              <FormField label="Phone">
                <Input 
                  value={editingLead.phone || ''}
                  onChange={(e) => setEditingLead({...editingLead, phone: e.target.value})}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Stage">
                <Select
                  value={editingLead.statusKey}
                  onChange={(e) => setEditingLead({...editingLead, statusKey: e.target.value})}
                >
                  {(statusOptions || []).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </Select>
              </FormField>
              <FormField label="Source">
                <Select
                  value={editingLead.source}
                  onChange={(e) => setEditingLead({...editingLead, source: e.target.value})}
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
                  onChange={(e) => setEditingLead({...editingLead, value: parseInt(e.target.value) || 0})}
                />
              </FormField>
              <FormField label="City">
                <Input 
                  value={editingLead.city || ''}
                  onChange={(e) => setEditingLead({...editingLead, city: e.target.value})}
                />
              </FormField>
            </div>
            <FormField label="Notes">
              <Textarea 
                rows={3}
                value={editingLead.notes || ''}
                onChange={(e) => setEditingLead({...editingLead, notes: e.target.value})}
              />
            </FormField>
          </div>
        </Modal>
      )}

      {/* TIMELINE MODAL */}
      {showTimelineModal && (
        <Modal
          open={showTimelineModal}
          onClose={() => setShowTimelineModal(false)}
          title="Activity Log"
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowTimelineModal(false)}>Close</Button>
            </div>
          }
        >
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {timelineData.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No timeline events found.</p>
            ) : (
              timelineData.map((event, idx) => (
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
                    <p className="text-[10px] text-[var(--text-muted)]">{event.ts} · {event.by}</p>
                  </div>
                </div>
              ))
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

      {/* LEAD TRACKER DRAWER */}
      {showTrackerDrawer && trackerLeadId && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => { setShowTrackerDrawer(false); setTrackerLeadId(null); }}
          />
          {/* Sidebar Drawer */}
          <div className="fixed right-0 top-[36.5px] bottom-0 w-[400px] bg-white border-l border-[var(--border-base)] z-50 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-base)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Lead Progress</h3>
              <button
                onClick={() => { setShowTrackerDrawer(false); setTrackerLeadId(null); }}
                className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
              >
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Tracker Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <LeadTracker 
                leadId={trackerLeadId}
                statusOptions={statusOptions}
                currentStage={activeLeads.find(l => l._id === trackerLeadId)?.statusKey}
                onStageChange={fetchLeads}
              />
            </div>
          </div>
        </>
      )}

    </div >
  );
};

export default CRMPage;
