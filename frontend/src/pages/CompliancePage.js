// Solar OS – EPC Edition — CompliancePage.js
import React, { useState, useRef } from 'react';
import {
    FileText, CheckCircle, AlertTriangle, Zap, Upload,
    Plus, Download, Building2, ShieldCheck, IndianRupee, LayoutGrid, List,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { Progress } from '../components/ui/Progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import DataTable from '../components/ui/DataTable';
import { APP_CONFIG } from '../config/app.config';

/* ─── Config-driven Status Maps ─── */
const NEUTRAL = 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-muted)]';
const NM_STATUS = {
    Draft: { label: 'Draft', color: NEUTRAL },
    Applied: { label: 'Applied', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    Approved: { label: 'Approved', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    Rejected: { label: 'Rejected', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
    Connected: { label: 'Connected', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
};
const SUB_STATUS = {
    Applied: { label: 'Applied', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    Sanctioned: { label: 'Sanctioned', color: 'bg-[var(--bg-hover)] text-[var(--primary-light)] border-[var(--border-active)]' },
    Disbursed: { label: 'Disbursed', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    Rejected: { label: 'Rejected', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};
const INS_STATUS = {
    Pending: { label: 'Pending', color: NEUTRAL },
    Scheduled: { label: 'Scheduled', color: 'bg-[var(--bg-hover)] text-[var(--primary-light)] border-[var(--border-active)]' },
    Passed: { label: 'Passed', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    Failed: { label: 'Failed', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};
const DOC_STATUS = {
    Uploaded: { label: 'Uploaded', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    Pending: { label: 'Pending', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    Rejected: { label: 'Rejected', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const mkBadge = (map) => ({ value }) => {
    const meta = map[value] ?? { label: value, color: NEUTRAL };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>{meta.label}</span>;
};

const NMBadge = mkBadge(NM_STATUS);
const SubBadge = mkBadge(SUB_STATUS);
const InsBadge = mkBadge(INS_STATUS);
const DocBadge = mkBadge(DOC_STATUS);

/* ─── Local Data ─── */
const NET_METERING = [
    { id: 'NM001', projectId: 'P001', customer: 'Ramesh Joshi', site: 'GIDC Ahmedabad', systemSize: '50 kW', discom: 'DGVCL', applicationNo: 'DGVCL/NM/2026/1234', appliedDate: '2026-02-26', approvalDate: null, status: 'Applied', compensationRate: '₹2.25/kWh', bidirectionalMeter: false },
    { id: 'NM002', projectId: 'P003', customer: 'Prakash Agarwal', site: 'Ahmedabad Plant', systemSize: '80 kW', discom: 'DGVCL', applicationNo: 'DGVCL/NM/2026/0891', appliedDate: '2026-01-16', approvalDate: '2026-02-10', status: 'Approved', compensationRate: '₹2.25/kWh', bidirectionalMeter: true },
    { id: 'NM003', projectId: 'P002', customer: 'Suresh Bhatt', site: 'Vapi GIDC', systemSize: '150 kW', discom: 'DGVCL', applicationNo: null, appliedDate: null, approvalDate: null, status: 'Draft', compensationRate: '₹2.25/kWh', bidirectionalMeter: false },
];

const SUBSIDIES = [
    { id: 'SUB001', customer: 'Ramesh Joshi', systemSize: '50 kW', scheme: 'PM Surya Ghar', appliedDate: '2026-02-26', sanctionDate: null, disbursedDate: null, claimAmount: 94500, status: 'Applied', applicationRef: 'PMSG/GJ/2026/55201' },
    { id: 'SUB002', customer: 'Prakash Agarwal', systemSize: '80 kW', scheme: 'GEDA Rooftop', appliedDate: '2026-01-17', sanctionDate: '2026-02-05', disbursedDate: '2026-02-20', claimAmount: 120000, status: 'Disbursed', applicationRef: 'GEDA/RT/2026/00341' },
    { id: 'SUB003', customer: 'Meena Patel', systemSize: '40 kW', scheme: 'MNRE CAPEX', appliedDate: '2026-02-10', sanctionDate: '2026-02-28', disbursedDate: null, claimAmount: 60000, status: 'Sanctioned', applicationRef: 'MNRE/RT/2026/88104' },
];

const INSPECTIONS = [
    { id: 'INS001', projectId: 'P001', customer: 'Ramesh Joshi', type: 'DISCOM Technical', scheduledDate: '2026-03-05', completedDate: null, status: 'Scheduled', inspector: 'DGVCL Officer', outcome: null, remarks: null },
    { id: 'INS002', projectId: 'P003', customer: 'Prakash Agarwal', type: 'DISCOM Final', scheduledDate: '2026-02-08', completedDate: '2026-02-08', status: 'Passed', inspector: 'DGVCL Officer', outcome: 'Passed with remarks', remarks: 'Earthing improvements required within 30 days.' },
    { id: 'INS003', projectId: 'P001', customer: 'Ramesh Joshi', type: 'Electrical Inspector', scheduledDate: '2026-02-28', completedDate: null, status: 'Pending', inspector: 'State Electrical Inspector', outcome: null, remarks: null },
];

const DOCUMENTS = [
    { id: 'DOC001', name: 'Net Metering Application Form', category: 'DISCOM', project: 'P001', status: 'Uploaded', required: true },
    { id: 'DOC002', name: 'Single Line Diagram (SLD)', category: 'DISCOM', project: 'P001', status: 'Uploaded', required: true },
    { id: 'DOC003', name: 'Structural Load Certificate', category: 'DISCOM', project: 'P001', status: 'Uploaded', required: true },
    { id: 'DOC004', name: 'Electrical Completion Certificate', category: 'CEA', project: 'P001', status: 'Pending', required: true },
    { id: 'DOC005', name: 'Bidirectional Meter Installation Report', category: 'DISCOM', project: 'P001', status: 'Pending', required: true },
    { id: 'DOC006', name: 'Net Metering Agreement', category: 'DISCOM', project: 'P001', status: 'Pending', required: true },
    { id: 'DOC007', name: 'Subsidy Application (PM Surya Ghar)', category: 'MNRE', project: 'P001', status: 'Uploaded', required: false },
    { id: 'DOC008', name: 'Commissioning Certificate', category: 'Internal', project: 'P003', status: 'Uploaded', required: true },
    { id: 'DOC009', name: 'Generation Meter Calibration', category: 'CEA', project: 'P003', status: 'Uploaded', required: true },
];

/* ─── Column Schemas ─── */
const NM_COLUMNS = [
    { key: 'id', header: 'App ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
    { key: 'customer', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
    { key: 'systemSize', header: 'Size', render: v => <span className="text-xs font-bold text-[var(--solar)]">{v}</span> },
    { key: 'discom', header: 'DISCOM', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
    { key: 'applicationNo', header: 'App No.', render: v => <span className="text-xs font-mono text-[var(--text-secondary)]">{v ?? '—'}</span> },
    { key: 'appliedDate', header: 'Applied', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
    { key: 'approvalDate', header: 'Approved', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
    { key: 'compensationRate', header: 'Rate', render: v => <span className="text-xs text-emerald-400">{v}</span> },
    { key: 'status', header: 'Status', render: v => <NMBadge value={v} /> },
];

const SUB_COLUMNS = [
    { key: 'id', header: 'Sub ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
    { key: 'customer', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
    { key: 'scheme', header: 'Scheme', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
    { key: 'systemSize', header: 'Size', render: v => <span className="text-xs font-bold text-[var(--solar)]">{v}</span> },
    { key: 'claimAmount', header: 'Claim Amt', sortable: true, render: v => <span className="text-xs font-bold text-[var(--text-primary)]">₹{v.toLocaleString('en-IN')}</span> },
    { key: 'appliedDate', header: 'Applied', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
    { key: 'sanctionDate', header: 'Sanctioned', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
    { key: 'disbursedDate', header: 'Disbursed', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
    { key: 'status', header: 'Status', render: v => <SubBadge value={v} /> },
];

const INS_COLUMNS = [
    { key: 'id', header: 'Inspection ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
    { key: 'customer', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
    { key: 'type', header: 'Type', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
    { key: 'inspector', header: 'Inspector', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
    { key: 'scheduledDate', header: 'Scheduled', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
    { key: 'completedDate', header: 'Completed', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
    { key: 'outcome', header: 'Outcome', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
    { key: 'status', header: 'Status', render: v => <InsBadge value={v} /> },
];

const DOC_COLUMNS = [
    { key: 'id', header: 'Doc ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
    { key: 'name', header: 'Document Name', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
    { key: 'category', header: 'Authority', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
    { key: 'project', header: 'Project', render: v => <span className="text-xs font-mono text-[var(--text-muted)]">{v}</span> },
    { key: 'required', header: 'Required', render: v => <span className={`text-xs font-semibold ${v ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>{v ? 'Mandatory' : 'Optional'}</span> },
    { key: 'status', header: 'Status', render: v => <DocBadge value={v} /> },
];

/* ─── Kanban Stage Defs ─── */
const NM_STAGES = [
    { id: 'Draft', label: 'Draft', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
    { id: 'Applied', label: 'Applied', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { id: 'Approved', label: 'Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    { id: 'Connected', label: 'Connected', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
    { id: 'Rejected', label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

const SUB_STAGES = [
    { id: 'Applied', label: 'Applied', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { id: 'Sanctioned', label: 'Sanctioned', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    { id: 'Disbursed', label: 'Disbursed', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    { id: 'Rejected', label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

/* ─── Net Metering Card ─── */
const NMCard = ({ item, onDragStart, onClick }) => {
    const meta = NM_STATUS[item.status] ?? NM_STATUS.Draft;
    return (
        <div
            draggable
            onDragStart={() => onDragStart(item.id)}
            onClick={() => onClick({ type: 'nm', data: item })}
            className="glass-card p-3 cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all space-y-2"
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-[var(--accent-light)]">{item.id}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-medium ${meta.color}`}>{meta.label}</span>
            </div>
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{item.customer}</p>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div className="glass-card p-1.5">
                    <p className="text-[var(--text-muted)]">DISCOM</p>
                    <p className="font-bold text-[var(--text-primary)]">{item.discom}</p>
                </div>
                <div className="glass-card p-1.5">
                    <p className="text-[var(--text-muted)]">Size</p>
                    <p className="font-bold text-[var(--solar)]">{item.systemSize}</p>
                </div>
            </div>
            <div className="text-[9px] text-[var(--text-muted)] flex items-center gap-1">
                <Building2 size={9} />
                <span className="truncate">{item.site}</span>
            </div>
            {item.applicationNo && (
                <p className="text-[9px] font-mono text-[var(--text-muted)] truncate">{item.applicationNo}</p>
            )}
            {item.bidirectionalMeter && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">Meter Installed ✓</span>
            )}
        </div>
    );
};

/* ─── Subsidy Card ─── */
const SubCard = ({ item, onDragStart, onClick }) => {
    const meta = SUB_STATUS[item.status] ?? SUB_STATUS.Applied;
    return (
        <div
            draggable
            onDragStart={() => onDragStart(item.id)}
            onClick={() => onClick({ type: 'sub', data: item })}
            className="glass-card p-3 cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all space-y-2"
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-[var(--accent-light)]">{item.id}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-medium ${meta.color}`}>{meta.label}</span>
            </div>
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{item.customer}</p>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div className="glass-card p-1.5">
                    <p className="text-[var(--text-muted)]">Claim</p>
                    <p className="font-bold text-emerald-400">₹{item.claimAmount.toLocaleString('en-IN')}</p>
                </div>
                <div className="glass-card p-1.5">
                    <p className="text-[var(--text-muted)]">Size</p>
                    <p className="font-bold text-[var(--solar)]">{item.systemSize}</p>
                </div>
            </div>
            <p className="text-[9px] text-[var(--text-muted)] truncate">{item.scheme}</p>
            {item.applicationRef && (
                <p className="text-[9px] font-mono text-[var(--text-muted)] truncate">{item.applicationRef}</p>
            )}
        </div>
    );
};

/* ─── Generic Kanban Board ─── */
const ComplianceKanbanBoard = ({ stages, items, CardComponent, onStageChange, onCardClick }) => {
    const draggingId = useRef(null);
    const [dragOver, setDragOver] = useState(null);
    return (
        <div className="overflow-x-auto pb-3">
            <div className="flex gap-3 min-w-max">
                {stages.map(stage => {
                    const cards = items.filter(i => i.status === stage.id);
                    return (
                        <div key={stage.id}
                            className={`flex flex-col w-56 rounded-xl border transition-colors ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}
                            onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={() => { if (draggingId.current) onStageChange(draggingId.current, stage.id); draggingId.current = null; setDragOver(null); }}
                        >
                            <div className="p-2.5 border-b border-[var(--border-base)] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                                    <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
                                </div>
                                <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                                    style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
                            </div>
                            <div className="flex flex-col gap-2 p-2 flex-1 min-h-[100px]">
                                {cards.map(item => (
                                    <CardComponent key={item.id} item={item}
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

/* ─── Main Page ─── */
const CompliancePage = () => {
    const [nmItems, setNmItems] = useState(NET_METERING);
    const [subItems, setSubItems] = useState(SUBSIDIES);
    const [nmView, setNmView] = useState('kanban');
    const [subView, setSubView] = useState('kanban');
    const [nmPage, setNmPage] = useState(1);
    const [subPage, setSubPage] = useState(1);
    const [insPage, setInsPage] = useState(1);
    const [docPage, setDocPage] = useState(1);
    const [pageSize] = useState(APP_CONFIG.defaultPageSize);
    const [showAddNM, setShowAddNM] = useState(false);
    const [showAddSub, setShowAddSub] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [selected, setSelected] = useState(null);

    const handleNMStage = (id, s) => setNmItems(prev => prev.map(i => i.id === id ? { ...i, status: s } : i));
    const handleSubStage = (id, s) => setSubItems(prev => prev.map(i => i.id === id ? { ...i, status: s } : i));

    const paginatedNM = nmItems.slice((nmPage - 1) * pageSize, nmPage * pageSize);
    const paginatedSub = subItems.slice((subPage - 1) * pageSize, subPage * pageSize);
    const paginatedIns = INSPECTIONS.slice((insPage - 1) * pageSize, insPage * pageSize);
    const paginatedDoc = DOCUMENTS.slice((docPage - 1) * pageSize, docPage * pageSize);

    const totalSubsidy = subItems.reduce((a, s) => a + s.claimAmount, 0);
    const disbursed = subItems.filter(s => s.status === 'Disbursed').reduce((a, s) => a + s.claimAmount, 0);
    const uploadedDocs = DOCUMENTS.filter(d => d.status === 'Uploaded').length;
    const pendingDocs = DOCUMENTS.filter(d => d.status === 'Pending').length;
    const docProgress = Math.round((uploadedDocs / DOCUMENTS.length) * 100);

    const NM_ACTIONS = [{ label: 'View Application', icon: FileText, onClick: r => setSelected({ type: 'nm', data: r }) }];
    const SUB_ACTIONS = [{ label: 'View Application', icon: FileText, onClick: r => setSelected({ type: 'sub', data: r }) }, { label: 'Download Form', icon: Download, onClick: () => { } }];
    const INS_ACTIONS = [{ label: 'View Inspection', icon: FileText, onClick: r => setSelected({ type: 'ins', data: r }) }];
    const DOC_ACTIONS = [{ label: 'View Document', icon: FileText, onClick: () => { } }, { label: 'Upload New Version', icon: Upload, onClick: () => setShowUpload(true) }];

    return (
        <div className="animate-fade-in space-y-5">
            <PageHeader
                title="Compliance & Regulatory"
                subtitle="Net metering · subsidies · DISCOM inspections · document checklist"
                actions={[
                    { type: 'button', label: 'Upload Doc', icon: Upload, onClick: () => setShowUpload(true) },
                    { type: 'button', label: 'Apply Net Metering', icon: Plus, variant: 'primary', onClick: () => setShowAddNM(true) }
                ]}
            />

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard title="Net Metering Apps" value={nmItems.length} icon={Building2} trend={+1} trendLabel="applied this month" color="accent" />
                <KPICard title="Subsidy Claimed" value={`₹${(totalSubsidy / 100000).toFixed(1)}L`} icon={IndianRupee} trend={+2} trendLabel="total claims filed" color="solar" />
                <KPICard title="Subsidy Disbursed" value={`₹${(disbursed / 100000).toFixed(1)}L`} icon={CheckCircle} trend={+1} trendLabel="received this quarter" color="emerald" />
                <KPICard title="Docs Pending" value={pendingDocs} icon={AlertTriangle} trend={-2} trendLabel="need upload" color="amber" />
            </div>

            {/* AI Banner */}
            <div className="ai-banner">
                <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
                <p className="text-xs text-[var(--text-secondary)]">
                    <span className="text-[var(--accent-light)] font-semibold">AI Insight:</span>{' '}
                    NM001 (Joshi Industries) awaiting bidirectional meter installation — coordinate with DGVCL for expedited meter provisioning. SUB001 (PM Surya Ghar) application submitted — expect sanction in 15-20 working days.
                </p>
            </div>

            {/* Document Completion Progress */}
            <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <ShieldCheck size={15} className="text-[var(--accent)]" /> Document Compliance Score
                    </h3>
                    <span className="text-sm font-black text-[var(--accent-light)]">{docProgress}%</span>
                </div>
                <Progress value={docProgress} className="h-2.5 mb-2" />
                <div className="flex gap-4 text-xs text-[var(--text-muted)]">
                    <span className="text-emerald-400 font-semibold">{uploadedDocs} Uploaded</span>
                    <span className="text-amber-400 font-semibold">{pendingDocs} Pending</span>
                    <span>{DOCUMENTS.length} Total Required</span>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="netmetering">
                <TabsList>
                    <TabsTrigger value="netmetering">Net Metering ({nmItems.length})</TabsTrigger>
                    <TabsTrigger value="subsidies">Subsidies ({subItems.length})</TabsTrigger>
                    <TabsTrigger value="inspections">Inspections ({INSPECTIONS.length})</TabsTrigger>
                    <TabsTrigger value="documents">Documents ({DOCUMENTS.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="netmetering">
                    <div className="space-y-3">
                        {/* Header row: view toggle + action button */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="view-toggle-pill">
                                <button onClick={() => setNmView('kanban')}
                                    className={`view-toggle-btn ${nmView === 'kanban' ? 'active' : ''}`}>
                                    <LayoutGrid size={12} /> Kanban
                                </button>
                                <button onClick={() => setNmView('table')}
                                    className={`view-toggle-btn ${nmView === 'table' ? 'active' : ''}`}>
                                    <List size={12} /> Table
                                </button>
                            </div>
                            <Button size="sm" onClick={() => setShowAddNM(true)}><Plus size={12} /> New Application</Button>
                        </div>

                        {nmView === 'kanban' ? (
                            <ComplianceKanbanBoard
                                stages={NM_STAGES}
                                items={nmItems}
                                CardComponent={NMCard}
                                onStageChange={handleNMStage}
                                onCardClick={setSelected}
                            />
                        ) : (
                            <DataTable columns={NM_COLUMNS} data={paginatedNM} rowActions={NM_ACTIONS}
                                pagination={{ page: nmPage, pageSize, total: nmItems.length, onChange: setNmPage }}
                                emptyMessage="No net metering applications found." />
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="subsidies">
                    <div className="space-y-3">
                        {/* Header row: view toggle + action button */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="view-toggle-pill">
                                <button onClick={() => setSubView('kanban')}
                                    className={`view-toggle-btn ${subView === 'kanban' ? 'active' : ''}`}>
                                    <LayoutGrid size={12} /> Kanban
                                </button>
                                <button onClick={() => setSubView('table')}
                                    className={`view-toggle-btn ${subView === 'table' ? 'active' : ''}`}>
                                    <List size={12} /> Table
                                </button>
                            </div>
                            <Button size="sm" onClick={() => setShowAddSub(true)}><Plus size={12} /> New Subsidy Application</Button>
                        </div>

                        {subView === 'kanban' ? (
                            <ComplianceKanbanBoard
                                stages={SUB_STAGES}
                                items={subItems}
                                CardComponent={SubCard}
                                onStageChange={handleSubStage}
                                onCardClick={setSelected}
                            />
                        ) : (
                            <DataTable columns={SUB_COLUMNS} data={paginatedSub} rowActions={SUB_ACTIONS}
                                pagination={{ page: subPage, pageSize, total: subItems.length, onChange: setSubPage }}
                                emptyMessage="No subsidy applications found." />
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="inspections">
                    <DataTable columns={INS_COLUMNS} data={paginatedIns} rowActions={INS_ACTIONS}
                        pagination={{ page: insPage, pageSize, total: INSPECTIONS.length, onChange: setInsPage }}
                        emptyMessage="No inspections found." />
                </TabsContent>

                <TabsContent value="documents">
                    <div className="space-y-3">
                        <div className="flex justify-end">
                            <Button size="sm" onClick={() => setShowUpload(true)}><Upload size={12} /> Upload Document</Button>
                        </div>
                        <DataTable columns={DOC_COLUMNS} data={paginatedDoc} rowActions={DOC_ACTIONS}
                            pagination={{ page: docPage, pageSize, total: DOCUMENTS.length, onChange: setDocPage }}
                            emptyMessage="No documents found." />
                    </div>
                </TabsContent>
            </Tabs>

            {/* Net Metering Modal */}
            <Modal open={showAddNM} onClose={() => setShowAddNM(false)} title="Apply for Net Metering"
                footer={
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setShowAddNM(false)}>Cancel</Button>
                        <Button onClick={() => setShowAddNM(false)}><Plus size={13} /> Submit Application</Button>
                    </div>
                }>
                <div className="space-y-3">
                    <FormField label="Project">
                        <Select><option value="">Select Project</option>
                            <option>P001 – Joshi Industries 50kW</option>
                            <option>P002 – Suresh Bhatt 150kW</option>
                        </Select>
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="DISCOM">
                            <Select><option value="">Select DISCOM</option>
                                {['DGVCL', 'MGVCL', 'PGVCL', 'UGVCL', 'MSEDCL', 'BESCOM'].map(d => <option key={d}>{d}</option>)}
                            </Select>
                        </FormField>
                        <FormField label="Application Date">
                            <Input type="date" />
                        </FormField>
                    </div>
                    <FormField label="DISCOM Contact Officer">
                        <Input placeholder="Officer name" />
                    </FormField>
                    <FormField label="DISCOM Contact Phone">
                        <Input placeholder="9876543210" />
                    </FormField>
                </div>
            </Modal>

            {/* Subsidy Modal */}
            <Modal open={showAddSub} onClose={() => setShowAddSub(false)} title="File Subsidy Application"
                footer={
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setShowAddSub(false)}>Cancel</Button>
                        <Button onClick={() => setShowAddSub(false)}><Plus size={13} /> Submit Application</Button>
                    </div>
                }>
                <div className="space-y-3">
                    <FormField label="Project">
                        <Select><option value="">Select Project</option>
                            <option>P001 – Joshi Industries</option>
                        </Select>
                    </FormField>
                    <FormField label="Subsidy Scheme">
                        <Select><option value="">Select Scheme</option>
                            {['PM Surya Ghar', 'GEDA Rooftop', 'MNRE CAPEX', 'State CAPEX'].map(s => <option key={s}>{s}</option>)}
                        </Select>
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Claim Amount (₹)">
                            <Input type="number" placeholder="94500" />
                        </FormField>
                        <FormField label="Application Date">
                            <Input type="date" />
                        </FormField>
                    </div>
                    <FormField label="Application Reference No.">
                        <Input placeholder="PMSG/GJ/2026/..." />
                    </FormField>
                </div>
            </Modal>

            {/* Upload Document Modal */}
            <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Compliance Document"
                footer={
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setShowUpload(false)}>Cancel</Button>
                        <Button onClick={() => setShowUpload(false)}><Upload size={13} /> Upload</Button>
                    </div>
                }>
                <div className="space-y-3">
                    <FormField label="Project">
                        <Select><option value="">Select Project</option>
                            <option>P001 – Joshi Industries</option>
                            <option>P003 – Prakash Agarwal</option>
                        </Select>
                    </FormField>
                    <FormField label="Document Type">
                        <Select><option value="">Select Document</option>
                            {DOCUMENTS.filter(d => d.status === 'Pending').map(d => <option key={d.id}>{d.name}</option>)}
                        </Select>
                    </FormField>
                    <FormField label="Issuing Authority">
                        <Select><option value="">Select Authority</option>
                            {['DISCOM', 'CEA', 'MNRE', 'GEDA', 'Internal', 'Structural Engineer'].map(a => <option key={a}>{a}</option>)}
                        </Select>
                    </FormField>
                    <FormField label="Document Date">
                        <Input type="date" />
                    </FormField>
                    <div className="border-2 border-dashed border-[var(--border-base)] rounded-lg p-6 text-center">
                        <Upload size={24} className="mx-auto text-[var(--text-muted)] mb-2" />
                        <p className="text-xs text-[var(--text-muted)]">Click to select file or drag & drop</p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">PDF, JPG, PNG — max 10MB</p>
                    </div>
                </div>
            </Modal>

            {/* Detail Modal */}
            {selected && (
                <Modal open={!!selected} onClose={() => setSelected(null)}
                    title={selected.type === 'nm' ? `Net Metering — ${selected.data.id}` :
                        selected.type === 'sub' ? `Subsidy — ${selected.data.id}` :
                            `Inspection — ${selected.data.id}`}
                    footer={
                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
                            <Button><Download size={13} /> Download</Button>
                        </div>
                    }>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        {Object.entries(selected.data)
                            .filter(([k]) => !['id'].includes(k))
                            .map(([k, v]) => (
                                <div key={k} className="glass-card p-2">
                                    <div className="text-[var(--text-muted)] mb-0.5 capitalize">{k.replace(/([A-Z])/g, ' $1')}</div>
                                    <div className="font-semibold text-[var(--text-primary)]">
                                        {v === null || v === undefined ? '—' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
                                    </div>
                                </div>
                            ))}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default CompliancePage;
