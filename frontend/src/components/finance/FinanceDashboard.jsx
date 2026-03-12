import React, { useMemo, useEffect, useState, useRef } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, IndianRupee, Clock,
  FileText, CheckCircle, AlertCircle, BarChart3, PieChart,
  Users, Building2, ArrowUpRight, ArrowDownRight, Activity,
  Wallet, CreditCard, TrendingUp as TrendIcon,
  Layers
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, LineChart, Line, PieChart as RePieChart, Pie, Cell
} from 'recharts';

const fmt = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatL = (value) => {
  if (!value || isNaN(value) || value === 0) return '₹0';
  // Always show in Lakhs with ₹ symbol
  const lakhs = Math.round(value / 100000);
  return lakhs === 0 ? '₹0' : `₹${lakhs}L`;
};

const formatAxisCurrency = (value) => {
  if (!value || isNaN(value)) return '₹0';
  // Always show in thousands (K) for Y-axis
  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(0)}K`;
  } else {
    return `₹${value}`;
  }
};

// Animated Number Counter
const AnimatedNumber = ({ value, duration = 1500, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef(null);

  useEffect(() => {
    startTime.current = null;
    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = value * easeOutQuart;
      setDisplayValue(current);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span className={className}>{fmt(displayValue)}</span>;
};

const AnimatedPercentage = ({ value, duration = 1500, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = performance.now();
    const animate = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.round(value * easeOutQuart));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span className={className}>{displayValue}%</span>;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-muted)] rounded-lg p-3 shadow-xl">
      <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-[11px]" style={{ color: entry.color }}>
          {entry.name}: {entry.name?.includes('Rate') ? `${entry.value}%` : fmt(entry.value)}
        </p>
      ))}
    </div>
  );
};

// Section 1: Financial Overview Cards with Animations
const FinancialOverview = ({ dashboardStats, payablesTotal, manualBalance, cashPosition, onInvoicesClick, onPayablesClick, onReceivablesClick, invoices }) => {
  // Compute totalRevenue from filtered invoices passed in
  const revenueCurrent = (invoices || []).reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  
  // Helper to get paid amount from invoice
  const getPaidAmount = (inv) => {
    if (inv.status === 'Paid') return Number(inv.amount || 0);
    if (inv.status === 'Partial') return Number(inv.paid || inv.amountPaid || 0);
    return Number(inv.paid || 0);
  };
  
  // Helper to get balance from invoice
  const getBalance = (inv) => {
    if (inv.status === 'Paid') return 0;
    const amount = Number(inv.amount || 0);
    const paid = getPaidAmount(inv);
    return amount - paid;
  };
  
  // Calculate receivables from invoices - sum of outstanding balance only
  const receivables = useMemo(() => {
    return (invoices || []).reduce((sum, inv) => sum + getBalance(inv), 0);
  }, [invoices]);
  
  // Calculate collected from invoices - sum of paid amounts
  const totalCollected = useMemo(() => {
    return (invoices || []).reduce((sum, inv) => sum + getPaidAmount(inv), 0);
  }, [invoices]);
  
  // Use passed cashPosition (already calendar-filtered in FinancePage)
  const cashPositionVal = cashPosition !== undefined ? cashPosition : manualBalance;

  const cards = [
    {
      label: 'Total Revenue',
      value: revenueCurrent,
      sub: 'From invoices',
      icon: TrendingUp,
      accentColor: '#22c55e',
      gradient: 'from-emerald-500/20 to-emerald-500/5',
      trend: '+12%',
      onClick: onInvoicesClick,
    },
    {
      label: 'Cash Position',
      value: cashPositionVal,
      sub: 'Collected - Payables',
      icon: IndianRupee,
      accentColor: '#3b82f6',
      gradient: 'from-blue-500/20 to-blue-500/5',
      trend: cashPositionVal >= 0 ? '+8%' : '-5%',
      onClick: null,
    },
    {
      label: 'Receivables',
      value: receivables,
      sub: 'Outstanding',
      icon: Clock,
      accentColor: '#f59e0b',
      gradient: 'from-amber-500/20 to-amber-500/5',
      trend: '-3%',
      onClick: onReceivablesClick,
    },
    {
      label: 'Payables',
      value: payablesTotal,
      sub: 'Due to vendors',
      icon: TrendingDown,
      accentColor: '#ef4444',
      gradient: 'from-red-500/20 to-red-500/5',
      trend: '+15%',
      onClick: onPayablesClick,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${card.gradient} border border-[var(--border-muted)] shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-500 group animate-fade-in ${card.onClick ? 'cursor-pointer' : ''}`}
          style={{ animationDelay: `${index * 100}ms` }}
          onClick={card.onClick}
        >
          <div className="absolute top-0 right-0 w-24 h-24 opacity-10 group-hover:opacity-20 transition-opacity">
            <div
              className="w-full h-full rounded-full blur-2xl"
              style={{ backgroundColor: card.accentColor }}
            />
          </div>
          <div className="flex items-start justify-between mb-4 relative z-10">
            <div
              className="p-3 rounded-xl shadow-md"
              style={{ backgroundColor: `${card.accentColor}30` }}
            >
              <card.icon size={22} style={{ color: card.accentColor }} />
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-bold text-[var(--text-primary)] mb-1 tracking-tight">
              <AnimatedNumber value={card.value} />
            </div>
            <div className="text-sm font-medium text-[var(--text-primary)] mb-0.5">
              {card.label}
            </div>
            <div className="text-xs text-[var(--text-muted)]">{card.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Section 2: Cashflow Summary Cards
const CashflowSummary = ({ dashboardStats, collectionRate, invoices, totalRevenue, onCollectedClick, onInvoicedClick, onOutstandingClick }) => {
  // Helper to get paid amount from invoice
  const getPaidAmount = (inv) => {
    if (inv.status === 'Paid') return Number(inv.amount || 0);
    if (inv.status === 'Partial') return Number(inv.paid || inv.amountPaid || 0);
    return Number(inv.paid || 0);
  };
  
  // Helper to get balance from invoice
  const getBalance = (inv) => {
    if (inv.status === 'Paid') return 0;
    const amount = Number(inv.amount || 0);
    const paid = getPaidAmount(inv);
    return amount - paid;
  };
  
  // Calculate collected from invoices - sum of paid amounts
  const collected = useMemo(() => {
    return (invoices || []).reduce((sum, inv) => sum + getPaidAmount(inv), 0);
  }, [invoices]);
  // Calculate outstanding from invoices
  const outstanding = useMemo(() => {
    return (invoices || []).reduce((sum, inv) => sum + getBalance(inv), 0);
  }, [invoices]);
  const cards = [
    {
      label: 'Total Invoiced',
      value: totalRevenue,
      icon: FileText,
      color: '#64748b',
      clickable: true,
    },
    {
      label: 'Collected',
      value: collected,
      icon: CheckCircle,
      color: '#22c55e',
      clickable: true,
    },
    {
      label: 'Outstanding',
      value: outstanding,
      icon: Clock,
      color: '#f59e0b',
      clickable: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className={`glass-card p-4 text-center rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-300 animate-fade-in ${card.clickable ? 'cursor-pointer' : ''}`}
          style={{ animationDelay: `${index * 75}ms` }}
          onClick={card.clickable ? (card.label === 'Collected' ? onCollectedClick : card.label === 'Outstanding' ? onOutstandingClick : onInvoicedClick) : undefined}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <card.icon size={18} style={{ color: card.color }} />
            <span className="text-[11px] text-[var(--text-muted)] font-medium">{card.label}</span>
          </div>
          <div className="text-xl font-bold" style={{ color: card.color }}>
            <AnimatedNumber value={card.value} />
          </div>
        </div>
      ))}
      <div
        className="glass-card p-4 text-center rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-300 animate-fade-in"
        style={{ animationDelay: '225ms' }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <BarChart3 size={18} className="text-cyan-400" />
          <span className="text-[11px] text-[var(--text-muted)] font-medium">Collection Rate</span>
        </div>
        <div className="text-xl font-bold text-cyan-400">
          <AnimatedPercentage value={collectionRate} />
        </div>
      </div>
    </div>
  );
};

