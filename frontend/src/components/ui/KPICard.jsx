// Universal KPI Card — unified styling across all modules
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
 *  variant    — string (emerald | blue | amber | red | purple | indigo)
 *  className  — string
 *  style      — object
 *  onClick    — function
 *  loading    — boolean
 */
export const KPICard = ({
    label,
    value,
    sub,
    icon: Icon,
    trend,
    trendUp,
    variant = 'emerald',
    className,
    style,
    onClick,
    loading = false,
}) => {
    const variants = {
        emerald: {
            accent: '#22c55e',
            gradient: 'from-emerald-500/20 to-emerald-500/5',
            iconBg: 'bg-emerald-500/20',
            iconColor: 'text-emerald-600',
        },
        blue: {
            accent: '#3b82f6',
            gradient: 'from-blue-500/20 to-blue-500/5',
            iconBg: 'bg-blue-500/20',
            iconColor: 'text-blue-600',
        },
        amber: {
            accent: '#f59e0b',
            gradient: 'from-amber-500/20 to-amber-500/5',
            iconBg: 'bg-amber-500/20',
            iconColor: 'text-amber-600',
        },
        red: {
            accent: '#ef4444',
            gradient: 'from-red-500/20 to-red-500/5',
            iconBg: 'bg-red-500/20',
            iconColor: 'text-red-600',
        },
        purple: {
            accent: '#8b5cf6',
            gradient: 'from-purple-500/20 to-purple-500/5',
            iconBg: 'bg-purple-500/20',
            iconColor: 'text-purple-600',
        },
        indigo: {
            accent: '#6366f1',
            gradient: 'from-indigo-500/20 to-indigo-500/5',
            iconBg: 'bg-indigo-500/20',
            iconColor: 'text-indigo-600',
        },
    };

    const v = variants[variant] || variants.emerald;

    if (loading) {
        return (
            <div
                className={cn(
                    'relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br',
                    v.gradient,
                    'border border-[var(--border-muted)]',
                    'animate-pulse',
                    className
                )}
                style={style}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className={cn('p-3 rounded-xl', v.iconBg)}>
                        <div className="w-[22px] h-[22px] bg-gray-300 rounded" />
                    </div>
                </div>
                <div className="h-4 w-20 bg-gray-300 rounded mb-2" />
                <div className="h-8 w-32 bg-gray-300 rounded" />
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className={cn(
                'relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br',
                v.gradient,
                'border border-[var(--border-muted)]',
                'hover:scale-[1.02] transition-all duration-300 cursor-pointer group',
                onClick && 'cursor-pointer',
                className
            )}
            style={{
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                ...style,
            }}
        >
            {/* Background glow effect */}
            <div className="absolute top-0 right-0 w-24 h-24 opacity-10 group-hover:opacity-20 transition-opacity">
                <div
                    className="w-full h-full rounded-full blur-2xl"
                    style={{ backgroundColor: v.accent }}
                />
            </div>

            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={cn('p-3 rounded-xl shadow-md', v.iconBg)}>
                    {Icon && <Icon size={22} className={v.iconColor} />}
                </div>

                {trend && (
                    <div className="flex items-center gap-1">
                        {trendUp
                            ? <ArrowUpRight size={14} className="text-emerald-500" />
                            : <ArrowDownRight size={14} className="text-red-500" />}
                        <span className={cn('text-xs font-semibold', trendUp ? 'text-emerald-500' : 'text-red-500')}>
                            {trend}
                        </span>
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <div className="text-sm font-medium text-[var(--text-primary)] mb-0.5">
                    {label}
                </div>
                <div className="text-2xl font-extrabold text-[var(--text-primary)] tabular-nums leading-none tracking-tight">
                    {value}
                </div>
                {sub && <div className="text-xs text-[var(--text-muted)] mt-1">{sub}</div>}
            </div>
        </div>
    );
};

export default KPICard;
