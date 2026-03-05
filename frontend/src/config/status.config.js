// STATUS CONFIG — All statuses config-driven, never hardcoded in components

// Neutral "inactive" status — uses CSS vars for light/dark theme compatibility
const NEUTRAL = 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-muted)]';
const NEUTRAL_DOT = 'bg-[var(--text-faint)]';

export const STATUS_CONFIG = {
    lead: {
        Hot: { label: 'Hot', color: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-400' },
        Warm: { label: 'Warm', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
        Cold: { label: 'Cold', color: NEUTRAL, dot: NEUTRAL_DOT },
        Qualified: { label: 'Qualified', color: 'bg-[var(--bg-hover)] text-[var(--primary-light)] border-[var(--border-active)]', dot: 'bg-[var(--primary-light)]' },
        Converted: { label: 'Converted', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
        Lost: { label: 'Lost', color: 'bg-red-900/20 text-red-500 border-red-900/30', dot: 'bg-red-600' },
    },
    project: {
        Survey: { label: 'Survey', color: 'bg-[var(--bg-hover)] text-[var(--primary-light)] border-[var(--border-active)]', dot: 'bg-[var(--primary-light)]' },
        Design: { label: 'Design', color: 'bg-[var(--bg-hover)] text-[var(--primary-light)] border-[var(--border-active)]', dot: 'bg-[var(--primary-light)]' },
        Quotation: { label: 'Quotation', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', dot: 'bg-cyan-400' },
        Procurement: { label: 'Procurement', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
        Installation: { label: 'Installation', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-400' },
        Commissioned: { label: 'Commissioned', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
        'On Hold': { label: 'On Hold', color: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30', dot: 'bg-yellow-400' },
        Cancelled: { label: 'Cancelled', color: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-400' },
    },
    quotation: {
        Draft: { label: 'Draft', color: NEUTRAL, dot: NEUTRAL_DOT },
        Sent: { label: 'Sent', color: 'bg-[var(--bg-hover)] text-[var(--primary-light)] border-[var(--border-active)]', dot: 'bg-[var(--primary-light)]' },
        Approved: { label: 'Approved', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
        Rejected: { label: 'Rejected', color: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-400' },
        Expired: { label: 'Expired', color: NEUTRAL, dot: NEUTRAL_DOT },
    },
    invoice: {
        Paid: { label: 'Paid', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
        Partial: { label: 'Partial', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
        Pending: { label: 'Sent', color: NEUTRAL, dot: NEUTRAL_DOT },
        Overdue: { label: 'Overdue', color: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-400' },
    },
    inventory: {
        'In Stock': { label: 'In Stock', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
        'Low Stock': { label: 'Low Stock', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
        'Out of Stock': { label: 'Out of Stock', color: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-400' },
    },
    ticket: {
        Open: { label: 'Open', color: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-400' },
        Scheduled: { label: 'Scheduled', color: 'bg-[var(--bg-hover)] text-[var(--primary-light)] border-[var(--border-active)]', dot: 'bg-[var(--primary-light)]' },
        'In Progress': { label: 'In Progress', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
        Resolved: { label: 'Resolved', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
        Closed: { label: 'Closed', color: NEUTRAL, dot: NEUTRAL_DOT },
    },
    purchaseOrder: {
        Draft: { label: 'Draft', color: NEUTRAL, dot: NEUTRAL_DOT },
        Ordered: { label: 'Ordered', color: 'bg-[var(--bg-hover)] text-[var(--primary-light)] border-[var(--border-active)]', dot: 'bg-[var(--primary-light)]' },
        'In Transit': { label: 'In Transit', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', dot: 'bg-cyan-400' },
        Delivered: { label: 'Delivered', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
        Cancelled: { label: 'Cancelled', color: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-400' },
    },
    milestone: {
        Done: { label: 'Done', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
        'In Progress': { label: 'In Progress', color: 'bg-[var(--bg-hover)] text-[var(--primary-light)] border-[var(--border-active)]', dot: 'bg-[var(--primary-light)]' },
        Pending: { label: 'Pending', color: NEUTRAL, dot: NEUTRAL_DOT },
    },
    survey: {
        Pending: { label: 'Pending', color: NEUTRAL, dot: NEUTRAL_DOT },
        Scheduled: { label: 'Scheduled', color: 'bg-[var(--bg-hover)] text-[var(--primary-light)] border-[var(--border-active)]', dot: 'bg-[var(--primary-light)]' },
        Completed: { label: 'Completed', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
        Cancelled: { label: 'Cancelled', color: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-400' },
    },
    design: {
        Draft: { label: 'Draft', color: NEUTRAL, dot: NEUTRAL_DOT },
        'In Review': { label: 'In Review', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
        Approved: { label: 'Approved', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
        Rejected: { label: 'Rejected', color: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-400' },
    },
};

export const getStatus = (domain, key) =>
    STATUS_CONFIG[domain]?.[key] ?? { label: key, color: NEUTRAL, dot: NEUTRAL_DOT };