// Helper: build last 6 month buckets from current or selected date
const buildMonthBuckets = (calendarFilterYear, calendarFilterMonth) => {
  const months = [];
  // If a specific year/month selected, show 6 months ending at selected month; else last 6 months
  let endYear, endMonth;
  if (calendarFilterYear && calendarFilterYear !== 'all') {
    endYear = parseInt(calendarFilterYear);
    endMonth = calendarFilterMonth !== undefined && calendarFilterMonth !== null ? calendarFilterMonth : new Date().getMonth();
  } else {
    const now = new Date();
    endYear = now.getFullYear();
    endMonth = now.getMonth();
  }
  for (let i = 5; i >= 0; i--) {
    let y = endYear;
    let m = endMonth - i;
    while (m < 0) { m += 12; y--; }
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 1);
    months.push({
      label: start.toLocaleString('en-IN', { month: 'short' }),
      key: `${y}-${String(m + 1).padStart(2, '0')}`,
      start,
      end,
    });
  }
  return months;
};

// Helper: compute revenue+cost series from filtered invoices and adjustments
const computeRevenueCostSeries = (invoices, manualAdjustments, calendarFilterYear, calendarFilterMonth, calendarFilterDay) => {
  // If Today mode (day selected), return single day data
  if (calendarFilterDay !== undefined && calendarFilterYear !== 'all') {
    const year = parseInt(calendarFilterYear);
    const month = calendarFilterMonth;
    const day = calendarFilterDay;
    const start = new Date(year, month, day, 0, 0, 0, 0);
    const end = new Date(year, month, day, 23, 59, 59, 999);
    const revenue = (invoices || []).reduce((sum, inv) => {
      const dt = new Date(inv.invoiceDate || inv.createdAt);
      if (dt < start || dt > end) return sum;
      return sum + Number(inv.amount || 0);
    }, 0);
    const cost = (manualAdjustments || []).filter(a => a.type === 'debit').reduce((sum, adj) => {
      const dt = new Date(adj.date || adj.createdAt);
      if (dt < start || dt > end) return sum;
      return sum + Number(adj.amount || 0);
    }, 0);
    return [{ month: 'Today', revenue, cost }];
  }
  // Monthly mode
  const months = buildMonthBuckets(calendarFilterYear, calendarFilterMonth);
  return months.map(m => {
    const revenue = (invoices || []).reduce((sum, inv) => {
      const dt = new Date(inv.invoiceDate || inv.createdAt);
      if (dt < m.start || dt >= m.end) return sum;
      return sum + Number(inv.amount || 0);
    }, 0);
    const cost = (manualAdjustments || []).filter(a => a.type === 'debit').reduce((sum, adj) => {
      const dt = new Date(adj.date || adj.createdAt);
      if (dt < m.start || dt >= m.end) return sum;
      return sum + Number(adj.amount || 0);
    }, 0);
    return { month: m.label, revenue, cost };
  });
};

