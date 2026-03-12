// Solar EPC ERP - Professional Proposal Module
// Complete Proposal Management System with Dashboard, Wizard, and PDF Generation

import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, FileText, Send, DollarSign, Download, Copy, Trash2, Search, Filter,
  User, Building2, Phone, Mail, MapPin, Sun, Zap, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronUp, Edit, Eye, MoreHorizontal, Calculator, TrendingUp,
  TrendingDown, LayoutGrid, List, Kanban, ChevronRight, ChevronLeft, Save, Printer,
  Check, ArrowRight, FileSpreadsheet, RefreshCw, EyeIcon, CheckSquare,
  XSquare, FileSignature, ArrowLeftRight, BadgeCheck, FileCheck, MailOpen,
  Sparkles, Shield, Leaf, Battery, Gauge, Settings
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea, FormField } from '../components/ui/Input';
import DataTable from '../components/ui/DataTable';
import { CURRENCY } from '../config/app.config';
import { cn } from '../lib/utils';
import { downloadRayzonPDF } from '../lib/pdfTemplate';
import PDFTemplateCustomizer from '../components/documents/PDFTemplateCustomizer';
import { settingsApi } from '../services/settingsApi';

const fmt = CURRENCY.format;

// ── Proposal Status Configurations ─────────────────────────────────────────────
const PROPOSAL_STATUS = {
  draft: {
    label: 'Draft',
    color: '#64748b',
    bg: 'rgba(100,116,139,0.12)',
    icon: FileText,
    description: 'Proposal is being prepared'
  },
  sent: {
    label: 'Sent',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    icon: Send,
    description: 'Proposal sent to client'
  },
  viewed: {
    label: 'Viewed',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.12)',
    icon: EyeIcon,
    description: 'Client has viewed the proposal'
  },
  accepted: {
    label: 'Accepted',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    icon: CheckCircle,
    description: 'Proposal accepted by client'
  },
  rejected: {
    label: 'Rejected',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    icon: XCircle,
    description: 'Proposal rejected by client'
  },
};

const DEFAULT_PROJECT_TYPES = [
  { value: 'residential', label: 'Residential', icon: User },
  { value: 'commercial', label: 'Commercial', icon: Building2 },
  { value: 'industrial', label: 'Industrial', icon: Zap },
];

const DEFAULT_INSTALLATION_TYPES = [
  { value: 'rooftop', label: 'Rooftop' },
  { value: 'ground_mounted', label: 'Ground Mounted' },
  { value: 'carport', label: 'Carport' },
];

