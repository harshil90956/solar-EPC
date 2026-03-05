// Universal DataTable — fully schema-driven, server-side pagination, column toggle, 3-dot menu, bulk actions, mobile responsive
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Search, ChevronDown, ChevronUp, MoreHorizontal, ChevronLeft, ChevronRight, Eye, EyeOff, Check, Clock, Activity, Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { Input } from './Input';

/**
 * DataTable props:
 *  columns         — [{ key, header, render?, sortable?, width? }]
 *  data            — current page rows
 *  total           — total records (server-side)
 *  page            — current page (1-based)
 *  pageSize        — rows per page
 *  onPageChange    — (page) => void
 *  onPageSizeChange— (size) => void
 *  onSort          — ({ key, dir }) => void
 *  search          — string
 *  onSearch        — (val) => void
 *  rowActions      — [{ label, icon, onClick(row), danger?, show?: (row) => boolean }]
 *  bulkActions     — [{ label, icon, onClick(selectedRows) }]
 *  loading         — bool
 *  emptyText       — string
 *  selectedRows    — Set<id>
 *  onSelectRows    — (Set) => void
 *  rowKey          — field name (default 'id')
 *  toolbar         — React node (injected right side of toolbar)
 */
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const DataTable = ({
    columns = [], data = [], total: propTotal = 0,
    page: propPage = 1, pageSize: propPageSize = 25,
    onPageChange: propOnPageChange, onPageSizeChange: propOnPageSizeChange,
    pagination, // Support old pagination object format
    onSort,
    search = '', onSearch,
    rowActions = [], bulkActions = [],
    loading = false, emptyText = 'No records found',
    selectedRows: controlledSelected,
    onSelectRows,
    rowKey = 'id',
    toolbar,
    className,
    sort: controlledSort,
    onRowClick,
    hiddenCols: controlledHiddenCols,
    onHiddenColsChange,
    hideColumnToggle = false,
}) => {
    // Support both flat props and pagination object for backward compatibility
    const total = pagination?.total != null ? pagination.total : propTotal;
    const page = pagination?.page != null ? pagination.page : propPage;
    const pageSize = pagination?.pageSize != null ? pagination.pageSize : propPageSize;
    const onPageChange = pagination?.onChange != null ? pagination.onChange : propOnPageChange;
    const onPageSizeChange = pagination?.onPageSizeChange != null ? pagination.onPageSizeChange : propOnPageSizeChange;
    const [internalSort, setInternalSort] = useState({ key: null, dir: 'asc' });
    const [internalHiddenCols, setInternalHiddenCols] = useState(new Set());
    const isControlledHiddenCols = controlledHiddenCols !== undefined;
    const hiddenCols = isControlledHiddenCols ? controlledHiddenCols : internalHiddenCols;
    const setHiddenCols = isControlledHiddenCols ? onHiddenColsChange : setInternalHiddenCols;
    
    const [openMenuIndex, setOpenMenuIndex] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef(null);
    const buttonRefs = useRef({});
    const [colToggleOpen, setColToggleOpen] = useState(false);
    const [jumpPage, setJumpPage] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mobileView, setMobileView] = useState(false);

    const [internalSelected, setInternalSelected] = useState(new Set());
    const selectedRows = controlledSelected != null ? controlledSelected : internalSelected;
    const setSelected = onSelectRows != null ? onSelectRows : setInternalSelected;

    // Use controlled sort if provided, otherwise use internal
    const isControlledSort = controlledSort !== undefined;
    const sort = isControlledSort ? controlledSort : internalSort;
    const setSort = isControlledSort ? null : setInternalSort;

    const visibleColumns = useMemo(() => columns.filter(c => !hiddenCols.has(c.key)), [columns, hiddenCols]);
    const totalPages = Math.ceil(total / pageSize) || 1;

    const buttonRef = useRef(null);

    // Standard rulebook actions to be injected if not present
    const standardActions = [];

    const allRowActions = useMemo(() => {
        const existingLabels = new Set(rowActions.map(a => a.label));
        const filteredStandards = standardActions.filter(a => !existingLabels.has(a.label));
        return [...rowActions, ...filteredStandards];
    }, [rowActions]);

    const handleSort = (key) => {
        if (!onSort) return;
        const dir = sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc';
        if (!isControlledSort) {
            setInternalSort({ key, dir });
        }
        onSort({ key, dir });
    };

    const handleJump = (e) => {
        if (e.key === 'Enter') {
            const p = parseInt(jumpPage);
            if (p >= 1 && p <= totalPages) {
                onPageChange?.(p);
                setJumpPage('');
            }
        }
    };

    const toggleCol = (key) => {
        setHiddenCols(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const toggleRow = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedRows.size === data.length) setSelected(new Set());
        else setSelected(new Set(data.map(r => r[rowKey])));
    };

    const handleMenuOpen = useCallback((e, index) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const menuWidth = 176;
        
        let left = rect.left - menuWidth - 8;
        let top = rect.top;
        
        if (left < 8) left = rect.right + 8;
        if (top + 200 > window.innerHeight) top = window.innerHeight - 200 - 8;
        if (top < 8) top = 8;
        
        setMenuPosition({ top, left });
        setOpenMenuIndex(openMenuIndex === index ? null : index);
    }, [openMenuIndex]);

    const handleMenuClose = useCallback(() => {
        setOpenMenuIndex(null);
    }, []);

    // Check for mobile viewport
    React.useEffect(() => {
        const checkMobile = () => setMobileView(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const SortIcon = ({ col }) => {
        if (sort.key !== col.key) return <ChevronDown size={11} className="text-[var(--text-faint)] opacity-50" />;
        return sort.dir === 'asc'
            ? <ChevronUp size={11} className="text-[var(--primary)]" />
            : <ChevronDown size={11} className="text-[var(--primary)]" />;
    };

    return (
        <div className={cn('flex flex-col gap-3', className)}>
            {/* ── Mobile Filter Toggle ── */}
            {mobileView && (
                <div className="flex items-center gap-2">
                    <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="flex-1"
                    >
                        {isMobileMenuOpen ? <X size={14} /> : <Menu size={14} />}
                        <span className="ml-1">{isMobileMenuOpen ? 'Close' : 'Filters & Actions'}</span>
                    </Button>
                    {selectedRows.size > 0 && (
                        <span className="text-xs text-[var(--text-muted)]">
                            {selectedRows.size} selected
                        </span>
                    )}
                </div>
            )}

            {/* ── Toolbar ── */}
            <div className={cn(
                "flex items-center gap-2 flex-wrap",
                mobileView && !isMobileMenuOpen && "hidden"
            )}>
                {onSearch !== undefined && (
                    <div className="relative min-w-[200px] flex-1 max-w-xs">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                        <Input
                            placeholder="Search…"
                            value={search}
                            onChange={e => onSearch(e.target.value)}
                            className="pl-8 h-8 text-xs"
                        />
                    </div>
                )}

                {/* Bulk actions */}
                {selectedRows.size > 0 && bulkActions.map(a => (
                    <Button key={a.label} size="sm" variant="secondary" onClick={() => a.onClick([...selectedRows])}>
                        {a.icon && <a.icon size={12} />} {a.label} ({selectedRows.size})
                    </Button>
                ))}

                <div className="ml-auto flex items-center gap-2 flex-wrap">
                    {toolbar}

                    {/* Column visibility toggle */}
                    {!hideColumnToggle && (
                        <div className="relative">
                            <Button size="sm" variant="secondary" onClick={() => setColToggleOpen(p => !p)}>
                                <Eye size={12} /> Columns
                            </Button>
                            {colToggleOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setColToggleOpen(false)} />
                                    <div className="absolute right-0 top-9 z-40 w-44 glass-card shadow-2xl shadow-black/40 py-1.5 animate-slide-up">
                                        {columns.map(col => (
                                            <button
                                                key={col.key}
                                                onClick={() => {
                                                    setHiddenCols(prev => {
                                                        const next = new Set(prev);
                                                        next.has(col.key) ? next.delete(col.key) : next.add(col.key);
                                                        return next;
                                                    });
                                                }}
                                                className="flex items-center justify-between w-full px-3 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                                            >
                                                {col.header}
                                                {!hiddenCols.has(col.key)
                                                    ? <Check size={11} className="text-[var(--primary)]" />
                                                    : <EyeOff size={11} className="text-[var(--text-faint)]" />}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Mobile Card View ── */}
            {mobileView ? (
                <div className="space-y-3">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="glass-card p-4 space-y-2">
                                <div className="h-4 rounded animate-shimmer w-3/4" />
                                <div className="h-3 rounded animate-shimmer w-1/2" />
                                <div className="h-3 rounded animate-shimmer w-2/3" />
                            </div>
                        ))
                    ) : data.length === 0 ? (
                        <div className="text-center py-8 text-[var(--text-faint)] text-sm">
                            {emptyText}
                        </div>
                    ) : (
                        data.map((row, index) => (
                            <div 
                                key={row[rowKey] || index} 
                                className="glass-card p-3 space-y-2"
                                onClick={() => onRowClick?.(row)}
                            >
                                {bulkActions.length > 0 && (
                                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border-base)]">
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.has(row[rowKey])}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                toggleRow(row[rowKey]);
                                            }}
                                            className="w-4 h-4 accent-[var(--primary)] cursor-pointer"
                                        />
                                        {allRowActions.length > 0 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMenuOpen(e, index);
                                                }}
                                                className="w-8 h-8 rounded flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                                            >
                                                <MoreHorizontal size={16} />
                                            </button>
                                        )}
                                    </div>
                                )}
                                {visibleColumns.slice(0, 4).map(col => (
                                    <div key={col.key} className="flex items-start justify-between gap-2">
                                        <span className="text-[11px] text-[var(--text-muted)]">{col.header}</span>
                                        <span className="text-[12px] text-[var(--text-primary)] text-right">
                                            {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                                        </span>
                                    </div>
                                ))}
                                {visibleColumns.length > 4 && (
                                    <div className="text-[10px] text-[var(--text-faint)] pt-1 border-t border-[var(--border-base)]">
                                        +{visibleColumns.length - 4} more fields
                                    </div>
                                )}
                                {bulkActions.length === 0 && allRowActions.length > 0 && (
                                    <div className="flex justify-end pt-2 border-t border-[var(--border-base)]">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMenuOpen(e, index);
                                            }}
                                            className="w-8 h-8 rounded flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                                        >
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            ) : (
                /* ── Table (Desktop) ── */
                <div className="rounded-xl border border-[var(--border-base)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-[var(--border-base)] bg-[var(--bg-raised)]">
                                    {bulkActions.length > 0 && (
                                        <th className="w-10 px-3 py-3 sticky left-0 z-10 bg-[var(--bg-raised)]">
                                            <input
                                                type="checkbox"
                                                checked={data.length > 0 && selectedRows.size === data.length}
                                                onChange={toggleAll}
                                                className="w-3.5 h-3.5 accent-[var(--primary)] cursor-pointer"
                                            />
                                        </th>
                                    )}
                                    {visibleColumns.map(col => (
                                        <th
                                            key={col.key}
                                            className={cn(
                                                'px-3 py-2.5 text-left text-[11px] font-semibold text-[var(--text-muted)] whitespace-nowrap',
                                                col.sortable && 'cursor-pointer select-none hover:text-[var(--text-primary)]'
                                            )}
                                            style={col.width ? { width: col.width } : undefined}
                                            onClick={() => col.sortable && handleSort(col.key)}
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                {col.header}
                                                {col.sortable && <SortIcon col={col} />}
                                            </span>
                                        </th>
                                    ))}
                                    {allRowActions.length > 0 && (
                                        <th className="w-10 px-2 py-2.5 sticky right-0 z-10 bg-[var(--bg-raised)] border-l border-[var(--border-base)]" />
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="border-b border-[var(--border-base)]">
                                            {(bulkActions.length > 0 ? [null, ...visibleColumns] : visibleColumns).map((col, idx) => (
                                                <td key={`${i}-${idx}`} className="px-4 py-3.5">
                                                    <div className="h-3 rounded animate-shimmer" style={{ width: `${40 + Math.random() * 40}%` }} />
                                                </td>
                                            ))}
                                            {allRowActions.length > 0 && (
                                                <td className="px-4 py-3.5" />
                                            )}
                                        </tr>
                                    ))
                                ) : data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={visibleColumns.length + (bulkActions.length ? 1 : 0) + (allRowActions.length ? 1 : 0)}
                                            className="text-center py-16 text-[var(--text-faint)] text-sm"
                                        >
                                            {emptyText}
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((row, index) => (
                                        <tr
                                            key={row[rowKey] || index}
                                            className="table-row border-b border-[var(--border-base)] last:border-0 group"
                                            onClick={() => onRowClick?.(row)}
                                        >
                                            {bulkActions.length > 0 && (
                                                <td className="px-3 py-3.5 sticky left-0 z-10 bg-[var(--bg-surface)] group-hover:bg-[var(--bg-hover)] transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRows.has(row[rowKey])}
                                                        onChange={e => {
                                                            e.stopPropagation();
                                                            toggleRow(row[rowKey]);
                                                        }}
                                                        className="w-3.5 h-3.5 accent-[var(--primary)] cursor-pointer"
                                                    />
                                                </td>
                                            )}
                                            {visibleColumns.map(col => (
                                                <td key={col.key} className="px-3 py-2 text-[12px] text-[var(--text-primary)]">
                                                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                                                </td>
                                            ))}
                                            {allRowActions.length > 0 && (
                                                <td
                                                    className="px-2 py-2 sticky right-0 z-10 bg-[var(--bg-surface)] group-hover:bg-[var(--bg-hover)] transition-colors border-l border-[var(--border-base)]"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <button
                                                        ref={el => (buttonRefs.current[index] = el)}
                                                        onClick={e => handleMenuOpen(e, index)}
                                                        className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                                                    >
                                                        <MoreHorizontal size={14} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                    </table>
                </div>
            </div>
            )}

            {/* ── Floating Menu ── */}
            {openMenuIndex !== null && data[openMenuIndex] && (
                <>
                    <div className="fixed inset-0 z-40" onClick={handleMenuClose} />
                    <div 
                        ref={menuRef}
                        className={cn(
                            "fixed z-50 glass-card shadow-2xl shadow-black/50 py-1.5 animate-slide-up",
                            mobileView ? "bottom-0 left-0 right-0 rounded-t-xl w-full" : "w-44"
                        )}
                        style={mobileView ? {} : { 
                            top: `${menuPosition.top}px`,
                            left: `${menuPosition.left}px`,
                        }}
                    >
                        {mobileView && (
                            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-base)]">
                                <span className="text-xs font-semibold text-[var(--text-muted)]">Actions</span>
                                <button onClick={handleMenuClose} className="p-1">
                                    <X size={16} className="text-[var(--text-muted)]" />
                                </button>
                            </div>
                        )}
                        <div className={cn("py-1", mobileView && "grid grid-cols-2 gap-1 px-2")}>
                            {allRowActions.map((a, actionIdx) => (
                                <button
                                    key={`menu-${openMenuIndex}-${a.label}-${actionIdx}`}
                                    onClick={() => { 
                                        a.onClick(data[openMenuIndex]); 
                                        handleMenuClose(); 
                                    }}
                                    className={cn(
                                        'flex items-center gap-2 transition-colors',
                                        mobileView ? 'justify-center px-3 py-3 rounded-lg text-sm' : 'w-full px-3 py-2 text-xs',
                                        a.danger
                                            ? 'text-red-400 hover:bg-red-500/10'
                                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                    )}
                                >
                                    {a.icon && <a.icon size={mobileView ? 16 : 12} />} {a.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* ── Pagination ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-4 text-[11px] text-[var(--text-faint)]">
                    <div className="flex items-center gap-2">
                        <span>Rows per page:</span>
                        <select
                            value={pageSize}
                            onChange={e => onPageSizeChange?.(Number(e.target.value))}
                            className="h-7 px-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-secondary)] text-[11px] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        >
                            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span>Jump to:</span>
                        <input
                            type="number"
                            value={jumpPage}
                            onChange={e => setJumpPage(e.target.value)}
                            onKeyDown={handleJump}
                            placeholder="Page…"
                            className="w-12 h-7 px-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] text-[var(--text-secondary)] text-[11px] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all"
                        />
                    </div>

                    <span>
                        {total === 0 ? '0' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}`} of {total}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <Button size="xs" variant="secondary" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>
                        <ChevronLeft size={12} />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let p;
                        if (totalPages <= 5) {
                            p = i + 1;
                        } else {
                            p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                        }
                        return (
                            <Button
                                key={p} size="xs"
                                variant={p === page ? 'primary' : 'secondary'}
                                onClick={() => onPageChange?.(p)}
                            >
                                {p}
                            </Button>
                        );
                    })}
                    <Button size="xs" variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}>
                        <ChevronRight size={12} />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DataTable;
