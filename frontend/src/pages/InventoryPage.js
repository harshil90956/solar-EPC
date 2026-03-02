// Solar OS – EPC Edition — InventoryPage.js
import React, { useState, useMemo, useRef } from 'react';
import {
  Package, Plus, AlertTriangle, Warehouse, ArrowUp, ArrowDown, Zap, LayoutGrid, List
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { INVENTORY } from '../data/mockData';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select } from '../components/ui/Input';
import { KPICard } from '../components/ui/KPICard';
import { Progress } from '../components/ui/Progress';
import DataTable from '../components/ui/DataTable';
import { CURRENCY, APP_CONFIG } from '../config/app.config';

const fmt = CURRENCY.format;

const getStockStatus = (item) => {
  if (item.available === 0) return 'Out of Stock';
  if (item.available <= item.minStock) return 'Low Stock';
  if (item.reserved > 0 && item.available > item.minStock) return 'Partially Reserved';
  return 'In Stock';
};

// ── Kanban columns ─────────────────────────────────────────────────────────────
const INV_STAGES = [
  { id: 'In Stock', label: 'In Stock', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { id: 'Partially Reserved', label: 'Partially Reserved', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  { id: 'Low Stock', label: 'Low Stock', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { id: 'Out of Stock', label: 'Out of Stock', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

const COLUMNS = [
  { key: 'id', header: 'Item ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
  { key: 'name', header: 'Item Name', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
  { key: 'category', header: 'Category', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
  { key: 'stock', header: 'Total Stock', sortable: true, render: (v, row) => <span className="text-xs font-bold text-[var(--text-primary)]">{v} {row.unit}</span> },
  { key: 'reserved', header: 'Reserved', render: (v, row) => <span className="text-xs text-amber-400">{v} {row.unit}</span> },
  {
    key: 'available', header: 'Available', sortable: true, render: (v, row) => (
      <div className="flex items-center gap-2 min-w-[80px]">
        <span className="text-xs font-bold text-emerald-400">{v}</span>
        <Progress value={Math.round((v / row.stock) * 100)} className="h-1.5 w-16" />
      </div>
    )
  },
  { key: 'minStock', header: 'Min Stock', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'rate', header: 'Unit Rate', sortable: true, render: v => <span className="text-xs text-[var(--text-muted)]">₹{v.toLocaleString('en-IN')}</span> },
  { key: 'warehouse', header: 'Warehouse', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: '__status', header: 'Status', render: (_, row) => <StatusBadge domain="inventory" value={getStockStatus(row)} /> },
];

const CATEGORY_FILTERS = ['All', 'Panel', 'Inverter', 'BOS', 'Structure'];

/* ── Inventory Kanban Card ── */
const InvCard = ({ item, onDragStart, onClick }) => {
  const statusPct = Math.round((item.available / item.stock) * 100);
  const status = getStockStatus(item);
  const stage = INV_STAGES.find(s => s.id === status);
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-[var(--primary)]/40 transition-all">
      <div className="flex items-start justify-between mb-1">
        <span className="text-[10px] font-mono text-[var(--accent-light)]">{item.id}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: stage?.bg, color: stage?.color }}>{item.category}</span>
      </div>
      <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5 leading-tight">{item.name}</p>
      <p className="text-[10px] text-[var(--text-muted)] mb-2">{item.warehouse}</p>
      <Progress value={statusPct} className="h-1 mb-2" />
      <div className="grid grid-cols-3 gap-1 text-center">
        <div>
          <p className="text-[9px] text-[var(--text-faint)]">Stock</p>
          <p className="text-[11px] font-bold text-[var(--text-primary)]">{item.stock}</p>
        </div>
        <div>
          <p className="text-[9px] text-[var(--text-faint)]">Avail</p>
          <p className="text-[11px] font-bold text-emerald-400">{item.available}</p>
        </div>
        <div>
          <p className="text-[9px] text-[var(--text-faint)]">Rsv</p>
          <p className="text-[11px] font-bold text-amber-400">{item.reserved}</p>
        </div>
      </div>
      {item.available <= item.minStock && item.available > 0 && (
        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-amber-400">
          <AlertTriangle size={9} /> Below min stock ({item.minStock})
        </div>
      )}
      <div className="mt-1.5 text-[10px] font-bold text-[var(--text-secondary)]">
        ₹{(item.available * item.rate).toLocaleString('en-IN')}
      </div>
    </div>
  );
};

/* ── Kanban Board ── */
const InvKanbanBoard = ({ items, onCardClick }) => {
  const draggingId = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  const [overrides, setOverrides] = useState({});

  const getStatus = (item) => overrides[item.id] || getStockStatus(item);

  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex gap-3 min-w-max">
        {INV_STAGES.map(stage => {
          const cards = items.filter(i => getStatus(i) === stage.id);
          const totalVal = cards.reduce((a, i) => a + i.available * i.rate, 0);
          return (
            <div key={stage.id}
              className={`flex flex-col w-60 rounded-xl border transition-colors ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => {
                if (draggingId.current) setOverrides(o => ({ ...o, [draggingId.current]: stage.id }));
                draggingId.current = null; setDragOver(null);
              }}>
              <div className="flex items-center justify-between p-3 border-b border-[var(--border-base)]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {totalVal > 0 && <span className="text-[10px] text-[var(--text-muted)]">₹{(totalVal / 100000).toFixed(1)}L</span>}
                  <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 p-2 flex-1 min-h-[180px]">
                {cards.map(i => (
                  <InvCard key={i.id} item={i}
                    onDragStart={() => { draggingId.current = i.id; }}
                    onClick={() => onCardClick(i)} />
                ))}
                {cards.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-[11px] text-[var(--text-faint)]">Drop here</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── Main Page ── */
const InventoryPage = () => {
  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showAdd, setShowAdd] = useState(false);
  const [showStockIn, setStockIn] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', unit: '', minStock: '', rate: '', warehouse: '' });

  const filtered = useMemo(() =>
    INVENTORY.filter(i =>
      (catFilter === 'All' || i.category === catFilter) &&
      i.name.toLowerCase().includes(search.toLowerCase())
    ), [search, catFilter]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const lowStockItems = INVENTORY.filter(i => i.available <= i.minStock);
  const totalValue = INVENTORY.reduce((a, i) => a + i.stock * i.rate, 0);
  const outOfStock = INVENTORY.filter(i => i.available === 0).length;

  const chartData = INVENTORY.map(i => ({
    name: i.name.length > 14 ? i.name.slice(0, 14) + '…' : i.name,
    available: i.available, reserved: i.reserved,
  }));

  const ROW_ACTIONS = [
    { label: 'View Details', icon: Package, onClick: row => setSelected(row) },
    { label: 'Stock In', icon: ArrowUp, onClick: () => setStockIn(true) },
    { label: 'Stock Out', icon: ArrowDown, onClick: () => { } },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <div className="page-header">
        <div>
          <h1 className="heading-page">Inventory Management</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Stock levels · reservations · low-stock alerts · warehouses</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="view-toggle-pill">
            <button onClick={() => setView('kanban')}
              className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`}><LayoutGrid size={14} /></button>
            <button onClick={() => setView('table')}
              className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`}><List size={14} /></button>
          </div>
          <Button variant="ghost" onClick={() => setStockIn(true)}><ArrowUp size={13} /> Stock In</Button>
          <Button onClick={() => setShowAdd(true)}><Plus size={13} /> Add Item</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total Items" value={INVENTORY.length} sub="SKUs tracked" icon={Package} accentColor="#3b82f6" />
        <KPICard label="Inventory Value" value={fmt(totalValue)} sub="At current rates" icon={Warehouse} accentColor="#f59e0b" trend="+5% vs last mo" trendUp />
        <KPICard label="Low Stock Alerts" value={lowStockItems.length} sub="Items need reorder" icon={AlertTriangle} accentColor="#f59e0b" />
        <KPICard label="Out of Stock" value={outOfStock} sub="Immediate action needed" icon={AlertTriangle} accentColor="#ef4444" />
      </div>

      {lowStockItems.length > 0 && (
        <div className="ai-banner border-amber-500/20 bg-amber-500/5">
          <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-[var(--text-secondary)]">
            <span className="text-amber-400 font-semibold">Low Stock Alert:</span>{' '}
            {lowStockItems.map(i => i.name).join(', ')} — reorder immediately to avoid project delays.
          </p>
        </div>
      )}

      <div className="ai-banner">
        <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="text-[var(--accent-light)] font-semibold">AI Insight:</span>{' '}
          Based on current project pipeline, you need 500 additional panels by Mar 10. PO002 covers 5 inverters — approve immediately. 10kW inverter stock is critically low at 2 units.
        </p>
      </div>

      {view === 'table' && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Available vs Reserved Stock</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={14} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="available" fill="#22c55e" radius={[3, 3, 0, 0]} name="Available" />
              <Bar dataKey="reserved" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Reserved" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-[var(--text-muted)] mr-1">Category:</span>
        {CATEGORY_FILTERS.map(c => (
          <button key={c} onClick={() => { setCatFilter(c); setPage(1); }}
            className={`filter-chip ${catFilter === c ? 'filter-chip-active' : ''}`}>{c}</button>
        ))}
        <div className="ml-auto">
          <Input placeholder="Search inventory…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-8 text-xs w-52" />
        </div>
      </div>

      {view === 'kanban' ? (
        <>
          <p className="text-xs text-[var(--text-muted)]">Drag items between columns to update stock status</p>
          <InvKanbanBoard items={filtered} onCardClick={setSelected} />
        </>
      ) : (
        <DataTable columns={COLUMNS} data={paginated} total={filtered.length}
          page={page} pageSize={pageSize} onPageChange={setPage}
          onPageSizeChange={s => { setPageSize(s); setPage(1); }}
          search={search} onSearch={v => { setSearch(v); setPage(1); }}
          rowActions={ROW_ACTIONS} emptyText="No inventory items found." />
      )}

      {/* Add Item Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Inventory Item"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button onClick={() => setShowAdd(false)}><Plus size={13} /> Add Item</Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Item Name"><Input placeholder="e.g. 400W Mono PERC Panel" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">Select Category</option>
                {['Panel', 'Inverter', 'BOS', 'Structure', 'Cable', 'Other'].map(c => <option key={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="Unit">
              <Select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                <option value="">Select Unit</option>
                {['Nos', 'Mtr', 'Kg', 'Set', 'Pairs', 'Box'].map(u => <option key={u}>{u}</option>)}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Min Stock Level"><Input type="number" placeholder="100" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))} /></FormField>
            <FormField label="Unit Rate (₹)"><Input type="number" placeholder="14500" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} /></FormField>
          </div>
          <FormField label="Warehouse">
            <Select value={form.warehouse} onChange={e => setForm(f => ({ ...f, warehouse: e.target.value }))}>
              <option value="">Select Warehouse</option>
              <option>WH-Ahmedabad</option><option>WH-Surat</option><option>WH-Mumbai</option>
            </Select>
          </FormField>
        </div>
      </Modal>

      {/* Stock In Modal */}
      <Modal open={showStockIn} onClose={() => setStockIn(false)} title="Stock In — Receive Materials"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setStockIn(false)}>Cancel</Button>
          <Button onClick={() => setStockIn(false)}><ArrowUp size={13} /> Confirm Receipt</Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Item">
            <Select><option value="">Select Item</option>
              {INVENTORY.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Quantity Received"><Input type="number" placeholder="100" /></FormField>
            <FormField label="PO Reference"><Input placeholder="PO001" /></FormField>
          </div>
          <FormField label="Received Date"><Input type="date" /></FormField>
          <FormField label="Remarks"><Input placeholder="Any notes about the delivery…" /></FormField>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.name}
          footer={<Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['Item ID', selected.id], ['Category', selected.category], ['Warehouse', selected.warehouse],
              ['Unit', selected.unit], ['Total Stock', `${selected.stock} ${selected.unit}`],
              ['Reserved', `${selected.reserved} ${selected.unit}`], ['Available', `${selected.available} ${selected.unit}`],
              ['Min Stock', `${selected.minStock} ${selected.unit}`], ['Unit Rate', `₹${selected.rate.toLocaleString('en-IN')}`],
              ['Total Value', fmt(selected.stock * selected.rate)],
              ['Status', <StatusBadge domain="inventory" value={getStockStatus(selected)} />],
              ['Last Updated', selected.lastUpdated],
            ].map(([k, v]) => (
              <div key={k} className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">{k}</div>
                <div className="font-semibold text-[var(--text-primary)]">{v}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InventoryPage;