// Helper: compute cashflow series
const computeCashFlowSeries = (invoices, manualAdjustments, calendarFilterYear, calendarFilterMonth, calendarFilterDay) => {
  // If Today mode (day selected), return single day data
  if (calendarFilterDay !== undefined && calendarFilterYear !== 'all') {
    const year = parseInt(calendarFilterYear);
    const month = calendarFilterMonth;
    const day = calendarFilterDay;
    const start = new Date(year, month, day, 0, 0, 0, 0);
    const end = new Date(year, month, day, 23, 59, 59, 999);
    const inflow = (invoices || []).reduce((sum, inv) => {
      let dt = inv.paidDate ? new Date(inv.paidDate) : null;
      if (!dt && inv.status === 'Paid') dt = new Date(inv.invoiceDate || inv.createdAt);
      if (!dt || dt < start || dt > end) return sum;
      const paid = Number(inv.paid || 0);
      const amount = Number(inv.amount || 0);
      return sum + ((paid === 0 && inv.status === 'Paid') ? amount : paid);
    }, 0) + (manualAdjustments || []).filter(a => a.type === 'credit').reduce((sum, adj) => {
      const dt = new Date(adj.date || adj.createdAt);
      if (dt < start || dt > end) return sum;
      return sum + Number(adj.amount || 0);
    }, 0);
    const outflow = (manualAdjustments || []).filter(a => a.type === 'debit').reduce((sum, adj) => {
      const dt = new Date(adj.date || adj.createdAt);
      if (dt < start || dt > end) return sum;
      return sum + Number(adj.amount || 0);
    }, 0);
    return [{ month: 'Today', inflow, outflow }];
  }
  // Monthly mode
  const months = buildMonthBuckets(calendarFilterYear, calendarFilterMonth);
  return months.map(m => {
    const inflow = (invoices || []).reduce((sum, inv) => {
      let dt = inv.paidDate ? new Date(inv.paidDate) : null;
      if (!dt && inv.status === 'Paid') dt = new Date(inv.invoiceDate || inv.createdAt);
      if (!dt || dt < m.start || dt >= m.end) return sum;
      const paid = Number(inv.paid || 0);
      const amount = Number(inv.amount || 0);
      return sum + ((paid === 0 && inv.status === 'Paid') ? amount : paid);
    }, 0) + (manualAdjustments || []).filter(a => a.type === 'credit').reduce((sum, adj) => {
      const dt = new Date(adj.date || adj.createdAt);
      if (dt < m.start || dt >= m.end) return sum;
      return sum + Number(adj.amount || 0);
    }, 0);
    const outflow = (manualAdjustments || []).filter(a => a.type === 'debit').reduce((sum, adj) => {
      const dt = new Date(adj.date || adj.createdAt);
      if (dt < m.start || dt >= m.end) return sum;
      return sum + Number(adj.amount || 0);
    }, 0);
    return { month: m.label, inflow, outflow };
  });
};

