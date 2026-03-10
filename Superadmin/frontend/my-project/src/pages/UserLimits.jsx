import { motion } from 'framer-motion';
import { Users, Settings, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function UserLimits() {
  const { tenants, updateTenant } = useAppStore();

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">User Limits</h1>
        <p className="text-slate-500 mt-1">Manage maximum users per tenant</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tenants.map((tenant) => {
          const usagePercent = (tenant.currentUsers / tenant.userLimit) * 100;
          const isNearLimit = usagePercent >= 80;

          return (
            <motion.div
              key={tenant.id}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-semibold text-slate-600 dark:text-slate-400">
                    {tenant.logo}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{tenant.name}</h3>
                    <p className="text-sm text-slate-500">{tenant.plan} Plan</p>
                  </div>
                </div>
                {isNearLimit && (
                  <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-500">User Usage</span>
                    <span className={cn(
                      "font-semibold",
                      isNearLimit ? "text-amber-600" : "text-slate-900 dark:text-white"
                    )}>
                      {tenant.currentUsers} / {tenant.userLimit} ({Math.round(usagePercent)}%)
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(usagePercent, 100)}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className={cn(
                        "h-full rounded-full",
                        usagePercent >= 90 ? "bg-red-500" :
                          usagePercent >= 70 ? "bg-amber-500" : "bg-green-500"
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500">User Limit</label>
                    <input
                      type="number"
                      value={tenant.userLimit}
                      onChange={(e) => updateTenant(tenant.id, { userLimit: parseInt(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500">Current Users</label>
                    <p className="mt-1 px-3 py-2 text-sm font-medium">{tenant.currentUsers}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
