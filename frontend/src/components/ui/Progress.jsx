import React from 'react';
import { cn } from '../../lib/utils';

export const Progress = ({ value = 0, className, colorClass }) => {
  const color = colorClass ?? (
    value >= 80 ? 'from-emerald-500 to-teal-400' :
      value >= 50 ? 'from-[var(--primary)] to-[var(--primary-light)]' :
        value >= 25 ? 'from-amber-500 to-orange-400' :
          'from-red-500 to-rose-400'
  );
  return (
    <div className={cn('w-full h-1.5 rounded-full bg-[var(--bg-overlay)] overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
};
export default Progress;
