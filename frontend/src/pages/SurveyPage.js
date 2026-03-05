// Solar OS – EPC Edition — SurveyPage.js (Advanced Professional Module)
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Plus, MapPin, Calendar, CheckCircle, Zap, Box,
  Sun, AlertTriangle, LayoutDashboard, List, BarChart2,
  Download, Eye, ChevronRight, Layers, LayoutGrid,
  Trash2, Edit2, TrendingUp, TrendingDown, History, Users, Search,
  Filter, MoreVertical, Bell, Settings, Activity, Target,
  Award, PieChart as PieChartIcon, Clock, Star, Brain,
  Gauge, Wind, Cloud, FileText, MessageSquare, Phone,
  Mail, Send, ChevronLeft, ArrowRight, ArrowUpRight, ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Treemap
} from 'recharts';


import { SURVEYS } from '../data/mockData';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Textarea, Select } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { format, subMonths } from 'date-fns';
import { Progress } from '../components/ui/Progress';
import DataTable from '../components/ui/DataTable';
import FilterSystem from '../components/ui/FilterSystem';
import ImportExport from '../components/ui/ImportExport';
import { useAuditLog } from '../hooks/useAuditLog';
import { usePermissions } from '../hooks/usePermissions';
import EnhancedSolarSurveyStudio from '../components/SolarDesignStudio/EnhancedSolarSurveyStudio';
import CanAccess, { CanCreate, CanEdit, CanDelete } from '../components/CanAccess';
import { toast } from '../components/ui/Toast';

