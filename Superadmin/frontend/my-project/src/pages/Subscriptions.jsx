import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Calendar, DollarSign, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/store';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Subscriptions() {
  const { subscriptions, tenants } = useAppStore();

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Subscriptions</h1>
        <p className="text-slate-500 mt-1">Manage tenant subscriptions and billing</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {subscriptions.map((sub) => {
          const tenant = tenants.find(t => t.id === sub.tenantId);
          return (
            <motion.div
              key={sub.id}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold">
                  {sub.status}
                </span>
              </div>
              <h3 className="font-semibold text-lg mt-4">{tenant?.name}</h3>
              <p className="text-slate-500">{sub.plan} Plan</p>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-semibold">${sub.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Billing</span>
                  <span>{sub.billingCycle}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Expires</span>
                  <span>{new Date(sub.endDate).toLocaleDateString()}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
