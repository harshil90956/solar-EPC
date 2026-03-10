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
 *  gradient   — string (tailwind gradient class for background)
 *  iconBgColor— string (tailwind bg class for icon container)
 *  iconColor  — string (tailwind text class for icon)
 */
export const KPICard = ({
    label, value, sub, icon: Icon,
    trend, trendUp,
    accentColor = 'var(--primary)',
    className,
    style,
    gradient,
    iconBgColor = 'bg-gray-100',
    iconColor = 'text-gray-600',
    onClick,
}) => (
<<<<<<< Updated upstream
    <div 
        onClick={onClick}
        className={cn('p-4 flex flex-col gap-2 group cursor-default rounded-xl border border-gray-200/50 backdrop-blur-sm', onClick && 'cursor-pointer', className)} 
        style={style}
    >
=======
    <div className={cn(
        'p-4 flex flex-col gap-2 group cursor-default rounded-xl border border-gray-200/50 backdrop-blur-sm transition-all duration-200 hover:shadow-md',
        gradient || 'bg-white/50',
        className
    )} style={style}>
>>>>>>> Stashed changes
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
                    className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 border border-white/50 shadow-sm', iconBgColor)}
                >
                    <Icon size={18} className={iconColor} />
                </div>
            )}
        </div>
    </div>
);

export default KPICard;