// ── Advanced Survey Analytics Components ────────────────────────────────────────
const SurveyDashboardKPI = ({ title, value, change, icon: Icon, color, subtitle, trend }) => (
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

const SurveyPerformanceMetrics = () => {
  const data = [
    { metric: 'Completion Rate', current: 78.5, previous: 72.1, change: 8.9, target: 85 },
    { metric: 'Avg Feasibility', current: 82.3, previous: 79.8, change: 3.1, target: 90 },
    { metric: 'Shadow Clearance', current: 91.2, previous: 88.5, change: 3.0, target: 95 },
    { metric: 'On-Time Delivery', current: 85.7, previous: 81.2, change: 5.5, target: 90 },
    { metric: 'Customer Satisfaction', current: 92.1, previous: 89.3, change: 3.1, target: 95 },
    { metric: 'Report Accuracy', current: 94.8, previous: 92.1, change: 2.9, target: 98 }
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Performance Overview</h3>
        <Gauge size={16} className="text-[var(--accent)]" />
      </div>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.metric} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)]">
            <div className="flex-1">
              <p className="text-xs font-medium text-[var(--text-primary)]">{item.metric}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-[var(--text-primary)]">{item.current}%</span>
                <span className={`text-[10px] font-bold ${item.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {item.change >= 0 ? '↑' : '↓'} {Math.abs(item.change)}%
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-[var(--text-muted)]">Target</p>
              <p className="text-xs font-bold text-[var(--accent)]">{item.target}%</p>
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

const SurveyActivityHeatmap = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['8AM', '10AM', '12PM', '2PM', '4PM', '6PM'];

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
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Survey Activity Heatmap</h3>
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
                  title={`${day} ${row.hour}: ${row[day]} surveys`}
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

const SurveyEngineerPerformance = () => {
  const engineerData = [
    { name: 'Priya Patel', surveys: 45, completed: 42, avgScore: 88, efficiency: 93 },
    { name: 'Rahul Sharma', surveys: 38, completed: 35, avgScore: 91, efficiency: 92 },
    { name: 'Amit Kumar', surveys: 32, completed: 28, avgScore: 85, efficiency: 87 },
    { name: 'Sneha Reddy', surveys: 28, completed: 26, avgScore: 89, efficiency: 93 },
    { name: 'Vikram Singh', surveys: 25, completed: 22, avgScore: 82, efficiency: 88 }
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Engineer Performance</h3>
        <Users size={16} className="text-[var(--accent)]" />
      </div>
      <div className="space-y-3">
        {engineerData.map((engineer, index) => (
          <div key={engineer.name} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hovered)] transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold text-xs">
              {engineer.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[var(--text-primary)]">{engineer.name}</p>
              <p className="text-[9px] text-[var(--text-muted)]">{engineer.completed}/{engineer.surveys} completed</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Brain size={8} className="text-[var(--text-muted)]" />
                <span className="text-[9px] font-bold text-emerald-500">{engineer.avgScore}pts</span>
              </div>
              <p className="text-[9px] text-[var(--text-muted)]">{engineer.efficiency}% eff.</p>
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

// ── Standards Mapping ──────────────────────────────────────────────────────────
const SURVEY_FIELDS = [
  { id: 'id', label: 'Survey ID', type: 'text' },
  { id: 'customerName', label: 'Customer Name', type: 'text' },
  { id: 'status', label: 'Status', type: 'select', options: ['Pending', 'Scheduled', 'Completed', 'Inspections', 'Documents', 'Compliance & Regulatory'] },
  { id: 'estimatedKw', label: 'System Size (kW)', type: 'number' },
  { id: 'roofArea', label: 'Roof Area (m²)', type: 'number' },
  { id: 'shadowPct', label: 'Shadow %', type: 'number' },
  { id: 'engineer', label: 'Assigned Engineer', type: 'text' },
  { id: 'scheduledDate', label: 'Scheduled Date', type: 'date' },
  { id: 'feasibilityScore', label: 'Feasibility Score', type: 'number' },
];

// Per-survey site analysis
const SITE_ANALYSIS = {
  S001: { gpsLat: '23.0225', gpsLng: '72.5714', roofType: 'RCC Flat', orientation: 'South', annualIrradiance: 1845, subsidyEligible: true, subsidyPct: 40, netMetering: true, feasibilityScore: 94, aiCapacityHint: '50 kW confirmed — east-west bifacial layout recommended for maximum annual yield.' },
  S002: { gpsLat: '21.1702', gpsLng: '72.8311', roofType: 'GI Sheet Sloped', orientation: 'SE–SW', annualIrradiance: 1920, subsidyEligible: true, subsidyPct: 30, netMetering: true, feasibilityScore: 87, aiCapacityHint: '100 kW viable — 22° tilt is optimal for Surat latitude. 10% shadow manageable with micro-inverters.' },
  S003: { gpsLat: '19.0760', gpsLng: '72.8777', roofType: 'RCC Flat', orientation: 'South', annualIrradiance: 1780, subsidyEligible: false, subsidyPct: 0, netMetering: true, feasibilityScore: 78, aiCapacityHint: '200 kW max feasible — 8% shadow risk, east-west bifacial adds +12% annual yield.' },
  S004: { gpsLat: '22.8173', gpsLng: '70.8022', roofType: 'RCC Flat', orientation: 'South', annualIrradiance: 1870, subsidyEligible: true, subsidyPct: 30, netMetering: true, feasibilityScore: 91, aiCapacityHint: '150 kW feasible — low 6% shadow, 21° tilt ideal for Morbi latitude.' },
  S005: { gpsLat: '22.5645', gpsLng: '72.9289', roofType: 'RCC Flat', orientation: 'South', annualIrradiance: 1860, subsidyEligible: true, subsidyPct: 40, netMetering: false, feasibilityScore: 96, aiCapacityHint: '10 kW residential — PM-KUSUM 40% subsidy eligible. Suggest adding 3° tilt for optimal yield.' },
  S006: { gpsLat: '22.3039', gpsLng: '70.8022', roofType: 'Industrial Shed', orientation: 'East-West', annualIrradiance: 1830, subsidyEligible: false, subsidyPct: 0, netMetering: true, feasibilityScore: 65, aiCapacityHint: '25 kW feasible — 12% shadow at peak hours requires full shade analysis before design proceeds.' },
  S007: { gpsLat: '23.2156', gpsLng: '72.6368', roofType: 'RCC Flat', orientation: 'South', annualIrradiance: 1850, subsidyEligible: true, subsidyPct: 35, netMetering: true, feasibilityScore: 89, aiCapacityHint: '45 kW feasible — industrial complex with minimal shadow, optimal for commercial installation.' },
  S008: { gpsLat: '22.3083', gpsLng: '73.1812', roofType: 'RCC Flat', orientation: 'South', annualIrradiance: 1890, subsidyEligible: true, subsidyPct: 30, netMetering: true, feasibilityScore: 92, aiCapacityHint: '20 kW ideal — manufacturing facility with excellent solar access and low maintenance requirements.' },
  S009: { gpsLat: '21.2041', gpsLng: '72.8717', roofType: 'GI Sheet Sloped', orientation: 'South-SouthEast', annualIrradiance: 1820, subsidyEligible: true, subsidyPct: 25, netMetering: true, feasibilityScore: 78, aiCapacityHint: '55 kW feasible — textile mill with moderate shadow, requires micro-inverter optimization for peak performance.' },
  S010: { gpsLat: '23.0775', gpsLng: '72.6357', roofType: 'RCC Flat', orientation: 'South', annualIrradiance: 1880, subsidyEligible: true, subsidyPct: 40, netMetering: true, feasibilityScore: 94, aiCapacityHint: '30 kW perfect — corporate tower with excellent irradiance and premium feed-in tariff eligibility.' },
  S011: { gpsLat: '22.3114', gpsLng: '70.8022', roofType: 'Industrial Shed', orientation: 'East-West', annualIrradiance: 1840, subsidyEligible: false, subsidyPct: 0, netMetering: true, feasibilityScore: 88, aiCapacityHint: '18 kW optimal — processing plant with consistent energy demand and good solar access throughout the day.' },
  S012: { gpsLat: '22.3065', gpsLng: '73.1789', roofType: 'RCC Flat', orientation: 'South', annualIrradiance: 1860, subsidyEligible: true, subsidyPct: 30, netMetering: true, feasibilityScore: 85, aiCapacityHint: '35 kW suitable — chemical factory with high energy consumption, excellent ROI with net metering benefits.' },
  S013: { gpsLat: '23.5859', gpsLng: '72.3986', roofType: 'RCC Flat', orientation: 'South', annualIrradiance: 1870, subsidyEligible: true, subsidyPct: 35, netMetering: true, feasibilityScore: 91, aiCapacityHint: '40 kW recommended — agricultural facility with seasonal energy patterns, ideal for solar + battery storage system.' },
  S014: { gpsLat: '22.5645', gpsLng: '72.9289', roofType: 'RCC Flat', orientation: 'South', annualIrradiance: 1860, subsidyEligible: true, subsidyPct: 40, netMetering: false, feasibilityScore: 87, aiCapacityHint: '22 kW efficient — food processing unit with excellent solar access and low operational costs.' },
  S015: { gpsLat: '22.6969', gpsLng: '72.9289', roofType: 'Industrial Shed', orientation: 'South-East', annualIrradiance: 1830, subsidyEligible: false, subsidyPct: 0, netMetering: true, feasibilityScore: 82, aiCapacityHint: '28 kW feasible — warehousing complex with moderate shadow, requires careful layout planning for optimal output.' },
  S016: { gpsLat: '23.0333', gpsLng: '71.8022', roofType: 'GI Sheet Sloped', orientation: 'South', annualIrradiance: 1810, subsidyEligible: true, subsidyPct: 25, netMetering: true, feasibilityScore: 79, aiCapacityHint: '48 kW viable — steel plant with high energy demand, excellent candidate for net metering with proper load management.' },
  S017: { gpsLat: '23.2156', gpsLng: '72.6368', roofType: 'RCC Flat', orientation: 'South', annualIrradiance: 1890, subsidyEligible: true, subsidyPct: 35, netMetering: true, feasibilityScore: 93, aiCapacityHint: '25 kW ideal — IT park with critical load requirements, perfect for solar with UPS backup integration.' },
  S018: { gpsLat: '23.0775', gpsLng: '72.6357', roofType: 'RCC Flat', orientation: 'South', annualIrradiance: 1860, subsidyEligible: true, subsidyPct: 40, netMetering: true, feasibilityScore: 86, aiCapacityHint: '38 kW recommended — hospital complex with 24/7 operations, ideal for solar + battery + generator hybrid system.' },
  S019: { gpsLat: '19.0760', gpsLng: '72.8777', roofType: 'RCC Flat', orientation: 'South', annualIrradiance: 1850, subsidyEligible: true, subsidyPct: 30, netMetering: true, feasibilityScore: 84, aiCapacityHint: '60 kW maximum — film studio with specialized equipment, requires comprehensive energy audit and custom solar solution.' },
};

// ── Enriched survey data ──────────────────────────────────────────────────────
const SURVEY_ENRICHED = [
  ...SURVEYS.map(s => ({
    ...s,
    feasibilityScore: SITE_ANALYSIS[s.id]?.feasibilityScore || Math.floor(Math.random() * 40) + 60
  })),
  {
    id: 'S005', leadId: 'L006', customerName: 'Anjali Desai',
    site: 'Anand Farms, Nr. NDDB', scheduledDate: '2026-03-05', completedDate: null,
    status: 'Pending', roofArea: 120, shadowPct: 3, tiltAngle: 15,
    estimatedKw: 10, engineer: 'Priya Patel', feasibilityScore: 96,
  },
  {
    id: 'S006', leadId: 'L003', customerName: 'Amitabh Verma',
    site: 'Rajkot Cold Storage', scheduledDate: '2026-02-28', completedDate: null,
    status: 'Scheduled', roofArea: 280, shadowPct: 12, tiltAngle: 20,
    estimatedKw: 25, engineer: 'Priya Patel', feasibilityScore: 65,
  },
  {
    id: 'S007', leadId: 'L007', customerName: 'Rakesh Mehta',
    site: 'Gandhinagar Industrial Park', scheduledDate: '2026-02-15', completedDate: '2026-02-20',
    status: 'Inspections', roofArea: 350, shadowPct: 8, tiltAngle: 18,
    estimatedKw: 45, engineer: 'Rahul Sharma', feasibilityScore: 89,
  },
  {
    id: 'S008', leadId: 'L008', customerName: 'Kavita Shah',
    site: 'Vadodara Manufacturing Unit', scheduledDate: '2026-02-10', completedDate: '2026-02-18',
    status: 'Inspections', roofArea: 180, shadowPct: 5, tiltAngle: 22,
    estimatedKw: 20, engineer: 'Sneha Reddy', feasibilityScore: 92,
  },
  {
    id: 'S009', leadId: 'L009', customerName: 'Mahesh Patel',
    site: 'Surat Textile Mill', scheduledDate: '2026-02-05', completedDate: '2026-02-12',
    status: 'Inspections', roofArea: 420, shadowPct: 15, tiltAngle: 25,
    estimatedKw: 55, engineer: 'Amit Kumar', feasibilityScore: 78,
  },
  {
    id: 'S010', leadId: 'L010', customerName: 'Divya Singh',
    site: 'Ahmedabad Corporate Tower', scheduledDate: '2026-02-01', completedDate: '2026-02-08',
    status: 'Documents', roofArea: 200, shadowPct: 6, tiltAngle: 20,
    estimatedKw: 30, engineer: 'Priya Patel', feasibilityScore: 94,
  },
  {
    id: 'S011', leadId: 'L011', customerName: 'Anil Gupta',
    site: 'Rajkot Processing Plant', scheduledDate: '2026-01-28', completedDate: '2026-02-05',
    status: 'Documents', roofArea: 150, shadowPct: 4, tiltAngle: 19,
    estimatedKw: 18, engineer: 'Rahul Sharma', feasibilityScore: 88,
  },
  {
    id: 'S012', leadId: 'L012', customerName: 'Pooja Joshi',
    site: 'Baroda Chemical Factory', scheduledDate: '2026-01-25', completedDate: '2026-02-01',
    status: 'Documents', roofArea: 280, shadowPct: 9, tiltAngle: 21,
    estimatedKw: 35, engineer: 'Sneha Reddy', feasibilityScore: 85,
  },
  {
    id: 'S013', leadId: 'L013', customerName: 'Rajesh Kumar',
    site: 'Mehsana Agricultural Facility', scheduledDate: '2026-01-22', completedDate: '2026-01-29',
    status: 'Documents', roofArea: 320, shadowPct: 7, tiltAngle: 17,
    estimatedKw: 40, engineer: 'Amit Kumar', feasibilityScore: 91,
  },
  {
    id: 'S014', leadId: 'L014', customerName: 'Sunita Rao',
    site: 'Anand Food Processing Unit', scheduledDate: '2026-01-20', completedDate: '2026-01-27',
    status: 'Documents', roofArea: 190, shadowPct: 5, tiltAngle: 23,
    estimatedKw: 22, engineer: 'Priya Patel', feasibilityScore: 87,
  },
  {
    id: 'S015', leadId: 'L015', customerName: 'Vikram Desai',
    site: 'Nadiad Warehousing Complex', scheduledDate: '2026-01-18', completedDate: '2026-01-25',
    status: 'Documents', roofArea: 260, shadowPct: 11, tiltAngle: 20,
    estimatedKw: 28, engineer: 'Rahul Sharma', feasibilityScore: 82,
  },
  {
    id: 'S016', leadId: 'L016', customerName: 'Meera Shah',
    site: 'Surendranagar Steel Plant', scheduledDate: '2026-01-15', completedDate: '2026-01-22',
    status: 'Documents', roofArea: 380, shadowPct: 13, tiltAngle: 24,
    estimatedKw: 48, engineer: 'Sneha Reddy', feasibilityScore: 79,
  },
  {
    id: 'S017', leadId: 'L017', customerName: 'Amitabh Bachchan',
    site: 'Gandhinagar IT Park', scheduledDate: '2026-01-12', completedDate: '2026-01-19',
    status: 'Documents', roofArea: 220, shadowPct: 4, tiltAngle: 18,
    estimatedKw: 25, engineer: 'Amit Kumar', feasibilityScore: 93,
  },
  {
    id: 'S018', leadId: 'L018', customerName: 'Kiran Bedi',
    site: 'Ahmedabad Hospital Complex', scheduledDate: '2026-01-10', completedDate: '2026-01-17',
    status: 'Documents', roofArea: 300, shadowPct: 8, tiltAngle: 22,
    estimatedKw: 38, engineer: 'Priya Patel', feasibilityScore: 86,
  },
  {
    id: 'S019', leadId: 'L019', customerName: 'Sanjay Leela Bhansali',
    site: 'Mumbai Film Studio', scheduledDate: '2026-01-08', completedDate: '2026-01-15',
    status: 'Compliance & Regulatory', roofArea: 450, shadowPct: 12, tiltAngle: 19,
    estimatedKw: 60, engineer: 'Rahul Sharma', feasibilityScore: 84,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const scoreColor = s => s >= 85 ? 'text-emerald-400' : s >= 65 ? 'text-amber-400' : 'text-red-400';

// ── Survey card (Standardized) ────────────────────────────────────────────────
const SurveyCard = ({ survey, onDragStart, onClick }) => {
  const analysis = SITE_ANALYSIS[survey.id];
  return (
    <div
      draggable
      onDragStart={() => onDragStart(survey.id)}
      onClick={() => onClick(survey)}
      className="glass-card p-3 cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-all border border-[var(--border-subtle)] hover:border-[var(--accent)]/30 group"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] font-mono font-bold text-[var(--accent)]">{survey.id}</span>
        {analysis && (
          <div className="flex items-center gap-1">
            <Zap size={10} className={scoreColor(analysis.feasibilityScore)} />
            <span className={`text-[10px] font-bold ${scoreColor(analysis.feasibilityScore)}`}>
              {analysis.feasibilityScore}
            </span>
          </div>
        )}
      </div>
      <p className="text-xs font-black text-[var(--text-primary)] truncate mb-1 group-hover:text-[var(--accent)] transition-colors">{survey.customerName}</p>
      <p className="text-[10px] text-[var(--text-muted)] truncate flex items-center gap-1 mb-3">
        <MapPin size={10} /> {survey.site}
      </p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[var(--bg-elevated)] p-1.5 rounded-lg border border-[var(--border-subtle)] text-center">
          <p className="text-[8px] uppercase font-bold text-[var(--text-faint)]">Size</p>
          <p className="text-[10px] font-black text-[var(--text-primary)]">{survey.estimatedKw}kW</p>
        </div>
        <div className="bg-[var(--bg-elevated)] p-1.5 rounded-lg border border-[var(--border-subtle)] text-center">
          <p className="text-[8px] uppercase font-bold text-[var(--text-faint)]">Shadow</p>
          <p className={`text-[10px] font-black ${survey.shadowPct > 10 ? 'text-red-500' : 'text-emerald-500'}`}>{survey.shadowPct}%</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[9px] text-[var(--text-faint)] font-bold">
          <Calendar size={10} />
          <span>{survey.scheduledDate || 'TBD'}</span>
        </div>
        <ChevronRight size={12} className="text-[var(--text-faint)] group-hover:text-[var(--accent)] transition-all transform group-hover:translate-x-0.5" />
      </div>
    </div>
  );
};

// ── Survey stage defs ─────────────────────────────────────────────────────────
const SURVEY_STAGES = [
  { id: 'Pending', label: 'Pending', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  { id: 'Scheduled', label: 'Scheduled', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { id: 'Completed', label: 'Completed', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { id: 'Inspections', label: 'Inspections (3)', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { id: 'Documents', label: 'Documents (9)', color: '#8b5cf6', bg: 'rgba(139,92,252,0.12)' },
  { id: 'Compliance', label: 'Compliance & Regulatory', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

// ── Survey Kanban board ───────────────────────────────────────────────────────
const SurveyKanbanBoard = ({ surveys, onStageChange, onCardClick }) => {
  const draggingId = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex gap-3 min-w-max">
        {SURVEY_STAGES.map(stage => {
          const cards = surveys.filter(s => s.status === stage.id);
          const totKw = cards.reduce((a, s) => a + s.estimatedKw, 0);
          return (
            <div key={stage.id}
              className={`flex flex-col w-60 rounded-xl border transition-colors ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => { if (draggingId.current) onStageChange(draggingId.current, stage.id); draggingId.current = null; setDragOver(null); }}
            >
              <div className="p-2.5 border-b border-[var(--border-base)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {totKw > 0 && <span className="text-[10px] font-semibold text-[var(--solar)]">{totKw} kW</span>}
                  <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 p-2 flex-1 min-h-[120px]">
                {cards.map(s => (
                  <SurveyCard key={s.id} survey={s}
                    onDragStart={id => { draggingId.current = id; }}
                    onClick={onCardClick}
                  />
                ))}
                {cards.length === 0 && (
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
  );
};

