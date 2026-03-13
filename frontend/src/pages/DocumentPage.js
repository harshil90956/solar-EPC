// Solar OS – Document Management Module
import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, FileText, Send, DollarSign,
  LayoutGrid, List, Search, Filter,
  Copy, Trash2,
  FileSpreadsheet,
  User, Calendar, Clock,
  Brain,
  FileCheck, FileSignature, Receipt, FolderOpen,
  ChevronDown, ChevronUp, Mail, Phone,
  TrendingUp, TrendingDown, ArrowUpRight,
  Activity, PieChart as PieChartIcon,
  BarChart3, Target, Zap,
  Sun, Hammer,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line,
} from 'recharts';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea, FormField } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { CURRENCY } from '../config/app.config';
import { cn } from '../lib/utils';
import api from '../lib/apiClient';
import { downloadQuotationPDF } from '../lib/pdfTemplate';
import QuotationBuilderPage from './QuotationBuilderPage';
import EquipmentPage from './EquipmentPage';
import EstimatePage from './EstimatePage';
import ProposalPage from './ProposalPage';
import { documentsApi } from '../services/documentsApi';

const fmt = CURRENCY.format;

// ── Mock Data for Documents ───────────────────────────────────────────────────
const MOCK_DOCUMENTS = [
  {
    id: 'DOC-001',
    type: 'estimate',
    title: 'Solar Installation Estimate - ABC Corp',
    customerName: 'ABC Corporation',
    customerEmail: 'contact@abccorp.com',
    customerPhone: '+91 9876543210',
    total: 450000,
    status: 'draft',
    createdAt: '2024-03-01',
    validUntil: '2024-04-01',
    items: [
      { name: 'Solar Panels 550W', quantity: 20, unitPrice: 15000, total: 300000 },
      { name: 'Inverter 10kW', quantity: 1, unitPrice: 80000, total: 80000 },
      { name: 'Installation', quantity: 1, unitPrice: 70000, total: 70000 },
    ],
  },
  {
    id: 'DOC-002',
    type: 'proposal',
    title: 'Commercial Solar Proposal - XYZ Industries',
    customerName: 'XYZ Industries Ltd',
    customerEmail: 'procurement@xyz.com',
    customerPhone: '+91 9876543211',
    total: 850000,
    status: 'sent',
    createdAt: '2024-03-05',
    validUntil: '2024-04-05',
    sentAt: '2024-03-06',
    items: [
      { name: 'Solar Panels 550W', quantity: 40, unitPrice: 14500, total: 580000 },
      { name: 'Inverter 20kW', quantity: 1, unitPrice: 150000, total: 150000 },
      { name: 'Battery Storage 20kWh', quantity: 1, unitPrice: 80000, total: 80000 },
      { name: 'Installation & Commissioning', quantity: 1, unitPrice: 40000, total: 40000 },
    ],
  },
  {
    id: 'DOC-003',
    type: 'quotation',
    title: 'Residential Solar Quote - Mr. Sharma',
    customerName: 'Rajesh Sharma',
    customerEmail: 'r.sharma@email.com',
    customerPhone: '+91 9876543212',
    total: 325000,
    status: 'accepted',
    createdAt: '2024-03-08',
    validUntil: '2024-04-08',
    sentAt: '2024-03-09',
    acceptedAt: '2024-03-12',
    items: [
      { name: 'Solar Panels 440W', quantity: 10, unitPrice: 12000, total: 120000 },
      { name: 'Inverter 5kW', quantity: 1, unitPrice: 45000, total: 45000 },
      { name: 'Mounting Structure', quantity: 1, unitPrice: 35000, total: 35000 },
      { name: 'Installation', quantity: 1, unitPrice: 125000, total: 125000 },
    ],
  },
  {
    id: 'DOC-006',
    type: 'quotation',
    title: 'Solar Quote - Metro Builders',
    customerName: 'Metro Builders & Developers',
    customerEmail: 'info@metrobuilders.com',
    customerPhone: '+91 9876543214',
    total: 675000,
    status: 'sent',
    createdAt: '2024-03-14',
    validUntil: '2024-04-14',
    sentAt: '2024-03-14',
    items: [
      { name: 'Solar Panels 550W', quantity: 30, unitPrice: 14800, total: 444000 },
      { name: 'Inverter 15kW', quantity: 1, unitPrice: 120000, total: 120000 },
      { name: 'Installation', quantity: 1, unitPrice: 111000, total: 111000 },
    ],
  },
  {
    id: 'DOC-007',
    type: 'estimate',
    title: 'Preliminary Estimate - Sunrise Hospital',
    customerName: 'Sunrise Hospital',
    customerEmail: 'admin@sunrisehospital.com',
    customerPhone: '+91 9876543215',
    total: 950000,
    status: 'draft',
    createdAt: '2024-03-15',
    validUntil: '2024-04-15',
    items: [
      { name: 'Solar Panels 550W', quantity: 50, unitPrice: 14000, total: 700000 },
      { name: 'Inverter 25kW', quantity: 1, unitPrice: 180000, total: 180000 },
      { name: 'Battery Backup', quantity: 1, unitPrice: 70000, total: 70000 },
    ],
  },
];

