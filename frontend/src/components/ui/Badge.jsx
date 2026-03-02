import React from 'react';
import { cn } from '../../lib/utils';
import { getStatus } from '../../config/status.config';

/**
 * StatusBadge — config-driven, zero hardcoded colours in call-sites
 * Usage: <StatusBadge domain="lead" value="Hot" />
 */
export const StatusBadge = ({ domain, value, className }) => {
  const cfg = getStatus(domain, value);
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border',
      cfg.color, className
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  );
};

/**
 * Badge — generic coloured pill
 */
const BADGE_VARIANTS = {
  default: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-muted)]',
  blue: 'text-[var(--primary-light)] border-[var(--border-active)]',
  primary: 'text-[var(--primary-light)] border-[var(--border-active)]',
  green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  red: 'bg-red-500/15 text-red-400 border-red-500/25',
  yellow: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  orange: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  purple: 'text-[var(--primary-light)] border-[var(--border-active)]',
};

export const Badge = ({ variant = 'default', className, children }) => (
  <span className={cn(
    'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border',
    BADGE_VARIANTS[variant] ?? BADGE_VARIANTS.default,
    className
  )}>
    {children}
  </span>
);

export default Badge;