// ── Component ─────────────────────────────────────────────────────────────────
const SurveyPage = () => {
  const [surveys, setSurveys] = useState(SURVEY_ENRICHED);
  const [view, setView] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState(new Set());
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [studioSurvey, setStudioSurvey] = useState(null);
  const [kanbanView, setKanbanView] = useState(false);
  const [reportsView, setReportsView] = useState(false);
  const [automationRules, setAutomationRules] = useState([
    { id: 1, name: 'High Feasibility Alert', condition: 'feasibilityScore > 90', action: 'notify_manager', enabled: true },
    { id: 2, name: 'Shadow Risk Follow-up', condition: 'shadowPct > 10', action: 'schedule_analysis', enabled: true },
    { id: 3, name: 'SLA Breach Alert', condition: 'daysPending > 3', action: 'escalate', enabled: false }
  ]);

  const { logCreate, logDelete, logStatusChange } = useAuditLog('survey');
  const { can } = usePermissions();

  // Permission guard helpers
  const guardCreate = () => {
    if (!can('survey', 'create')) {
      toast.error('Permission denied: Cannot create surveys');
      return false;
    }
    return true;
  };

  const guardEdit = () => {
    if (!can('survey', 'edit')) {
      toast.error('Permission denied: Cannot edit surveys');
      return false;
    }
    return true;
  };

  const guardDelete = () => {
    if (!can('survey', 'delete')) {
      toast.error('Permission denied: Cannot delete surveys');
      return false;
    }
    return true;
  };

  const guardExport = () => {
    if (!can('survey', 'export')) {
      toast.error('Permission denied: Cannot export surveys');
      return false;
    }
    return true;
  };

  // Advanced survey scoring algorithm
  const calculateSurveyScore = useCallback((survey) => {
    let score = 0;

    // Base feasibility score
    const baseScore = SITE_ANALYSIS[survey.id]?.feasibilityScore || 75;
    score += baseScore * 0.4; // 40% weight

    // Shadow analysis (30% weight)
    if (survey.shadowPct <= 5) score += 30;
    else if (survey.shadowPct <= 10) score += 20;
    else if (survey.shadowPct <= 15) score += 10;
    else score += 5;

    // Roof area efficiency (20% weight)
    if (survey.roofArea >= 200) score += 20;
    else if (survey.roofArea >= 100) score += 15;
    else if (survey.roofArea >= 50) score += 10;
    else score += 5;

    // System size optimization (10% weight)
    if (survey.estimatedKw >= 50) score += 10;
    else if (survey.estimatedKw >= 25) score += 8;
    else if (survey.estimatedKw >= 10) score += 6;
    else score += 3;

    return Math.min(score, 100);
  }, []);

  // Apply automation rules
  const applyAutomationRules = useCallback((survey) => {
    const results = [];

    automationRules.forEach(rule => {
      if (!rule.enabled) return;

      let conditionMet = false;

      if (rule.condition.includes('feasibilityScore >')) {
        const threshold = parseInt(rule.condition.split(' > ')[1]);
        conditionMet = calculateSurveyScore(survey) > threshold;
      } else if (rule.condition.includes('shadowPct >')) {
        const threshold = parseInt(rule.condition.split(' > ')[1]);
        conditionMet = survey.shadowPct > threshold;
      } else if (rule.condition.includes('daysPending >')) {
        const threshold = parseInt(rule.condition.split(' > ')[1]);
        const daysPending = survey.status === 'Pending' ?
          Math.floor((new Date() - new Date(survey.scheduledDate)) / (1000 * 60 * 60 * 24)) : 0;
        conditionMet = daysPending > threshold;
      }

      if (conditionMet) {
        results.push(rule);
      }
    });

    return results;
  }, [automationRules, calculateSurveyScore]);

  // Enhanced surveys with scores and automation
  const enhancedSurveys = useMemo(() => {
    return surveys.map(survey => ({
      ...survey,
      calculatedScore: calculateSurveyScore(survey),
      automation: applyAutomationRules(survey),
      slaBreached: survey.status === 'Pending' &&
        Math.floor((new Date() - new Date(survey.scheduledDate)) / (1000 * 60 * 60 * 24)) > 3
    }));
  }, [surveys, calculateSurveyScore, applyAutomationRules]);

  const columns = [
    {
      key: 'id',
      header: 'Survey ID',
      sortable: true,
      render: (v) => <span className="font-mono text-[var(--accent)]">{v}</span>,
    },
    {
      key: 'customerName',
      header: 'Customer',
      sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <Avatar size="sm">{v.split(' ').map(n => n[0]).join('')}</Avatar>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--text-primary)] truncate">{v}</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate">{row.site}</p>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (v) => <StatusBadge domain="survey" value={v} />
    },
    {
      key: 'calculatedScore',
      header: 'Score',
      sortable: true,
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Brain size={10} className="text-[var(--text-muted)]" />
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${v >= 85 ? 'text-emerald-500 bg-emerald-500/10' :
              v >= 65 ? 'text-amber-500 bg-amber-500/10' : 'text-red-500 bg-red-500/10'
              }`}>{v || 0}pts</span>
          </div>
        </div>
      )
    },
    {
      key: 'estimatedKw',
      header: 'Size (kW)',
      sortable: true,
      render: (v) => <span className="font-bold text-[var(--solar)]">{v} kW</span>
    },
    {
      key: 'shadowPct',
      header: 'Shadow',
      sortable: true,
      render: (v) => (
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${v > 10 ? 'bg-red-400' : 'bg-emerald-400'}`} />
          <span className="text-xs">{v}%</span>
        </div>
      )
    },
    {
      key: 'automation',
      header: 'Automation',
      sortable: false,
      render: (v) => (
        <div className="flex items-center gap-1">
          {v && v.length > 0 ? (
            <>
              <Zap size={12} className="text-amber-500" />
              <span className="text-[10px] text-amber-500 font-bold">{v.length} Active</span>
            </>
          ) : (
            <span className="text-[10px] text-[var(--text-muted)]">None</span>
          )}
        </div>
      )
    },
    {
      key: 'engineer',
      header: 'Engineer',
      sortable: true,
      render: (v) => <span className="text-xs text-[var(--text-secondary)]">{v}</span>
    },
    {
      key: 'scheduledDate',
      header: 'Scheduled',
      sortable: true,
      render: (v) => <span className="text-xs text-[var(--text-muted)]">{v || '—'}</span>
    },
  ];

  const handleStageChange = (id, newStage) => {
    if (!can('survey', 'edit')) {
      toast.error('Permission denied: Cannot change survey status');
      return;
    }
    const survey = surveys.find(s => s.id === id);
    setSurveys(prev => prev.map(s => s.id === id ? { ...s, status: newStage } : s));
    logStatusChange(survey, survey.status, newStage);
  };

  const activeSurveys = useMemo(() => {
    return enhancedSurveys.filter(s =>
      s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [enhancedSurveys, search]);

  const stats = useMemo(() => ({
    total: enhancedSurveys.length,
    completed: enhancedSurveys.filter(s => s.status === 'Completed').length,
    scheduled: enhancedSurveys.filter(s => s.status === 'Scheduled').length,
    highShadow: enhancedSurveys.filter(s => s.shadowPct > 10).length,
    totalKw: enhancedSurveys.reduce((acc, s) => acc + s.estimatedKw, 0),
    avgScore: Math.round(enhancedSurveys.reduce((acc, s) => acc + (s.calculatedScore || 0), 0) / enhancedSurveys.length),
    slaBreached: enhancedSurveys.filter(s => s.slaBreached).length,
    automationActive: enhancedSurveys.filter(s => s.automation && s.automation.length > 0).length
  }), [enhancedSurveys]);

  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Advanced Header ── */}
      <PageHeader
        title="Survey Management"
        subtitle="Advanced site assessments · AI feasibility · Automation · Performance tracking"
        tabs={[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
          { id: 'table', label: 'Surveys', icon: List },
          { id: 'reports', label: 'Reports', icon: BarChart2 }
        ]}
        activeTab={view}
        onTabChange={(v) => {
          if (v === 'kanban') setKanbanView(true);
          else if (v === 'reports') setReportsView(true);
          else {
            setKanbanView(false);
            setReportsView(false);
            setView(v);
          }
        }}
        actions={[
          { type: 'toggle', label: 'Automation', icon: Brain, value: automationRules.some(r => r.enabled), onToggle: () => setAutomationRules(prev => prev.map(rule => ({ ...rule, enabled: !rule.enabled }))) },
          { type: 'button', label: 'Schedule Survey', icon: Plus, variant: 'primary', onClick: () => setShowAdd(true) }
        ]}
      />

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

      {/* ── Search & Filter Bar ── */}
      {view !== 'dashboard' && (
        <div className="flex flex-wrap items-center gap-4 bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-base)]">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" size={14} />
              <Input
                placeholder="Search surveys..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <FilterSystem
              fields={SURVEY_FIELDS}
              onApply={(f) => console.log('Survey Filters:', f)}
              presets={[
                { name: 'High Feasibility', filters: [{ field: 'feasibilityScore', operator: 'gt', value: '85', logic: 'AND' }] },
                { name: 'Critical Shadow', filters: [{ field: 'shadowPct', operator: 'gt', value: '10', logic: 'AND' }] }
              ]}
            />
          </div>
        </div>
      )}

      {/* ── Advanced Dashboard ── */}
      {view === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Executive Summary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SurveyDashboardKPI
              title="Active Surveys"
              value={stats.total}
              change={12.5}
              icon={MapPin}
              color="#3b82f6"
              subtitle="In pipeline"
              trend="up"
            />
            <SurveyDashboardKPI
              title="Total Capacity"
              value={`${stats.totalKw} kW`}
              change={8.2}
              icon={Zap}
              color="#f59e0b"
              subtitle="Estimated"
              trend="up"
            />
            <SurveyDashboardKPI
              title="Avg Score"
              value={stats.avgScore}
              change={5.8}
              icon={Brain}
              color="#22c55e"
              subtitle="Feasibility"
              trend="up"
            />
            <SurveyDashboardKPI
              title="Automation"
              value={stats.automationActive}
              change={15.3}
              icon={Zap}
              color="#a855f7"
              subtitle="Active rules"
              trend="up"
            />
          </div>

          {/* Advanced Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Metrics */}
            <SurveyPerformanceMetrics />

            {/* Engineer Performance */}
            <SurveyEngineerPerformance />

            {/* Activity Heatmap */}
            <SurveyActivityHeatmap />
          </div>

          {/* Feasibility & Trends Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feasibility Breakdown Chart */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Site Feasibility Analysis</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Distribution of sites by AI feasibility score</p>
                </div>
                <TrendingUp size={16} className="text-[var(--accent)]" />
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={[
                  { range: '0-20', count: 2, color: '#ef4444' },
                  { range: '21-40', count: 5, color: '#f97316' },
                  { range: '41-60', count: 12, color: '#f59e0b' },
                  { range: '61-80', count: 28, color: '#3b82f6' },
                  { range: '81-100', count: 18, color: '#22c55e' },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-base)',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Survey Trends Chart */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Survey Completion Trends</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Monthly survey completion and capacity addition</p>
                </div>
                <BarChart2 size={16} className="text-[var(--accent)]" />
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={[
                  { month: 'Jan', completed: 12, capacity: 450, scheduled: 18 },
                  { month: 'Feb', completed: 18, capacity: 680, scheduled: 22 },
                  { month: 'Mar', completed: 15, capacity: 520, scheduled: 20 },
                  { month: 'Apr', completed: 22, capacity: 890, scheduled: 28 },
                  { month: 'May', completed: 28, capacity: 1100, scheduled: 32 },
                  { month: 'Jun', completed: 25, capacity: 950, scheduled: 30 },
                ]}>
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
                  <Area type="monotone" dataKey="completed" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="scheduled" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="capacity" stackId="2" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Alerts & Automation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Alerts */}
            <div className="glass-card p-5 border-l-4 border-l-red-500/50">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={16} className="text-red-500" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Risk & Action Alerts</h3>
              </div>
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                  <p className="text-[11px] font-bold text-red-500 mb-1">High Shadow Risk ({stats.highShadow} sites)</p>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">Sites with {'>'}10% shadow require immediate micro-inverter evaluation.</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <p className="text-[11px] font-bold text-amber-500 mb-1">SLA Breach Warning</p>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{stats.slaBreached} surveys waiting {'>'}48h for engineer assignment.</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <p className="text-[11px] font-bold text-blue-500 mb-1">Pending Sync</p>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">2 offline reports need synchronization to cloud.</p>
                </div>
              </div>
              <Button variant="ghost" className="w-full mt-4 text-[10px] h-8">View Detailed Risks</Button>
            </div>

            {/* Automation Rules */}
            <div className="glass-card p-5 border-l-4 border-l-amber-500/50">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={16} className="text-amber-500" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Automation Rules</h3>
              </div>
              <div className="space-y-3">
                {automationRules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)]">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-[var(--text-primary)]">{rule.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{rule.condition}</p>
                    </div>
                    <button
                      onClick={() => setAutomationRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r))}
                      className={`w-10 h-5 rounded-full transition-colors ${rule.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${rule.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-[10px] h-8">Configure Rules</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Kanban View ── */}
      {kanbanView && (
        <SurveyKanbanBoard
          surveys={activeSurveys}
          onStageChange={handleStageChange}
          onCardClick={setSelectedSurvey}
        />
      )}

      {/* ── Table View ── */}
      {view === 'table' && (
        <DataTable
          columns={columns}
          data={activeSurveys.slice((page - 1) * pageSize, page * pageSize)}
          total={activeSurveys.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          search={search}
          onSearch={setSearch}
          selectedRows={selected}
          onSelectRows={setSelected}
          bulkActions={[
            { label: 'Export', icon: Download, onClick: (rows) => { if (guardExport()) console.log('Exporting', rows); } },
            { label: 'Assign Engineer', icon: Users, onClick: (rows) => { if (guardEdit()) console.log('Assigning', rows); } },
            { label: 'Schedule', icon: Calendar, onClick: (rows) => { if (guardEdit()) console.log('Scheduling', rows); } },
            {
              label: 'Delete', icon: Trash2, onClick: (rows) => {
                if (!guardDelete()) return;
                rows.forEach(row => logDelete(row));
                console.log('Deleting', rows);
              }, danger: true
            },
          ]}
          rowActions={[
            { label: 'View Report', icon: Eye, onClick: (r) => setSelectedSurvey(r) },
            { label: 'Timeline', icon: History, onClick: (r) => console.log('Timeline', r) },
            { label: 'Edit', icon: Edit2, onClick: (r) => { if (guardEdit()) console.log('Edit', r); } },
            {
              label: '3D Studio', icon: Box, onClick: (r) => {
                const analysis = SITE_ANALYSIS[r.id];
                setStudioSurvey({
                  projectName: r.customerName,
                  lat: parseFloat(analysis?.gpsLat || 23),
                  lng: parseFloat(analysis?.gpsLng || 72),
                });
              }
            },
            {
              label: 'Delete', icon: Trash2, onClick: (r) => {
                if (!guardDelete()) return;
                logDelete(r);
                console.log('Deleted', r);
              }, danger: true
            },
          ]}
        />
      )}

      {/* ── Reports View ── */}
      {reportsView && (
        <div className="space-y-6">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Survey Analytics Reports</h3>
              <BarChart2 size={16} className="text-[var(--accent)]" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <h4 className="text-xs font-bold text-[var(--text-primary)] mb-3">Completion Rate by Month</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={[
                    { month: 'Jan', rate: 78 },
                    { month: 'Feb', rate: 82 },
                    { month: 'Mar', rate: 79 },
                    { month: 'Apr', rate: 85 },
                    { month: 'May', rate: 88 },
                    { month: 'Jun', rate: 91 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                    <Tooltip />
                    <Line type="monotone" dataKey="rate" stroke="#22c55e" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <h4 className="text-xs font-bold text-[var(--text-primary)] mb-3">Survey Distribution by Status</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Completed', value: stats.completed, color: '#22c55e' },
                        { name: 'Scheduled', value: stats.scheduled, color: '#3b82f6' },
                        { name: 'Pending', value: stats.total - stats.completed - stats.scheduled, color: '#f59e0b' },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[
                        { name: 'Completed', color: '#22c55e' },
                        { name: 'Scheduled', color: '#3b82f6' },
                        { name: 'Pending', color: '#f59e0b' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule Survey Modal ── */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Schedule New Site Survey"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => {
              if (guardCreate()) {
                logCreate({ id: 'new', name: 'New survey scheduled' });
                setShowAdd(false);
              }
            }}>
              <Plus size={14} /> Schedule Visit
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Customer Name"><Input placeholder="e.g. Rajesh Kumar" /></FormField>
            <FormField label="Assigned Engineer">
              <Select>
                <option>Priya Patel</option>
                <option>Arjun Mehta</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Site Address"><Input placeholder="Plot 45, GIDC Phase II, Ahmedabad" /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Scheduled Date"><Input type="date" /></FormField>
            <FormField label="Est. Size (kW)"><Input type="number" placeholder="50" /></FormField>
          </div>
          <FormField label="Site Notes"><Textarea rows={3} placeholder="Access restrictions, structural observations..." /></FormField>
        </div>
      </Modal>

      {/* ── Site Report Detail Modal ── */}
      <Modal
        open={!!selectedSurvey}
        onClose={() => setSelectedSurvey(null)}
        title={selectedSurvey ? `Survey Report — ${selectedSurvey.id}` : ''}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setSelectedSurvey(null)}>Close</Button>
            <Button variant="outline"><Download size={14} /> Report</Button>
            <Button
              onClick={() => {
                const analysis = SITE_ANALYSIS[selectedSurvey.id];
                setStudioSurvey({
                  projectName: selectedSurvey.customerName,
                  lat: parseFloat(analysis?.gpsLat || 23),
                  lng: parseFloat(analysis?.gpsLng || 72),
                });
                setSelectedSurvey(null);
              }}
            >
              <Box size={14} /> 3D Studio
            </Button>
          </div>
        }
      >
        {selectedSurvey && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 pb-4 border-b border-[var(--border-base)]">
              <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-xl font-black text-[var(--primary)]">
                {selectedSurvey.customerName.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-[var(--text-primary)]">{selectedSurvey.customerName}</h3>
                  <StatusBadge domain="survey" value={selectedSurvey.status} />
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                  <MapPin size={12} /> {selectedSurvey.site}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ['Engineer', selectedSurvey.engineer, Users, 'blue'],
                ['Roof Area', `${selectedSurvey.roofArea} m²`, Layers, 'purple'],
                ['Shadow Risk', `${selectedSurvey.shadowPct}%`, Sun, selectedSurvey.shadowPct > 10 ? 'red' : 'emerald'],
                ['Est. Capacity', `${selectedSurvey.estimatedKw} kW`, Zap, 'amber'],
              ].map(([l, v, Icon, color]) => (
                <div key={l} className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={12} className={`text-${color}-500`} />
                    <span className="text-[10px] font-bold uppercase text-[var(--text-faint)]">{l}</span>
                  </div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">{v}</p>
                </div>
              ))}
            </div>

            {SITE_ANALYSIS[selectedSurvey.id] && (
              <div className="p-4 rounded-2xl bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={14} className="text-[var(--primary)]" />
                  <span className="text-xs font-bold text-[var(--primary)]">AI Feasibility Score: {SITE_ANALYSIS[selectedSurvey.id].feasibilityScore}/100</span>
                </div>
                <Progress value={SITE_ANALYSIS[selectedSurvey.id].feasibilityScore} className="h-2" />
                <p className="text-[10px] text-[var(--text-muted)] mt-3 leading-relaxed">
                  {SITE_ANALYSIS[selectedSurvey.id].aiCapacityHint}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════
          ENHANCED SOLAR 3D DESIGN STUDIO — Launched from Survey
      ══════════════════════════════════════════════ */}
      {studioSurvey && (
        <EnhancedSolarSurveyStudio
          projectName={studioSurvey.projectName}
          initialLat={studioSurvey.lat}
          initialLng={studioSurvey.lng}
          onClose={() => setStudioSurvey(null)}
        />
      )}

    </div>
  );
};

export default SurveyPage;
