import { motion } from 'framer-motion';
import { DollarSign, Check, Zap, Star, Crown } from 'lucide-react';
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

const planIcons = {
  Starter: Zap,
  Professional: Star,
  Enterprise: Crown
};

export default function Pricing() {
  const { pricingPlans, updatePricing } = useAppStore();

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Pricing Plans</h1>
        <p className="text-slate-500 mt-1">Manage subscription pricing and features</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pricingPlans.map((plan) => {
          const Icon = planIcons[plan.name];
          return (
            <motion.div
              key={plan.id}
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              className={cn(
                "relative rounded-2xl p-6 transition-all",
                "bg-white dark:bg-slate-900 border",
                plan.highlighted
                  ? "border-blue-500 shadow-xl shadow-blue-500/10"
                  : "border-slate-200 dark:border-slate-800 hover:shadow-lg"
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                "bg-gradient-to-br",
                plan.color
              )}>
                <Icon className="w-6 h-6 text-white" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
              <p className="text-slate-500 text-sm mt-1">{plan.description}</p>

              <div className="mt-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white">${plan.monthlyPrice}</span>
                  <span className="text-slate-500">/user/mo</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  ${plan.yearlyPrice}/user/year (save {Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100)}%)
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-3">
                  User Limit: {plan.userLimit || 'Unlimited'}
                </p>
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "w-full mt-6 py-2.5 rounded-xl font-medium transition-colors",
                  plan.highlighted
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
                )}
              >
                Edit Plan
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
