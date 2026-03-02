import React from 'react';
import { cn } from '../../lib/utils';

export const Avatar = ({ children, size = 'md', className, color }) => {
  const sizes = { xs: 'w-5 h-5 text-[9px]', sm: 'w-7 h-7 text-[10px]', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm' };
  const colors = [
    'from-blue-600 to-blue-400', 'from-sky-500 to-cyan-400',
    'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500',
    'from-rose-500 to-red-400', 'from-blue-700 to-blue-500',
  ];
  const str = String(children ?? '?');
  const idx = str.charCodeAt(0) % colors.length;
  return (
    <div className={cn(
      'rounded-lg flex items-center justify-center font-bold shrink-0 bg-gradient-to-br text-white',
      sizes[size] ?? sizes.md,
      color ?? colors[idx],
      className
    )}>
      {str.slice(0, 2).toUpperCase()}
    </div>
  );
};
export default Avatar;
