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


import { PIPELINE_STAGES } from '../data/mockData';
import { leadsApi } from '../services/leadsApi';
import { surveysApi } from '../services/surveysApi';
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
  const [view, setView] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState(new Set());
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [studioSurvey, setStudioSurvey] = useState(null);
  const [kanbanView, setKanbanView] = useState(false);
  const [reportsView, setReportsView] = useState(false);
  
  // 4-Section Survey Management State
  // Section 1: CRM Leads (stage='survey') - fetched from leads API
  const [crmLeads, setCrmLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState(null);
  
  // All surveys combined (for calculations and legacy support)
  const [surveys, setSurveys] = useState([]);
  
  // Section 2: Pending Surveys (status='pending') - survey scheduled, form not submitted
  const [pendingSurveys, setPendingSurveys] = useState([]);
  
  // Section 3: Active Surveys (status='active') - form submitted, survey in progress
  const [activeSurveys, setActiveSurveys] = useState([]);
  
  // Section 4: Completed Surveys (status='completed') - survey done
  const [completedSurveys, setCompletedSurveys] = useState([]);
  
  const [surveysLoading, setSurveysLoading] = useState(true);
  const [surveysError, setSurveysError] = useState(null);
  
  // Track which leads have surveys created (to prevent duplicate scheduling)
  const [surveyCreatedLeadIds, setSurveyCreatedLeadIds] = useState([]);
  
  // Form state for scheduling survey
  const [formData, setFormData] = useState({
    customerName: '',
    engineer: 'Priya Patel',
    siteAddress: '',
    scheduledDate: '',
    size: '',
    notes: ''
  });

  // Fetch real leads and surveys from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLeadsLoading(true);
        setSurveysLoading(true);
        
        // Fetch leads from CRM (Site Survey Scheduled stage)
        const leadsResult = await leadsApi.getAll({ stage: 'survey', limit: 100 });
        const leadsData = leadsResult.data?.data || leadsResult.data || [];
        setCrmLeads(leadsData);
        setLeadsError(null);
        
        // Fetch ALL surveys from backend (no status filter to get all)
        const surveysResult = await surveysApi.getAll({ limit: 100 });
        const surveysData = surveysResult.data?.data || surveysResult.data || [];
        
        // Transform and categorize surveys by status
        const transformedSurveys = surveysData.map(s => ({
          id: s.surveyId || s._id,
          customerName: s.customerName,
          engineer: s.engineer,
          site: s.site,
          scheduledDate: s.scheduledDate,
          estimatedKw: s.estimatedKw,
          status: s.status,
          shadowPct: s.shadowPct,
          roofArea: s.roofArea,
          sourceLeadId: s.sourceLeadId,
          notes: s.notes,
          createdAt: s.createdAt
        }));
        
        // Split surveys by status
        setPendingSurveys(transformedSurveys.filter(s => s.status === 'pending'));
        setActiveSurveys(transformedSurveys.filter(s => s.status === 'active'));
        setCompletedSurveys(transformedSurveys.filter(s => s.status === 'completed'));
        
        // Track which leads have surveys created
        const createdLeadIds = surveysData
          .filter(s => s.sourceLeadId)
          .map(s => s.sourceLeadId);
        setSurveyCreatedLeadIds(createdLeadIds);
        
        setSurveysError(null);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setLeadsError('Failed to load leads from CRM');
        setSurveysError('Failed to load surveys');
      } finally {
        setLeadsLoading(false);
        setSurveysLoading(false);
      }
    };
    fetchData();
  }, []);

  // Pre-fill form when lead is selected
  useEffect(() => {
    if (selectedLead) {
      setFormData({
        customerName: selectedLead.name || '',
        engineer: selectedLead.assignedTo || 'Priya Patel',
        siteAddress: selectedLead.company || '',
        scheduledDate: selectedLead.nextFollowUp || '',
        size: selectedLead.kw?.replace('kW', '') || '',
        notes: `Lead from CRM. City: ${selectedLead.city || ''}, Phone: ${selectedLead.phone || ''}`
      });
    } else {
      setFormData({
        customerName: '',
        engineer: 'Priya Patel',
        siteAddress: '',
        scheduledDate: '',
        size: '',
        notes: ''
      });
    }
  }, [selectedLead, showAdd]);
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

  // 🔄 SURVEY FLOW: Pending → Active (Submit Form)
  const handleSubmitSurveyForm = async (survey) => {
    if (!guardEdit()) return;
    
    // Optimistic UI update - move immediately
    const surveyWithActiveStatus = { ...survey, status: 'active' };
    setPendingSurveys(prev => prev.filter(s => s.id !== survey.id));
    setActiveSurveys(prev => [surveyWithActiveStatus, ...prev]);
    toast.success('Survey form submitted! Moved to Active.');
    logStatusChange(survey, 'pending', 'active');
    
    try {
      setSurveysLoading(true);
      // Update survey status to 'active' in backend
      await surveysApi.update(survey.id, { status: 'active' });
    } catch (err) {
      console.error('Failed to update survey status:', err);
      // Don't show error - UI already updated optimistically
      // Optionally refresh to sync with backend
      toast.error('Backend sync failed, but survey moved to Active');
    } finally {
      setSurveysLoading(false);
    }
  };

  // 🔄 SURVEY FLOW: Active → Completed + Lead Stage → Proposal
  const handleCompleteSurvey = async (survey) => {
    if (!guardEdit()) return;
    
    // Optimistic UI update - move immediately
    const surveyWithCompletedStatus = { ...survey, status: 'completed' };
    setActiveSurveys(prev => prev.filter(s => s.id !== survey.id));
    setCompletedSurveys(prev => [surveyWithCompletedStatus, ...prev]);
    toast.success('Survey completed! Lead moved to Proposal stage.');
    logStatusChange(survey, 'active', 'completed');
    
    try {
      setSurveysLoading(true);
      // Update survey status to 'completed' in backend
      await surveysApi.update(survey.id, { status: 'completed' });
      
      // Update lead stage to 'proposal' (ONLY on completion)
      if (survey.sourceLeadId) {
        await leadsApi.bulkUpdateStage([survey.sourceLeadId], 'proposal');
      }
    } catch (err) {
      console.error('Failed to complete survey:', err);
      toast.error('Backend sync failed, but survey moved to Completed');
    } finally {
      setSurveysLoading(false);
    }
  };

  // Generate proposal for completed survey
  const handleGenerateProposal = (survey) => {
    toast.success(`Generating proposal for ${survey.customerName}...`);
    // TODO: Navigate to proposal creation page
    console.log('Generate proposal for survey:', survey);
  };

  const filteredActiveSurveys = useMemo(() => {
    return activeSurveys.filter(s =>
      s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [activeSurveys, search]);

  const stats = useMemo(() => ({
    total: pendingSurveys.length + activeSurveys.length + completedSurveys.length,
    pending: pendingSurveys.length,
    active: activeSurveys.length,
    completed: completedSurveys.length,
    totalKw: [...pendingSurveys, ...activeSurveys, ...completedSurveys].reduce((acc, s) => acc + (s.estimatedKw || 0), 0),
  }), [pendingSurveys, activeSurveys, completedSurveys]);

  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Advanced Header ── */}
      <div className="page-header">
        <div>
          <h1 className="heading-page">Survey Management</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Advanced site assessments · AI feasibility · Automation · Performance tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)]">
            <Brain size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] text-[var(--text-muted)]">Automation</span>
            <button
              onClick={() => setAutomationRules(prev => prev.map(rule => ({ ...rule, enabled: !rule.enabled })))}
              className={`w-8 h-4 rounded-full transition-colors ${automationRules.some(r => r.enabled) ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
            >
              <div className={`w-3 h-3 bg-white rounded-full transition-transform ${automationRules.some(r => r.enabled) ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
            </button>
          </div>
        </div>

      </div>

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
          {/* Simple Stats Cards Only */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SurveyDashboardKPI
              title="ALL"
              value={stats.total}
              change={12.5}
              icon={MapPin}
              color="#3b82f6"
              subtitle="Total surveys"
              trend="up"
            />
            <SurveyDashboardKPI
              title="PENDING"
              value={stats.pending}
              change={-5.2}
              icon={Clock}
              color="#f59e0b"
              subtitle="Awaiting form submission"
              trend="down"
            />
            <SurveyDashboardKPI
              title="ACTIVE"
              value={stats.active}
              change={8.2}
              icon={Zap}
              color="#22c55e"
              subtitle="In progress"
              trend="up"
            />
            <SurveyDashboardKPI
              title="COMPLETED"
              value={stats.completed}
              change={15.3}
              icon={CheckCircle}
              color="#a855f7"
              subtitle="Finished surveys"
              trend="up"
            />
          </div>

          {/* CRM Leads - Site Survey Scheduled */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Site Survey Scheduled (From CRM)</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Leads ready for site survey scheduling</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                  {crmLeads.filter(l => !surveyCreatedLeadIds.includes(l.id)).length} Pending
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {leadsLoading ? (
                <div className="col-span-full p-8 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p className="text-[11px] text-[var(--text-muted)]">Loading leads from CRM...</p>
                </div>
              ) : leadsError ? (
                <div className="col-span-full p-8 text-center">
                  <p className="text-[11px] text-red-500">{leadsError}</p>
                </div>
              ) : crmLeads.filter(l => !surveyCreatedLeadIds.includes(l.id)).length === 0 ? (
                <div className="col-span-full p-8 text-center">
                  <p className="text-[11px] text-[var(--text-muted)]">No leads in "Site Survey Scheduled" stage</p>
                </div>
              ) : (
                crmLeads.filter(l => !surveyCreatedLeadIds.includes(l.id)).map(lead => (
                <div
                  key={lead.id}
                  onClick={() => {
                    setSelectedLead(lead);
                    setShowAdd(true);
                  }}
                  className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/50 cursor-pointer hover:scale-[1.02] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-sm">
                      {lead.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">{lead.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">{lead.company}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-amber-500">{lead.kw}</p>
                      <p className="text-[9px] text-[var(--text-muted)]">{lead.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]">
                      <Calendar size={10} />
                      <span>Due: {lead.nextFollowUp}</span>
                    </div>
                    <span className="text-[9px] text-[var(--accent)] font-medium">Click to Schedule →</span>
                  </div>
                </div>
              ))
              )}
            </div>
          </div>

          {/* PENDING Surveys - Form not yet submitted */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">PENDING Surveys (Form Required)</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Scheduled but form not yet submitted</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                  {pendingSurveys.length} Pending
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingSurveys.map(survey => (
                <div
                  key={survey.id}
                  className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-amber-500/30 hover:border-amber-500/60 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-sm">
                      {survey.customerName?.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">{survey.customerName}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">{survey.site}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-amber-500">{survey.estimatedKw}kW</p>
                      <StatusBadge domain="survey" value="pending" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]">
                      <Calendar size={10} />
                      <span>Scheduled: {survey.scheduledDate}</span>
                    </div>
                    <button
                      onClick={() => handleSubmitSurveyForm(survey)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Edit2 size={10} />
                      Fill Survey Form
                    </button>
                  </div>
                </div>
              ))}
              {pendingSurveys.length === 0 && (
                <div className="col-span-full p-8 text-center">
                  <p className="text-[11px] text-[var(--text-muted)]">No pending surveys</p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-1">Schedule from CRM leads above</p>
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE Surveys */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">ACTIVE Surveys (Running)</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Scheduled site surveys in progress</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                  {activeSurveys.length} Active
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeSurveys.map(survey => (
                <div
                  key={survey.id}
                  className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-emerald-500/30 hover:border-emerald-500/60 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 text-white flex items-center justify-center font-bold text-sm">
                      {survey.customerName?.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">{survey.customerName}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">{survey.site}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-emerald-500">{survey.estimatedKw}kW</p>
                      <StatusBadge domain="survey" value="active" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]">
                      <Calendar size={10} />
                      <span>Scheduled: {survey.scheduledDate}</span>
                    </div>
                    <button
                      onClick={() => handleCompleteSurvey(survey)}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <CheckCircle size={10} />
                      Complete Survey
                    </button>
                  </div>
                </div>
              ))}
              {activeSurveys.length === 0 && (
                <div className="col-span-full p-8 text-center">
                  <p className="text-[11px] text-[var(--text-muted)]">No active surveys</p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-1">Submit form from Pending section to activate</p>
                </div>
              )}
            </div>
          </div>

          {/* COMPLETED Surveys */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">COMPLETED Surveys</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Survey completed, lead ready for proposal</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold">
                  {completedSurveys.length} Completed
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {completedSurveys.map(survey => (
                <div
                  key={survey.id}
                  className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-blue-500/30 hover:border-blue-500/60 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center font-bold text-sm">
                      {survey.customerName?.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">{survey.customerName}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">{survey.site}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-blue-500">{survey.estimatedKw}kW</p>
                      <StatusBadge domain="survey" value="completed" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]">
                      <Calendar size={10} />
                      <span>Completed: {survey.scheduledDate}</span>
                    </div>
                    <button
                      onClick={() => handleGenerateProposal(survey)}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <FileText size={10} />
                      Generate Proposal
                    </button>
                  </div>
                </div>
              ))}
              {completedSurveys.length === 0 && (
                <div className="col-span-full p-8 text-center">
                  <p className="text-[11px] text-[var(--text-muted)]">No completed surveys yet</p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-1">Complete surveys from Active section</p>
                </div>
              )}
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
            { key: 'export', label: 'Export', icon: Download, onClick: (rows) => { if (guardExport()) console.log('Exporting', rows); } },
            { key: 'assign', label: 'Assign Engineer', icon: Users, onClick: (rows) => { if (guardEdit()) console.log('Assigning', rows); } },
            { key: 'schedule', label: 'Schedule', icon: Calendar, onClick: (rows) => { if (guardEdit()) console.log('Scheduling', rows); } },
            {
              key: 'delete', label: 'Delete', icon: Trash2, onClick: (rows) => {
                if (!guardDelete()) return;
                rows.forEach(row => logDelete(row));
                console.log('Deleting', rows);
              }, danger: true
            },
          ]}
          rowActions={[
            { key: 'view', label: 'View Report', icon: Eye, onClick: (r) => setSelectedSurvey(r) },
            { key: 'timeline', label: 'Timeline', icon: History, onClick: (r) => console.log('Timeline', r) },
            { key: 'edit', label: 'Edit', icon: Edit2, onClick: (r) => { if (guardEdit()) console.log('Edit', r); } },
            {
              key: '3d', label: '3D Studio', icon: Box, onClick: (r) => {
                const analysis = SITE_ANALYSIS[r.id];
                setStudioSurvey({
                  projectName: r.customerName,
                  lat: parseFloat(analysis?.gpsLat || 23),
                  lng: parseFloat(analysis?.gpsLng || 72),
                });
              }
            },
            {
              key: 'delete', label: 'Delete', icon: Trash2, onClick: (r) => {
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
                        { name: 'Active', value: stats.active, color: '#3b82f6' },
                        { name: 'Pending', value: stats.pending, color: '#f59e0b' },
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
                        { name: 'Active', color: '#3b82f6' },
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
        onClose={() => {
          setShowAdd(false);
          setSelectedLead(null);
        }}
        title={selectedLead ? `Schedule Survey — ${selectedLead.name}` : "Schedule New Site Survey"}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => {
              setShowAdd(false);
              setSelectedLead(null);
            }}>Cancel</Button>
            <Button 
              disabled={isScheduling}
              onClick={async () => {
              if (guardCreate()) {
                setIsScheduling(true);
                try {
                  // Create survey with 'pending' status
                  // Lead stage will NOT change - it stays 'survey' in CRM
                  const surveyData = {
                    customerName: formData.customerName,
                    engineer: formData.engineer,
                    site: formData.siteAddress,
                    scheduledDate: formData.scheduledDate,
                    estimatedKw: parseInt(formData.size) || 0,
                    status: 'pending', // NEW: Create as pending, not active
                    shadowPct: 0,
                    roofArea: 0,
                    sourceLeadId: selectedLead?.id || null,
                    notes: formData.notes
                  };
                  
                  const result = await surveysApi.create(surveyData);
                  const newSurveyId = result.data?.surveyId || result.data?._id || `temp-${Date.now()}`;
                  
                  // Add to pending surveys immediately (lead stays in CRM section)
                  const newSurvey = {
                    id: newSurveyId,
                    customerName: formData.customerName,
                    engineer: formData.engineer,
                    site: formData.siteAddress,
                    scheduledDate: formData.scheduledDate,
                    estimatedKw: parseInt(formData.size) || 0,
                    status: 'pending',
                    shadowPct: 0,
                    roofArea: 0,
                    sourceLeadId: selectedLead?.id || null,
                    notes: formData.notes,
                    createdAt: new Date().toISOString()
                  };
                  
                  setPendingSurveys(prev => [newSurvey, ...prev]);
                  
                  // Track this lead as having a survey created
                  if (selectedLead?.id) {
                    setSurveyCreatedLeadIds(prev => [...prev, selectedLead.id]);
                  }
                  
                  // Refresh all surveys from backend
                  const surveysResult = await surveysApi.getAll({ limit: 100 });
                  const surveysData = surveysResult.data?.data || surveysResult.data || [];
                  
                  const transformedSurveys = surveysData.map(s => ({
                    id: s.surveyId || s._id,
                    customerName: s.customerName,
                    engineer: s.engineer,
                    site: s.site,
                    scheduledDate: s.scheduledDate,
                    estimatedKw: s.estimatedKw,
                    status: s.status,
                    shadowPct: s.shadowPct,
                    roofArea: s.roofArea,
                    sourceLeadId: s.sourceLeadId,
                    notes: s.notes,
                    createdAt: s.createdAt
                  }));
                  
                  // Update all survey lists
                  setPendingSurveys(transformedSurveys.filter(s => s.status === 'pending'));
                  setActiveSurveys(transformedSurveys.filter(s => s.status === 'active'));
                  setCompletedSurveys(transformedSurveys.filter(s => s.status === 'completed'));
                  
                  logCreate({ id: 'new', name: `Survey scheduled for ${formData.customerName}` });
                  toast.success(`Survey scheduled for ${formData.customerName} - Pending Form Submission`);
                  setShowAdd(false);
                  setSelectedLead(null);
                  
                  // Reset form
                  setFormData({
                    customerName: '',
                    engineer: 'Priya Patel',
                    siteAddress: '',
                    scheduledDate: '',
                    size: '',
                    notes: ''
                  });
                } catch (err) {
                  console.error('Failed to create survey:', err);
                  toast.error(err.message || 'Failed to schedule survey. Please try again.');
                } finally {
                  setIsScheduling(false);
                }
              }
            }}>
              {isScheduling ? 'Scheduling...' : <><Plus size={14} /> {selectedLead ? 'Schedule from Lead' : 'Schedule Visit'}</>}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Customer Name">
              <Input 
                value={formData.customerName}
                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                placeholder="e.g. Rajesh Kumar" 
              />
            </FormField>
            <FormField label="Assigned Engineer">
              <Select 
                value={formData.engineer}
                onChange={(e) => setFormData({...formData, engineer: e.target.value})}
              >
                <option key="eng1" value="Priya Patel">Priya Patel</option>
                <option key="eng2" value="Rahul Sharma">Rahul Sharma</option>
                <option key="eng3" value="Amit Kumar">Amit Kumar</option>
                <option key="eng4" value="Sneha Reddy">Sneha Reddy</option>
                <option key="eng5" value="Vikram Singh">Vikram Singh</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Site Address">
            <Input 
              value={formData.siteAddress}
              onChange={(e) => setFormData({...formData, siteAddress: e.target.value})}
              placeholder="Plot 45, GIDC Phase II, Ahmedabad" 
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Scheduled Date">
              <Input 
                type="date" 
                value={formData.scheduledDate}
                onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})}
              />
            </FormField>
            <FormField label="Est. Size (kW)">
              <Input 
                type="number" 
                value={formData.size}
                onChange={(e) => setFormData({...formData, size: e.target.value})}
                placeholder="50" 
              />
            </FormField>
          </div>
          <FormField label="Site Notes">
            <Textarea 
              rows={3} 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Access restrictions, structural observations..." 
            />
          </FormField>
          {selectedLead && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-[11px] text-blue-600">
                <strong>Source:</strong> CRM Lead #{selectedLead.id} | 
                <strong>Stage:</strong> {PIPELINE_STAGES.find(s => s.id === selectedLead.stage)?.label} | 
                <strong>Value:</strong> ₹{selectedLead.value?.toLocaleString()}
              </p>
            </div>
          )}
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
