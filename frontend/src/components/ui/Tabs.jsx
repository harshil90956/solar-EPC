import React, { createContext, useContext, useState } from 'react';
import { cn } from '../../lib/utils';

const TabsCtx = createContext(null);

export const Tabs = ({ value, onValueChange, defaultValue, className, children }) => {
  const [internal, setInternal] = useState(defaultValue ?? '');
  const active = value ?? internal;
  const setActive = onValueChange ?? setInternal;
  return <TabsCtx.Provider value={{ active, setActive }}><div className={cn('flex flex-col gap-4', className)}>{children}</div></TabsCtx.Provider>;
};

export const TabsList = ({ className, children }) => (
  <div className={cn('flex gap-1 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)] w-fit', className)}>
    {children}
  </div>
);

export const TabsTrigger = ({ value, children, className }) => {
  const { active, setActive } = useContext(TabsCtx);
  const isActive = active === value;
  return (
    <button
      onClick={() => setActive(value)}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
        isActive
          ? 'bg-[var(--primary)] text-white shadow-sm shadow-[var(--primary-glow)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
        className
      )}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value, children }) => {
  const { active } = useContext(TabsCtx);
  if (active !== value) return null;
  return <div className="animate-fade-in">{children}</div>;
};
