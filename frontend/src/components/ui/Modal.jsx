import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Generic Modal — controlled by `open` prop
 * Sizes: sm (400px) | md (560px) | lg (720px) | xl (900px) | full
 */
export const Modal = ({ open, onClose, title, description, size = 'md', children, footer }) => {
  const overlayRef = useRef(null);
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape' && open) onClose?.(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-lg md:max-w-md', lg: 'max-w-2xl md:max-w-xl', xl: 'max-w-4xl md:max-w-2xl', full: 'max-w-[95vw]' };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === overlayRef.current) onClose?.(); }}
    >
      <div className={cn(
        'relative w-full sm:glass-card bg-[var(--bg-surface)] sm:shadow-2xl sm:shadow-black/60 animate-slide-up flex flex-col max-h-[90vh] sm:max-h-[88vh] rounded-t-xl sm:rounded-xl',
        size === 'full' ? 'h-[90vh]' : '',
        widths[size] ?? widths.md
      )}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 pb-4 border-b border-[var(--border-base)] shrink-0">
          <div>
            {title && <h2 className="text-sm font-bold text-[var(--text-primary)]">{title}</h2>}
            {description && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors shrink-0"
          >
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 flex items-center justify-end gap-2 p-4 border-t border-[var(--border-base)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
