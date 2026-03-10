import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  CreditCard,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
  }
};

function StatCard({ title, value, change, trend, icon: Icon, color }) {
  const isPositive = trend === 'up';
  
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4 }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-6",
        "bg-white dark:bg-slate-900",
        "border border-slate-200 dark:border-slate-800",
        "shadow-sm hover:shadow-lg transition-all"
      )}
    >
      <div className={cn("absolute inset-0 opacity-5 bg-linear-to-br", color)} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{value}</h3>
          </div>
          <div className={cn("p-3 rounded-xl bg-linear-to-br", color)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <span className={cn("flex items-center gap-1 text-sm font-medium", isPositive ? "text-green-600" : "text-red-600")}>
            {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {change}
          </span>
          <span className="text-sm text-slate-400">vs last month</span>
        </div>
      </div>
    </motion.div>
  );
}

function ChartCard({ title, subtitle, children, className }) {
  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        "rounded-2xl p-6",
        "bg-white dark:bg-slate-900",
        "border border-slate-200 dark:border-slate-800",
        "shadow-sm",
        className
      )}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}

function ActivityItem({ activity }) {
  const icons = {
    Building: Building2,
    CreditCard: CreditCard,
    Users: Users,
    Database: Activity,
    DollarSign: DollarSign
  };
  
  const colors = {
    tenant_created: "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    subscription_renewed: "bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400",
    user_limit_updated: "bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
    backup_completed: "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    pricing_updated: "bg-pink-100 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400"
  };
  
  const Icon = icons[activity.icon] || Activity;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
    >
      <div className={cn("p-2 rounded-lg", colors[activity.type] || colors.tenant_created)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{activity.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-500">{activity.user}</span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(activity.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { tenants, analytics, activities } = useAppStore();

  const totalRevenue = tenants.reduce((acc, t) => acc + t.revenue, 0);
  const activeTenants = tenants.filter(t => t.status === 'Active').length;
  const totalUsers = tenants.reduce((acc, t) => acc + t.currentUsers, 0);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back! Here's what's happening with your platform.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tenants"
          value={tenants.length}
          change="12.5%"
          trend="up"
          icon={Building2}
          color="from-blue-500 to-cyan-500"
        />
        <StatCard
          title="Active Subscriptions"
          value={activeTenants}
          change="8.2%"
          trend="up"
          icon={CreditCard}
          color="from-green-500 to-emerald-500"
        />
        <StatCard
          title="Total Revenue"
          value={`$${(totalRevenue / 1000).toFixed(1)}k`}
          change="24.3%"
          trend="up"
          icon={DollarSign}
          color="from-amber-500 to-orange-500"
        />
        <StatCard
          title="Total Users"
          value={totalUsers}
          change="5.7%"
          trend="up"
          icon={Users}
          color="from-purple-500 to-violet-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard 
          title="Revenue Analytics" 
          subtitle="Monthly revenue vs targets"
          className="lg:col-span-2"
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                <Area type="monotone" dataKey="target" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorTarget)" name="Target" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Plan Distribution" subtitle="Active subscriptions by plan">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analytics.planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 justify-center mt-4">
            {analytics.planDistribution.map((plan) => (
              <div key={plan.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: plan.color }} />
                <span className="text-sm text-slate-600">{plan.name}</span>
                <span className="text-sm font-semibold text-slate-900">{plan.value}%</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Tenant Growth" subtitle="New tenants over time">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.tenantGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                <Bar dataKey="tenants" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Top Tenant Usage" subtitle="Active users by tenant">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.userUsage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis dataKey="tenant" type="category" stroke="#94a3b8" fontSize={12} width={80} />
                <Tooltip />
                <Bar dataKey="used" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Used" />
                <Bar dataKey="limit" fill="#e2e8f0" radius={[0, 4, 4, 0]} name="Limit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
                <p className="text-sm text-slate-500 mt-1">Latest platform events</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activities.slice(0, 5).map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