// Helper: compute adjustment trend
const computeAdjustmentTrend = (manualAdjustments, calendarFilterYear, calendarFilterMonth) => {
  const months = buildMonthBuckets(calendarFilterYear, calendarFilterMonth);
  return months.map(m => {
    const income = (manualAdjustments || []).filter(a => a.type === 'credit').reduce((sum, adj) => {
      const dt = new Date(adj.date || adj.createdAt);
      if (dt < m.start || dt >= m.end) return sum;
      return sum + Number(adj.amount || 0);
    }, 0);
    const expense = (manualAdjustments || []).filter(a => a.type === 'debit').reduce((sum, adj) => {
      const dt = new Date(adj.date || adj.createdAt);
      if (dt < m.start || dt >= m.end) return sum;
      return sum + Number(adj.amount || 0);
    }, 0);
    return { month: m.label, income, expense };
  });
};

// Helper: compute transaction analytics (income/expense by category)
const computeTransactionAnalytics = (manualAdjustments) => {
  const incomeMap = {};
  const expenseMap = {};
  (manualAdjustments || []).forEach(adj => {
    const cat = adj.category || adj.categoryName || (adj.type === 'credit' ? 'Other Income' : 'Other Expense');
    const amt = Number(adj.amount || 0);
    if (adj.type === 'credit') {
      incomeMap[cat] = (incomeMap[cat] || 0) + amt;
    } else {
      expenseMap[cat] = (expenseMap[cat] || 0) + amt;
    }
  });
  return {
    incomeByCategory: Object.entries(incomeMap).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    expenseByCategory: Object.entries(expenseMap).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
  };
};

