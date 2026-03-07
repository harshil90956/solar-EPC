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
  if (!value || isNaN(value)) return '₹0';
  // Show in Lakhs for large numbers
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  } else if (value >= 1000) {
    return `₹${(value / 1000).toFixed(0)}K`;
  } else {
    return `₹${value}`;
  }
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
const FinancialOverview = ({ dashboardStats, payablesTotal, manualBalance, onInvoicesClick, invoices }) => {
  const revenueCurrent = dashboardStats?.totalRevenue || 0;
  
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
  
  // Cash Position is the manualBalance which already includes:
  // Customer Payments + Credit Adjustments - Debit Adjustments - Vendor Payments
  const cashPosition = manualBalance;

  const cards = [
    {
      label: 'Total Revenue',
      value: revenueCurrent,
      sub: 'From invoices',
      icon: TrendingUp,
      accentColor: '#22c55e',
      gradient: 'from-emerald-500/20 to-emerald-500/5',
      trend: '+12%',
    },
    {
      label: 'Cash Position',
      value: cashPosition,
      sub: 'Collected - Payables',
      icon: IndianRupee,
      accentColor: '#3b82f6',
      gradient: 'from-blue-500/20 to-blue-500/5',
      trend: cashPosition >= 0 ? '+8%' : '-5%',
    },
    {
      label: 'Receivables',
      value: receivables,
      sub: 'Outstanding',
      icon: Clock,
      accentColor: '#f59e0b',
      gradient: 'from-amber-500/20 to-amber-500/5',
      trend: '-3%',
    },
    {
      label: 'Payables',
      value: payablesTotal,
      sub: 'Due to vendors',
      icon: TrendingDown,
      accentColor: '#ef4444',
      gradient: 'from-red-500/20 to-red-500/5',
      trend: '+15%',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${card.gradient} border border-[var(--border-muted)] shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-500 cursor-pointer group animate-fade-in`}
          style={{ animationDelay: `${index * 100}ms` }}
          onClick={onInvoicesClick}
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
const CashflowSummary = ({ dashboardStats, collectionRate, invoices }) => {
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
      value: dashboardStats?.totalRevenue || 0,
      icon: FileText,
      color: '#64748b',
    },
    {
      label: 'Collected',
      value: collected,
      icon: CheckCircle,
      color: '#22c55e',
    },
    {
      label: 'Outstanding',
      value: outstanding,
      icon: Clock,
      color: '#f59e0b',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className="glass-card p-4 text-center rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-300 animate-fade-in"
          style={{ animationDelay: `${index * 75}ms` }}
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

// Chart 1: Revenue vs Cost
const RevenueVsCostChart = ({ monthlyRevenue }) => {
  return (
    <div className="glass-card p-5 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <BarChart3 size={16} className="text-emerald-400" />
        Revenue vs Cost (6 Months)
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
        Cash Flow Trend (6 Months)
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
            innerRadius={50}
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

// Chart 6: Monthly Collection Performance
const MonthlyCollectionChart = ({ monthlyRevenue, cashFlow }) => {
  const data = useMemo(() => {
    return monthlyRevenue.map((m, index) => ({
      month: m.month,
      invoices: m.revenue,
      payments: cashFlow[index]?.inflow || 0,
    }));
  }, [monthlyRevenue, cashFlow]);

  return (
    <div className="glass-card p-5 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 animate-fade-in" style={{ animationDelay: '500ms' }}>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <TrendIcon size={16} className="text-indigo-400" />
        Monthly Collection Performance
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
  onInvoicesClick,
  onStatusClick,
}) => {
  if (!isOpen) return null;

  // Helper functions for calculations
  const getPaidAmount = (inv) => {
    if (inv.status === 'Paid') return Number(inv.amount || 0);
    if (inv.status === 'Partial') return Number(inv.paid || inv.amountPaid || 0);
    return Number(inv.paid || 0);
  };

  // Calculate total revenue and collected from invoices
  const totalRevenue = (invoices || []).reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const totalCollected = (invoices || []).reduce((sum, inv) => sum + getPaidAmount(inv), 0);

  // Calculate collection rate from invoices
  const collectionRate = totalRevenue > 0
    ? Math.round((totalCollected / totalRevenue) * 100)
    : 0;

  const payablesTotal = payables.reduce((sum, p) => sum + (p.outstandingAmount || 0), 0);

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
          onInvoicesClick={onInvoicesClick}
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
          invoices={invoices}
        />
      </section>

      {/* Charts Grid - Row 1 */}
      <section className="animate-fade-in" style={{ animationDelay: '200ms' }}>
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Financial Trends
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <RevenueVsCostChart monthlyRevenue={monthlyRevenue} />
          <CashFlowTrendChart cashFlow={cashFlow} />
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
          <MonthlyCollectionChart monthlyRevenue={monthlyRevenue} cashFlow={cashFlow} />
        </div>
      </section>
    </div>
  );
};

export default FinanceDashboard;