// ── Status Configurations ─────────────────────────────────────────────────────
const DOCUMENT_STATUS = {
  draft: { label: 'Draft', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  sent: { label: 'Sent', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  viewed: { label: 'Viewed', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  accepted: { label: 'Accepted', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  expired: { label: 'Expired', color: '#475569', bg: 'rgba(71,85,105,0.10)' },
  signed: { label: 'Signed', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  paid: { label: 'Paid', color: '#059669', bg: 'rgba(5,150,105,0.12)' },
  pending: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
};

const DOCUMENT_TYPES = {
  estimate: { label: 'Estimate', icon: FileText, color: '#3b82f6' },
  proposal: { label: 'Proposal', icon: FileCheck, color: '#8b5cf6' },
  quotation: { label: 'Quotation', icon: FileSpreadsheet, color: '#22c55e' },
};

// ── Dashboard KPI Component ────────────────────────────────────────────────────
const DashboardKPI = ({ title, value, change, icon: Icon, color, subtitle }) => (
  <div className="glass-card p-4 flex items-center gap-3 hover:scale-[1.02] transition-transform cursor-pointer">
    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}20, ${color}10)` }}>
      <Icon size={20} style={{ color }} />
    </div>
    <div className="flex-1">
      <p className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider">{title}</p>
      <p className="text-xl font-black text-[var(--text-primary)]">{value}</p>
      {subtitle && <p className="text-[9px] text-[var(--text-muted)]">{subtitle}</p>}
      {change !== undefined && (
        <p className={`text-[10px] font-bold ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
        </p>
      )}
    </div>
  </div>
);

// ── Document Card Component ──────────────────────────────────────────────────
const DocumentCard = ({ document, onClick, onSend, onDuplicate, onDelete }) => {
  const TypeIcon = DOCUMENT_TYPES[document.type]?.icon || FileText;
  const typeColor = DOCUMENT_TYPES[document.type]?.color || '#64748b';
  const statusConfig = DOCUMENT_STATUS[document.status] || DOCUMENT_STATUS.draft;

  return (
    <div
      onClick={() => onClick(document)}
      className="glass-card p-4 cursor-pointer hover:scale-[1.01] transition-all space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${typeColor}20` }}>
            <TypeIcon size={20} style={{ color: typeColor }} />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">{document.id}</p>
            <p className="text-[10px] text-[var(--text-muted)] capitalize">{DOCUMENT_TYPES[document.type]?.label}</p>
          </div>
        </div>
        <div
          className="px-2 py-1 rounded-full text-[10px] font-medium"
          style={{ background: statusConfig.bg, color: statusConfig.color }}
        >
          {statusConfig.label}
        </div>
      </div>

      <div>
        <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-2">{document.title}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{document.customerName}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="glass-card p-2 text-center">
          <p className="text-[var(--text-muted)]">Total Value</p>
          <p className="font-bold text-[var(--text-primary)]">{fmt(document.total)}</p>
        </div>
        <div className="glass-card p-2 text-center">
          <p className="text-[var(--text-muted)]">Items</p>
          <p className="font-bold text-[var(--solar)]">{document.items?.length || 0}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <span>Created: {new Date(document.createdAt).toLocaleDateString()}</span>
        {document.validUntil && (
          <span>Valid till: {new Date(document.validUntil).toLocaleDateString()}</span>
        )}
      </div>

      <div className="flex items-center gap-1 pt-2 border-t border-[var(--border-base)]">
        <button
          onClick={(e) => { e.stopPropagation(); onSend(document); }}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-medium hover:bg-[var(--primary)]/20 transition-colors"
        >
          <Send size={12} />
          Send
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(document); }}
          className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(document); }}
          className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-elevated)] text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// ── Main Document Page Component ─────────────────────────────────────────────