// Chart 1: Revenue vs Cost
const RevenueVsCostChart = ({ monthlyRevenue }) => {
  return (
    <div className="glass-card p-5 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <BarChart3 size={16} className="text-emerald-400" />
        Revenue vs Cost
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={monthlyRevenue} barSize={28} barGap={6} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatL}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
          <Bar
            dataKey="revenue"
            fill="#22c55e"
            radius={[6, 6, 0, 0]}
            name="Revenue"
            animationDuration={1500}
            animationBegin={0}
          />
          <Bar
            dataKey="cost"
            fill="#3b82f6"
            radius={[6, 6, 0, 0]}
            name="Cost"
            animationDuration={1500}
            animationBegin={300}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Chart 2: Cash Flow Trend
const CashFlowTrendChart = ({ cashFlow }) => {
  return (
    <div className="glass-card p-5 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in" style={{ animationDelay: '100ms' }}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Activity size={16} className="text-cyan-400" />
        Cash Flow Trend
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={cashFlow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatL}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 10000000]}
            ticks={[0, 2500000, 5000000, 7500000, 10000000]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
          <Area
            type="monotone"
            dataKey="inflow"
            stroke="#06b6d4"
            fill="url(#inflowGrad)"
            strokeWidth={3}
            name="Inflow"
            animationDuration={2000}
            animationBegin={0}
          />
          <Area
            type="monotone"
            dataKey="outflow"
            stroke="#f59e0b"
            fill="url(#outflowGrad)"
            strokeWidth={3}
            name="Outflow"
            animationDuration={2000}
            animationBegin={400}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Chart 3: Invoice Status Distribution (Doughnut)
const InvoiceStatusChart = ({ invoices }) => {
  const data = useMemo(() => {
    const statusCounts = { Draft: 0, Sent: 0, Partial: 0, Paid: 0, Overdue: 0 };
    invoices.forEach((inv) => {
      // Map "Pending" to "Sent" as per UI convention
      const status = inv.status === 'Pending' ? 'Sent' : inv.status;
      if (statusCounts[status] !== undefined) {
        statusCounts[status] += 1;
      } else {
        // Handle any other unknown statuses by counting them as Draft
        statusCounts.Draft += 1;
      }
    });
    return [
      { name: 'Draft', value: statusCounts.Draft, color: '#64748b' },
      { name: 'Sent', value: statusCounts.Sent, color: '#3b82f6' },
      { name: 'Partial', value: statusCounts.Partial, color: '#f59e0b' },
      { name: 'Paid', value: statusCounts.Paid, color: '#22c55e' },
      { name: 'Overdue', value: statusCounts.Overdue, color: '#ef4444' },
    ].filter(item => item.value > 0);
  }, [invoices]);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="glass-card p-5 rounded-2xl shadow-lg h-[320px] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">No invoice data</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in" style={{ animationDelay: '200ms' }}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <PieChart size={16} className="text-purple-400" />
        Invoice Status Distribution
        <span className="text-[10px] text-[var(--text-muted)] font-normal ml-2">({invoices.length} total)</span>
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <RePieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            animationDuration={1500}
            animationBegin={0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--bg-surface)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </RePieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5 text-[10px]">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[var(--text-muted)]">{item.name}</span>
            <span className="font-semibold text-[var(--text-primary)]">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Chart 4: Receivable Aging (Horizontal Bar)
const ReceivableAgingChart = ({ invoices }) => {
  const data = useMemo(() => {
    const now = new Date();
    const buckets = {
      '0-30 Days': 0,
      '31-60 Days': 0,
      '61-90 Days': 0,
      '90+ Days': 0,
    };

    invoices
      .filter(inv => inv.status !== 'Paid' && inv.balance > 0)
      .forEach((inv) => {
        const dueDate = new Date(inv.dueDate || inv.invoiceDate);
        const daysDiff = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 30) buckets['0-30 Days'] += inv.balance;
        else if (daysDiff <= 60) buckets['31-60 Days'] += inv.balance;
        else if (daysDiff <= 90) buckets['61-90 Days'] += inv.balance;
        else buckets['90+ Days'] += inv.balance;
      });

    return [
      { bucket: '0-30 Days', amount: buckets['0-30 Days'], color: '#22c55e' },
      { bucket: '31-60 Days', amount: buckets['31-60 Days'], color: '#3b82f6' },
      { bucket: '61-90 Days', amount: buckets['61-90 Days'], color: '#f59e0b' },
      { bucket: '90+ Days', amount: buckets['90+ Days'], color: '#ef4444' },
    ];
  }, [invoices]);

  const maxAmount = Math.max(...data.map(d => d.amount), 1);

  return (
    <div className="glass-card p-5 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in" style={{ animationDelay: '300ms' }}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Clock size={16} className="text-amber-400" />
        Receivable Aging
      </h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={item.bucket} className="group">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[var(--text-muted)]">{item.bucket}</span>
              <span className="font-semibold text-[var(--text-primary)]">{fmt(item.amount)}</span>
            </div>
            <div className="h-3 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${(item.amount / maxAmount) * 100}%`,
                  backgroundColor: item.color,
                  animationDelay: `${index * 200}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Chart 5: Vendor Payables Breakdown (Pie)
const VendorPayablesChart = ({ payables }) => {
  const data = useMemo(() => {
    return payables
      .slice(0, 6)
      .map((vendor, index) => ({
        name: vendor.vendorName?.substring(0, 15) || 'Unknown',
        value: vendor.outstandingAmount,
        color: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][index % 6],
      }))
      .filter(item => item.value > 0);
  }, [payables]);

  if (data.length === 0) {
    return (
      <div className="glass-card p-5 rounded-2xl shadow-lg h-[320px] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">No payables data</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in" style={{ animationDelay: '400ms' }}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Users size={16} className="text-rose-400" />
        Vendor Payables Breakdown
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <RePieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            animationDuration={1500}
            animationBegin={200}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--bg-surface)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </RePieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-1 mt-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5 text-[10px]">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[var(--text-muted)] truncate">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Chart 6: Collection Performance
const MonthlyCollectionChart = ({ invoices, payments, calendarFilterYear, calendarFilterMonth, calendarFilterDay, totalRevenue }) => {
  const data = useMemo(() => {
    // If calendarFilterDay is set, we're in "Today" mode - show single day data
    if (calendarFilterDay !== undefined) {
      // For Today view, show total revenue as Invoices Created
      const invoiceTotal = totalRevenue || 0;
      
      // Calculate today's payments only
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      const paymentTotal = (payments || []).reduce((sum, p) => {
        try {
          const dt = new Date(p.paymentDate || p.createdAt);
          if (!isNaN(dt.getTime()) && dt >= todayStart && dt <= todayEnd) {
            return sum + Number(p.amount || 0);
          }
        } catch (e) {
          console.error('Error processing payment date:', e);
        }
        return sum;
      }, 0);
      
      return [{ month: 'Today', invoices: invoiceTotal, payments: paymentTotal }];
    }
    
    // Normal month-based calculation
    const months = buildMonthBuckets(calendarFilterYear, calendarFilterMonth);
    return months.map(m => {
      const invoiceTotal = (invoices || []).reduce((sum, inv) => {
        const dt = new Date(inv.invoiceDate || inv.createdAt);
        if (dt < m.start || dt >= m.end) return sum;
        return sum + Number(inv.amount || 0);
      }, 0);
      const paymentTotal = (payments || []).reduce((sum, p) => {
        const dt = new Date(p.paymentDate || p.createdAt);
        if (dt < m.start || dt >= m.end) return sum;
        return sum + Number(p.amount || 0);
      }, 0);
      return { month: m.label, invoices: invoiceTotal, payments: paymentTotal };
    });
  }, [invoices, payments, calendarFilterYear, calendarFilterMonth, calendarFilterDay, totalRevenue]);

  // Dynamic title based on calendar filter
  const getDynamicTitle = () => {
    if (calendarFilterDay !== undefined) return 'Today Collection';
    if (calendarFilterMonth !== undefined && calendarFilterYear !== 'all') {
      const monthName = new Date(parseInt(calendarFilterYear), calendarFilterMonth).toLocaleString('en-IN', { month: 'long' });
      return `${monthName} ${calendarFilterYear} Collection`;
    }
    if (calendarFilterYear !== 'all') return `${calendarFilterYear} Collection`;
    return 'Collection Performance';
  };

  return (
    <div className="glass-card p-5 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in" style={{ animationDelay: '500ms' }}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <TrendIcon size={16} className="text-indigo-400" />
        {getDynamicTitle()}
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatL}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 'dataMax + 50000']}
            allowDecimals={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
          <Line
            type="monotone"
            dataKey="invoices"
            stroke="#8b5cf6"
            strokeWidth={3}
            dot={{ fill: '#8b5cf6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Invoices Created"
            animationDuration={2000}
            animationBegin={0}
          />
          <Line
            type="monotone"
            dataKey="payments"
            stroke="#22c55e"
            strokeWidth={3}
            dot={{ fill: '#22c55e', r: 4 }}
            activeDot={{ r: 6 }}
            name="Payments Received"
            animationDuration={2000}
            animationBegin={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Chart 7: Income by Category (Donut Chart)
const IncomeByCategoryChart = ({ transactionAnalytics }) => {
  const data = useMemo(() => {
    if (!transactionAnalytics?.incomeByCategory?.length) return [];
    return transactionAnalytics.incomeByCategory.map((item, index) => ({
      name: item.category,
      value: item.amount,
      color: ['#22c55e', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669'][index % 6],
    }));
  }, [transactionAnalytics]);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (data.length === 0) {
    return (
      <div className="glass-card p-5 rounded-2xl shadow-lg h-[320px] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">No income data available</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in" style={{ animationDelay: '500ms' }}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
        <TrendingUp size={16} className="text-emerald-400" />
        Income by Category
        <span className="text-[10px] text-[var(--text-muted)] font-normal ml-auto">{fmt(total)}</span>
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <RePieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            animationDuration={1500}
            animationBegin={0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--bg-surface)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </RePieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-1 mt-2 max-h-[80px] overflow-y-auto">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5 text-[10px]">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[var(--text-muted)] truncate">{item.name}</span>
            <span className="font-semibold text-[var(--text-primary)]">{fmt(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Chart 8: Expense by Category (Bar Chart)
const ExpenseByCategoryChart = ({ transactionAnalytics }) => {
  const data = useMemo(() => {
    if (!transactionAnalytics?.expenseByCategory?.length) return [];
    return transactionAnalytics.expenseByCategory.map((item) => ({
        category: item.category.length > 15 ? item.category.substring(0, 15) + '...' : item.category,
        amount: item.amount,
      }));
  }, [transactionAnalytics]);

  const total = useMemo(() => {
    return transactionAnalytics?.expenseByCategory?.reduce((sum, item) => sum + item.amount, 0) || 0;
  }, [transactionAnalytics]);

  if (data.length === 0) {
    return (
      <div className="glass-card p-5 rounded-2xl shadow-lg h-[320px] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">No expense data available</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in" style={{ animationDelay: '600ms' }}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <TrendingDown size={16} className="text-red-400" />
        Expense by Category
        <span className="text-[10px] text-[var(--text-muted)] font-normal ml-auto">{fmt(total)}</span>
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={formatL}
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 4000000]}
            ticks={[0, 1000000, 2000000, 3000000, 4000000]}
          />
          <YAxis
            type="category"
            dataKey="category"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={75}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="amount"
            fill="#ef4444"
            radius={[0, 4, 4, 0]}
            animationDuration={1500}
            animationBegin={200}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Chart 9: Income vs Expense Trend
const IncomeExpenseTrendChart = ({ adjustmentTrend }) => {
  const data = useMemo(() => {
    if (!adjustmentTrend || adjustmentTrend.length === 0) return [];
    return adjustmentTrend.map(item => ({
      label: item.month,
      income: item.income || 0,
      expense: item.expense || 0,
    }));
  }, [adjustmentTrend]);

  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-5 rounded-2xl shadow-lg h-[320px] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">No trend data available</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in" style={{ animationDelay: '700ms' }}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Activity size={16} className="text-blue-400" />
        Income vs Expense
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatL}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
          <Line
            type="monotone"
            dataKey="income"
            stroke="#22c55e"
            strokeWidth={3}
            dot={{ fill: '#22c55e', r: 4 }}
            name="Income"
            animationDuration={2000}
            animationBegin={0}
          />
          <Line
            type="monotone"
            dataKey="expense"
            stroke="#ef4444"
            strokeWidth={3}
            dot={{ fill: '#ef4444', r: 4 }}
            name="Expense"
            animationDuration={2000}
            animationBegin={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Section 8: Recent Finance Activity
const RecentActivity = ({ invoices, payments, manualAdjustments }) => {
  const activities = useMemo(() => {
    const items = [];

    // Add recent invoices
    invoices.slice(0, 5).forEach((inv) => {
      items.push({
        date: inv.invoiceDate || inv.createdAt,
        type: 'New Invoice',
        entity: inv.invoiceNumber || inv.id,
        amount: inv.amount,
        status: inv.status,
        icon: FileText,
        color: 'text-blue-400',
      });
    });

    // Add recent payments
    payments.slice(0, 5).forEach((payment) => {
      items.push({
        date: payment.paymentDate || payment.createdAt,
        type: payment.paymentType === 'Customer Payment' ? 'Payment Received' : 'Vendor Payment',
        entity: payment.referenceId,
        amount: payment.amount,
        status: 'Completed',
        icon: payment.paymentType === 'Customer Payment' ? Wallet : CreditCard,
        color: payment.paymentType === 'Customer Payment' ? 'text-emerald-400' : 'text-amber-400',
      });
    });

    // Add manual adjustments
    manualAdjustments.slice(0, 5).forEach((adj) => {
      items.push({
        date: adj.date || adj.createdAt,
        type: 'Amount Adjusted',
        entity: adj.reason || adj.type,
        amount: adj.amount,
        status: adj.type,
        icon: Activity,
        color: adj.type === 'credit' ? 'text-emerald-400' : 'text-red-400',
      });
    });

    // Sort by date descending
    return items
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 8);
  }, [invoices, payments, manualAdjustments]);

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Activity size={16} className="text-cyan-400" />
        Recent Finance Activity
      </h3>
      <div className="space-y-2">
        {activities.map((activity, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-muted)]"
          >
            <div className={`p-1.5 rounded-md bg-[var(--bg-primary)] ${activity.color}`}>
              <activity.icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  {activity.type}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {activity.date ? new Date(activity.date).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">
                {activity.entity}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xs font-semibold ${activity.color}`}>
                {fmt(activity.amount)}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                {activity.status}
              </div>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            No recent activity
          </p>
        )}
      </div>
    </div>
  );
};

