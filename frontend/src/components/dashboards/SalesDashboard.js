// FinanceDashboard.js — Finance role dashboard (redesigned)
import React from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    DollarSign, TrendingUp, TrendingDown, FileText, CheckCircle,
    AlertTriangle, Clock, Shield, BarChart3, ArrowUpRight
} from 'lucide-react';
import { useRoleDashboard } from './RoleDashboardProvider';
import {
    StatCard, ChartCard, SectionHeader, ActivityItem, ProgressRow,
    DashTable, Grid4, Grid2, Grid3,
    DashboardLoading, DashTooltip,
    fmtCurrency, fmtPct, CHART_COLORS, chartAxisStyle, ROLE_COLORS
} from './DashboardShell';

const C = ROLE_COLORS.finance;

const FinanceDashboard = () => {
    const { data, loading } = useRoleDashboard();
    if (loading) return <DashboardLoading />;

    const { invoices = {}, cashFlow = {}, payables = {}, receivables = {}, compliance = {} } = data || {};

    const cashFlowData = (cashFlow?.monthly || []).map(m => ({ ...m }));

    const invoiceStatusPie = [
        { name: 'Paid', value: invoices.paid || 0, color: '#10b981' },
        { name: 'Pending', value: invoices.pending || 0, color: '#f59e0b' },
        { name: 'Overdue', value: invoices.overdue || 0, color: '#ef4444' },
    ];

    const arData = [
        { name: 'Current', value: receivables.current || 0, fill: '#10b981' },
        { name: 'Overdue', value: receivables.overdue || 0, fill: '#ef4444' },
    ];

    const apData = [
        { name: 'Current', value: payables.current || 0, fill: '#10b981' },
        { name: 'Overdue', value: payables.overdue || 0, fill: '#ef4444' },
        { name: 'Upcoming', value: payables.upcoming || 0, fill: '#f59e0b' },
    ];

    return (
        <div className="space-y-6 p-6">
            <SectionHeader
                title="Finance Dashboard"
                subtitle="Cash flow · Invoicing · Payables · Compliance"
                icon={DollarSign}
                accent={C.primary}
                badge="Financial Hub"
            />

            {/* KPIs */}
            <Grid4>
                <StatCard label="Invoice Value" value={fmtCurrency(invoices.totalValue || 0)} icon={FileText} accent={C.primary} />
                <StatCard label="Cash Inflow (Proj)" value={fmtCurrency(cashFlow.projected || 0)} icon={TrendingUp} accent="#10b981" trend="+9.2% MoM" trendUp />
                <StatCard label="Overdue Invoices" value={invoices.overdue || 0} icon={AlertTriangle} accent="#ef4444" sub="Needs follow-up" />
                <StatCard label="Collection Rate" value={fmtPct(receivables.collections)} icon={CheckCircle} accent={C.secondary} trend="+1.5% this month" trendUp />
            </Grid4>

            {/* Cash flow chart + Invoice pie */}
            <Grid2>
                <ChartCard title="Cash Flow Analysis" subtitle="Monthly inflow vs outflow vs net (INR)">
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={cashFlowData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="finIn" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={C.primary} stopOpacity={0.4} />
                                    <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="finOut" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="finNet" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                            <XAxis dataKey="month" {...chartAxisStyle} />
                            <YAxis tickFormatter={fmtCurrency} {...chartAxisStyle} width={52} />
                            <Tooltip content={<DashTooltip formatter={(v) => fmtCurrency(v)} />} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Area type="monotone" dataKey="inflow" name="Inflow" stroke={C.primary} strokeWidth={2.5} fill="url(#finIn)" />
                            <Area type="monotone" dataKey="outflow" name="Outflow" stroke="#ef4444" strokeWidth={2} fill="url(#finOut)" />
                            <Area type="monotone" dataKey="net" name="Net" stroke="#f59e0b" strokeWidth={2} fill="url(#finNet)" strokeDasharray="4 3" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Invoice Status" subtitle="Billing portfolio breakdown">
                    <ResponsiveContainer width="100%" height={210}>
                        <PieChart>
                            <Pie data={invoiceStatusPie} cx="50%" cy="50%" outerRadius={85} innerRadius={48}
                                dataKey="value" paddingAngle={3}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {invoiceStatusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip content={<DashTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                        {invoiceStatusPie.map(({ name, value, color }) => (
                            <div key={name} className="text-center p-2 rounded-lg border border-[var(--border-base)]">
                                <p className="text-[16px] font-extrabold tabular-nums" style={{ color }}>{value}</p>
                                <p className="text-[9px] text-[var(--text-muted)] mt-0.5 font-bold uppercase tracking-wide leading-tight">{name}</p>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </Grid2>

            {/* AR + AP + Compliance */}
            <Grid3>
                <ChartCard title="Accounts Receivable" subtitle="Outstanding collections">
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={arData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                            <XAxis dataKey="name" {...chartAxisStyle} />
                            <YAxis tickFormatter={fmtCurrency} {...chartAxisStyle} width={52} />
                            <Tooltip content={<DashTooltip formatter={(v) => fmtCurrency(v)} />} />
                            <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]}>
                                {arData.map((e, i) => <Cell key={i} fill={e.fill} fillOpacity={0.85} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 pt-3 border-t border-[var(--border-base)] flex justify-between text-[12px]">
                        <span className="text-[var(--text-muted)]">Collection Rate</span>
                        <span className="font-bold" style={{ color: '#10b981' }}>{fmtPct(receivables.collections)}</span>
                    </div>
                </ChartCard>

                <ChartCard title="Accounts Payable" subtitle="Vendor payment obligations">
                    <div className="space-y-3 mt-1">
                        {apData.map((a) => (
                            <div key={a.name} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-base)]">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.fill }} />
                                    <span className="text-[12px] text-[var(--text-secondary)]">{a.name}</span>
                                </div>
                                <span className="text-[15px] font-extrabold tabular-nums" style={{ color: a.fill }}>{fmtCurrency(a.value)}</span>
                            </div>
                        ))}
                    </div>
                    <ProgressRow
                        className="mt-3"
                        label="Budget variance"
                        value={Math.abs(cashFlow.projected - cashFlow.actual || 0) / (cashFlow.projected || 1) * 100}
                        accent={C.primary}
                    />
                </ChartCard>

                <ChartCard title="Compliance Status" subtitle="GST · TDS · Audit filings">
                    <div className="space-y-3 mt-1">
                        {[
                            { label: 'GST Returns Filed', v: compliance?.gstReturns?.filed || 0, total: (compliance?.gstReturns?.filed || 0) + (compliance?.gstReturns?.pending || 0), pending: compliance?.gstReturns?.pending || 0, color: '#10b981' },
                            { label: 'TDS Returns Filed', v: compliance?.tdsReturns?.filed || 0, total: (compliance?.tdsReturns?.filed || 0) + (compliance?.tdsReturns?.pending || 0), pending: compliance?.tdsReturns?.pending || 0, color: '#10b981' },
                        ].map(({ label, v, total, pending, color }) => (
                            <div key={label} className="p-3 rounded-xl border border-[var(--border-base)]">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[12px] font-medium text-[var(--text-secondary)]">{label}</span>
                                    <span className="text-[12px] font-bold text-[var(--text-primary)] tabular-nums">{v}/{total}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: total ? `${(v / total) * 100}%` : '100%', backgroundColor: pending > 0 ? '#f59e0b' : color }} />
                                </div>
                                {pending > 0 && <p className="text-[10px] text-amber-400 mt-1">{pending} pending</p>}
                            </div>
                        ))}
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-base)]">
                            <Shield size={16} style={{ color: compliance?.auditStatus === 'Completed' ? '#10b981' : '#f59e0b' }} />
                            <div className="flex-1">
                                <p className="text-[12px] font-medium text-[var(--text-secondary)]">Audit Status</p>
                                <p className="text-[11px] font-bold" style={{ color: compliance?.auditStatus === 'Completed' ? '#10b981' : '#f59e0b' }}>
                                    {compliance?.auditStatus || 'Unknown'}
                                </p>
                            </div>
                        </div>
                    </div>
                </ChartCard>
            </Grid3>

            {/* Cash flow summary table */}
            <ChartCard title="Cash Flow Summary" subtitle="Month-by-month breakdown">
                <DashTable
                    columns={['Month', 'Inflow', 'Outflow', 'Net', 'Status']}
                    rows={cashFlowData.map(m => [
                        <span className="font-medium text-[var(--text-primary)]">{m.month}</span>,
                        <span className="font-bold tabular-nums" style={{ color: C.primary }}>{fmtCurrency(m.inflow)}</span>,
                        <span className="font-bold tabular-nums" style={{ color: '#ef4444' }}>{fmtCurrency(m.outflow)}</span>,
                        <span className="font-bold tabular-nums" style={{ color: m.net >= 0 ? '#10b981' : '#ef4444' }}>{fmtCurrency(m.net)}</span>,
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md border"
                            style={{ color: m.net >= 0 ? '#10b981' : '#ef4444', borderColor: (m.net >= 0 ? '#10b981' : '#ef4444') + '40', backgroundColor: (m.net >= 0 ? '#10b981' : '#ef4444') + '12' }}>
                            {m.net >= 0 ? 'Positive' : 'Deficit'}
                        </span>,
                    ])}
                />
            </ChartCard>
        </div>
    );
};

export default FinanceDashboard;