// ── Generate Proposal Number ─────────────────────────────────────────────────
const generateProposalNumber = (existingProposals = []) => {
  const year = new Date().getFullYear();
  const prefix = `PROP-${year}`;

  const existingNumbers = existingProposals
    .map(p => p.proposalNumber)
    .filter(n => n?.startsWith(prefix))
    .map(n => {
      const match = n.match(/-(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    });

  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  const nextNumber = String(maxNumber + 1).padStart(4, '0');

  return `${prefix}-${nextNumber}`;
};

// ── Sunvora Energy Company Data ──────────────────────────────────────────────
const COMPANY_DATA = {
  name: 'Sunvora Energy Pvt. Ltd.',
  tagline: 'Best Value & Quality Solar Solution',
  logo: '/logo.png',
  address: '104 to 1117, 11th Floor, Millennium Business Hub-1',
  city: 'Opp. Sarthana Nature Park, Surat - 395006, Gujarat - India',
  phone: '+91 96380 00461',
  phone2: '+91 96380 00462',
  tollfree: '1800 123 1232',
  email: 'epc@sunvoraenergy.com',
  website: 'www.sunvoraenergy.com',
  gstin: '24AABCU9603R1ZX',
  manufacturing: {
    name: 'Sunvora Solar Pvt. Ltd.',
    address: 'Block No. 105, B/H Aron Pipes B/H Hariya Talav, Karanj Kim - Mandavi Road',
    city: 'Gujarat 394110',
    email: 'contact@sunvoraenergies.com',
    website: 'www.sunvorasolar.com'
  }
};

// ── Mock Proposals Data ──────────────────────────────────────────────────────
const MOCK_PROPOSALS = [
  {
    id: 'PROP-001',
    proposalNumber: 'PROP-2026-0001',
    estimateId: 'EST-2026-0001',
    customerName: 'ABC Corporation',
    companyName: 'ABC Corp Ltd',
    customerEmail: 'contact@abccorp.com',
    customerPhone: '+91 9876543210',
    customerAddress: '123 Business Park, Mumbai',
    projectLocation: 'Mumbai, Maharashtra',
    projectName: '5kW Rooftop Solar Installation',
    systemCapacity: 5,
    projectType: 'commercial',
    installationType: 'rooftop',
    projectDescription: 'Grid-tied solar system for office building with net metering',
    equipmentItems: [
      { component: 'Solar PV Module', brand: 'Sunvora', description: '625 Wp TopCon Glass-to-Glass Bifacial Module x 8 nos', quantity: 8 },
      { component: 'Module Mounting Structure', brand: 'As per design', description: 'Fixed Tilt - Hot Dip GI Galvalum material', quantity: 1 },
      { component: 'Inverter', brand: 'Solis', description: 'Grid Tied String Inverter with remote monitoring', quantity: 1 },
      { component: 'DC Cable', brand: 'Apar', description: '1C X 4 Sq. mm Copper UV protected', quantity: 100 },
      { component: 'AC Cable', brand: 'RR Kabel', description: '3.5C X 4 sq mm al armd cable', quantity: 50 },
      { component: 'Earthing Kit', brand: 'Reputed', description: 'HDGI Earthing Rod with accessories', quantity: 1 },
    ],
    equipmentCost: 285000,
    installationCost: 45000,
    engineeringCost: 15000,
    transportationCost: 8000,
    miscellaneousCost: 5000,
    discount: 0,
    subtotal: 358000,
    gstRate: 18,
    gstAmount: 64440,
    total: 422440,
    status: 'accepted',
    benefits: {
      yearlySavings: 85000,
      co2Reduction: 6.5,
      paybackPeriod: 5,
      warrantyYears: 25
    },
    terms: '50% advance payment, 50% on completion. 5 year warranty on installation. 30 years performance warranty on solar panels.',
    notes: 'Net metering application to be done by client. All approvals and clearances included.',
    createdAt: '2026-01-15',
    sentAt: '2026-01-16',
    viewedAt: '2026-01-17',
    acceptedAt: '2026-01-20',
  },
  {
    id: 'PROP-002',
    proposalNumber: 'PROP-2026-0002',
    estimateId: 'EST-2026-0002',
    customerName: 'Rajesh Sharma',
    companyName: '',
    customerEmail: 'r.sharma@email.com',
    customerPhone: '+91 9876543212',
    customerAddress: '45 Green Valley, Pune',
    projectLocation: 'Pune, Maharashtra',
    projectName: '3kW Home Solar System',
    systemCapacity: 3,
    projectType: 'residential',
    installationType: 'rooftop',
    projectDescription: 'Residential rooftop solar with premium components',
    equipmentItems: [
      { component: 'Solar PV Module', brand: 'Sunvora', description: '440W Monocrystalline Panels x 7 nos', quantity: 7 },
      { component: 'Hybrid Inverter', brand: 'Growatt', description: '3kW Solar hybrid inverter with monitoring', quantity: 1 },
      { component: 'Mounting Structure', brand: 'Tata', description: 'GI structure for RCC roof', quantity: 1 },
      { component: 'Cables & Accessories', brand: 'Polycab', description: 'DC/AC cables, connectors, junction boxes', quantity: 1 },
    ],
    equipmentCost: 247000,
    installationCost: 28000,
    engineeringCost: 8000,
    transportationCost: 5000,
    miscellaneousCost: 3000,
    discount: 5000,
    subtotal: 286000,
    gstRate: 18,
    gstAmount: 51480,
    total: 337480,
    status: 'sent',
    benefits: {
      yearlySavings: 55000,
      co2Reduction: 4.2,
      paybackPeriod: 6,
      warrantyYears: 25
    },
    terms: '40% advance, 60% on commissioning. Subsidy application assistance provided.',
    notes: 'Subsidy application assistance provided. Government subsidy of 40% applicable.',
    createdAt: '2026-02-10',
    sentAt: '2026-02-11',
  },
  {
    id: 'PROP-003',
    proposalNumber: 'PROP-2026-0003',
    estimateId: 'EST-2026-0003',
    customerName: 'Metro Industries',
    companyName: 'Metro Industries Pvt Ltd',
    customerEmail: 'projects@metroind.com',
    customerPhone: '+91 9876543215',
    customerAddress: '78 Industrial Area, Ahmedabad',
    projectLocation: 'Ahmedabad, Gujarat',
    projectName: '100kW Industrial Solar Plant',
    systemCapacity: 100,
    projectType: 'industrial',
    installationType: 'ground_mounted',
    projectDescription: 'Ground-mounted solar power plant for factory with net metering',
    equipmentItems: [
      { component: 'Solar PV Module', brand: 'Sunvora', description: '550W High Wattage Panels x 182 nos', quantity: 182 },
      { component: 'Central Inverter', brand: 'SMA', description: '100kW Industrial Inverter', quantity: 1 },
      { component: 'Ground Mount Structure', brand: 'Schletter', description: 'Hot-dip galvanized structure', quantity: 1 },
      { component: 'HT Cable', brand: 'KEI', description: 'HT cable 500m', quantity: 1 },
      { component: 'Transformers', brand: 'Voltamp', description: 'Step-up transformer', quantity: 1 },
      { component: 'SCADA System', brand: 'Wonderware', description: 'Monitoring system', quantity: 1 },
    ],
    equipmentCost: 3733000,
    installationCost: 280000,
    engineeringCost: 95000,
    transportationCost: 45000,
    miscellaneousCost: 35000,
    discount: 50000,
    subtotal: 4138000,
    gstRate: 18,
    gstAmount: 744840,
    total: 4882840,
    status: 'draft',
    benefits: {
      yearlySavings: 850000,
      co2Reduction: 85,
      paybackPeriod: 5.5,
      warrantyYears: 25
    },
    terms: '30% advance, 40% on material delivery, 30% on commissioning. O&M for 5 years included.',
    notes: 'Awaiting site survey completion. DCR compliance required for subsidy.',
    createdAt: '2026-03-01',
  },
];

// ── Mock Estimates for Conversion ────────────────────────────────────────────
const MOCK_ESTIMATES_FOR_CONVERSION = [
  { id: 'EST-2026-0004', customerName: 'Green Valley Apartments', projectName: '50kW Residential Complex', systemCapacity: 50, total: 1850000, status: 'draft' },
  { id: 'EST-2026-0005', customerName: 'Tech Park Solutions', projectName: '200kW Commercial Solar', systemCapacity: 200, total: 7200000, status: 'draft' },
  { id: 'EST-2026-0006', customerName: 'Farmers Co-op', projectName: '25kW Agricultural Solar', systemCapacity: 25, total: 925000, status: 'draft' },
];

// ── Reusable Document Header Component ───────────────────────────────────────
const DocumentHeader = ({
  company = COMPANY_DATA,
  documentType = 'Proposal',
  documentNumber,
  date,
  validUntil,
  customerName,
  customerAddress,
  projectLocation
}) => (
  <div className="bg-gradient-to-r from-[#006b6b] to-[#008080] text-white rounded-xl p-6 mb-6">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      {/* Company Info */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
          <Sun size={32} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{company.name}</h2>
          <p className="text-sm text-white/80">{company.tagline}</p>
          <div className="mt-2 text-xs text-white/70 space-y-0.5">
            <p>{company.address}</p>
            <p>{company.city}</p>
            <p>Phone: {company.phone} | {company.email}</p>
          </div>
        </div>
      </div>

      {/* Document Info */}
      <div className="text-right">
        <div className="bg-white/20 rounded-lg px-4 py-2 inline-block">
          <p className="text-xs text-white/70 uppercase tracking-wider">{documentType}</p>
          <p className="text-lg font-bold">{documentNumber}</p>
        </div>
        <div className="mt-2 text-xs text-white/80 space-y-1">
          <p>Date: {date ? new Date(date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</p>
          {validUntil && <p>Valid Until: {new Date(validUntil).toLocaleDateString('en-IN')}</p>}
        </div>
      </div>
    </div>

    {/* Customer Info */}
    {(customerName || customerAddress || projectLocation) && (
      <div className="mt-4 pt-4 border-t border-white/20">
        <p className="text-xs text-white/70 uppercase tracking-wider mb-2">Prepared For</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {customerName && (
            <div>
              <span className="text-white/70">Customer:</span>
              <span className="ml-2 font-medium">{customerName}</span>
            </div>
          )}
          {customerAddress && (
            <div>
              <span className="text-white/70">Address:</span>
              <span className="ml-2">{customerAddress}</span>
            </div>
          )}
          {projectLocation && (
            <div>
              <span className="text-white/70">Project Location:</span>
              <span className="ml-2">{projectLocation}</span>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

// ── Main Proposal Page Component ─────────────────────────────────────────────
const ProposalPage = () => {
  const [projectTypeOptions, setProjectTypeOptions] = useState(DEFAULT_PROJECT_TYPES);
  const [installationTypeOptions, setInstallationTypeOptions] = useState(DEFAULT_INSTALLATION_TYPES);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadTypeOptions = async () => {
      try {
        const res = await settingsApi.getTypeOptions();
        const pts = res?.projectTypes || res?.data?.projectTypes;
        const its = res?.installationTypes || res?.data?.installationTypes;
        if (!cancelled) {
          if (Array.isArray(pts) && pts.length > 0) setProjectTypeOptions(pts);
          if (Array.isArray(its) && its.length > 0) setInstallationTypeOptions(its);
        }
      } catch {
        // ignore
      }
    };
    loadTypeOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const [proposals, setProposals] = useState(MOCK_PROPOSALS);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid' | 'kanban' 
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPDFCustomizerOpen, setIsPDFCustomizerOpen] = useState(false);

  // ── Filter Proposals ────────────────────────────────────────────────────────
  const filteredProposals = useMemo(() => {
    let filtered = proposals;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.proposalNumber.toLowerCase().includes(query) ||
        p.customerName.toLowerCase().includes(query) ||
        p.projectName.toLowerCase().includes(query) ||
        p.projectLocation.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    return filtered;
  }, [proposals, searchQuery, statusFilter]);

  // ── Stats Calculations ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = proposals.length;
    const totalValue = proposals.reduce((a, p) => a + p.total, 0);
    const accepted = proposals.filter(p => p.status === 'accepted').length;
    const pending = proposals.filter(p => ['draft', 'sent', 'viewed'].includes(p.status)).length;
    const acceptedValue = proposals.filter(p => p.status === 'accepted').reduce((a, p) => a + p.total, 0);

    return { total, totalValue, accepted, pending, acceptedValue };
  }, [proposals]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCreateProposal = (data) => {
    const newProposal = {
      id: `PROP-${String(proposals.length + 1).padStart(3, '0')}`,
      proposalNumber: generateProposalNumber(proposals),
      ...data,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setProposals([newProposal, ...proposals]);
    setIsCreateModalOpen(false);
  };

  const handleConvertFromEstimate = (estimate) => {
    const convertedProposal = {
      id: `PROP-${String(proposals.length + 1).padStart(3, '0')}`,
      proposalNumber: generateProposalNumber(proposals),
      estimateId: estimate.id,
      customerName: estimate.customerName,
      companyName: estimate.companyName || '',
      customerEmail: estimate.customerEmail || '',
      customerPhone: estimate.customerPhone || '',
      customerAddress: estimate.customerAddress || '',
      projectLocation: estimate.projectLocation,
      projectName: estimate.projectName,
      systemCapacity: estimate.systemCapacity,
      projectType: estimate.projectType,
      installationType: estimate.installationType,
      projectDescription: estimate.projectDescription || '',
      equipmentItems: estimate.items?.map(item => ({
        component: item.name,
        brand: item.brand,
        description: item.description,
        quantity: item.quantity
      })) || [],
      equipmentCost: estimate.equipmentCost || 0,
      installationCost: estimate.installationCost || 0,
      engineeringCost: estimate.engineeringCost || 0,
      transportationCost: estimate.transportationCost || 0,
      miscellaneousCost: estimate.miscellaneousCost || 0,
      discount: 0,
      subtotal: estimate.subtotal || 0,
      gstRate: estimate.gstRate || 18,
      gstAmount: estimate.gstAmount || 0,
      total: estimate.total || 0,
      status: 'draft',
      benefits: {
        yearlySavings: Math.round(estimate.systemCapacity * 15000),
        co2Reduction: Math.round(estimate.systemCapacity * 1.3 * 10) / 10,
        paybackPeriod: Math.round(estimate.total / (estimate.systemCapacity * 15000) * 10) / 10,
        warrantyYears: 25
      },
      terms: estimate.terms || '50% advance, 50% on completion. 5 year warranty on installation. 30 years performance warranty on solar panels.',
      notes: estimate.notes || '',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setProposals([convertedProposal, ...proposals]);
    setIsConvertModalOpen(false);
    setSelectedProposal(convertedProposal);
    setIsEditMode(true);
  };

  const handleUpdateProposal = (id, data) => {
    setProposals(proposals.map(p =>
      p.id === id ? { ...p, ...data } : p
    ));
    setSelectedProposal(null);
    setIsEditMode(false);
  };

  const handleDeleteProposal = (id) => {
    if (window.confirm('Are you sure you want to delete this proposal?')) {
      setProposals(proposals.filter(p => p.id !== id));
    }
  };

  const handleDuplicateProposal = (proposal) => {
    const newProposal = {
      ...proposal,
      id: `PROP-${String(proposals.length + 1).padStart(3, '0')}`,
      proposalNumber: generateProposalNumber(proposals),
      projectName: `${proposal.projectName} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      sentAt: null,
      viewedAt: null,
      acceptedAt: null,
    };
    setProposals([newProposal, ...proposals]);
  };

  const handleDownloadPDF = (proposal) => {
    downloadRayzonPDF(proposal);
  };

  const handleSendProposal = (id) => {
    setProposals(proposals.map(p =>
      p.id === id ? { ...p, status: 'sent', sentAt: new Date().toISOString() } : p
    ));
  };

  const handleMarkViewed = (id) => {
    setProposals(proposals.map(p =>
      p.id === id && p.status === 'sent' ? { ...p, status: 'viewed', viewedAt: new Date().toISOString() } : p
    ));
  };

  const handleAcceptProposal = (id) => {
    setProposals(proposals.map(p =>
      p.id === id ? { ...p, status: 'accepted', acceptedAt: new Date().toISOString() } : p
    ));
  };

  const handleRejectProposal = (id) => {
    setProposals(proposals.map(p =>
      p.id === id ? { ...p, status: 'rejected', rejectedAt: new Date().toISOString() } : p
    ));
  };

  // Debug viewMode changes
  useEffect(() => {
    console.log('[ProposalPage] viewMode changed to:', viewMode);
  }, [viewMode]);

  // ── Table Columns ─────────────────────────────────────────────────────────
  const tableColumns = [
    {
      key: 'proposalNumber',
      header: 'Proposal #',
      render: v => <span className="text-xs font-mono text-[var(--primary)] font-semibold">{v}</span>,
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: v => (
        <div>
          <span className="text-xs font-medium text-[var(--text-primary)]">{v}</span>
        </div>
      ),
    },
    {
      key: 'projectName',
      header: 'Project',
      render: v => <span className="text-xs text-[var(--text-muted)] line-clamp-1">{v}</span>,
    },
    {
      key: 'systemCapacity',
      header: 'Capacity',
      render: v => <span className="text-xs font-medium text-[var(--text-primary)]">{v} kW</span>,
    },
    {
      key: 'total',
      header: 'Total Value',
      render: v => <span className="text-xs font-bold text-emerald-500">{fmt(v)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: v => {
        const config = PROPOSAL_STATUS[v] || PROPOSAL_STATUS.draft;
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
      header: 'Date',
      render: v => <span className="text-xs text-[var(--text-muted)]">{new Date(v).toLocaleDateString('en-IN')}</span>,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Document Header with Company Branding */}
      <DocumentHeader
        company={COMPANY_DATA}
        documentType="Proposal Management"
        documentNumber="Dashboard"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 border-l-4 border-blue-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileText size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Total Proposals</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-l-4 border-emerald-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign size={20} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{(stats.totalValue / 100000).toFixed(1)}L</p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Total Value</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-l-4 border-green-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.accepted}</p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Accepted</p>
              <p className="text-[10px] text-emerald-500">{(stats.acceptedValue / 100000).toFixed(1)}L</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 border-l-4 border-amber-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.pending}</p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search proposals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)]">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'list' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
              title="List View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'grid' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                viewMode === 'kanban' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
              title="Kanban View"
            >
              <Kanban size={16} />
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={() => setIsConvertModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <ArrowLeftRight size={16} />
            Convert from Estimate
          </Button>

          <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-1.5">
            <Plus size={16} />
            Create Proposal
          </Button>
        </div>
      </div>

      {/* Proposals List */}
      {filteredProposals.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No proposals found</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">Create your first solar proposal</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="secondary" onClick={() => setIsConvertModalOpen(true)}>
              <ArrowLeftRight size={16} className="mr-1.5" />
              Convert from Estimate
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={16} className="mr-1.5" />
              Create Proposal
            </Button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProposals.map(proposal => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onView={() => setSelectedProposal(proposal)}
              onEdit={() => { setSelectedProposal(proposal); setIsEditMode(true); }}
              onDuplicate={() => handleDuplicateProposal(proposal)}
              onDelete={() => handleDeleteProposal(proposal.id)}
              onDownload={() => handleDownloadPDF(proposal)}
              onSend={() => handleSendProposal(proposal.id)}
              onAccept={() => handleAcceptProposal(proposal.id)}
              onReject={() => handleRejectProposal(proposal.id)}
            />
          ))}
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanView proposals={filteredProposals} onCardClick={setSelectedProposal} />
      ) : (
        <div className="glass-card overflow-hidden p-4">
          <div style={{ minHeight: '200px', background: 'var(--bg-surface)' }}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-base)]">
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-muted)]">Proposal #</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-muted)]">Customer</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-muted)]">Project</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-[var(--text-muted)]">Total</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProposals.map((proposal) => (
                  <tr 
                    key={proposal.id} 
                    className="border-b border-[var(--border-base)]/50 hover:bg-[var(--bg-hover)] cursor-pointer"
                    onClick={() => setSelectedProposal(proposal)}
                  >
                    <td className="py-2 px-3 text-xs font-mono text-[var(--primary)]">{proposal.proposalNumber}</td>
                    <td className="py-2 px-3 text-xs">{proposal.customerName}</td>
                    <td className="py-2 px-3 text-xs text-[var(--text-muted)]">{proposal.projectName}</td>
                    <td className="py-2 px-3 text-xs text-right font-bold text-emerald-500">{(proposal.total / 100000).toFixed(1)}L</td>
                    <td className="py-2 px-3 text-xs">
                      <span 
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ 
                          background: PROPOSAL_STATUS[proposal.status]?.bg || '#e5e7eb',
                          color: PROPOSAL_STATUS[proposal.status]?.color || '#374151'
                        }}
                      >
                        {PROPOSAL_STATUS[proposal.status]?.label || proposal.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={Boolean(isCreateModalOpen || (selectedProposal && isEditMode))}
        onClose={() => { setIsCreateModalOpen(false); setSelectedProposal(null); setIsEditMode(false); }}
        title={isEditMode ? 'Edit Proposal' : 'Create Solar Proposal'}
        size="full"
      >
        <CreateProposalWizard
          initialData={isEditMode ? selectedProposal : null}
          projectTypeOptions={projectTypeOptions}
          installationTypeOptions={installationTypeOptions}
          onSubmit={isEditMode ? (data) => handleUpdateProposal(selectedProposal.id, data) : handleCreateProposal}
          onCancel={() => { setIsCreateModalOpen(false); setSelectedProposal(null); setIsEditMode(false); }}
        />
      </Modal>

      {/* Convert from Estimate Modal */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title="Convert Estimate to Proposal"
        size="lg"
      >
        <ConvertFromEstimate
          estimates={MOCK_ESTIMATES_FOR_CONVERSION}
          onConvert={handleConvertFromEstimate}
          onCancel={() => setIsConvertModalOpen(false)}
        />
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={Boolean(selectedProposal && !isEditMode)}
        onClose={() => setSelectedProposal(null)}
        title={`Proposal ${selectedProposal?.proposalNumber}`}
        size="lg"
      >
        {selectedProposal && (
          <ProposalDetail
            proposal={selectedProposal}
            onEdit={() => setIsEditMode(true)}
            onDelete={() => handleDeleteProposal(selectedProposal.id)}
            onDownload={() => handleDownloadPDF(selectedProposal)}
            onCustomizePDF={() => setIsPDFCustomizerOpen(true)}
            onSend={() => handleSendProposal(selectedProposal.id)}
            onAccept={() => handleAcceptProposal(selectedProposal.id)}
            onReject={() => handleRejectProposal(selectedProposal.id)}
          />
        )}
      </Modal>

      {/* PDF Template Customizer Modal */}
      <PDFTemplateCustomizer
        isOpen={isPDFCustomizerOpen}
        onClose={() => setIsPDFCustomizerOpen(false)}
        proposalData={selectedProposal || {}}
        onDownload={() => {
          setIsPDFCustomizerOpen(false);
        }}
      />
    </div>
  );
};

// ── Proposal Card Component ─────────────────────────────────────────────────
const ProposalCard = ({ proposal, onView, onEdit, onDuplicate, onDelete, onDownload, onSend, onAccept, onReject }) => {
  const statusConfig = PROPOSAL_STATUS[proposal.status] || PROPOSAL_STATUS.draft;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="glass-card p-4 space-y-3 hover:scale-[1.01] transition-all cursor-pointer" onClick={onView}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-[var(--primary)] font-semibold">{proposal.proposalNumber}</p>
          <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-1">{proposal.projectName}</p>
        </div>
        <div
          className="px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1"
          style={{ background: statusConfig.bg, color: statusConfig.color }}
        >
          <StatusIcon size={10} />
          {statusConfig.label}
        </div>
      </div>

      {/* Customer Info */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <User size={12} />
          <span className="line-clamp-1">{proposal.customerName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <MapPin size={12} />
          <span className="line-clamp-1">{proposal.projectLocation}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-card p-2 text-center">
          <p className="text-[10px] text-[var(--text-muted)]">System</p>
          <p className="text-sm font-bold text-[var(--text-primary)]">{proposal.systemCapacity} kW</p>
        </div>
        <div className="glass-card p-2 text-center">
          <p className="text-[10px] text-[var(--text-muted)]">Total</p>
          <p className="text-sm font-bold text-emerald-500">{(proposal.total / 100000).toFixed(1)}L</p>
        </div>
      </div>

      {/* Benefits Preview */}
      {proposal.benefits && (
        <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <Leaf size={10} className="text-green-500" />
            {proposal.benefits.co2Reduction} Tons CO₂
          </span>
          <span className="flex items-center gap-1">
            <Gauge size={10} className="text-blue-500" />
            {proposal.benefits.yearlySavings >= 100000
              ? `${(proposal.benefits.yearlySavings / 100000).toFixed(1)}L/yr`
              : `${proposal.benefits.yearlySavings.toLocaleString()}/yr`
            }
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-2 border-t border-[var(--border-base)]">
        {proposal.status === 'draft' && (
          <button
            onClick={(e) => { e.stopPropagation(); onSend(); }}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[var(--primary)] text-white text-[10px] font-medium hover:opacity-90 transition-opacity"
          >
            <Send size={10} />
            Send
          </button>
        )}
        {proposal.status === 'sent' && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onAccept(); }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-green-500 text-white text-[10px] font-medium hover:opacity-90 transition-opacity"
            >
              <CheckCircle size={10} />
              Accept
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onReject(); }}
              className="flex items-center justify-center p-1.5 rounded-lg bg-red-400 text-white hover:opacity-90 transition-opacity"
            >
              <XCircle size={14} />
            </button>
          </>
        )}
        {proposal.status === 'viewed' && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onAccept(); }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-green-500 text-white text-[10px] font-medium hover:opacity-90 transition-opacity"
            >
              <CheckCircle size={10} />
              Accept
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onReject(); }}
              className="flex items-center justify-center p-1.5 rounded-lg bg-red-400 text-white hover:opacity-90 transition-opacity"
            >
              <XCircle size={14} />
            </button>
          </>
        )}
        {(proposal.status === 'accepted' || proposal.status === 'rejected') && (
          <div className="flex-1 text-center text-[10px] text-[var(--text-muted)] py-1.5">
            {proposal.status === 'accepted' ? (
              <span className="flex items-center justify-center gap-1 text-green-500">
                <BadgeCheck size={14} />
                Accepted
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1 text-red-400">
                <XSquare size={14} />
                Rejected
              </span>
            )}
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          title="Download Proposal"
        >
          <FileText size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <Edit size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--bg-elevated)] text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// ── Convert From Estimate Component ───────────────────────────────────────
const ConvertFromEstimate = ({ estimates, onConvert, onCancel }) => {
  const [selectedEstimate, setSelectedEstimate] = useState(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">
        Select an estimate to convert into a professional proposal. All data will be copied and can be edited before finalizing.
      </p>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {estimates.map(estimate => (
          <div
            key={estimate.id}
            onClick={() => setSelectedEstimate(estimate)}
            className={cn(
              'p-4 rounded-xl border cursor-pointer transition-all',
              selectedEstimate?.id === estimate.id
                ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                : 'border-[var(--border-base)] hover:border-[var(--primary)]/50'
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-mono text-[var(--primary)]">{estimate.id}</p>
                <p className="font-medium text-[var(--text-primary)]">{estimate.projectName}</p>
                <p className="text-sm text-[var(--text-muted)]">{estimate.customerName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-500">{fmt(estimate.total)}</p>
                <p className="text-xs text-[var(--text-muted)]">{estimate.systemCapacity} kW</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-base)]">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => selectedEstimate && onConvert(selectedEstimate)}
          disabled={!selectedEstimate}
        >
          <RefreshCw size={16} className="mr-1.5" />
          Convert to Proposal
        </Button>
      </div>
    </div>
  );
};

// ── Create Proposal Wizard Component ──────────────────────────────────────
const CreateProposalWizard = ({
  initialData,
  projectTypeOptions = DEFAULT_PROJECT_TYPES,
  installationTypeOptions = DEFAULT_INSTALLATION_TYPES,
  onSubmit,
  onCancel,
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialData || {
    customerName: '',
    companyName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    projectLocation: '',
    projectName: '',
    systemCapacity: '',
    projectType: 'residential',
    installationType: 'rooftop',
    projectDescription: '',
    equipmentItems: [],
    equipmentCost: 0,
    installationCost: 0,
    engineeringCost: 0,
    transportationCost: 0,
    miscellaneousCost: 0,
    discount: 0,
    subtotal: 0,
    gstRate: 18,
    gstAmount: 0,
    total: 0,
    benefits: {
      yearlySavings: 0,
      co2Reduction: 0,
      paybackPeriod: 0,
      warrantyYears: 25
    },
    terms: '50% advance payment, 50% on completion. 5 year warranty on installation. 30 years performance warranty on solar panels.',
    notes: '',
  });

  const steps = [
    { id: 1, label: 'Customer', icon: User },
    { id: 2, label: 'Project', icon: Sun },
    { id: 3, label: 'Components', icon: Zap },
    { id: 4, label: 'Pricing', icon: DollarSign },
    { id: 5, label: 'Summary', icon: FileText },
  ];

  const calculateTotals = () => {
    const subtotal =
      (formData.equipmentCost || 0) +
      (formData.installationCost || 0) +
      (formData.engineeringCost || 0) +
      (formData.transportationCost || 0) +
      (formData.miscellaneousCost || 0) -
      (formData.discount || 0);

    const gstAmount = (subtotal * (formData.gstRate || 18)) / 100;
    const total = subtotal + gstAmount;

    // Calculate benefits
    const yearlySavings = Math.round(formData.systemCapacity * 15000) || 0;
    const co2Reduction = Math.round((formData.systemCapacity || 0) * 1.3 * 10) / 10;
    const paybackPeriod = total > 0 && yearlySavings > 0
      ? Math.round(total / yearlySavings * 10) / 10
      : 0;

    return {
      subtotal,
      gstAmount,
      total,
      benefits: {
        yearlySavings,
        co2Reduction,
        paybackPeriod,
        warrantyYears: 25
      }
    };
  };

  const handleNext = () => {
    if (step < 5) {
      if (step === 4) {
        // Calculate totals when moving to summary
        const totals = calculateTotals();
        setFormData(prev => ({ ...prev, ...totals }));
      }
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <User size={20} className="text-[var(--primary)]" />
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Customer Name *" required>
                <Input
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Enter customer name"
                />
              </FormField>
              <FormField label="Company Name">
                <Input
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Enter company name (if applicable)"
                />
              </FormField>
              <FormField label="Phone Number *" required>
                <Input
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </FormField>
              <FormField label="Email Address">
                <Input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="customer@email.com"
                />
              </FormField>
              <FormField label="Address" className="md:col-span-2">
                <Textarea
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  placeholder="Customer address"
                  rows={2}
                />
              </FormField>
              <FormField label="Project Location *" required>
                <Input
                  value={formData.projectLocation}
                  onChange={(e) => setFormData({ ...formData, projectLocation: e.target.value })}
                  placeholder="City, State"
                />
              </FormField>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sun size={20} className="text-[var(--primary)]" />
              Project Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Project Name *" required>
                <Input
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  placeholder="e.g., 5kW Rooftop Solar Installation"
                />
              </FormField>
              <FormField label="System Capacity (kW) *" required>
                <Input
                  type="number"
                  value={formData.systemCapacity}
                  onChange={(e) => setFormData({ ...formData, systemCapacity: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 5"
                />
              </FormField>
              <FormField label="Project Type">
                <Select
                  value={formData.projectType}
                  onChange={(v) => setFormData({ ...formData, projectType: v })}
                  options={projectTypeOptions.map(t => ({ value: t.value, label: t.label }))}
                />
              </FormField>
              <FormField label="Installation Type">
                <Select
                  value={formData.installationType}
                  onChange={(v) => setFormData({ ...formData, installationType: v })}
                  options={installationTypeOptions}
                />
              </FormField>
              <FormField label="Project Description" className="md:col-span-2">
                <Textarea
                  value={formData.projectDescription}
                  onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                  placeholder="Describe the project scope, requirements, etc."
                  rows={3}
                />
              </FormField>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Zap size={20} className="text-[var(--primary)]" />
              Solar System Components
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-base)]">
                    <th className="text-left py-2 text-xs font-medium text-[var(--text-muted)]">Component</th>
                    <th className="text-left py-2 text-xs font-medium text-[var(--text-muted)]">Brand</th>
                    <th className="text-left py-2 text-xs font-medium text-[var(--text-muted)]">Description</th>
                    <th className="text-center py-2 text-xs font-medium text-[var(--text-muted)]">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.equipmentItems.map((item, index) => (
                    <tr key={index} className="border-b border-[var(--border-base)]/50">
                      <td className="py-2 text-sm">{item.component}</td>
                      <td className="py-2 text-sm text-[var(--text-muted)]">{item.brand}</td>
                      <td className="py-2 text-sm text-[var(--text-muted)]">{item.description}</td>
                      <td className="py-2 text-center text-sm">{item.quantity}</td>
                    </tr>
                  ))}
                  {formData.equipmentItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[var(--text-muted)]">
                        No components added. Add equipment in the Components step or convert from an estimate.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)]">
              <h4 className="text-sm font-medium mb-2">Add Component</h4>
              <div className="grid grid-cols-4 gap-2">
                <Input placeholder="Component name" />
                <Input placeholder="Brand" />
                <Input placeholder="Description" />
                <Input type="number" placeholder="Qty" />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <DollarSign size={20} className="text-[var(--primary)]" />
              Pricing & Costs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Equipment Cost (₹)">
                <Input
                  type="number"
                  value={formData.equipmentCost}
                  onChange={(e) => setFormData({ ...formData, equipmentCost: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </FormField>
              <FormField label="Installation Cost (₹)">
                <Input
                  type="number"
                  value={formData.installationCost}
                  onChange={(e) => setFormData({ ...formData, installationCost: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </FormField>
              <FormField label="Engineering Cost (₹)">
                <Input
                  type="number"
                  value={formData.engineeringCost}
                  onChange={(e) => setFormData({ ...formData, engineeringCost: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </FormField>
              <FormField label="Transportation Cost (₹)">
                <Input
                  type="number"
                  value={formData.transportationCost}
                  onChange={(e) => setFormData({ ...formData, transportationCost: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </FormField>
              <FormField label="Miscellaneous Cost (₹)">
                <Input
                  type="number"
                  value={formData.miscellaneousCost}
                  onChange={(e) => setFormData({ ...formData, miscellaneousCost: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </FormField>
              <FormField label="Discount (₹)">
                <Input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </FormField>
              <FormField label="GST Rate (%)">
                <Input
                  type="number"
                  value={formData.gstRate}
                  onChange={(e) => setFormData({ ...formData, gstRate: parseFloat(e.target.value) || 0 })}
                  placeholder="18"
                />
              </FormField>
            </div>

            {/* Cost Summary */}
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)] space-y-2">
              <h4 className="text-sm font-medium mb-3">Cost Summary</h4>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Equipment Cost:</span>
                <span>{fmt(formData.equipmentCost || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Installation Cost:</span>
                <span>{fmt(formData.installationCost || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Engineering Cost:</span>
                <span>{fmt(formData.engineeringCost || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Transportation Cost:</span>
                <span>{fmt(formData.transportationCost || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Miscellaneous Cost:</span>
                <span>{fmt(formData.miscellaneousCost || 0)}</span>
              </div>
              {formData.discount > 0 && (
                <div className="flex justify-between text-sm text-green-500">
                  <span>Discount:</span>
                  <span>-{fmt(formData.discount)}</span>
                </div>
              )}
              <div className="border-t border-[var(--border-base)] pt-2 mt-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Subtotal:</span>
                  <span>{fmt(calculateTotals().subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">GST ({formData.gstRate || 18}%):</span>
                  <span>{fmt(calculateTotals().gstAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-[var(--primary)] mt-2">
                  <span>Grand Total:</span>
                  <span>{fmt(calculateTotals().total)}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        const totals = calculateTotals();
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FileText size={20} className="text-[var(--primary)]" />
              Proposal Summary
            </h3>

            {/* Company Header Preview */}
            <div className="bg-gradient-to-r from-[#006b6b] to-[#008080] text-white rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Sun size={24} className="shrink-0" />
                <div>
                  <h4 className="font-bold">{COMPANY_DATA.name}</h4>
                  <p className="text-xs text-white/80">{COMPANY_DATA.tagline}</p>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)]">
              <h4 className="text-sm font-medium mb-3 text-[var(--primary)]">Customer Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-[var(--text-muted)]">Name:</span> {formData.customerName}</div>
                {formData.companyName && <div><span className="text-[var(--text-muted)]">Company:</span> {formData.companyName}</div>}
                <div><span className="text-[var(--text-muted)]">Phone:</span> {formData.customerPhone}</div>
                <div><span className="text-[var(--text-muted)]">Location:</span> {formData.projectLocation}</div>
              </div>
            </div>

            {/* Project Overview */}
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)]">
              <h4 className="text-sm font-medium mb-3 text-[var(--primary)]">Project Overview</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-[var(--text-muted)]">Project:</span> {formData.projectName}</div>
                <div><span className="text-[var(--text-muted)]">Capacity:</span> {formData.systemCapacity} kW</div>
                <div><span className="text-[var(--text-muted)]">Type:</span> {formData.projectType}</div>
                <div><span className="text-[var(--text-muted)]">Installation:</span> {formData.installationType}</div>
              </div>
            </div>

            {/* Equipment List */}
            {formData.equipmentItems.length > 0 && (
              <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)]">
                <h4 className="text-sm font-medium mb-3 text-[var(--primary)]">Solar Equipment ({formData.equipmentItems.length} items)</h4>
                <div className="space-y-1 text-sm">
                  {formData.equipmentItems.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-[var(--text-muted)]">{item.component} ({item.brand})</span>
                      <span>Qty: {item.quantity}</span>
                    </div>
                  ))}
                  {formData.equipmentItems.length > 3 && (
                    <p className="text-xs text-[var(--text-muted)]">+{formData.equipmentItems.length - 3} more items...</p>
                  )}
                </div>
              </div>
            )}

            {/* Cost Breakdown */}
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)]">
              <h4 className="text-sm font-medium mb-3 text-[var(--primary)]">Cost Breakdown</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Equipment Cost:</span>
                  <span>{fmt(formData.equipmentCost || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Installation & Other Costs:</span>
                  <span>{fmt((formData.installationCost || 0) + (formData.engineeringCost || 0) + (formData.transportationCost || 0) + (formData.miscellaneousCost || 0))}</span>
                </div>
                {formData.discount > 0 && (
                  <div className="flex justify-between text-green-500">
                    <span>Discount:</span>
                    <span>-{fmt(formData.discount)}</span>
                  </div>
                )}
                <div className="border-t border-[var(--border-base)] pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span>Subtotal:</span>
                    <span>{fmt(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">GST ({formData.gstRate || 18}%):</span>
                    <span>{fmt(totals.gstAmount)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-lg font-bold text-emerald-500 pt-2 border-t-2 border-[var(--border-base)]">
                  <span>Grand Total:</span>
                  <span>{fmt(totals.total)}</span>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <h4 className="text-sm font-medium mb-3 text-green-600 flex items-center gap-2">
                <Sparkles size={16} />
                Project Benefits
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Leaf size={16} className="text-green-500" />
                  <span>{totals.benefits.co2Reduction} Tons CO₂ reduction/year</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-500" />
                  <span>₹{totals.benefits.yearlySavings.toLocaleString()} savings/year</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-blue-500" />
                  <span>{totals.benefits.paybackPeriod} years payback</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-amber-500" />
                  <span>{totals.benefits.warrantyYears} years warranty</span>
                </div>
              </div>
            </div>

            {/* Terms & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Terms & Conditions">
                <Textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  placeholder="Payment terms, warranty details, etc."
                  rows={3}
                />
              </FormField>
              <FormField label="Additional Notes">
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </FormField>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Progress */}
      <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)] overflow-x-auto">
        {steps.map((s, index) => {
          const StepIcon = s.icon;
          const isActive = step === s.id;
          const isCompleted = step > s.id;

          return (
            <div key={s.id} className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => setStep(s.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-[var(--primary)] text-white'
                    : isCompleted
                      ? 'bg-green-500/10 text-green-500'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                )}
              >
                {isCompleted ? (
                  <CheckCircle size={14} />
                ) : (
                  <StepIcon size={14} />
                )}
                {s.label}
              </button>
              {index < steps.length - 1 && (
                <ChevronRight size={14} className="text-[var(--text-muted)] mx-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--border-base)]">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          {step > 1 && (
            <Button type="button" variant="secondary" onClick={handlePrevious}>
              <ChevronLeft size={16} className="mr-1" />
              Previous
            </Button>
          )}
          {step < 5 ? (
            <Button type="button" onClick={handleNext}>
              Next
              <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => downloadRayzonPDF(formData)}>
                <FileText size={16} className="mr-1" />
                Preview PDF
              </Button>
              <Button type="button" onClick={handleSubmit}>
                <Save size={16} className="mr-1" />
                Save Proposal
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Proposal Detail Component ──────────────────────────────────────────────
const ProposalDetail = ({ proposal, onEdit, onDelete, onDownload, onCustomizePDF, onSend, onAccept, onReject }) => {
  const statusConfig = PROPOSAL_STATUS[proposal.status] || PROPOSAL_STATUS.draft;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <DocumentHeader
        company={COMPANY_DATA}
        documentType="Solar Proposal"
        documentNumber={proposal.proposalNumber}
        date={proposal.createdAt}
        customerName={proposal.customerName}
        customerAddress={proposal.customerAddress}
        projectLocation={proposal.projectLocation}
      />

      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5"
            style={{ background: statusConfig.bg, color: statusConfig.color }}
          >
            <StatusIcon size={14} />
            {statusConfig.label}
          </span>
          <span className="text-xs text-[var(--text-muted)]">{statusConfig.description}</span>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-emerald-500">{fmt(proposal.total)}</p>
          <p className="text-xs text-[var(--text-muted)]">Total Project Value</p>
        </div>
      </div>

      {/* Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-4 space-y-3">
          <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <User size={16} className="text-[var(--primary)]" />
            Customer Information
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Name:</span>
              <span className="font-medium">{proposal.customerName}</span>
            </div>
            {proposal.companyName && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Company:</span>
                <span>{proposal.companyName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Phone:</span>
              <span>{proposal.customerPhone}</span>
            </div>
            {proposal.customerEmail && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Email:</span>
                <span>{proposal.customerEmail}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Location:</span>
              <span>{proposal.projectLocation}</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 space-y-3">
          <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Sun size={16} className="text-[var(--primary)]" />
            Project Details
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Project Name:</span>
              <span className="font-medium">{proposal.projectName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">System Capacity:</span>
              <span className="font-medium">{proposal.systemCapacity} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Project Type:</span>
              <span className="capitalize">{proposal.projectType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Installation:</span>
              <span className="capitalize">{proposal.installationType.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment List */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Zap size={16} className="text-[var(--primary)]" />
          Solar Equipment ({proposal.equipmentItems?.length || 0} items)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-base)]">
                <th className="text-left py-2 text-xs font-medium text-[var(--text-muted)]">Component</th>
                <th className="text-left py-2 text-xs font-medium text-[var(--text-muted)]">Brand</th>
                <th className="text-left py-2 text-xs font-medium text-[var(--text-muted)]">Description</th>
                <th className="text-center py-2 text-xs font-medium text-[var(--text-muted)]">Qty</th>
              </tr>
            </thead>
            <tbody>
              {proposal.equipmentItems?.map((item, index) => (
                <tr key={index} className="border-b border-[var(--border-base)]/50">
                  <td className="py-2 text-sm font-medium">{item.component}</td>
                  <td className="py-2 text-sm text-[var(--text-muted)]">{item.brand}</td>
                  <td className="py-2 text-sm text-[var(--text-muted)]">{item.description}</td>
                  <td className="py-2 text-center text-sm">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="glass-card p-4 space-y-3">
        <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <DollarSign size={16} className="text-[var(--primary)]" />
          Cost Summary
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Equipment Cost</span>
              <span className="font-medium">{fmt(proposal.equipmentCost || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Installation Cost</span>
              <span>{fmt(proposal.installationCost || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Engineering Cost</span>
              <span>{fmt(proposal.engineeringCost || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Transportation</span>
              <span>{fmt(proposal.transportationCost || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Miscellaneous</span>
              <span>{fmt(proposal.miscellaneousCost || 0)}</span>
            </div>
            {proposal.discount > 0 && (
              <div className="flex justify-between text-green-500">
                <span>Discount</span>
                <span>-{fmt(proposal.discount)}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between pt-4 border-t border-[var(--border-base)]">
              <span className="font-medium">Subtotal</span>
              <span className="font-medium">{fmt(proposal.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">GST ({proposal.gstRate || 18}%)</span>
              <span>{fmt(proposal.gstAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-[var(--border-base)]">
              <span className="text-emerald-500">Grand Total</span>
              <span className="text-emerald-500">{fmt(proposal.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      {proposal.benefits && (
        <div className="glass-card p-4 space-y-3 bg-gradient-to-r from-green-500/5 to-emerald-500/5 border-green-500/20">
          <h4 className="text-sm font-bold text-green-600 flex items-center gap-2">
            <Sparkles size={16} />
            Project Benefits
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <Leaf size={20} className="text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-600">{proposal.benefits.co2Reduction}</p>
              <p className="text-xs text-[var(--text-muted)]">Tons CO₂/yr</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-500/10">
              <DollarSign size={20} className="text-emerald-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-emerald-600">
                {proposal.benefits.yearlySavings >= 100000
                  ? `${(proposal.benefits.yearlySavings / 100000).toFixed(1)}L`
                  : (proposal.benefits.yearlySavings / 1000).toFixed(1) + 'K'
                }
              </p>
              <p className="text-xs text-[var(--text-muted)]">Savings/yr</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-500/10">
              <Clock size={20} className="text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-blue-600">{proposal.benefits.paybackPeriod}</p>
              <p className="text-xs text-[var(--text-muted)]">Years Payback</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-500/10">
              <Shield size={20} className="text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-amber-600">{proposal.benefits.warrantyYears}</p>
              <p className="text-xs text-[var(--text-muted)]">Years Warranty</p>
            </div>
          </div>
        </div>
      )}

      {/* Terms & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">Terms & Conditions</h4>
          <p className="text-sm text-[var(--text-muted)] whitespace-pre-line">{proposal.terms}</p>
        </div>
        {proposal.notes && (
          <div className="glass-card p-4">
            <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">Additional Notes</h4>
            <p className="text-sm text-[var(--text-muted)] whitespace-pre-line">{proposal.notes}</p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3">Proposal Timeline</h4>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <FileText size={14} className="text-blue-500" />
            </div>
            <div>
              <p className="font-medium">Created</p>
              <p className="text-xs text-[var(--text-muted)]">{new Date(proposal.createdAt).toLocaleDateString('en-IN')}</p>
            </div>
          </div>
          {proposal.sentAt && (
            <>
              <ArrowRight size={16} className="text-[var(--text-muted)]" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Send size={14} className="text-purple-500" />
                </div>
                <div>
                  <p className="font-medium">Sent</p>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(proposal.sentAt).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            </>
          )}
          {proposal.viewedAt && (
            <>
              <ArrowRight size={16} className="text-[var(--text-muted)]" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Eye size={14} className="text-amber-500" />
                </div>
                <div>
                  <p className="font-medium">Viewed</p>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(proposal.viewedAt).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            </>
          )}
          {proposal.acceptedAt && (
            <>
              <ArrowRight size={16} className="text-[var(--text-muted)]" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle size={14} className="text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Accepted</p>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(proposal.acceptedAt).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-[var(--border-base)]">
        {proposal.status === 'draft' && (
          <button
            onClick={onSend}
            className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Send size={16} />
            Send to Client
          </button>
        )}
        {(proposal.status === 'sent' || proposal.status === 'viewed') && (
          <>
            <button
              onClick={onAccept}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <BadgeCheck size={16} />
              Mark Accepted
            </button>
            <button
              onClick={onReject}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-red-400 text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <XCircle size={16} />
              Reject
            </button>
          </>
        )}
        <button
          onClick={onDownload}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-hover)] transition-colors"
        >
          <FileText size={16} />
          Download PDF
        </button>
        <button
          onClick={onCustomizePDF}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-600 text-sm font-medium hover:bg-amber-500/20 transition-colors"
        >
          <Settings size={16} />
          Customize PDF
        </button>
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-hover)] transition-colors"
        >
          <Edit size={16} />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-red-400/10 text-red-400 text-sm font-medium hover:bg-red-400/20 transition-colors"
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    </div>
  );
};

// ── Kanban View Component ───────────────────────────────────────────────────
const KanbanView = ({ proposals, onCardClick }) => {
  const columns = [
    { id: 'draft', label: 'Draft', color: '#64748b' },
    { id: 'sent', label: 'Sent', color: '#3b82f6' },
    { id: 'viewed', label: 'Viewed', color: '#8b5cf6' },
    { id: 'accepted', label: 'Accepted', color: '#22c55e' },
    { id: 'rejected', label: 'Rejected', color: '#ef4444' },
  ];

  const getProposalsByStatus = (status) => proposals.filter(p => p.status === status);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {columns.map(column => (
        <div key={column.id} className="glass-card p-3 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-base)]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: column.color }} />
              <span className="text-sm font-bold text-[var(--text-primary)]">{column.label}</span>
            </div>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full">
              {getProposalsByStatus(column.id).length}
            </span>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {getProposalsByStatus(column.id).map(proposal => (
              <div
                key={proposal.id}
                onClick={() => onCardClick(proposal)}
                className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] hover:border-[var(--primary)] cursor-pointer transition-all hover:shadow-md"
              >
                <p className="text-xs font-mono text-[var(--primary)]">{proposal.proposalNumber}</p>
                <p className="text-xs font-medium text-[var(--text-primary)] line-clamp-1">{proposal.projectName}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{proposal.customerName}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-bold text-emerald-500">{(proposal.total / 100000).toFixed(1)}L</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{proposal.systemCapacity} kW</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProposalPage;