const DocumentPage = () => {
  const [activeTab, setActiveTab] = useState('estimate');
  const [viewMode, setViewMode] = useState('list'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [scoringEnabled, setScoringEnabled] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documents, setDocuments] = useState(MOCK_DOCUMENTS);
  const [realQuotations, setRealQuotations] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  const [solarQuoteKey, setSolarQuoteKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        const [statsRes, quotRes] = await Promise.all([
          documentsApi.getDashboardStats(),
          api.get('/quotations')
        ]);
        
        const statsData = statsRes?.data?.data || statsRes?.data;
        if (!cancelled) setDashboardStats(statsData);

        // Extract and format real quotations to match document structure
        const rawQuots = quotRes?.data || quotRes || [];
        const formattedQuots = (Array.isArray(rawQuots) ? rawQuots : []).map(q => ({
          id: q.quotationId || q._id,
          dbId: q._id,
          type: 'quotation',
          title: q.notes || `Solar Quote - ${q.customerName}`,
          customerName: q.customerName,
          customerEmail: q.customerEmail,
          customerPhone: q.customerPhone,
          total: q.finalQuotationPrice,
          status: q.status?.toLowerCase() || 'draft',
          createdAt: q.createdAt,
          validUntil: q.validUntil,
          items: q.materials.map(m => ({
            name: m.name,
            quantity: m.quantity,
            unitPrice: m.unitPrice,
            total: m.totalPrice
          }))
        }));
        
        if (!cancelled) setRealQuotations(formattedQuots);
      } catch (err) {
        console.error('Error loading documents data:', err);
      }
    };
    loadData();
    return () => {
      cancelled = true;
    };
  }, [solarQuoteKey]);

  // Merge mock documents with real quotations for the 'All' view
  const allDocuments = useMemo(() => {
    const mocksWithoutQuots = MOCK_DOCUMENTS.filter(d => d.type !== 'quotation');
    return [...realQuotations, ...mocksWithoutQuots].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [realQuotations]);

  // ── Filter Documents by Tab ────────────────────────────────────────────────
  const filteredDocuments = useMemo(() => {
    // Filter by tab
    switch (activeTab) {
      case 'dashboard':
        return [];
      case 'estimate':
        return allDocuments.filter(d => d.type === 'estimate');
      case 'proposal':
        return allDocuments.filter(d => d.type === 'proposal');
      case 'quotation':
        return realQuotations;
      case 'all':
      default:
        let filtered = allDocuments;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(d =>
            d.id.toLowerCase().includes(query) ||
            d.title.toLowerCase().includes(query) ||
            d.customerName.toLowerCase().includes(query) ||
            d.customerEmail.toLowerCase().includes(query)
          );
        }
        return filtered;
    }
  }, [allDocuments, realQuotations, activeTab, searchQuery]);

  // ── Stats Calculations ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const epq = documents.filter(d => ['estimate', 'proposal', 'quotation'].includes(d.type));

    return {
      epq: {
        total: epq.length,
        value: epq.reduce((a, d) => a + d.total, 0),
        draft: epq.filter(d => d.status === 'draft').length,
        sent: epq.filter(d => d.status === 'sent').length,
        accepted: epq.filter(d => d.status === 'accepted').length,
      },
      total: {
        documents: documents.length,
        value: documents.reduce((a, d) => a + d.total, 0),
      },
    };
  }, [documents]);

  // ── Handlers ───────────────────────────────────────────────────────────────────
  const handleCreateDocument = (data) => {
    const newDoc = {
      id: `DOC-${String(documents.length + 1).padStart(3, '0')}`,
      ...data,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setDocuments([newDoc, ...documents]);
    setIsCreateModalOpen(false);
  };

  const handleSendDocument = (doc) => {
    setDocuments(docs => docs.map(d =>
      d.id === doc.id ? { ...d, status: 'sent', sentAt: new Date().toISOString() } : d
    ));
  };

  const handleDuplicateDocument = (doc) => {
    const newDoc = {
      ...doc,
      id: `DOC-${String(documents.length + 1).padStart(3, '0')}`,
      title: `${doc.title} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      sentAt: null,
      acceptedAt: null,
    };
    setDocuments([newDoc, ...documents]);
  };

  const handleDeleteDocument = (doc) => {
    if (window.confirm(`Delete document ${doc.id}?`)) {
      setDocuments(docs => docs.filter(d => d.id !== doc.id));
    }
  };

  // ── Table Columns ────────────────────────────────────────────────────────────
  const tableColumns = [
    {
      key: 'id',
      header: 'Doc ID',
      render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: v => (
        <div className="flex items-center gap-1.5">
          {React.createElement(DOCUMENT_TYPES[v]?.icon || FileText, { size: 14, style: { color: DOCUMENT_TYPES[v]?.color } })}
          <span className="text-xs capitalize">{DOCUMENT_TYPES[v]?.label || v}</span>
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: v => <span className="text-xs font-medium text-[var(--text-primary)] line-clamp-1">{v}</span>,
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      render: v => <span className="text-xs font-bold text-[var(--text-primary)]">{fmt(v)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: v => {
        const config = DOCUMENT_STATUS[v] || DOCUMENT_STATUS.draft;
        return (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ background: config.bg, color: config.color }}
          >
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: v => <span className="text-xs text-[var(--text-muted)]">{new Date(v).toLocaleDateString()}</span>,
    },
  ];

  // ── Dashboard View ─────────────────────────────────────────────────────────────
  const DashboardView = () => {
    const [timeFilter, setTimeFilter] = useState('6months');

    // Filtered monthly data based on time period
    const getFilteredData = () => {
      const allData = [
        { month: 'Jan', estimates: 12, proposals: 8, quotations: 15, value: 2400000 },
        { month: 'Feb', estimates: 18, proposals: 12, quotations: 20, value: 3800000 },
        { month: 'Mar', estimates: 15, proposals: 15, quotations: 18, value: 4200000 },
        { month: 'Apr', estimates: 22, proposals: 18, quotations: 25, value: 5800000 },
        { month: 'May', estimates: 20, proposals: 20, quotations: 22, value: 6200000 },
        { month: 'Jun', estimates: 25, proposals: 22, quotations: 28, value: 7500000 },
      ];

      switch (timeFilter) {
        case '7days':
          return allData.slice(-1);
        case '30days':
          return allData.slice(-1);
        case '3months':
          return allData.slice(-3);
        case '6months':
        default:
          return allData;
      }
    };

    const monthlyData = getFilteredData();

    // Document type distribution for pie chart
    const typeDistribution = [
      { name: 'Estimates', value: documents.filter(d => d.type === 'estimate').length, color: '#3b82f6' },
      { name: 'Proposals', value: documents.filter(d => d.type === 'proposal').length, color: '#8b5cf6' },
      { name: 'Quotations', value: documents.filter(d => d.type === 'quotation').length, color: '#22c55e' },
    ].filter(item => item.value > 0);

    // Status distribution
    const statusData = [
      { status: 'Draft', count: documents.filter(d => d.status === 'draft').length, color: '#64748b' },
      { status: 'Sent', count: documents.filter(d => d.status === 'sent').length, color: '#3b82f6' },
      { status: 'Accepted', count: documents.filter(d => d.status === 'accepted').length, color: '#22c55e' },
      { status: 'Signed', count: documents.filter(d => d.status === 'signed').length, color: '#10b981' },
      { status: 'Paid', count: documents.filter(d => d.status === 'paid').length, color: '#059669' },
    ].filter(item => item.count > 0);

    // Top customers by value
    const topCustomers = useMemo(() => {
      const customerTotals = {};
      documents.forEach(doc => {
        if (!customerTotals[doc.customerName]) {
          customerTotals[doc.customerName] = { name: doc.customerName, value: 0, count: 0 };
        }
        customerTotals[doc.customerName].value += doc.total;
        customerTotals[doc.customerName].count += 1;
      });
      return Object.values(customerTotals)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    }, [documents]);

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Filter Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Time Period:</span>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
            <span>Last updated: Just now</span>
            <button
              onClick={() => window.location.reload()}
              className="p-1 rounded hover:bg-[var(--bg-hover)]"
            >
              <TrendingUp size={12} />
            </button>
          </div>
        </div>

        {/* Compact KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-card p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FolderOpen size={16} className="text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--text-primary)]">{dashboardStats?.totalDocuments ?? stats.total.documents}</p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase">Total Documents</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp size={10} className="text-emerald-500" />
              <span className="text-[10px] text-emerald-500">{`${dashboardStats?.documentsMoMPercent ?? 0}%`}</span>
              <span className="text-[10px] text-[var(--text-muted)]">vs last month</span>
            </div>
          </div>

          <div className="glass-card p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FileCheck size={16} className="text-purple-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--text-primary)]">{dashboardStats?.epq?.active ?? (stats.epq.sent + stats.epq.draft)}</p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase">Active EPQ</p>
              </div>
            </div>
            <div className="w-full bg-[var(--bg-elevated)] rounded-full h-1.5 mt-2">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${Math.round(dashboardStats?.epq?.conversionPercent ?? ((stats.epq.accepted / (stats.epq.sent + stats.epq.draft || 1)) * 100))}%` }}
              />
            </div>
          </div>

          <div className="glass-card p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Target size={16} className="text-amber-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-[var(--text-primary)]">{`${Math.round(dashboardStats?.epq?.conversionPercent ?? ((documents.filter(d => ['accepted', 'signed', 'paid'].includes(d.status)).length / (documents.length || 1)) * 100))}%`}</p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase">Conversion</p>
              </div>
            </div>
            <div className="w-full bg-[var(--bg-elevated)] rounded-full h-1.5 mt-2">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${dashboardStats?.epq?.conversionPercent ?? ((documents.filter(d => ['accepted', 'signed', 'paid'].includes(d.status)).length / (documents.length || 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Monthly Trend */}
          <div className="glass-card p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Monthly Document Flow</h3>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px] text-blue-500">
                  <div className="w-2 h-2 rounded-full bg-blue-500" /> Estimates
                </span>
                <span className="flex items-center gap-1 text-[10px] text-purple-500">
                  <div className="w-2 h-2 rounded-full bg-purple-500" /> Proposals
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" /> Quotations
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-base)',
                    borderRadius: '6px',
                    fontSize: '11px'
                  }}
                />
                <Area type="monotone" dataKey="estimates" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="proposals" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="quotations" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Document Types */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Document Types</h3>
            <div className="space-y-2">
              {typeDistribution.map((type) => {
                const percentage = documents.length > 0 ? Math.round((type.value / documents.length) * 100) : 0;
                return (
                  <div key={type.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: type.color }} />
                    <span className="text-xs text-[var(--text-muted)] flex-1">{type.name}</span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">{type.value}</span>
                    <span className="text-[10px] text-[var(--text-muted)] w-8 text-right">{percentage}%</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--border-base)]">
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>Total</span>
                <span className="font-bold text-[var(--text-primary)]">{documents.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monthly Value */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Monthly Value (₹ Lakhs)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-base)',
                    borderRadius: '6px',
                    fontSize: '11px'
                  }}
                  formatter={(value) => fmt(value)}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status Breakdown */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Status Distribution</h3>
            <div className="space-y-2">
              {statusData.map((status) => {
                const percentage = documents.length > 0 ? Math.round((status.count / documents.length) * 100) : 0;
                return (
                  <div key={status.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[var(--text-primary)]">{status.status}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{status.count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, background: status.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Customers */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Top Customers</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-base)]">
                  <th className="text-left py-2 text-[10px] font-medium text-[var(--text-muted)]">Rank</th>
                  <th className="text-left py-2 text-[10px] font-medium text-[var(--text-muted)]">Customer</th>
                  <th className="text-right py-2 text-[10px] font-medium text-[var(--text-muted)]">Docs</th>
                  <th className="text-right py-2 text-[10px] font-medium text-[var(--text-muted)]">Value</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((customer, index) => (
                  <tr key={customer.name} className="border-b border-[var(--border-base)]/50">
                    <td className="py-2">
                      <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-2">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[150px]">{customer.name}</p>
                    </td>
                    <td className="py-2 text-right text-xs text-[var(--text-muted)]">{customer.count}</td>
                    <td className="py-2 text-right text-xs font-bold text-emerald-500">{(customer.value / 100000).toFixed(1)}L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent Activity */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Recent Activity</h3>
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {documents.slice(0, 6).map((doc, i) => (
                <div key={doc.id} className="flex items-center gap-2 p-2 rounded bg-[var(--bg-elevated)]/50">
                  <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ background: `${DOCUMENT_TYPES[doc.type]?.color}15` }}>
                    {React.createElement(DOCUMENT_TYPES[doc.type]?.icon || FileText, { size: 14, style: { color: DOCUMENT_TYPES[doc.type]?.color } })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-primary)] truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[var(--text-muted)]">{doc.customerName}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: DOCUMENT_STATUS[doc.status]?.bg, color: DOCUMENT_STATUS[doc.status]?.color }}>
                        {DOCUMENT_STATUS[doc.status]?.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-500">{(doc.total / 100000).toFixed(1)}L</p>
                    <p className="text-[9px] text-[var(--text-muted)]">
                      {i === 0 ? 'Just now' : i === 1 ? '2m' : i === 2 ? '5m' : i === 3 ? '15m' : i === 4 ? '1h' : '2h'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Document List View ───────────────────────────────────────────────────────
  const DocumentListView = () => (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
            <Filter size={14} />
            Filter
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)]">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'grid' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'list' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              <List size={16} />
            </button>
          </div>

          <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-1.5">
            <Plus size={16} />
            <span className="hidden sm:inline">Add Document</span>
          </Button>
        </div>
      </div>

      {/* Documents Display */}
      {filteredDocuments.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No documents found</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">Create your first document to get started</p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={16} className="mr-1.5" />
            Create Document
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map(doc => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onClick={setSelectedDocument}
              onSend={handleSendDocument}
              onDuplicate={handleDuplicateDocument}
              onDelete={handleDeleteDocument}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <DataTable columns={tableColumns} data={filteredDocuments} />
        </div>
      )}
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header with Tabs - Side by Side Layout */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <PageHeader
          title="Documents"
          subtitle="Manage estimates, proposals & quotations"
        />

        {/* Navigation Bar - Side by Side */}
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="dashboard" className="flex items-center gap-1.5">
                <LayoutGrid size={14} />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="estimate" className="flex items-center gap-1.5">
                <FileText size={14} />
                Estimates
              </TabsTrigger>
              <TabsTrigger value="proposal" className="flex items-center gap-1.5">
                <FileCheck size={14} />
                Proposals
              </TabsTrigger>
              <TabsTrigger value="quotation" className="flex items-center gap-1.5">
                <Sun size={14} />
                Solar Quote
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-1.5">
                <FolderOpen size={14} />
                All
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Add Button - Context Aware */}
          {activeTab === 'estimate' ? (
            <button
              onClick={() => {
                console.log('Button clicked - calling global function');
                // @ts-ignore
                if (window.openEstimateModal) {
                  // @ts-ignore
                  window.openEstimateModal();
                } else {
                  alert('Estimate modal function not ready yet');
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Create Estimate
            </button>
          ) : activeTab === 'quotation' ? (
            <button
              onClick={() => {
                // Force re-render of SolarQuotationPage to reset form
                setSolarQuoteKey(Date.now());
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Create Solar Quote
            </button>
          ) : (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Add Document
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'dashboard' && <DashboardView />}
      {activeTab === 'estimate' && <EstimatePage />}
      {activeTab === 'proposal' && <ProposalPage />}
      {activeTab === 'quotation' && <QuotationBuilderPage key={solarQuoteKey} />}
      {activeTab === 'all' && <DocumentListView />}

      {/* Create Document Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Document"
        size="lg"
      >
        <CreateDocumentForm
          onSubmit={handleCreateDocument}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Document Detail Modal */}
      <Modal
        isOpen={!!selectedDocument}
        onClose={() => setSelectedDocument(null)}
        title={selectedDocument?.title || 'Document Details'}
        size="lg"
      >
        {selectedDocument && (
          <DocumentDetail
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
            onSend={() => handleSendDocument(selectedDocument)}
            onDuplicate={() => handleDuplicateDocument(selectedDocument)}
            onDelete={() => handleDeleteDocument(selectedDocument)}
          />
        )}
      </Modal>
    </div>
  );
};

// ── Create Document Form ─────────────────────────────────────────────────────
const CreateDocumentForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    type: 'estimate',
    title: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    items: [{ name: '', description: '', quantity: 1, unitPrice: 0, total: 0 }],
    notes: '',
    terms: '',
  });

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { name: '', description: '', quantity: 1, unitPrice: 0, total: 0 }],
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        items[index].total = items[index].quantity * items[index].unitPrice;
      }
      return { ...prev, items };
    });
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const total = formData.items.reduce((a, item) => a + item.total, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, total });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Document Type" required>
          <Select
            value={formData.type}
            onChange={(v) => setFormData({ ...formData, type: v })}
            options={[
              { value: 'estimate', label: 'Estimate' },
              { value: 'proposal', label: 'Proposal' },
              { value: 'quotation', label: 'Quotation' },
            ]}
          />
        </FormField>

        <FormField label="Title" required>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Solar Installation Quote"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Customer Name" required>
          <Input
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            placeholder="Customer name"
          />
        </FormField>

        <FormField label="Email">
          <Input
            type="email"
            value={formData.customerEmail}
            onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
            placeholder="customer@email.com"
          />
        </FormField>

        <FormField label="Phone">
          <Input
            value={formData.customerPhone}
            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
            placeholder="+91 9876543210"
          />
        </FormField>
      </div>

      {/* Items Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-[var(--text-primary)]">Line Items</h4>
          <Button type="button" variant="secondary" size="sm" onClick={addItem}>
            <Plus size={14} className="mr-1" />
            Add Item
          </Button>
        </div>

        {formData.items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-[var(--bg-elevated)]">
            <div className="col-span-4">
              <Input
                value={item.name}
                onChange={(e) => updateItem(index, 'name', e.target.value)}
                placeholder="Item name"
                className="text-sm"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                placeholder="Qty"
                className="text-sm"
              />
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                value={item.unitPrice}
                onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                placeholder="Unit Price"
                className="text-sm"
              />
            </div>
            <div className="col-span-2">
              <Input
                value={fmt(item.total)}
                disabled
                className="text-sm font-medium"
              />
            </div>
            <div className="col-span-1">
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <div className="text-right">
            <p className="text-sm text-[var(--text-muted)]">Total Amount</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{fmt(total)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Notes">
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes..."
            rows={3}
          />
        </FormField>

        <FormField label="Terms & Conditions">
          <Textarea
            value={formData.terms}
            onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
            placeholder="Terms and conditions..."
            rows={3}
          />
        </FormField>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-base)]">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Document
        </Button>
      </div>
    </form>
  );
};

// ── Document Detail View ──────────────────────────────────────────────────────
const DocumentDetail = ({ document, onClose, onSend, onDuplicate, onDelete }) => {
  const TypeIcon = DOCUMENT_TYPES[document.type]?.icon || FileText;
  const typeColor = DOCUMENT_TYPES[document.type]?.color || '#64748b';
  const statusConfig = DOCUMENT_STATUS[document.status] || DOCUMENT_STATUS.draft;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: `${typeColor}20` }}>
            <TypeIcon size={28} style={{ color: typeColor }} />
          </div>
          <div>
            <p className="text-xs font-mono text-[var(--accent-light)]">{document.id}</p>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">{document.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ background: statusConfig.bg, color: statusConfig.color }}
              >
                {statusConfig.label}
              </span>
              <span className="text-xs text-[var(--text-muted)] capitalize">{document.type}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {document.type === 'quotation' && (
            <button
              onClick={() => downloadQuotationPDF(document)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              <FileSpreadsheet size={14} />
              Download PDF
            </button>
          )}
          <button
            onClick={onSend}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Send size={14} />
            Send
          </button>
          <button
            onClick={onDuplicate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] text-sm font-medium hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Copy size={14} />
            Duplicate
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-400/10 text-red-400 text-sm font-medium hover:bg-red-400/20 transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* Customer Info */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-sm font-bold text-[var(--text-primary)]">Customer Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <User size={16} className="text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-primary)]">{document.customerName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-primary)]">{document.customerEmail || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone size={16} className="text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-primary)]">{document.customerPhone || '—'}</span>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-sm font-bold text-[var(--text-primary)]">Line Items</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-base)]">
                <th className="text-left py-2 text-xs font-medium text-[var(--text-muted)]">Item</th>
                <th className="text-center py-2 text-xs font-medium text-[var(--text-muted)]">Qty</th>
                <th className="text-right py-2 text-xs font-medium text-[var(--text-muted)]">Unit Price</th>
                <th className="text-right py-2 text-xs font-medium text-[var(--text-muted)]">Total</th>
              </tr>
            </thead>
            <tbody>
              {document.items?.map((item, index) => (
                <tr key={index} className="border-b border-[var(--border-base)]/50">
                  <td className="py-2">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{item.name}</p>
                    {item.description && <p className="text-xs text-[var(--text-muted)]">{item.description}</p>}
                  </td>
                  <td className="text-center py-2 text-sm text-[var(--text-primary)]">{item.quantity}</td>
                  <td className="text-right py-2 text-sm text-[var(--text-primary)]">{fmt(item.unitPrice)}</td>
                  <td className="text-right py-2 text-sm font-medium text-[var(--text-primary)]">{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--border-base)]">
                <td colSpan={3} className="text-right py-3 text-sm font-bold text-[var(--text-primary)]">Total</td>
                <td className="text-right py-3 text-lg font-bold text-[var(--primary)]">{fmt(document.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-sm font-bold text-[var(--text-primary)]">Document Timeline</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
            <span className="text-sm text-[var(--text-primary)]">Created on {new Date(document.createdAt).toLocaleDateString()}</span>
          </div>
          {document.sentAt && (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm text-[var(--text-primary)]">Sent on {new Date(document.sentAt).toLocaleDateString()}</span>
            </div>
          )}
          {document.acceptedAt && (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm text-[var(--text-primary)]">Accepted on {new Date(document.acceptedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentPage;