// Main Dashboard Component
const FinanceDashboard = ({
  isOpen,
  onClose,
  dashboardStats,
  payables,
  invoices,
  payments,
  manualAdjustments,
  monthlyRevenue,
  cashFlow,
  manualBalance,
  cashPosition,
  transactionAnalytics,
  adjustmentTrend,
  calendarFilterYear,
  calendarFilterMonth,
  calendarFilterDay,
  onInvoicesClick,
  onPayablesClick,
  onCollectedClick,
  onReceivablesClick,
  onOutstandingClick,
  onStatusClick,
}) => {
  // Helper functions for calculations
  const getPaidAmount = (inv) => {
    if (inv.status === 'Paid') return Number(inv.amount || 0);
    if (inv.status === 'Partial') return Number(inv.paid || inv.amountPaid || 0);
    return Number(inv.paid || 0);
  };

  // Calculate total revenue and collected from FILTERED invoices
  const totalRevenue = (invoices || []).reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  
  // For Today mode, calculate collected from payments data (only today's payments)
  // For monthly/yearly mode, use invoice paid amounts
  const totalCollected = useMemo(() => {
    if (calendarFilterDay !== undefined && calendarFilterYear !== 'all') {
      // Today mode: sum payments received today
      const year = parseInt(calendarFilterYear);
      const month = calendarFilterMonth;
      const day = calendarFilterDay;
      const start = new Date(year, month, day, 0, 0, 0, 0);
      const end = new Date(year, month, day, 23, 59, 59, 999);
      return (payments || []).reduce((sum, p) => {
        const dt = new Date(p.paymentDate || p.date || p.createdAt);
        if (dt < start || dt > end) return sum;
        return sum + Number(p.amount || p.paidAmount || 0);
      }, 0);
    }
    // Monthly/Yearly mode: sum paid amounts from invoices
    return (invoices || []).reduce((sum, inv) => sum + getPaidAmount(inv), 0);
  }, [invoices, payments, calendarFilterYear, calendarFilterMonth, calendarFilterDay]);

  // Calculate collection rate from invoices
  const collectionRate = totalRevenue > 0
    ? Math.round((totalCollected / totalRevenue) * 100)
    : 0;

  const payablesTotal = (payables || []).reduce((sum, p) => sum + (p.outstandingAmount || 0), 0);

  // Compute all chart data from filtered data (hooks must be before any early return)
  const computedMonthlyRevenue = useMemo(
    () => computeRevenueCostSeries(invoices, manualAdjustments, calendarFilterYear, calendarFilterMonth, calendarFilterDay),
    [invoices, manualAdjustments, calendarFilterYear, calendarFilterMonth, calendarFilterDay]
  );
  const computedCashFlow = useMemo(
    () => computeCashFlowSeries(invoices, manualAdjustments, calendarFilterYear, calendarFilterMonth, calendarFilterDay),
    [invoices, manualAdjustments, calendarFilterYear, calendarFilterMonth, calendarFilterDay]
  );
  const computedAdjustmentTrend = useMemo(
    () => computeAdjustmentTrend(manualAdjustments, calendarFilterYear, calendarFilterMonth),
    [manualAdjustments, calendarFilterYear, calendarFilterMonth]
  );
  const computedTransactionAnalytics = useMemo(
    () => computeTransactionAnalytics(manualAdjustments),
    [manualAdjustments]
  );

  // Early return AFTER all hooks
  if (!isOpen) return null;

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <PieChart size={28} className="text-[var(--accent)]" />
            Finance Dashboard
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Complete overview of your financial operations
          </p>
        </div>
      </div>

      {/* Section 1: Financial Overview */}
      <section className="animate-fade-in">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Financial Overview
        </h2>
        <FinancialOverview
          dashboardStats={dashboardStats}
          payablesTotal={payablesTotal}
          manualBalance={manualBalance}
          cashPosition={cashPosition !== undefined ? cashPosition : manualBalance}
          onInvoicesClick={onInvoicesClick}
          onPayablesClick={onPayablesClick}
          onReceivablesClick={onReceivablesClick}
          invoices={invoices}
        />
      </section>

      {/* Section 2: Cashflow Summary */}
      <section className="animate-fade-in" style={{ animationDelay: '100ms' }}>
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Cashflow Summary
        </h2>
        <CashflowSummary
          dashboardStats={dashboardStats}
          collectionRate={collectionRate}
          totalRevenue={totalRevenue}
          invoices={invoices}
          onCollectedClick={onCollectedClick}
          onInvoicedClick={onInvoicesClick}
          onOutstandingClick={onOutstandingClick}
        />
      </section>

      {/* Section 3: Financial Analytics (Income vs Expense) */}
      <section className="animate-fade-in" style={{ animationDelay: '150ms' }}>
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Financial Analytics
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <IncomeByCategoryChart transactionAnalytics={computedTransactionAnalytics} />
          <ExpenseByCategoryChart transactionAnalytics={computedTransactionAnalytics} />
          <IncomeExpenseTrendChart adjustmentTrend={computedAdjustmentTrend} />
        </div>
      </section>

      {/* Charts Grid - Row 1 */}
      <section className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Financial Trends
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <RevenueVsCostChart monthlyRevenue={computedMonthlyRevenue} />
          <CashFlowTrendChart cashFlow={computedCashFlow} />
        </div>
      </section>

      {/* Charts Grid - Row 2 */}
      <section className="animate-fade-in" style={{ animationDelay: '300ms' }}>
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Invoice Analysis
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <InvoiceStatusChart invoices={invoices} />
          <ReceivableAgingChart invoices={invoices} />
        </div>
      </section>

      {/* Charts Grid - Row 3 */}
      <section className="animate-fade-in" style={{ animationDelay: '400ms' }}>
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Payables & Collections
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <VendorPayablesChart payables={payables} />
          <MonthlyCollectionChart invoices={invoices} payments={payments} calendarFilterYear={calendarFilterYear} calendarFilterMonth={calendarFilterMonth} calendarFilterDay={calendarFilterDay} totalRevenue={totalRevenue} />
        </div>
      </section>
    </div>
  );
};

export default FinanceDashboard;
