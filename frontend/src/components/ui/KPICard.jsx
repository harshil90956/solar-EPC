// Universal KPI Card — config-driven, no hardcoded values
import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * KPICard props:
 *  label      — string
 *  value      — string | number (formatted externally)
 *  sub        — string (subtitle)
 *  icon       — Lucide icon component
 *  trend      — string (e.g. "+23% YoY")
 *  trendUp    — bool
 *  accentColor— hex | CSS var
 *  glowClass  — tailwind shadow class
 *  sparkData  — [number] (mini sparkline — future)
 */
export const KPICard = ({
    label, value, sub, icon: Icon,
    trend, trendUp,
    accentColor = 'var(--primary)',
    className,
}) => (
    <div className={cn('glass-card p-4 flex flex-col gap-2 group cursor-default', className)}>
        <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
                <p className="label-muted mb-1">{label}</p>
                <p className="text-2xl font-extrabold text-[var(--text-primary)] tabular-nums leading-none tracking-tight">
                    {value}
                </p>
                {sub && <p className="text-[11px] text-[var(--text-muted)] mt-1">{sub}</p>}
                {trend && (
                    <div className="flex items-center gap-1 mt-1">
                        {trendUp
                            ? <ArrowUpRight size={12} className="text-emerald-400" />
                            : <ArrowDownRight size={12} className="text-red-400" />}
                        <span className={cn('text-[11px] font-semibold', trendUp ? 'text-emerald-400' : 'text-red-400')}>
                            {trend}
                        </span>
                    </div>
                )}
            </div>
            {Icon && (
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{ backgroundColor: accentColor + '18', border: `1px solid ${accentColor}30` }}
                >
                    <Icon size={18} style={{ color: accentColor }} />
                </div>
            )}
        </div>
    </div>
);

export default KPICard;
