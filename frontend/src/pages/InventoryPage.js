// Solar OS – EPC Edition — InventoryPage.js
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Package, Plus, AlertTriangle, Warehouse, ArrowUp, ArrowDown, Zap, LayoutGrid, List, Edit2, Trash2, Eye, ArrowRightLeft, Scale, Tag, LayoutDashboard, TrendingUp, BarChart2, PieChartIcon, Activity, DollarSign, Target, Layers, Download, Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { Progress } from '../components/ui/Progress';
import DataTable from '../components/ui/DataTable';
import { CURRENCY, APP_CONFIG } from '../config/app.config';
import apiClient, { api } from '../lib/apiClient';
import CompactCalendarFilter from '../components/ui/CompactCalendarFilter';

const fmt = CURRENCY.format;
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api/v1';
const PROJECT_API_BASE_URL = process.env.REACT_APP_PROJECT_API_BASE_URL || 'http://localhost:3000/api/v1';
const TENANT_ID = 'solarcorp';

const getStockStatus = (item) => {
  const available = (item.stock || 0) - (item.reserved || 0);
  // Priority: Out of Stock > Low Stock > Reserved > Available
  if (available === 0) return 'out-of-stock';
  if (available < (item.minStock || 0)) return 'low-stock';
  if ((item.reserved || 0) > 0) return 'reserved';
  return 'available';
};

// ── Export Helper ─────────────────────────────────────────────────────────────
const exportToCSV = (data, filename, columns) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }
  
  const headers = columns.map(c => c.header).join(',');
  const rows = data.map(row => 
    columns.map(col => {
      const val = row[col.key] ?? '';
      // Escape values with commas or quotes
      if (String(val).includes(',') || String(val).includes('"')) {
        return `"${String(val).replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',')
  ).join('\n');
  
  const csvContent = [headers, rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ── Kanban columns ─────────────────────────────────────────────────────────────
const INV_STAGES = [
  { id: 'reserved', label: 'Reserved', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  { id: 'available', label: 'Available', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { id: 'low-stock', label: 'Low Stock', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { id: 'out-of-stock', label: 'Out of Stock', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

const COLUMNS = [
  { key: 'itemId', header: 'Item ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
  { key: 'name', header: 'Item Name', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
  { key: 'category', header: 'Category', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
  { key: 'stock', header: 'Total Stock', sortable: true, render: (v, row) => <span className="text-xs font-bold text-[var(--text-primary)]">{v} {row.unit}</span> },
  { key: 'reserved', header: 'Reserved', render: (v, row) => <span className="text-xs text-amber-400">{v || 0} {row.unit}</span> },
  {
    key: 'stock', header: 'Available', sortable: true, render: (v, row) => {
      const avail = (v || 0) - (row.reserved || 0);
      return (
        <div className="flex items-center gap-2 min-w-[80px]">
          <span className="text-xs font-bold text-emerald-400">{avail}</span>
          <Progress value={v > 0 ? Math.round((avail / v) * 100) : 0} className="h-1.5 w-16" />
        </div>
      );
    }
  },
  { key: 'minStock', header: 'Min Stock', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'rate', header: 'Unit Rate', sortable: true, render: v => <span className="text-xs text-[var(--text-muted)]">₹{v.toLocaleString('en-IN')}</span> },
  { key: 'warehouse', header: 'Warehouse', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: '__status', header: 'Status', render: (_, row) => <StatusBadge domain="inventory" value={getStockStatus(row)} /> },
];

const CATEGORY_FILTERS = ['All', 'Panel', 'Inverter', 'BOS', 'Structure'];

/* ── Inventory Kanban Card ── */
const InvCard = ({ item, onDragStart, onClick }) => {
  const available = (item.stock || 0) - (item.reserved || 0);
  const reservedPct = item.stock > 0 ? Math.round((item.reserved || 0) / item.stock * 100) : 0;
  const status = getStockStatus(item);
  const stage = INV_STAGES.find(s => s.id === status);
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-[var(--primary)]/40 transition-all">
      <div className="flex items-start justify-between mb-1">
        <span className="text-[10px] font-mono text-[var(--accent-light)]">{item.itemId}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: stage?.bg, color: stage?.color }}>{item.category}</span>
      </div>
      <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5 leading-tight">{item.name}</p>
      <div className="flex items-center gap-1.5 mb-2">
        <Warehouse size={12} className="text-[var(--accent-light)]" />
        <span className="text-[11px] font-medium text-[var(--accent-light)]">{item.warehouse}</span>
      </div>
      <Progress value={100 - reservedPct} className="h-1 mb-2" />
      <div className="grid grid-cols-2 gap-1 text-center">
        <div>
          <p className="text-[9px] text-[var(--text-faint)]">Available</p>
          <p className="text-[11px] font-bold text-emerald-400">{available}</p>
        </div>
        <div>
          <p className="text-[9px] text-[var(--text-faint)]">Reserved</p>
          <p className="text-[11px] font-bold text-amber-400">{item.reserved || 0}</p>
        </div>
      </div>
      {item._originalWarehouses && item._originalWarehouses.length > 1 && (
        <div className="mt-2 text-[9px] text-[var(--text-muted)] border-t border-[var(--border-base)] pt-1">
          {item._originalWarehouses.map((wh, idx) => (
            <span key={wh.warehouse}>
              {wh.warehouse}: {wh.stock} {idx < item._originalWarehouses.length - 1 ? ' | ' : ''}
            </span>
          ))}
        </div>
      )}
      {available <= item.minStock && available > 0 && (
        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-amber-400">
          <AlertTriangle size={9} /> Below min stock ({item.minStock})
        </div>
      )}
      <div className="mt-1.5 text-[10px] font-bold text-[var(--text-secondary)]">
        ₹{(item.stock * item.rate).toLocaleString('en-IN')}
      </div>
      <div className="mt-1 text-[9px] text-[var(--text-faint)]">
        Min: {item.minStock || 0} {item.unit}
      </div>
    </div>
  );
};

/* ── Kanban Board ── */
const InvKanbanBoard = ({ items, onCardClick, onDrop }) => {
  const draggingId = useRef(null);
  const draggingStageId = useRef(null);
  const [dragOver, setDragOver] = useState(null);
  const [stageOrder, setStageOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('invKanbanStageOrder');
      if (!saved) return INV_STAGES.map(s => s.id);
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return INV_STAGES.map(s => s.id);
      const valid = parsed.filter(id => INV_STAGES.some(s => s.id === id));
      const missing = INV_STAGES.map(s => s.id).filter(id => !valid.includes(id));
      return [...valid, ...missing];
    } catch {
      return INV_STAGES.map(s => s.id);
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('invKanbanStageOrder', JSON.stringify(stageOrder));
    } catch {
      // ignore
    }
  }, [stageOrder]);

  const handleDrop = (stageId) => {
    if (draggingStageId.current) {
      const from = draggingStageId.current;
      const to = stageId;
      if (from !== to) {
        setStageOrder(prev => {
          const next = [...prev];
          const fromIdx = next.indexOf(from);
          const toIdx = next.indexOf(to);
          if (fromIdx === -1 || toIdx === -1) return prev;
          next.splice(fromIdx, 1);
          next.splice(toIdx, 0, from);
          return next;
        });
      }
      draggingStageId.current = null;
      setDragOver(null);
      return;
    }

    if (draggingId.current && onDrop) {
      onDrop(draggingId.current, stageId);
    }
    draggingId.current = null; setDragOver(null);
  };

  return (
    <div className="overflow-x-auto pb-3 -mx-2 px-2">
      <div className="flex gap-3 min-w-max">
        {stageOrder
          .map(id => INV_STAGES.find(s => s.id === id))
          .filter(Boolean)
          .map(stage => {
            const cards = items.filter(i => getStockStatus(i) === stage.id);
            const totalVal = cards.reduce((a, i) => a + ((i.stock || 0) - (i.reserved || 0)) * i.rate, 0);
            return (
              <div key={stage.id}
                className={`flex flex-col w-72 sm:w-60 rounded-xl border transition-colors ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}
                onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(stage.id)}>
                <div
                  draggable
                  onDragStart={(e) => {
                    draggingStageId.current = stage.id;
                    try {
                      e.dataTransfer.effectAllowed = 'move';
                    } catch {
                      // ignore
                    }
                  }}
                  onDragEnd={() => { draggingStageId.current = null; setDragOver(null); }}
                  className="flex items-center justify-between p-3 border-b border-[var(--border-base)] cursor-grab active:cursor-grabbing"
                  title="Drag to reorder columns"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {totalVal > 0 && <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">₹{(totalVal / 100000).toFixed(1)}L</span>}
                    <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                      style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 p-2 flex-1 min-h-[180px]">
                  {cards.map(i => (
                    <InvCard key={i.itemId} item={i}
                      onDragStart={() => { draggingId.current = i.itemId; }}
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
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'inventory', 'warehouse', 'items', 'category', 'unit'
  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');

  // Month filter for dashboard
  const [inventoryMonthFilter, setInventoryMonthFilter] = useState('all');
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showAdd, setShowAdd] = useState(false);
  const [showStockIn, setStockIn] = useState(false);
  const [selected, setSelected] = useState(null);
  const [itemReservations, setItemReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [form, setForm] = useState({ itemId: '', name: '', category: '', unit: '', minStock: '', rate: '', warehouse: '' });
  const [stockInForm, setStockInForm] = useState({ itemId: '', quantity: '', poId: '', poReference: '', receivedDate: '', remarks: '', warehouse: '' });
  // Store warehouses as objects with name and code
  const [warehouseData, setWarehouseData] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [newWarehouse, setNewWarehouse] = useState('');
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [editWarehouseValue, setEditWarehouseValue] = useState('');
  const [viewingWarehouse, setViewingWarehouse] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [units, setUnits] = useState([]);
  const [unitData, setUnitData] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingUnit, setEditingUnit] = useState(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');
  const [editUnitValue, setEditUnitValue] = useState('');
  const [viewingCategory, setViewingCategory] = useState(null);
  const [viewingUnit, setViewingUnit] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', category: '', unit: '', minStock: '', rate: '', status: '' });
  const [showStockOut, setShowStockOut] = useState(false);
  const [stockOutForm, setStockOutForm] = useState({ itemId: '', quantity: '', projectId: '', issuedDate: '', remarks: '' });
  const [inventory, setInventory] = useState([]);
  
  // Dynamic month options based on inventory dates
  const inventoryMonthOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Time' }];
    if (!inventory || inventory.length === 0) return options;
    
    // Find earliest and latest dates from inventory
    const dates = inventory
      .map(i => i.lastUpdated || i.updatedAt || i.createdAt || i.date)
      .filter(d => d)
      .map(d => new Date(d));
    
    if (dates.length === 0) return options;
    
    const earliestDate = new Date(Math.min(...dates));
    const now = new Date();
    
    // Start from earliest inventory month, go till current month + 3 future months
    const startDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 1);
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Generate all months in range
    const current = new Date(startDate);
    while (current <= endDate) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const value = `${year}-${String(month + 1).padStart(2, '0')}`;
      const label = `${monthNames[month]} ${year}`;
      options.push({ value, label });
      current.setMonth(current.getMonth() + 1);
    }
    
    // Reverse to show newest first
    return options.reverse();
  }, [inventory]);
  
  const [items, setItems] = useState([]); // Items from Items module
  const [projects, setProjects] = useState([]); // Projects for reservation display
  const [purchaseOrders, setPurchaseOrders] = useState([]); // POs for Stock In
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ totalItems: 0, totalValue: 0, lowStockItems: 0, outOfStockItems: 0 });
  const [inventoryStats, setInventoryStats] = useState(null);
  const [itemsByCategory, setItemsByCategory] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFromWarehouse, setTransferFromWarehouse] = useState('');
  const [transferToWarehouse, setTransferToWarehouse] = useState('');
  const [transferItem, setTransferItem] = useState('');
  const [transferQuantity, setTransferQuantity] = useState('');
  const [transferRemarks, setTransferRemarks] = useState('');
  const [showCardsInViews, setShowCardsInViews] = useState(false); // Toggle KPI cards in list/kanban view
  const [showCategoryCards, setShowCategoryCards] = useState(true); // Toggle cards in Category tab
  const [showUnitCards, setShowUnitCards] = useState(true); // Toggle cards in Unit tab

  // Bulk selection states for all tables
  const [selectedInventoryItems, setSelectedInventoryItems] = useState(new Set());
  const [selectedWarehouses, setSelectedWarehouses] = useState(new Set());
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [selectedUnits, setSelectedUnits] = useState(new Set());

  // Pagination and search states for different tables
  // Warehouse table
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [warehousePage, setWarehousePage] = useState(1);
  const [warehousePageSize, setWarehousePageSize] = useState(10);

  // Items table pagination (search already exists)
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsPageSize, setItemsPageSize] = useState(10);

  // Category table
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryPageSize, setCategoryPageSize] = useState(10);

  // Unit table
  const [unitSearch, setUnitSearch] = useState('');
  const [unitPage, setUnitPage] = useState(1);
  const [unitPageSize, setUnitPageSize] = useState(10);

  // Warehouse items modal
  const [whItemsSearch, setWhItemsSearch] = useState('');
  const [whItemsPage, setWhItemsPage] = useState(1);
  const [whItemsPageSize, setWhItemsPageSize] = useState(10);

  // Fetch warehouses from API
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const data = await api.get('/lookups/warehouses', { headers: { 'x-tenant-id': TENANT_ID } });
        const warehousesArray = Array.isArray(data) ? data : (data.data || []);
        setWarehouseData(warehousesArray); // Store full objects with code
        setWarehouses(warehousesArray.map(w => w.name));
      } catch (err) {
        console.error('Failed to fetch warehouses:', err);
        setWarehouses([]); // No hardcoded fallback
      }
    };
    fetchWarehouses();
  }, []);

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await api.get('/lookups/categories', { headers: { 'x-tenant-id': TENANT_ID } });
        const categoriesArray = Array.isArray(data) ? data : (data.data || []);
        setCategoryData(categoriesArray);
        setCategories(categoriesArray.map(c => c.name));
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setCategories([]); // No hardcoded fallback
      }
    };
    fetchCategories();
  }, []);

  // Fetch units from API
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const data = await api.get('/lookups/units', { headers: { 'x-tenant-id': TENANT_ID } });
        const unitsArray = Array.isArray(data) ? data : (data.data || []);
        setUnitData(unitsArray);
        setUnits(unitsArray.map(u => u.name));
      } catch (err) {
        console.error('Failed to fetch units:', err);
        setUnits([]); // No hardcoded fallback
      }
    };
    fetchUnits();
  }, []);

  const handleAddWarehouse = async () => {
    const name = newWarehouse.trim();
    if (!name) {
      alert('Please enter a warehouse name');
      return;
    }
    if (warehouses.includes(name)) {
      alert('Warehouse already exists');
      return;
    }

    setSubmitting(true);
    try {
      const code = name.toUpperCase().replace(/\s+/g, '-');
      await api.post('/lookups/warehouses', {
        code,
        name,
        location: name,
      }, { headers: { 'x-tenant-id': TENANT_ID } });
      setWarehouses([...warehouses, name]);
      setNewWarehouse('');
      setShowWarehouseModal(false);
      alert('Warehouse added successfully');
    } catch (err) {
      alert(err.message || 'Failed to add warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditWarehouse = async (oldName) => {
    const name = editWarehouseValue.trim();
    if (!name) {
      alert('Please enter a warehouse name');
      return;
    }
    if (warehouses.includes(name) && name !== oldName) {
      alert('Warehouse already exists');
      return;
    }

    setSubmitting(true);
    try {
      // Find the warehouse data to get the actual code
      const warehouseObj = warehouseData.find(w => w.name === oldName);
      const oldCode = warehouseObj?.code || oldName.toUpperCase().replace(/\s+/g, '-');
      await api.patch(`/lookups/warehouses/${oldCode}`, {
        name,
      }, { headers: { 'x-tenant-id': TENANT_ID } });
      setWarehouses(warehouses.map(w => (w === oldName ? name : w)));
      setWarehouseData(warehouseData.map(w => (w.name === oldName ? { ...w, name } : w)));
      setInventory(prev => prev.map(i => (i.warehouse === oldName ? { ...i, warehouse: name } : i)));
      setEditingWarehouse(null);
      setEditWarehouseValue('');
      alert('Warehouse updated successfully');
    } catch (err) {
      alert(err.message || 'Failed to update warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWarehouse = async (name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" warehouse?`)) return;

    setSubmitting(true);
    try {
      // Find the warehouse data to get the actual code
      const warehouseObj = warehouseData.find(w => w.name === name);
      const code = warehouseObj?.code || name.toUpperCase().replace(/\s+/g, '-');
      await api.delete(`/lookups/warehouses/${code}`, { headers: { 'x-tenant-id': TENANT_ID } });
      setWarehouses(warehouses.filter(w => w !== name));
      setWarehouseData(warehouseData.filter(w => w.name !== name));
      setInventory(prev => prev.map(i => (i.warehouse === name ? { ...i, warehouse: '' } : i)));
      alert('Warehouse deleted successfully');
    } catch (err) {
      alert(err.message || 'Failed to delete warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferItem || !transferQuantity || !transferToWarehouse) {
      alert('Please fill all required fields');
      return;
    }
    if (transferFromWarehouse === transferToWarehouse) {
      alert('Source and destination warehouse cannot be the same');
      return;
    }

    const qty = parseInt(transferQuantity);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const item = inventory.find(i => i.itemId === transferItem && i.warehouse === transferFromWarehouse);
    if (!item) {
      alert('Item not found in source warehouse');
      return;
    }

    // Debug: Check if _id exists
    if (!item._id) {
      console.error('Item _id is missing:', item);
      alert(`Error: Item _id is missing. ItemId: ${item.itemId}, Warehouse: ${item.warehouse}. Please check console.`);
      return;
    }

    if ((item.available || 0) < qty) {
      alert(`Insufficient stock. Available: ${item.available} ${item.unit}`);
      return;
    }

    setSubmitting(true);
    try {
      // First, check if item exists in destination warehouse
      const existingItemInDest = inventory.find(i => i.itemId === transferItem && i.warehouse === transferToWarehouse);

      if (existingItemInDest) {
        // Transfer between existing items - directly update stock (don't use stock-out which increments reserved)
        // Source: decrease stock
        await api.patch(`/items/${item._id || item.itemId}`, {
          stock: (item.stock || 0) - qty,
        }, { headers: { 'x-tenant-id': TENANT_ID } });

        // Destination: increase stock
        await api.patch(`/items/${existingItemInDest._id || existingItemInDest.itemId}`, {
          stock: (existingItemInDest.stock || 0) + qty,
        }, { headers: { 'x-tenant-id': TENANT_ID } });

        // Add transfer record to remarks/history if needed
        await api.post('/inventory/transfers', {
          itemId: item.itemId,
          fromWarehouse: transferFromWarehouse,
          toWarehouse: transferToWarehouse,
          quantity: qty,
          remarks: transferRemarks || 'Stock transfer',
          date: new Date().toISOString(),
        }, { headers: { 'x-tenant-id': TENANT_ID } }).catch(() => {
          // Ignore if transfers endpoint doesn't exist
        });
      } else {
        // Create new item in destination warehouse
        const newItemData = {
          itemId: item.itemId,
          description: item.name || item.description,
          category: item.category,
          unit: item.unit,
          stock: qty,
          reserved: 0,
          minStock: item.minStock || 0,
          rate: item.rate || 0,
          warehouse: transferToWarehouse,
          status: 'In Stock',
        };

        // Create new item in destination warehouse
        const createdItem = await api.post('/items', newItemData, { headers: { 'x-tenant-id': TENANT_ID } });

        // Stock out from source warehouse
        await api.post(`/items/${item._id || item.itemId}/stock-out`, {
          quantity: qty,
          remarks: `Transferred to ${transferToWarehouse} (new item created): ${transferRemarks || 'Stock transfer'}`,
        }, { headers: { 'x-tenant-id': TENANT_ID } });
      }

      // Refresh inventory
      const data = await api.get('/items', { headers: { 'x-tenant-id': TENANT_ID } });
      const itemsArray = Array.isArray(data) ? data : (data.data || []);
      const inventoryData = itemsArray.map(item => ({
        ...item,
        _id: item._id || item.id, // Ensure _id is preserved
        name: item.description || item.name || 'Unnamed Item',
        reserved: item.reserved || 0,
        available: (item.stock || 0) - (item.reserved || 0),
        lastUpdated: item.updatedAt || new Date().toISOString().split('T')[0]
      }));
      setInventory(inventoryData);

      setShowTransferModal(false);
      setTransferToWarehouse('');
      setTransferItem('');
      setTransferQuantity('');
      setTransferRemarks('');
      alert(`Successfully transferred ${qty} ${item.unit} of ${item.name || item.description} from ${transferFromWarehouse} to ${transferToWarehouse}`);
    } catch (err) {
      // Error logged silently
      alert(err.message || 'Failed to transfer stock. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch inventory stats from backend
  useEffect(() => {
    const fetchInventoryStats = async () => {
      try {
        const data = await api.get('/inventory/stats');
        setInventoryStats(data.data || data);
      } catch (err) {
        // Error fetching stats
      }
    };
    fetchInventoryStats();
  }, []);

  // Fetch items by category for chart
  useEffect(() => {
    const fetchByCategory = async () => {
      try {
        const data = await api.get('/inventory/by-category');
        setItemsByCategory(data.data || data || []);
      } catch (err) {
        // Error fetching by category
      }
    };
    fetchByCategory();
  }, []);

  // Fetch items from Items module (instead of inventory)
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const data = await api.get('/items');

        // Parse items array from response
        let itemsArray = [];
        if (Array.isArray(data)) {
          itemsArray = data;
        } else if (data.data && Array.isArray(data.data)) {
          itemsArray = data.data;
        } else if (data.items && Array.isArray(data.items)) {
          itemsArray = data.items;
        }

        // Map items to inventory format (description -> name, add reserved/available)
        const inventoryData = itemsArray.map(item => {
          const id = item._id || item.id;
          if (!id) {
            console.warn('Item _id is missing:', item.itemId || item.name || 'Unknown');
          }
          return {
            ...item,
            _id: id,
            name: item.description || item.name || 'Unnamed Item',
            reserved: item.reserved || 0,
            available: (item.stock || 0) - (item.reserved || 0),
            lastUpdated: item.updatedAt || new Date().toISOString().split('T')[0]
          };
        });

        setInventory(inventoryData);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  // Fetch items from Items module for Stock In/Out modals
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const data = await api.get('/items');
        const itemsArray = Array.isArray(data) ? data : (data.data || []);
        setItems(itemsArray);
      } catch (err) {
        // Error fetching items
      }
    };

    fetchItems();
  }, []);

  // Fetch projects for reservation display
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await api.get('/projects');
        const projectsArray = Array.isArray(data) ? data : (data.data || []);
        setProjects(projectsArray);
      } catch (err) {
        // Error fetching projects
      }
    };

    // Fetch Purchase Orders for Stock In PO selector
    const fetchPurchaseOrders = async () => {
      try {
        const res = await api.get('/procurement/purchase-orders', { headers: { 'x-tenant-id': TENANT_ID } });
        const posData = Array.isArray(res) ? res : (Array.isArray(res.data) ? res.data : (res.data?.data || []));
        setPurchaseOrders(posData);
      } catch (err) {
        // silent fail
      }
    };

    fetchProjects();
    fetchPurchaseOrders();
  }, []);

  // Calculate dynamic stats from inventory
  const dynamicStats = useMemo(() => {
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((a, i) => a + (i.stock || 0) * (i.rate || 0), 0);
    
    // Use getStockStatus logic to match Kanban columns exactly
    const lowStockItems = inventory.filter(i => getStockStatus(i) === 'low-stock').length;
    const outOfStockItems = inventory.filter(i => getStockStatus(i) === 'out-of-stock').length;
    const reservedItems = inventory.filter(i => getStockStatus(i) === 'reserved').length;
    const availableItems = inventory.filter(i => getStockStatus(i) === 'available').length;

    return { totalItems, totalValue, lowStockItems, outOfStockItems, reservedItems, availableItems };
  }, [inventory]);

  const warehouseItems = useMemo(() => {
    if (!viewingWarehouse) return [];
    return inventory
      .filter(i => i.warehouse === viewingWarehouse)
      .map(i => ({
        ...i,
        name: i.name || i.description,
        available: (i.available ?? ((i.stock || 0) - (i.reserved || 0))),
      }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [inventory, viewingWarehouse]);

  const filtered = useMemo(() =>
    inventory.filter(i =>
      (catFilter === 'All' || i.category === catFilter) &&
      i.name?.toLowerCase().includes(search.toLowerCase())
    ), [inventory, search, catFilter]);

  // Consolidate items by itemId for kanban view (aggregate stock across all warehouses)
  const consolidatedItems = useMemo(() => {
    const grouped = filtered.reduce((acc, item) => {
      const key = item.itemId;
      if (!acc[key]) {
        acc[key] = {
          ...item,
          _originalWarehouses: [{ warehouse: item.warehouse, stock: item.stock, reserved: item.reserved, available: item.available }],
        };
      } else {
        // Aggregate stock across warehouses
        acc[key].stock += (item.stock || 0);
        acc[key].reserved += (item.reserved || 0);
        acc[key].available = (acc[key].stock || 0) - (acc[key].reserved || 0);
        acc[key]._originalWarehouses.push({ warehouse: item.warehouse, stock: item.stock, reserved: item.reserved, available: item.available });
        // Use the first warehouse as primary for display
        acc[key].warehouse = `${acc[key]._originalWarehouses.length} warehouses`;
      }
      return acc;
    }, {});
    return Object.values(grouped);
  }, [filtered]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const chartData = inventory.slice(0, 10).map(i => ({
    name: (i.name || i.description || 'Unknown').length > 14 ? (i.name || i.description || 'Unknown').slice(0, 14) + '…' : (i.name || i.description || 'Unknown'),
    available: i.available, reserved: i.reserved,
  }));

  const handleAddItem = async () => {
    setSubmitting(true);
    try {
      const response = await api.post('/items', {
        itemId: form.itemId?.trim() || `INV${Date.now().toString().slice(-4)}`,
        description: form.name,
        category: form.category,
        unit: form.unit,
        stock: 0,
        reserved: 0,
        minStock: parseInt(form.minStock) || 0,
        rate: parseFloat(form.rate) || 0,
        warehouse: form.warehouse,
        status: 'In Stock',
      }, { headers: { 'x-tenant-id': TENANT_ID } });

      const createdItem = response;
      const itemData = createdItem.data || createdItem;
      const newItem = {
        ...itemData,
        _id: itemData._id || itemData.id,
        name: itemData.description || itemData.name,
        reserved: itemData.reserved || 0,
        available: (itemData.stock || 0) - (itemData.reserved || 0),
        lastUpdated: itemData.updatedAt || new Date().toISOString().split('T')[0]
      };

      setInventory(prev => [...prev, newItem]);
      setShowAdd(false);
      setForm({ itemId: '', name: '', category: '', unit: '', minStock: '', rate: '', warehouse: '' });
      alert('Item added successfully!');
    } catch (err) {
      alert(err.message || 'Failed to add item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockIn = async () => {
    if (!stockInForm.itemId || !stockInForm.quantity) return;

    setSubmitting(true);
    try {
      // Find item by itemId to get _id
      const item = inventory.find(i => i.itemId === stockInForm.itemId || i._id === stockInForm.itemId);
      if (!item || !item._id) {
        alert('Item not found');
        setSubmitting(false);
        return;
      }

      const response = await api.post(`/items/${item._id}/stock-in`, {
        quantity: parseInt(stockInForm.quantity),
        poReference: stockInForm.poReference,
        receivedDate: stockInForm.receivedDate,
        remarks: stockInForm.remarks,
        warehouse: stockInForm.warehouse,
      }, { headers: { 'x-tenant-id': TENANT_ID } });

      // Reload all inventory to reflect any new warehouse records created
      const allItems = await api.get('/items');
      let itemsArray = Array.isArray(allItems) ? allItems : (allItems.data || []);
      const inventoryData = itemsArray.map(i => ({
        ...i,
        _id: i._id || i.id,
        name: i.description || i.name || 'Unnamed Item',
        reserved: i.reserved || 0,
        available: (i.stock || 0) - (i.reserved || 0),
        lastUpdated: i.updatedAt || new Date().toISOString().split('T')[0],
      }));
      setInventory(inventoryData);

      setStockIn(false);
      setStockInForm({ itemId: '', quantity: '', poId: '', poReference: '', receivedDate: '', remarks: '', warehouse: '' });
      alert('Stock added successfully!');
    } catch (err) {
      alert(err.message || 'Failed to add stock. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch reservations when viewing item details
  useEffect(() => {
    if (selected?._id) {
      console.log('[FRONTEND] Selected item for reservation fetch:', selected);
      console.log('[FRONTEND] itemId:', selected.itemId, '_id:', selected._id);
      // Try both _id and itemId
      const itemIdToFetch = selected.itemId || selected._id;
      fetchItemReservations(itemIdToFetch);
    }
  }, [selected?._id, selected?.itemId]);

  const fetchItemReservations = async (itemId) => {
    setLoadingReservations(true);
    try {
      console.log('[FRONTEND] Fetching reservations for itemId:', itemId);
      console.log('[FRONTEND] TENANT_ID:', TENANT_ID);
      const data = await api.get(`/inventory/reservations/by-item/${itemId}`);
      console.log('[FRONTEND] Raw API response:', data);
      const reservations = data.data || data || [];
      console.log('[FRONTEND] Processed reservations:', reservations);
      console.log('[FRONTEND] Number of reservations:', reservations.length);
      setItemReservations(reservations);
    } catch (err) {
      console.error('[FRONTEND] Error fetching reservations:', err);
      setItemReservations([]);
    } finally {
      setLoadingReservations(false);
    }
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setEditForm({
      name: item.name || '',
      category: item.category || '',
      unit: item.unit || '',
      minStock: item.minStock || '',
      rate: item.rate || '',
      warehouse: item.warehouse || '',
      status: item.status || ''
    });
    setShowEdit(true);
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    setSubmitting(true);
    try {
      const updateData = {
        description: editForm.name,
        category: editForm.category,
        unit: editForm.unit,
        minStock: parseInt(editForm.minStock) || 0,
        rate: parseFloat(editForm.rate) || 0,
        status: editForm.status || undefined
      };

      const updatedItem = await api.patch(`/items/${editingItem._id}`, updateData, { headers: { 'x-tenant-id': TENANT_ID } });
      const itemData = updatedItem.data || updatedItem;
      
      // Transform the item data to match frontend format
      const transformedItem = {
        ...itemData,
        _id: itemData._id || itemData.id || editingItem._id,
        name: itemData.description || itemData.name || editForm.name || 'Unnamed Item',
        category: itemData.category || editForm.category,
        unit: itemData.unit || editForm.unit,
        rate: itemData.rate || parseFloat(editForm.rate) || 0,
        minStock: itemData.minStock || parseInt(editForm.minStock) || 0,
        status: itemData.status || editForm.status || editingItem.status,
        reserved: itemData.reserved || 0,
        available: (itemData.stock || 0) - (itemData.reserved || 0),
        lastUpdated: itemData.updatedAt || new Date().toISOString().split('T')[0],
      };
      
      setInventory(prev => prev.map(i => (i._id === editingItem._id || i.itemId === editingItem.itemId) ? transformedItem : i));
      setShowEdit(false);
      setEditingItem(null);
      setEditForm({ name: '', category: '', unit: '', minStock: '', rate: '', status: '' });
      alert('Item updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    // Debug: Check if _id exists
    if (!item._id) {
      console.error('Item _id is missing:', item);
      alert(`Error: Cannot delete - Item _id is missing. ItemId: ${item.itemId}`);
      return;
    }

    try {
      await api.delete(`/items/${item._id}`, { headers: { 'x-tenant-id': TENANT_ID } });

      setInventory(prev => prev.filter(i => i._id !== item._id));
      alert('Item deleted successfully!');
    } catch (err) {
      alert(err.message || 'Failed to delete item. Please try again.');
    }
  };

  const handleStockOut = async () => {
    if (!stockOutForm.itemId || !stockOutForm.quantity) return;

    setSubmitting(true);
    try {
      // Find item by itemId to get _id
      const item = inventory.find(i => i.itemId === stockOutForm.itemId || i._id === stockOutForm.itemId);
      if (!item || !item._id) {
        alert('Item not found');
        setSubmitting(false);
        return;
      }

      const updatedItem = await api.post(`/items/${item._id}/stock-out`, {
        quantity: parseInt(stockOutForm.quantity),
        projectId: stockOutForm.projectId,
        issuedDate: stockOutForm.issuedDate,
        remarks: stockOutForm.remarks,
      }, { headers: { 'x-tenant-id': TENANT_ID } });

      const itemData = updatedItem.data || updatedItem;

      // Create reservation record for the project
      if (stockOutForm.projectId) {
        try {
          // Find project name
          const project = projects.find(p => p.projectId === stockOutForm.projectId);
          const projectName = project?.customerName || project?.name || 'Unknown Project';

          console.log('[FRONTEND] Creating reservation for item:', item?.itemId, 'project:', stockOutForm.projectId);
          
          const resResponse = await apiClient.post('/inventory/reservations', {
            reservationId: `RES-${Date.now()}`,
            itemId: item?.itemId || stockOutForm.itemId,
            inventoryId: item?._id,
            projectId: stockOutForm.projectId,
            projectName: projectName,
            quantity: parseInt(stockOutForm.quantity),
            notes: stockOutForm.remarks || `Stock issued on ${stockOutForm.issuedDate || new Date().toISOString().split('T')[0]}`,
          }, { params: { tenantId: TENANT_ID } });
          
          console.log('[FRONTEND] Reservation created:', resResponse);
        } catch (resErr) {
          console.error('[FRONTEND] Reservation creation failed:', resErr);
          // Don't fail the whole operation if reservation creation fails
        }
      }

      // Transform the item data to match frontend format (same as handleStockIn)
      const transformedItem = {
        ...itemData,
        _id: itemData._id || itemData.id,
        name: itemData.description || itemData.name || 'Unnamed Item',
        reserved: itemData.reserved || 0,
        available: (itemData.stock || 0) - (itemData.reserved || 0),
        lastUpdated: itemData.updatedAt || new Date().toISOString().split('T')[0],
      };

      setInventory(prev => prev.map(i => i._id === item._id ? transformedItem : i));
      setShowStockOut(false);
      setStockOutForm({ itemId: '', quantity: '', projectId: '', issuedDate: '', remarks: '' });
      alert('Stock issued successfully! Project reservation recorded.');
    } catch (err) {
      alert(err.message || 'Failed to issue stock. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle kanban drop - update item status
  const handleKanbanDrop = async (itemId, targetStage) => {
    // Map stage IDs to status values
    const stageToStatus = {
      'in-stock': 'Available',
      'reserved': 'Reserved',
      'available': 'Available',
      'low-stock': 'Low Stock',
      'out-of-stock': 'Out of Stock'
    };

    const newStatus = stageToStatus[targetStage];
    if (!newStatus) return;

    setSubmitting(true);
    try {
      // Find the item to get its _id
      const item = inventory.find(i => i.itemId === itemId || i._id === itemId);
      if (!item) {
        alert('Item not found');
        return;
      }

      const updatedItem = await api.patch(`/items/${item._id || itemId}`, { status: newStatus }, { headers: { 'x-tenant-id': TENANT_ID } });
      const itemData = updatedItem.data || updatedItem;
      setInventory(prev => prev.map(i => (i._id || i.itemId) === (itemData._id || itemData.itemId) ? { ...i, status: newStatus } : i));

      // Refresh stats
      const statsData = await api.get('/inventory/stats', { headers: { 'x-tenant-id': TENANT_ID } });
      setInventoryStats(statsData.data || statsData);
    } catch (err) {
      alert(err.message || 'Failed to update stock status. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Category CRUD Functions
  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      alert('Please enter a category name');
      return;
    }
    if (categories.includes(newCategory.trim())) {
      alert('Category already exists');
      return;
    }

    setSubmitting(true);
    try {
      const code = newCategory.trim().toUpperCase().replace(/\s+/g, '-');
      await api.post('/lookups/categories', {
        code,
        name: newCategory.trim(),
        description: `${newCategory.trim()} category`,
      }, { headers: { 'x-tenant-id': TENANT_ID } });
      setCategories([...categories, newCategory.trim()]);
      setNewCategory('');
      setShowCategoryModal(false);
      alert('Category added successfully');
    } catch (err) {
      alert(err.message || 'Failed to add category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCategory = async (oldCategory) => {
    if (!editCategoryValue.trim()) {
      alert('Please enter a category name');
      return;
    }
    if (categories.includes(editCategoryValue.trim()) && editCategoryValue.trim() !== oldCategory) {
      alert('Category already exists');
      return;
    }

    setSubmitting(true);
    try {
      const catObj = categoryData.find(c => c.name === oldCategory);
      const oldCode = catObj?.code || oldCategory.toUpperCase().replace(/\s+/g, '-');
      await api.patch(`/lookups/categories/${oldCode}`, {
        name: editCategoryValue.trim(),
      }, { headers: { 'x-tenant-id': TENANT_ID } });
      setCategories(categories.map(cat => cat === oldCategory ? editCategoryValue.trim() : cat));
      setCategoryData(categoryData.map(c => (c.name === oldCategory ? { ...c, name: editCategoryValue.trim() } : c)));
      setEditingCategory(null);
      setEditCategoryValue('');
      alert('Category updated successfully');
    } catch (err) {
      alert(err.message || 'Failed to update category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryToDelete) => {
    if (!window.confirm(`Are you sure you want to delete "${categoryToDelete}" category?`)) {
      return;
    }

    setSubmitting(true);
    try {
      const catObj = categoryData.find(c => c.name === categoryToDelete);
      const code = catObj?.code || categoryToDelete.toUpperCase().replace(/\s+/g, '-');
      await api.delete(`/lookups/categories/${code}`, { headers: { 'x-tenant-id': TENANT_ID } });
      setCategories(categories.filter(cat => cat !== categoryToDelete));
      setCategoryData(categoryData.filter(c => c.name !== categoryToDelete));
      alert('Category deleted successfully');
    } catch (err) {
      alert(err.message || 'Failed to delete category');
    } finally {
      setSubmitting(false);
    }
  };

  // Unit CRUD Functions
  const handleAddUnit = async () => {
    if (!newUnit.trim()) {
      alert('Please enter a unit name');
      return;
    }
    if (units.includes(newUnit.trim())) {
      alert('Unit already exists');
      return;
    }

    setSubmitting(true);
    try {
      const code = newUnit.trim().toUpperCase().replace(/\s+/g, '-');
      await api.post('/lookups/units', {
        code,
        name: newUnit.trim(),
        description: `${newUnit.trim()} unit`,
      }, { headers: { 'x-tenant-id': TENANT_ID } });
      setUnits([...units, newUnit.trim()]);
      setNewUnit('');
      setShowUnitModal(false);
      alert('Unit added successfully');
    } catch (err) {
      alert(err.message || 'Failed to add unit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUnit = async (oldUnit) => {
    if (!editUnitValue.trim()) {
      alert('Please enter a unit name');
      return;
    }
    if (units.includes(editUnitValue.trim()) && editUnitValue.trim() !== oldUnit) {
      alert('Unit already exists');
      return;
    }

    setSubmitting(true);
    try {
      const unitObj = unitData.find(u => u.name === oldUnit);
      const oldCode = unitObj?.code || oldUnit.toUpperCase().replace(/\s+/g, '-');
      await api.patch(`/lookups/units/${oldCode}`, {
        name: editUnitValue.trim(),
      }, { headers: { 'x-tenant-id': TENANT_ID } });
      setUnits(units.map(u => u === oldUnit ? editUnitValue.trim() : u));
      setUnitData(unitData.map(u => (u.name === oldUnit ? { ...u, name: editUnitValue.trim() } : u)));
      setEditingUnit(null);
      setEditUnitValue('');
      alert('Unit updated successfully');
    } catch (err) {
      alert(err.message || 'Failed to update unit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUnit = async (unitToDelete) => {
    if (!window.confirm(`Are you sure you want to delete "${unitToDelete}" unit?`)) {
      return;
    }

    setSubmitting(true);
    try {
      const unitObj = unitData.find(u => u.name === unitToDelete);
      const code = unitObj?.code || unitToDelete.toUpperCase().replace(/\s+/g, '-');
      await api.delete(`/lookups/units/${code}`, { headers: { 'x-tenant-id': TENANT_ID } });
      setUnits(units.filter(u => u !== unitToDelete));
      setUnitData(unitData.filter(u => u.name !== unitToDelete));
      alert('Unit deleted successfully');
    } catch (err) {
      alert(err.message || 'Failed to delete unit');
    } finally {
      setSubmitting(false);
    }
  };

  const ROW_ACTIONS = [
    { label: 'View Details', icon: Package, onClick: row => setSelected(row) },
    { label: 'Edit', icon: Edit2, onClick: row => handleEditClick(row) },
    { label: 'Stock In', icon: ArrowUp, onClick: row => { 
      setStockInForm({ 
        ...stockInForm, 
        itemId: row.itemId,
        warehouse: row.warehouse || '' // Auto-select the item's current warehouse
      }); 
      setStockIn(true); 
    } },
    { label: 'Stock Out', icon: ArrowDown, onClick: row => { setStockOutForm({ ...stockOutForm, itemId: row.itemId }); setShowStockOut(true); } },
    { label: 'Delete', icon: Trash2, onClick: row => handleDeleteItem(row), danger: true },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <div className="page-header flex-col sm:flex-row gap-3">
        <div>
          <h1 className="heading-page text-lg sm:text-xl">Inventory Management</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Stock levels · reservations · low-stock alerts · warehouses</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Filter - Only for dashboard, placed before tabs */}
          {activeTab === 'dashboard' && (
            <CompactCalendarFilter
              onDateChange={(dateInfo) => {
                if (dateInfo === null) {
                  setInventoryMonthFilter('all');
                } else if (dateInfo.isToday) {
                  const today = new Date();
                  setInventoryMonthFilter(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
                } else if (dateInfo.month !== undefined && dateInfo.month !== null) {
                  setInventoryMonthFilter(`${dateInfo.year}-${String(dateInfo.month + 1).padStart(2, '0')}`);
                } else {
                  setInventoryMonthFilter(`${dateInfo.year}`);
                }
              }}
            />
          )}
          {/* Main Tabs - Now at top right */}
          <div className="flex items-center gap-1 p-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-base)]">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'inventory' ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Inventory
            </button>
            <button
              onClick={() => setActiveTab('warehouse')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'warehouse' ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Warehouse
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'items' ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Item
            </button>
            <button
              onClick={() => setActiveTab('category')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'category' ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Category
            </button>
            <button
              onClick={() => setActiveTab('unit')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'unit' ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              Unit
            </button>
          </div>
        </div>
      </div>

      {/* DASHBOARD TAB CONTENT - Shows overview of all 5 tabs */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="glass-card p-5 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <LayoutDashboard size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Inventory Overview Dashboard</h2>
                <p className="text-sm text-[var(--text-muted)]">Real-time insights across Inventory, Warehouse, Items, Category & Unit</p>
              </div>
            </div>
          </div>

          {/* 5 Cards Row - One for each tab */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Inventory Card */}
            <div
              onClick={() => setActiveTab('inventory')}
              className="relative overflow-hidden bg-gradient-to-br from-blue-100 to-sky-200 border border-blue-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all"
            >
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Total Stock</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{inventory.reduce((sum, i) => sum + (i.stock || 0), 0)}</p>
                  <p className="text-xs text-gray-500 mt-1">Total quantity in inventory</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-200 flex items-center justify-center">
                  <Package size={24} className="text-blue-700" />
                </div>
              </div>
              <div className="relative mt-3 flex gap-2">
                <span className="text-[10px] px-2 py-1 bg-white/80 rounded text-gray-700 font-medium">₹{(dynamicStats.totalValue / 100000).toFixed(1)}L value</span>
                <span className="text-[10px] px-2 py-1 bg-white/80 rounded text-gray-700 font-medium">{dynamicStats.lowStockItems} low</span>
              </div>
            </div>

            {/* Warehouse Card */}
            <div
              onClick={() => setActiveTab('warehouse')}
              className="relative overflow-hidden bg-gradient-to-br from-emerald-100 to-green-200 border border-emerald-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all"
            >
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Warehouse</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{warehouses.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Active warehouses</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-200 flex items-center justify-center">
                  <Warehouse size={24} className="text-emerald-700" />
                </div>
              </div>
              <div className="relative mt-3 flex gap-2">
                <span className="text-[10px] px-2 py-1 bg-white/80 rounded text-gray-700 font-medium">{inventory.length} items stored</span>
              </div>
            </div>

            {/* Items Card */}
            <div
              onClick={() => setActiveTab('items')}
              className="relative overflow-hidden bg-gradient-to-br from-violet-100 to-purple-200 border border-violet-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all"
            >
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-violet-700 uppercase tracking-wider">Items</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{new Set(inventory.map(i => i.itemId)).size}</p>
                  <p className="text-xs text-gray-500 mt-1">Unique items in system</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-violet-200 flex items-center justify-center">
                  <Package size={24} className="text-violet-700" />
                </div>
              </div>
              <div className="relative mt-3 flex gap-2">
                <span className="text-[10px] px-2 py-1 bg-white/80 rounded text-gray-700 font-medium">{inventory.length} total entries</span>
                <span className="text-[10px] px-2 py-1 bg-white/80 rounded text-gray-700 font-medium">{categories.length} categories</span>
              </div>
            </div>

            {/* Category Card */}
            <div
              onClick={() => setActiveTab('category')}
              className="relative overflow-hidden bg-gradient-to-br from-amber-100 to-orange-200 border border-amber-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all"
            >
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Category</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{categories.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Item categories</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-200 flex items-center justify-center">
                  <Tag size={24} className="text-amber-700" />
                </div>
              </div>
              <div className="relative mt-3 flex gap-2 flex-wrap">
                {categories.slice(0, 2).map((cat, i) => (
                  <span key={cat} className="text-[10px] px-2 py-1 bg-white/80 rounded text-gray-700 font-medium">{cat}</span>
                ))}
                {categories.length > 2 && (
                  <span className="text-[10px] px-2 py-1 bg-white/80 rounded text-gray-700 font-medium">+{categories.length - 2}</span>
                )}
              </div>
            </div>

            {/* Unit Card */}
            <div
              onClick={() => setActiveTab('unit')}
              className="relative overflow-hidden bg-gradient-to-br from-cyan-100 to-teal-200 border border-cyan-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all"
            >
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-cyan-700 uppercase tracking-wider">Unit</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{units.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Measurement units</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-cyan-200 flex items-center justify-center">
                  <Scale size={24} className="text-cyan-700" />
                </div>
              </div>
              <div className="relative mt-3 flex gap-2 flex-wrap">
                {units.slice(0, 3).map((unit, i) => (
                  <span key={unit} className="text-[10px] px-2 py-1 bg-white/80 rounded text-gray-700 font-medium">{unit}</span>
                ))}
                {units.length > 3 && (
                  <span className="text-[10px] px-2 py-1 bg-white/80 rounded text-gray-700 font-medium">+{units.length - 3}</span>
                )}
              </div>
            </div>
          </div>

          {/* Charts Row 1 - 3 charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Inventory Status Pie Chart */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <PieChartIcon size={16} className="text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Stock Status</h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'In Stock', value: Math.max(0, dynamicStats.totalItems - dynamicStats.lowStockItems - dynamicStats.outOfStockItems), color: '#3b82f6' },
                      { name: 'Low Stock', value: dynamicStats.lowStockItems, color: '#f59e0b' },
                      { name: 'Out of Stock', value: dynamicStats.outOfStockItems, color: '#ef4444' },
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {[
                      { name: 'In Stock', value: Math.max(0, dynamicStats.totalItems - dynamicStats.lowStockItems - dynamicStats.outOfStockItems), color: '#3b82f6' },
                      { name: 'Low Stock', value: dynamicStats.lowStockItems, color: '#f59e0b' },
                      { name: 'Out of Stock', value: dynamicStats.outOfStockItems, color: '#ef4444' },
                    ].filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-base)',
                      borderRadius: 8,
                      fontSize: 12
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category Distribution Donut */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <Tag size={16} className="text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Category Distribution</h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={categories.map((cat, i) => ({
                      name: cat,
                      value: inventory.filter(item => item.category === cat).length,
                      color: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'][i % 6]
                    })).filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categories.map((cat, i) => (
                      <Cell key={`cell-${i}`} fill={['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'][i % 6]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Unit Distribution */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <Scale size={16} className="text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Unit Distribution</h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={units.map((unit, i) => ({
                      name: unit,
                      value: inventory.filter(item => item.unit === unit).length,
                      color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][i % 6]
                    })).filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name }) => name}
                    labelLine={true}
                  >
                    {units.map((unit, i) => (
                      <Cell key={`cell-${i}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][i % 6]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 - Bar Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Items by Category Bar Chart */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={16} className="text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Items by Category</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categories.map(cat => ({ name: cat, count: inventory.filter(i => i.category === cat).length })).filter(c => c.count > 0)} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-base)',
                      borderRadius: 8,
                      fontSize: 12
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Inventory Value by Warehouse */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <Warehouse size={16} className="text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Value by Warehouse</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={warehouses.map(wh => {
                  const whItems = inventory.filter(i => i.warehouse === wh);
                  const value = whItems.reduce((sum, i) => sum + ((i.stock || 0) * (i.rate || 0)), 0);
                  return { name: wh, value: value / 1000 };
                })} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}K`} />
                  <Tooltip
                    formatter={(value) => [`₹${value}K`, 'Value']}
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-base)',
                      borderRadius: 8,
                      fontSize: 12
                    }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 3 - 2x2 Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Stock vs Reserved Area Chart */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} className="text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Stock vs Reserved (Top 10 Items)</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={inventory.slice(0, 10).map(i => ({ name: (i.name || i.description || 'Unknown').slice(0, 15), stock: i.stock || 0, reserved: i.reserved || 0 }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorReserved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="stock" name="Total Stock" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorStock)" />
                  <Area type="monotone" dataKey="reserved" name="Reserved" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorReserved)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Inventory Value Trend */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Inventory Value Trend (Simulated)</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={[
                  { month: 'Oct', value: dynamicStats.totalValue * 0.7 / 100000 },
                  { month: 'Nov', value: dynamicStats.totalValue * 0.8 / 100000 },
                  { month: 'Dec', value: dynamicStats.totalValue * 0.85 / 100000 },
                  { month: 'Jan', value: dynamicStats.totalValue * 0.9 / 100000 },
                  { month: 'Feb', value: dynamicStats.totalValue * 0.95 / 100000 },
                  { month: 'Mar', value: dynamicStats.totalValue / 100000 },
                ]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v.toFixed(1)}L`} />
                  <Tooltip formatter={(value) => [`₹${value.toFixed(1)}L`, 'Value']} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Stock Movement Analysis */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} className="text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Stock Movement Analysis (6 Months)</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={[
                  { month: 'Oct', stockIn: 450, stockOut: 320, net: 130 },
                  { month: 'Nov', stockIn: 520, stockOut: 380, net: 140 },
                  { month: 'Dec', stockIn: 680, stockOut: 450, net: 230 },
                  { month: 'Jan', stockIn: 580, stockOut: 420, net: 160 },
                  { month: 'Feb', stockIn: 720, stockOut: 510, net: 210 },
                  { month: 'Mar', stockIn: 650, stockOut: 480, net: 170 },
                ]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStockIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorStockOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="stockIn" name="Stock In" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorStockIn)" />
                  <Area type="monotone" dataKey="stockOut" name="Stock Out" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorStockOut)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Category Value Comparison */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={16} className="text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Inventory Value by Category</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categories.map(cat => {
                  const catItems = inventory.filter(i => i.category === cat);
                  const value = catItems.reduce((sum, i) => sum + ((i.stock || 0) * (i.rate || 0)), 0);
                  const count = catItems.length;
                  return { name: cat, value: value / 1000, count };
                }).filter(c => c.value > 0)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}K`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="value" name="Value (₹K)" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                  <Bar yAxisId="right" dataKey="count" name="Item Count" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <button
              onClick={() => setActiveTab('inventory')}
              className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 hover:bg-blue-500/20 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Package size={16} /> View Inventory
            </button>
            <button
              onClick={() => setActiveTab('warehouse')}
              className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Warehouse size={16} /> Manage Warehouses
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-600 hover:bg-violet-500/20 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Plus size={16} /> Add Items
            </button>
            <button
              onClick={() => setActiveTab('category')}
              className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 hover:bg-amber-500/20 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Tag size={16} /> Categories
            </button>
            <button
              onClick={() => setActiveTab('unit')}
              className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 hover:bg-cyan-500/20 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Scale size={16} /> Units
            </button>
          </div>
        </div>
      )}

      {/* INVENTORY TAB CONTENT */}
      {activeTab === 'inventory' && (
        <>
          {/* Inventory Controls Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Left side can have other controls if needed */}
            </div>
            <div className="flex items-center gap-2">
              <div className="view-toggle-pill">
                <button onClick={() => setView('kanban')}
                  className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`}><LayoutGrid size={14} /></button>
                <button onClick={() => setView('table')}
                  className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`}><List size={14} /></button>
              </div>
              <Button variant="ghost" onClick={() => setStockIn(true)}><ArrowUp size={13} /> Stock In</Button>
              <Button variant="ghost" onClick={() => setShowStockOut(true)}><ArrowDown size={13} /> Stock Out</Button>
              <Button variant="ghost" onClick={() => setShowCardsInViews(!showCardsInViews)}>
                <Layers size={13} /> {showCardsInViews ? 'Hide Cards' : 'Show Cards'}
              </Button>
            </div>
          </div>

          {showCardsInViews && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-100 to-sky-200 border border-blue-200 rounded-2xl p-5 shadow-lg">
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Total Stock</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{inventory.reduce((sum, i) => sum + (i.stock || 0), 0)}</p>
                    <p className="text-xs text-gray-500 mt-1">Total quantity in inventory</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-200 flex items-center justify-center">
                    <Package size={24} className="text-blue-700" />
                  </div>
                </div>
              </div>
              {/* Card 2: Reserved Items - Swapped to position 2 */}
              <div className="relative overflow-hidden bg-gradient-to-br from-violet-100 to-purple-200 border border-violet-200 rounded-2xl p-5 shadow-lg">
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-violet-700 uppercase tracking-wider">Reserved Items</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{dynamicStats.reservedItems}</p>
                    <p className="text-xs text-gray-500 mt-1">Allocated to projects</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-violet-200 flex items-center justify-center">
                    <Package size={24} className="text-violet-700" />
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden bg-gradient-to-br from-amber-100 to-orange-200 border border-amber-200 rounded-2xl p-5 shadow-lg">
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Low Stock</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{dynamicStats.lowStockItems}</p>
                    <p className="text-xs text-gray-500 mt-1">Items need reorder</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-200 flex items-center justify-center">
                    <AlertTriangle size={24} className="text-amber-700" />
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden bg-gradient-to-br from-rose-100 to-rose-200 border border-rose-200 rounded-2xl p-5 shadow-lg">
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Out of Stock</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{dynamicStats.outOfStockItems}</p>
                    <p className="text-xs text-gray-500 mt-1">Immediate action needed</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-rose-200 flex items-center justify-center">
                    <AlertTriangle size={24} className="text-rose-700" />
                  </div>
                </div>
              </div>

              {/* Card 5: Inventory Value - Swapped to position 5 */}
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-100 to-green-200 border border-emerald-200 rounded-2xl p-5 shadow-lg">
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Inventory Value</p>
                    <p className="text-xl font-bold text-gray-800 mt-2">₹{(dynamicStats.totalValue / 100000).toFixed(1)}L</p>
                    <p className="text-xs text-gray-500 mt-1">At current rates</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-200 flex items-center justify-center">
                    <Warehouse size={24} className="text-emerald-700" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {dynamicStats.lowStockItems > 0 && (
            <div className="ai-banner border-amber-500/20 bg-amber-500/5">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-[var(--text-secondary)]">
                <span className="text-amber-400 font-semibold">Low Stock Alert:</span>{' '}
                {inventory.filter(i => i.status === 'Low Stock' || ((i.stock || 0) - (i.reserved || 0)) <= (i.minStock || 0) && ((i.stock || 0) - (i.reserved || 0)) > 0).map(i => i.name || i.description).slice(0, 3).join(', ')}{inventory.filter(i => i.status === 'Low Stock' || ((i.stock || 0) - (i.reserved || 0)) <= (i.minStock || 0) && ((i.stock || 0) - (i.reserved || 0)) > 0).length > 3 ? '...' : ''} — reorder immediately to avoid project delays.
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

          {view === 'table' ? (
            <>
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-[var(--text-muted)] mr-1">Category:</span>
                  {CATEGORY_FILTERS.map(c => (
                    <button key={c} onClick={() => { setCatFilter(c); setPage(1); }}
                      className={`filter-chip ${catFilter === c ? 'filter-chip-active' : ''}`}>{c}</button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportToCSV(
                    filtered.map(item => ({
                      itemId: item.itemId,
                      name: item.name || item.description,
                      category: item.category,
                      warehouse: item.warehouse || '',
                      unit: item.unit,
                      rate: item.rate,
                      stock: item.stock,
                      reserved: item.reserved,
                      minStock: item.minStock,
                      available: (item.stock || 0) - (item.reserved || 0),
                      status: getStockStatus(item)
                    })),
                    'inventory',
                    [
                      { key: 'itemId', header: 'Item ID' },
                      { key: 'name', header: 'Item Name' },
                      { key: 'category', header: 'Category' },
                      { key: 'warehouse', header: 'Warehouse' },
                      { key: 'unit', header: 'Unit' },
                      { key: 'rate', header: 'Rate (₹)' },
                      { key: 'stock', header: 'Total Stock' },
                      { key: 'reserved', header: 'Reserved' },
                      { key: 'minStock', header: 'Min Stock' },
                      { key: 'available', header: 'Available' },
                      { key: 'status', header: 'Status' }
                    ]
                  )}>
                    <Download size={14} /> Export
                  </Button>
                  <Input placeholder="Search inventory…" value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }} className="h-8 text-xs w-52" />
                </div>
              </div>
              <DataTable columns={COLUMNS} data={paginated} total={filtered.length}
                page={page} pageSize={pageSize} onPageChange={setPage}
                onPageSizeChange={s => { setPageSize(s); setPage(1); }}
                search={search} onSearch={v => { setSearch(v); setPage(1); }}
                rowActions={ROW_ACTIONS} emptyText="No inventory items found."
                onRowClick={setSelected}
                selectedRows={selectedInventoryItems}
                onSelectRows={setSelectedInventoryItems}
                rowKey="_id"
                bulkActions={[
                  {
                    label: 'Export Selected',
                    icon: Download,
                    onClick: (selectedIds) => {
                      const selectedData = filtered.filter(i => selectedIds.has(i._id));
                      const dataToExport = selectedData.map(item => ({
                        itemId: item.itemId,
                        name: item.name || item.description,
                        category: item.category,
                        warehouse: item.warehouse || '',
                        unit: item.unit,
                        rate: item.rate,
                        stock: item.stock,
                        reserved: item.reserved,
                        minStock: item.minStock,
                        available: (item.stock || 0) - (item.reserved || 0),
                        status: getStockStatus(item)
                      }));
                      const columns = [
                        { key: 'itemId', header: 'Item ID' },
                        { key: 'name', header: 'Item Name' },
                        { key: 'category', header: 'Category' },
                        { key: 'warehouse', header: 'Warehouse' },
                        { key: 'unit', header: 'Unit' },
                        { key: 'rate', header: 'Rate (₹)' },
                        { key: 'stock', header: 'Total Stock' },
                        { key: 'reserved', header: 'Reserved' },
                        { key: 'minStock', header: 'Min Stock' },
                        { key: 'available', header: 'Available' },
                        { key: 'status', header: 'Status' }
                      ];
                      const headers = columns.map(c => c.header).join(',');
                      const rows = dataToExport.map(row =>
                        columns.map(col => {
                          const val = row[col.key] ?? '';
                          if (String(val).includes(',') || String(val).includes('"')) {
                            return `"${String(val).replace(/"/g, '""')}"`;
                          }
                          return val;
                        }).join(',')
                      ).join('\n');
                      const csvContent = [headers, rows].join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      const url = URL.createObjectURL(blob);
                      link.setAttribute('href', url);
                      link.setAttribute('download', `inventory_selected_${new Date().toISOString().split('T')[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      setSelectedInventoryItems(new Set());
                    }
                  }
                ]} />
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-[var(--text-muted)] mr-1">Category:</span>
                {CATEGORY_FILTERS.map(c => (
                  <button key={c} onClick={() => setCatFilter(c)}
                    className={`filter-chip ${catFilter === c ? 'filter-chip-active' : ''}`}>{c}</button>
                ))}
                <div className="ml-auto">
                  <Input placeholder="Search inventory…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs w-52" />
                </div>
              </div>
              {loading ? (
                <div className="glass-card p-8 text-center">
                  <div className="animate-pulse text-[var(--text-muted)]">Loading inventory...</div>
                </div>
              ) : error ? (
                <div className="glass-card p-8 text-center text-red-500">
                  <p>Error loading inventory: {error}</p>
                  <p className="text-xs mt-2 text-[var(--text-muted)]">Make sure the backend server is running on port 3000</p>
                </div>
              ) : (
                <InvKanbanBoard items={consolidatedItems} onCardClick={setSelected} onDrop={handleKanbanDrop} />
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'warehouse' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search warehouses..."
                value={warehouseSearch}
                onChange={(e) => { setWarehouseSearch(e.target.value); setWarehousePage(1); }}
                className="h-9 text-xs w-64"
              />
              <span className="text-xs text-[var(--text-muted)]">
                {warehouses.filter(w => w.toLowerCase().includes(warehouseSearch.toLowerCase())).length} warehouses
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedWarehouses.size > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const selectedData = warehouses.filter(w => selectedWarehouses.has(w)).map(w => ({
                      warehouse: w,
                      itemsCount: inventory.filter(i => i.warehouse === w).length
                    }));
                    const columns = [{ key: 'warehouse', header: 'Warehouse' }, { key: 'itemsCount', header: 'Items Count' }];
                    const headers = columns.map(c => c.header).join(',');
                    const rows = selectedData.map(row =>
                      columns.map(col => {
                        const val = row[col.key] ?? '';
                        if (String(val).includes(',') || String(val).includes('"')) {
                          return `"${String(val).replace(/"/g, '""')}"`;
                        }
                        return val;
                      }).join(',')
                    ).join('\n');
                    const csvContent = [headers, rows].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `warehouses_selected_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setSelectedWarehouses(new Set());
                  }}
                >
                  <Download size={14} /> Export Selected ({selectedWarehouses.size})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => exportToCSV(
                warehouses.filter(w => w.toLowerCase().includes(warehouseSearch.toLowerCase())).map(w => ({ 
                  warehouse: w, 
                  itemsCount: inventory.filter(i => i.warehouse === w).length 
                })),
                'warehouses',
                [{ key: 'warehouse', header: 'Warehouse' }, { key: 'itemsCount', header: 'Items Count' }]
              )}>
                <Download size={14} /> Export All
              </Button>
              <Button onClick={() => setShowWarehouseModal(true)}>
                <Plus size={14} /> Add Warehouse
              </Button>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border-base)] bg-[var(--bg-elevated)]">
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={warehouses.filter(w => w.toLowerCase().includes(warehouseSearch.toLowerCase())).length > 0 && 
                        warehouses.filter(w => w.toLowerCase().includes(warehouseSearch.toLowerCase())).every(w => selectedWarehouses.has(w))}
                      onChange={() => {
                        const filteredWarehouses = warehouses.filter(w => w.toLowerCase().includes(warehouseSearch.toLowerCase()));
                        const allSelected = filteredWarehouses.every(w => selectedWarehouses.has(w));
                        if (allSelected) {
                          setSelectedWarehouses(prev => {
                            const next = new Set(prev);
                            filteredWarehouses.forEach(w => next.delete(w));
                            return next;
                          });
                        } else {
                          setSelectedWarehouses(prev => {
                            const next = new Set(prev);
                            filteredWarehouses.forEach(w => next.add(w));
                            return next;
                          });
                        }
                      }}
                      className="w-3.5 h-3.5 accent-[var(--primary)] cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Items</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredWarehouses = warehouses.filter(w =>
                    w.toLowerCase().includes(warehouseSearch.toLowerCase())
                  );
                  const paginatedWarehouses = filteredWarehouses.slice(
                    (warehousePage - 1) * warehousePageSize,
                    warehousePage * warehousePageSize
                  );

                  if (warehouses.length === 0) {
                    return (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-[var(--text-muted)]">No warehouses</td>
                      </tr>
                    );
                  }

                  if (paginatedWarehouses.length === 0) {
                    return (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-[var(--text-muted)]">No warehouses found</td>
                      </tr>
                    );
                  }

                  return paginatedWarehouses.map((w) => (
                    <tr
                      key={w}
                      className="border-b border-[var(--border-base)] last:border-0 hover:bg-[var(--bg-hover)] cursor-pointer"
                      onClick={() => setViewingWarehouse(w)}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedWarehouses.has(w)}
                          onChange={() => {
                            setSelectedWarehouses(prev => {
                              const next = new Set(prev);
                              if (next.has(w)) next.delete(w);
                              else next.add(w);
                              return next;
                            });
                          }}
                          className="w-3.5 h-3.5 accent-[var(--primary)] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-[var(--text-primary)]">{w}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[var(--text-secondary)]">{inventory.filter(i => i.warehouse === w).length} items</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewingWarehouse(w); }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-blue-500 hover:bg-blue-500/10"
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setTransferFromWarehouse(w); setShowTransferModal(true); }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-purple-500 hover:bg-purple-500/10"
                            title="Transfer Stock"
                          >
                            <ArrowRightLeft size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingWarehouse(w); setEditWarehouseValue(w); }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-hover)]"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteWarehouse(w); }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
            {/* Pagination */}
            {warehouses.filter(w => w.toLowerCase().includes(warehouseSearch.toLowerCase())).length > warehousePageSize && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-base)]">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">Page {warehousePage} of {Math.ceil(warehouses.filter(w => w.toLowerCase().includes(warehouseSearch.toLowerCase())).length / warehousePageSize)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={warehousePage === 1}
                    onClick={() => setWarehousePage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={warehousePage >= Math.ceil(warehouses.filter(w => w.toLowerCase().includes(warehouseSearch.toLowerCase())).length / warehousePageSize)}
                    onClick={() => setWarehousePage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ITEMS TAB CONTENT */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-xs w-64"
              />
              <span className="text-xs text-[var(--text-muted)]">
                {inventory.filter(item => item.name?.toLowerCase().includes(search.toLowerCase()) ||
                  item.itemId?.toLowerCase().includes(search.toLowerCase())).length} items
              </span>
            </div>
            <div className="flex gap-2">
              {selectedItems.size > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const selectedData = inventory.filter(item => selectedItems.has(item._id || item.itemId));
                    const dataToExport = selectedData.map(item => ({
                      itemId: item.itemId,
                      name: item.name || item.description,
                      category: item.category,
                      warehouse: item.warehouse || '',
                      unit: item.unit,
                      rate: item.rate,
                      stock: item.stock,
                      reserved: item.reserved,
                      minStock: item.minStock
                    }));
                    const columns = [
                      { key: 'itemId', header: 'Item ID' },
                      { key: 'name', header: 'Description' },
                      { key: 'category', header: 'Category' },
                      { key: 'warehouse', header: 'Warehouse' },
                      { key: 'unit', header: 'Unit' },
                      { key: 'rate', header: 'Rate (₹)' },
                      { key: 'stock', header: 'Stock' },
                      { key: 'reserved', header: 'Reserved' },
                      { key: 'minStock', header: 'Min Stock' }
                    ];
                    const headers = columns.map(c => c.header).join(',');
                    const rows = dataToExport.map(row =>
                      columns.map(col => {
                        const val = row[col.key] ?? '';
                        if (String(val).includes(',') || String(val).includes('"')) {
                          return `"${String(val).replace(/"/g, '""')}"`;
                        }
                        return val;
                      }).join(',')
                    ).join('\n');
                    const csvContent = [headers, rows].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `items_selected_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setSelectedItems(new Set());
                  }}
                >
                  <Download size={14} /> Export Selected ({selectedItems.size})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => exportToCSV(
                inventory
                  .filter(item => item.name?.toLowerCase().includes(search.toLowerCase()) ||
                    item.itemId?.toLowerCase().includes(search.toLowerCase()))
                  .map(item => ({
                    itemId: item.itemId,
                    name: item.name || item.description,
                    category: item.category,
                    warehouse: item.warehouse || '',
                    unit: item.unit,
                    rate: item.rate,
                    stock: item.stock,
                    reserved: item.reserved,
                    minStock: item.minStock
                  })),
                'items',
                [
                  { key: 'itemId', header: 'Item ID' },
                  { key: 'name', header: 'Description' },
                  { key: 'category', header: 'Category' },
                  { key: 'warehouse', header: 'Warehouse' },
                  { key: 'unit', header: 'Unit' },
                  { key: 'rate', header: 'Rate (₹)' },
                  { key: 'stock', header: 'Stock' },
                  { key: 'reserved', header: 'Reserved' },
                  { key: 'minStock', header: 'Min Stock' }
                ]
              )}>
                <Download size={14} /> Export All
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(true)}>
                <Plus size={14} /> Add Item
              </Button>
            </div>
          </div>

          {/* Items Table */}
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border-base)] bg-[var(--bg-elevated)]">
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={inventory.filter(item => item.name?.toLowerCase().includes(search.toLowerCase()) ||
                        item.itemId?.toLowerCase().includes(search.toLowerCase())).length > 0 &&
                        inventory.filter(item => item.name?.toLowerCase().includes(search.toLowerCase()) ||
                          item.itemId?.toLowerCase().includes(search.toLowerCase()))
                          .every(item => selectedItems.has(item._id || item.itemId))}
                      onChange={() => {
                        const filteredItems = inventory.filter(item => item.name?.toLowerCase().includes(search.toLowerCase()) ||
                          item.itemId?.toLowerCase().includes(search.toLowerCase()));
                        const allSelected = filteredItems.every(item => selectedItems.has(item._id || item.itemId));
                        if (allSelected) {
                          setSelectedItems(prev => {
                            const next = new Set(prev);
                            filteredItems.forEach(item => next.delete(item._id || item.itemId));
                            return next;
                          });
                        } else {
                          setSelectedItems(prev => {
                            const next = new Set(prev);
                            filteredItems.forEach(item => next.add(item._id || item.itemId));
                            return next;
                          });
                        }
                      }}
                      className="w-3.5 h-3.5 accent-[var(--primary)] cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Item ID</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Description</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Category</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Unit</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Rate (₹)</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[var(--text-muted)]">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                        Loading items...
                      </div>
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[var(--text-muted)]">
                      <Package size={32} className="mx-auto mb-2 text-[var(--text-faint)]" />
                      <p>No items found</p>
                    </td>
                  </tr>
                ) : (
                  inventory
                    .filter(item => item.name?.toLowerCase().includes(search.toLowerCase()) ||
                      item.itemId?.toLowerCase().includes(search.toLowerCase()))
                    .map((item) => (
                      <tr key={item._id || item.itemId}
                        onClick={() => setSelected(item)}
                        className="border-b border-[var(--border-base)] last:border-0 hover:bg-[var(--bg-hover)] cursor-pointer">
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item._id || item.itemId)}
                            onChange={() => {
                              setSelectedItems(prev => {
                                const next = new Set(prev);
                                const id = item._id || item.itemId;
                                if (next.has(id)) next.delete(id);
                                else next.add(id);
                                return next;
                              });
                            }}
                            className="w-3.5 h-3.5 accent-[var(--primary)] cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-[var(--accent-light)]">{item.itemId}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold text-[var(--text-primary)]">{item.name || item.description}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-[var(--text-secondary)]">{item.category}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-[var(--text-secondary)]">{item.warehouse || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-[var(--text-secondary)]">{item.unit}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-[var(--text-primary)]">₹{item.rate?.toLocaleString('en-IN')}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelected(item); }}
                              className="p-1.5 rounded-lg text-[var(--text-faint)] hover:text-[var(--primary)] hover:bg-[var(--bg-hover)]"
                              title="View"
                            >
                              <Package size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditClick(item); }}
                              className="p-1.5 rounded-lg text-[var(--text-faint)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteItem(item); }}
                              className="p-1.5 rounded-lg text-[var(--text-faint)] hover:text-red-500 hover:bg-red-500/10"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
            {/* Pagination */}
            {(() => {
              const filteredCount = inventory.filter(item =>
                item.name?.toLowerCase().includes(search.toLowerCase()) ||
                item.itemId?.toLowerCase().includes(search.toLowerCase())
              ).length;
              if (filteredCount <= itemsPageSize) return null;
              return (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-base)]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">Page {itemsPage} of {Math.ceil(filteredCount / itemsPageSize)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={itemsPage === 1}
                      onClick={() => setItemsPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={itemsPage >= Math.ceil(filteredCount / itemsPageSize)}
                      onClick={() => setItemsPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* CATEGORY TAB CONTENT */}
      {activeTab === 'category' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Category Management</h2>
              <span className="text-[10px] px-2 py-1 bg-[var(--bg-elevated)] rounded-full text-[var(--text-muted)]">Total: {categories.length} Categories</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCategoryCards(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${showCategoryCards ? 'bg-white border-gray-200 text-gray-700 shadow-sm' : 'bg-white border-gray-200 text-gray-700 shadow-sm'}`}
                title={showCategoryCards ? 'Hide Cards' : 'Show Cards'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
                {showCategoryCards ? 'Hide Cards' : 'Show Cards'}
              </button>
              {selectedCategories.size > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const selectedData = categories.filter(cat => selectedCategories.has(cat)).map(cat => ({
                      category: cat,
                      itemsCount: inventory.filter(i => i.category === cat).length
                    }));
                    const columns = [{ key: 'category', header: 'Category Name' }, { key: 'itemsCount', header: 'Items Count' }];
                    const headers = columns.map(c => c.header).join(',');
                    const rows = selectedData.map(row =>
                      columns.map(col => {
                        const val = row[col.key] ?? '';
                        if (String(val).includes(',') || String(val).includes('"')) {
                          return `"${String(val).replace(/"/g, '""')}"`;
                        }
                        return val;
                      }).join(',')
                    ).join('\n');
                    const csvContent = [headers, rows].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `categories_selected_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setSelectedCategories(new Set());
                  }}
                >
                  <Download size={14} /> Export Selected ({selectedCategories.size})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => exportToCSV(
                categories.map(cat => ({
                  category: cat,
                  itemsCount: inventory.filter(i => i.category === cat).length
                })),
                'categories',
                [{ key: 'category', header: 'Category Name' }, { key: 'itemsCount', header: 'Items Count' }]
              )}>
                <Download size={14} /> Export All
              </Button>
              <Button onClick={() => setShowCategoryModal(true)}>
                <Plus size={14} /> Add Category
              </Button>
            </div>
          </div>

          {/* Items by Category - Cards */}
          {showCategoryCards && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.map((cat, index) => {
                const catItems = inventory.filter(i => i.category === cat);
                if (catItems.length === 0) return null;
                const colors = ['bg-gradient-to-br from-emerald-100 to-emerald-200 border-emerald-200', 'bg-gradient-to-br from-blue-100 to-sky-200 border-blue-200', 'bg-gradient-to-br from-amber-100 to-orange-200 border-amber-200', 'bg-gradient-to-br from-rose-100 to-rose-200 border-rose-200', 'bg-gradient-to-br from-violet-100 to-purple-200 border-violet-200', 'bg-gradient-to-br from-cyan-100 to-teal-200 border-cyan-200', 'bg-gradient-to-br from-orange-100 to-orange-200 border-orange-200', 'bg-gradient-to-br from-pink-100 to-pink-200 border-pink-200'];
                const iconColors = ['text-emerald-700', 'text-blue-700', 'text-amber-700', 'text-rose-700', 'text-violet-700', 'text-cyan-700', 'text-orange-700', 'text-pink-700'];
                const bgColors = ['bg-emerald-200', 'bg-blue-200', 'bg-amber-200', 'bg-rose-200', 'bg-violet-200', 'bg-cyan-200', 'bg-orange-200', 'bg-pink-200'];
                return (
                  <div key={cat} className={`${colors[index % colors.length]} border rounded-xl p-4 flex flex-col gap-2 hover:shadow-md transition-all`}>
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-xl ${bgColors[index % bgColors.length]} flex items-center justify-center shadow-sm`}>
                        <Package size={20} className={iconColors[index % iconColors.length]} />
                      </div>
                      <span className="text-xs font-medium text-gray-700">{catItems.length} items</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{cat}</span>
                    <div className="flex flex-wrap gap-1">
                      {catItems.slice(0, 3).map((item, idx) => (
                        <span key={`${item.itemId}-${idx}`} className="text-[10px] px-2 py-1 bg-white/80 rounded text-gray-700 border border-white/30">
                          {item.name || item.description}
                        </span>
                      ))}
                      {catItems.length > 3 && (
                        <span className="text-[10px] px-2 py-1 text-gray-500">
                          +{catItems.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Categories Table - Now at BOTTOM */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Categories</h3>
            <div className="glass-card overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border-base)] bg-[var(--bg-elevated)]">
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={categories.length > 0 && categories.every(cat => selectedCategories.has(cat))}
                        onChange={() => {
                          const allSelected = categories.every(cat => selectedCategories.has(cat));
                          if (allSelected) {
                            setSelectedCategories(new Set());
                          } else {
                            setSelectedCategories(new Set(categories));
                          }
                        }}
                        className="w-3.5 h-3.5 accent-[var(--primary)] cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Category Name</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Items Count</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr
                      key={cat}
                      className="border-b border-[var(--border-base)] last:border-0 hover:bg-[var(--bg-hover)] cursor-pointer"
                      onClick={() => setViewingCategory(cat)}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedCategories.has(cat)}
                          onChange={() => {
                            setSelectedCategories(prev => {
                              const next = new Set(prev);
                              if (next.has(cat)) next.delete(cat);
                              else next.add(cat);
                              return next;
                            });
                          }}
                          className="w-3.5 h-3.5 accent-[var(--primary)] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center">
                            <Package size={16} className="text-[var(--primary)]" />
                          </div>
                          <span className="text-sm font-medium text-[var(--text-primary)]">{cat}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] text-[var(--text-muted)]">{inventory.filter(i => i.category === cat).length} items</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewingCategory(cat); }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-blue-500 hover:bg-blue-500/10"
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); setEditCategoryValue(cat); }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-hover)]"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* UNIT TAB CONTENT */}
      {activeTab === 'unit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Unit Management</h2>
              <span className="text-[10px] px-2 py-1 bg-[var(--bg-elevated)] rounded-full text-[var(--text-muted)]">Total: {units.length} Units</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUnitCards(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${showUnitCards ? 'bg-white border-gray-200 text-gray-700 shadow-sm' : 'bg-white border-gray-200 text-gray-700 shadow-sm'}`}
                title={showUnitCards ? 'Hide Cards' : 'Show Cards'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
                {showUnitCards ? 'Hide Cards' : 'Show Cards'}
              </button>
              {selectedUnits.size > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const selectedData = units.filter(unit => selectedUnits.has(unit)).map(unit => ({
                      unit: unit,
                      itemsCount: inventory.filter(i => i.unit === unit).length
                    }));
                    const columns = [{ key: 'unit', header: 'Unit Name' }, { key: 'itemsCount', header: 'Items Count' }];
                    const headers = columns.map(c => c.header).join(',');
                    const rows = selectedData.map(row =>
                      columns.map(col => {
                        const val = row[col.key] ?? '';
                        if (String(val).includes(',') || String(val).includes('"')) {
                          return `"${String(val).replace(/"/g, '""')}"`;
                        }
                        return val;
                      }).join(',')
                    ).join('\n');
                    const csvContent = [headers, rows].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `units_selected_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setSelectedUnits(new Set());
                  }}
                >
                  <Download size={14} /> Export Selected ({selectedUnits.size})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => exportToCSV(
                units.map(unit => ({
                  unit: unit,
                  itemsCount: inventory.filter(i => i.unit === unit).length
                })),
                'units',
                [{ key: 'unit', header: 'Unit Name' }, { key: 'itemsCount', header: 'Items Count' }]
              )}>
                <Download size={14} /> Export All
              </Button>
              <Button onClick={() => setShowUnitModal(true)}>
                <Plus size={14} /> Add Unit
              </Button>
            </div>
          </div>

          {/* Items by Unit - Cards */}
          {showUnitCards && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {units.map((unit, index) => {
                const unitItems = inventory.filter(i => i.unit === unit);
                if (unitItems.length === 0) return null;
                const colors = ['bg-gradient-to-br from-emerald-100 to-emerald-200 border-emerald-200', 'bg-gradient-to-br from-blue-100 to-sky-200 border-blue-200', 'bg-gradient-to-br from-amber-100 to-orange-200 border-amber-200', 'bg-gradient-to-br from-rose-100 to-rose-200 border-rose-200', 'bg-gradient-to-br from-violet-100 to-purple-200 border-violet-200', 'bg-gradient-to-br from-cyan-100 to-teal-200 border-cyan-200', 'bg-gradient-to-br from-orange-100 to-orange-200 border-orange-200', 'bg-gradient-to-br from-pink-100 to-pink-200 border-pink-200'];
                const iconColors = ['text-emerald-700', 'text-blue-700', 'text-amber-700', 'text-rose-700', 'text-violet-700', 'text-cyan-700', 'text-orange-700', 'text-pink-700'];
                const bgColors = ['bg-emerald-200', 'bg-blue-200', 'bg-amber-200', 'bg-rose-200', 'bg-violet-200', 'bg-cyan-200', 'bg-orange-200', 'bg-pink-200'];
                return (
                  <div key={unit} className={`${colors[index % colors.length]} border rounded-xl p-4 flex flex-col gap-2 hover:shadow-md transition-all`}>
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-xl ${bgColors[index % bgColors.length]} flex items-center justify-center shadow-sm`}>
                        <Package size={20} className={iconColors[index % iconColors.length]} />
                      </div>
                      <span className="text-xs font-medium text-gray-700">{unitItems.length} items</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{unit}</span>
                    <div className="flex flex-wrap gap-1">
                      {unitItems.slice(0, 3).map((item, idx) => (
                        <span key={`${item.itemId}-${idx}`} className="text-[10px] px-2 py-1 bg-white/80 rounded text-gray-700 border border-white/30">
                          {item.name || item.description}
                        </span>
                      ))}
                      {unitItems.length > 3 && (
                        <span className="text-[10px] px-2 py-1 text-gray-500">
                          +{unitItems.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Units Table */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Units</h3>
            <div className="glass-card overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border-base)] bg-[var(--bg-elevated)]">
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={units.length > 0 && units.every(unit => selectedUnits.has(unit))}
                        onChange={() => {
                          const allSelected = units.every(unit => selectedUnits.has(unit));
                          if (allSelected) {
                            setSelectedUnits(new Set());
                          } else {
                            setSelectedUnits(new Set(units));
                          }
                        }}
                        className="w-3.5 h-3.5 accent-[var(--primary)] cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Unit Name</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Items Count</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit) => (
                    <tr
                      key={unit}
                      className="border-b border-[var(--border-base)] last:border-0 hover:bg-[var(--bg-hover)] cursor-pointer"
                      onClick={() => setViewingUnit(unit)}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedUnits.has(unit)}
                          onChange={() => {
                            setSelectedUnits(prev => {
                              const next = new Set(prev);
                              if (next.has(unit)) next.delete(unit);
                              else next.add(unit);
                              return next;
                            });
                          }}
                          className="w-3.5 h-3.5 accent-[var(--primary)] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center">
                            <Package size={16} className="text-[var(--primary)]" />
                          </div>
                          <span className="text-sm font-medium text-[var(--text-primary)]">{unit}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] text-[var(--text-muted)]">{inventory.filter(i => i.unit === unit).length} items</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewingUnit(unit); }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-blue-500 hover:bg-blue-500/10"
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingUnit(unit); setEditUnitValue(unit); }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-hover)]"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteUnit(unit); }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Inventory Item"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button onClick={handleAddItem} disabled={submitting || !form.name || !form.category || !form.warehouse}>
            {submitting ? 'Adding...' : <><Plus size={13} /> Add Item</>}
          </Button>
        </div>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Item ID (Optional)"><Input placeholder="e.g. INV001" value={form.itemId} onChange={e => setForm(f => ({ ...f, itemId: e.target.value }))} /></FormField>
          <FormField label="Item Name"><Input placeholder="e.g. 400W Mono PERC Panel" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
          <FormField label="Category">
            <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">Select Category</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormField>
          <FormField label="Unit">
            <Select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
              <option value="">Select Unit</option>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </Select>
          </FormField>
          <FormField label="Min Stock Level"><Input type="number" placeholder="100" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))} /></FormField>
          <FormField label="Unit Rate (₹)"><Input type="number" placeholder="14500" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} /></FormField>
          <FormField label="Warehouse">
            <Select value={form.warehouse} onChange={e => setForm(f => ({ ...f, warehouse: e.target.value }))}>
              <option value="">Select Warehouse</option>
              {warehouses.map(w => <option key={w}>{w}</option>)}
            </Select>
          </FormField>
        </div>
      </Modal>

      <Modal open={!!viewingWarehouse} onClose={() => setViewingWarehouse(null)} title={`Warehouse — ${viewingWarehouse}`}
        footer={<Button variant="ghost" onClick={() => setViewingWarehouse(null)}>Close</Button>}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-[var(--text-muted)]">
              {warehouseItems.length} items
            </div>
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              ₹{warehouseItems.reduce((a, i) => a + (i.stock || 0) * (i.rate || 0), 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border-base)] bg-[var(--bg-elevated)]">
                  <th className="px-3 py-2 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Item</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-[var(--text-secondary)] uppercase text-right">Stock</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-[var(--text-secondary)] uppercase text-right">Reserved</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-[var(--text-secondary)] uppercase text-right">Available</th>
                </tr>
              </thead>
              <tbody>
                {warehouseItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-[var(--text-muted)]">No items in this warehouse</td>
                  </tr>
                ) : (
                  warehouseItems.map((i) => (
                    <tr key={i.itemId} className="border-b border-[var(--border-base)] last:border-0 hover:bg-[var(--bg-hover)]">
                      <td className="px-3 py-2">
                        <div>
                          <div className="text-xs font-semibold text-[var(--text-primary)]">{i.name}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">{i.itemId}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-primary)]">{i.stock} {i.unit}</td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-amber-400">{i.reserved} {i.unit}</td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-emerald-400">{i.available} {i.unit}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <Modal open={showWarehouseModal} onClose={() => { setShowWarehouseModal(false); setNewWarehouse(''); }} title="Add New Warehouse"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => { setShowWarehouseModal(false); setNewWarehouse(''); }}>Cancel</Button>
          <Button onClick={handleAddWarehouse} disabled={!newWarehouse.trim()}>Add Warehouse</Button>
        </div>}>
        <FormField label="Warehouse Name" required>
          <Input placeholder="Enter warehouse name (e.g., WH-Baroda)" value={newWarehouse}
            onChange={(e) => setNewWarehouse(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddWarehouse(); } }} />
        </FormField>
      </Modal>

      <Modal open={!!editingWarehouse} onClose={() => { setEditingWarehouse(null); setEditWarehouseValue(''); }} title={`Edit Warehouse — ${editingWarehouse}`}
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => { setEditingWarehouse(null); setEditWarehouseValue(''); }}>Cancel</Button>
          <Button onClick={() => handleEditWarehouse(editingWarehouse)} disabled={!editWarehouseValue.trim()}>Save Changes</Button>
        </div>}>
        <FormField label="Warehouse Name" required>
          <Input placeholder="Enter new warehouse name" value={editWarehouseValue}
            onChange={(e) => setEditWarehouseValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEditWarehouse(editingWarehouse); } }} />
        </FormField>
      </Modal>

      {/* Warehouse Stock Transfer Modal */}
      <Modal open={showTransferModal} onClose={() => { setShowTransferModal(false); setTransferToWarehouse(''); setTransferItem(''); setTransferQuantity(''); setTransferRemarks(''); }}
        title={`Transfer Stock — ${transferFromWarehouse}`}
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => { setShowTransferModal(false); setTransferToWarehouse(''); setTransferItem(''); setTransferQuantity(''); setTransferRemarks(''); }}>Cancel</Button>
          <Button onClick={handleTransfer} disabled={submitting || !transferItem || !transferQuantity || !transferToWarehouse}>
            {submitting ? 'Transferring...' : <><ArrowRightLeft size={13} /> Transfer Stock</>}
          </Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="From Warehouse">
            <Input value={transferFromWarehouse} disabled className="bg-[var(--bg-muted)]" />
          </FormField>
          <FormField label="To Warehouse" required>
            <Select value={transferToWarehouse} onChange={e => setTransferToWarehouse(e.target.value)}>
              <option value="">Select Destination Warehouse</option>
              {warehouses.filter(w => w !== transferFromWarehouse).map(w => <option key={w} value={w}>{w}</option>)}
            </Select>
          </FormField>
          <FormField label="Item" required>
            <Select value={transferItem} onChange={e => { setTransferItem(e.target.value); }}>
              <option value="">Select Item to Transfer</option>
              {inventory.filter(i => i.warehouse === transferFromWarehouse).map(i => (
                <option key={i.itemId} value={i.itemId}>
                  {i.name || i.description} ({i.itemId}) — Available: {i.available} {i.unit}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Quantity to Transfer" required>
              <Input type="number" placeholder="Enter quantity" value={transferQuantity}
                onChange={e => setTransferQuantity(e.target.value)}
                min="1"
                max={inventory.find(i => i.itemId === transferItem && i.warehouse === transferFromWarehouse)?.available || ''}
              />
            </FormField>
            <FormField label="Available Stock">
              <Input
                value={transferItem ? `${inventory.find(i => i.itemId === transferItem && i.warehouse === transferFromWarehouse)?.available || 0} ${inventory.find(i => i.itemId === transferItem && i.warehouse === transferFromWarehouse)?.unit || ''}` : '—'}
                disabled
                className="bg-[var(--bg-muted)]"
              />
            </FormField>
          </div>
          <FormField label="Remarks">
            <Input placeholder="Optional notes about this transfer..." value={transferRemarks} onChange={e => setTransferRemarks(e.target.value)} />
          </FormField>
          {transferItem && (
            <div className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-elevated)] p-2 rounded-lg">
              <p className="font-medium mb-1">Item Details:</p>
              <p>Stock: {inventory.find(i => i.itemId === transferItem && i.warehouse === transferFromWarehouse)?.stock || 0}</p>
              <p>Reserved: {inventory.find(i => i.itemId === transferItem && i.warehouse === transferFromWarehouse)?.reserved || 0}</p>
              <p>Available: {inventory.find(i => i.itemId === transferItem && i.warehouse === transferFromWarehouse)?.available || 0}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Stock In Modal */}
      <Modal open={showStockIn} onClose={() => setStockIn(false)} title="Stock In — Receive Materials"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setStockIn(false)}>Cancel</Button>
          <Button onClick={handleStockIn} disabled={submitting || !stockInForm.itemId || !stockInForm.quantity}>
            {submitting ? 'Processing...' : <><ArrowUp size={13} /> Confirm Receipt</>}
          </Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Item">
            <Select 
              value={stockInForm.itemId} 
              onChange={e => {
                const selectedItem = inventory.find(i => i.itemId === e.target.value);
                setStockInForm(f => ({ 
                  ...f, 
                  itemId: e.target.value,
                  warehouse: selectedItem?.warehouse || f.warehouse // Auto-select item's warehouse
                }));
              }}
            >
              <option value="">Select Item</option>
              {inventory.map(i => <option key={i._id} value={i.itemId}>{i.name || i.description} ({i.warehouse}) - Stock: {i.stock || 0}</option>)}
            </Select>
          </FormField>
          <FormField label="Purchase Order (PO)">
            <Select
              value={stockInForm.poId}
              onChange={e => {
                const po = purchaseOrders.find(p => p.id === e.target.value || p._id === e.target.value);
                setStockInForm(f => ({ ...f, poId: e.target.value, poReference: po ? po.id : '' }));
              }}
            >
              <option value="">Select PO (optional)</option>
              {purchaseOrders.map(po => (
                <option key={po._id || po.id} value={po.id || po._id}>
                  {po.id} — {po.vendorName} | ₹{(po.totalAmount || 0).toLocaleString('en-IN')} | {po.status}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Quantity Received"><Input type="number" placeholder="100" value={stockInForm.quantity} onChange={e => setStockInForm(f => ({ ...f, quantity: e.target.value }))} /></FormField>
            <FormField label="Warehouse">
              <Select value={stockInForm.warehouse} onChange={e => setStockInForm(f => ({ ...f, warehouse: e.target.value }))}>
                <option value="">Select Warehouse</option>
                {warehouses.map(w => <option key={w}>{w}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Received Date"><Input type="date" value={stockInForm.receivedDate} onChange={e => setStockInForm(f => ({ ...f, receivedDate: e.target.value }))} /></FormField>
          <FormField label="Remarks"><Input placeholder="Any notes about the delivery…" value={stockInForm.remarks} onChange={e => setStockInForm(f => ({ ...f, remarks: e.target.value }))} /></FormField>
        </div>
      </Modal>

      {/* Edit Item Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Edit Item — ${editingItem?.itemId}`}
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowEdit(false)}>Cancel</Button>
          <Button onClick={handleUpdateItem} disabled={submitting || !editForm.name || !editForm.category}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>}>
        <div className="space-y-3">
          <FormField label="Item Name / Description" required>
            <Input placeholder="Enter item name" value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category" required>
              <Select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">Select Category</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </Select>
            </FormField>
            <FormField label="Unit" required>
              <Select value={editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))}>
                <option value="">Select Unit</option>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Min Stock">
              <Input type="number" placeholder="0" value={editForm.minStock}
                onChange={e => setEditForm(f => ({ ...f, minStock: e.target.value }))} />
            </FormField>
            <FormField label="Rate (₹)">
              <Input type="number" placeholder="0" value={editForm.rate}
                onChange={e => setEditForm(f => ({ ...f, rate: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Status">
            <Select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
              <option value="">Auto (calculated from stock)</option>
              <option value="In Stock">In Stock</option>
              <option value="Reserved">Reserved</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </Select>
          </FormField>
        </div>
      </Modal>

      {/* Stock Out Modal */}
      <Modal open={showStockOut} onClose={() => setShowStockOut(false)} title="Stock Out — Issue Materials"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowStockOut(false)}>Cancel</Button>
          <Button onClick={handleStockOut} disabled={submitting || !stockOutForm.itemId || !stockOutForm.quantity}>
            {submitting ? 'Processing...' : <><ArrowDown size={13} /> Confirm Issue</>}
          </Button>
        </div>}>
        <div className="space-y-3 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
          <FormField label="Item">
            <Select value={stockOutForm.itemId} onChange={e => setStockOutForm(f => ({ ...f, itemId: e.target.value }))}>
              <option value="">Select Item</option>
              {inventory.map(i => <option key={i._id} value={i.itemId}>{i.name || i.description} ({i.warehouse}) - Stock: {i.stock || 0}</option>)}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Quantity to Issue"><Input type="number" placeholder="50" value={stockOutForm.quantity} onChange={e => setStockOutForm(f => ({ ...f, quantity: e.target.value }))} /></FormField>
            <FormField label="Project">
              <Select value={stockOutForm.projectId} onChange={e => setStockOutForm(f => ({ ...f, projectId: e.target.value }))}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p._id || p.projectId} value={p.projectId}>{p.customerName || p.name} ({p.projectId})</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Issue Date"><Input type="date" value={stockOutForm.issuedDate} onChange={e => setStockOutForm(f => ({ ...f, issuedDate: e.target.value }))} /></FormField>
          <FormField label="Remarks"><Input placeholder="Any notes about the issue…" value={stockOutForm.remarks} onChange={e => setStockOutForm(f => ({ ...f, remarks: e.target.value }))} /></FormField>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.name}
          footer={<Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>}>
          <div className="grid grid-cols-2 gap-3 text-xs mb-4">
            {[
              ['Item ID', selected.itemId], ['Category', selected.category],
              ['Warehouse', selected.warehouse || '—'], ['Unit', selected.unit],
              ['Total Stock', `${selected.stock} ${selected.unit}`],
              ['Reserved', `${selected.reserved || 0} ${selected.unit}`], ['Available', `${(selected.stock || 0) - (selected.reserved || 0)} ${selected.unit}`],
              ['Min Stock', `${selected.minStock} ${selected.unit}`], ['Unit Rate', `₹${selected.rate.toLocaleString('en-IN')}`],
              ['Total Value', fmt(selected.stock * selected.rate)],
              ...(selected.poReference ? [['PO Reference', selected.poReference]] : []),
              ['Status', <StatusBadge domain="inventory" value={getStockStatus(selected)} />],
              ['Last Updated', selected.lastUpdated],
            ].map(([k, v]) => (
              <div key={k} className="glass-card p-2">
                <div className="text-[var(--text-muted)] mb-0.5">{k}</div>
                <div className="font-semibold text-[var(--text-primary)]">{v}</div>
              </div>
            ))}
          </div>

          {/* Warehouse Breakdown Section */}
          {selected._originalWarehouses && selected._originalWarehouses.length > 0 && (
            <div className="border-t border-[var(--border-base)] pt-3 mb-4">
              <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-2">Warehouse Distribution</h4>
              <div className="grid grid-cols-1 gap-2">
                {selected._originalWarehouses.map((wh) => (
                  <div key={wh.warehouse} className="glass-card p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Warehouse size={14} className="text-[var(--accent-light)]" />
                      <span className="text-xs font-medium text-[var(--text-primary)]">{wh.warehouse}</span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Stock: {wh.stock} {selected.unit} | Avail: {(wh.stock || 0) - (wh.reserved || 0)} {selected.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Project Reservations Section */}
          <div className="border-t border-[var(--border-base)] pt-3">
            <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-2">Reserved for Projects</h4>
            {loadingReservations ? (
              <p className="text-xs text-[var(--text-muted)]">Loading reservations...</p>
            ) : itemReservations.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No active reservations</p>
            ) : (
              <div className="space-y-2">
                {itemReservations.map(res => {
                  // First check if reservation has project details embedded
                  const projectFromRes = res.project;
                  // Check for projectName directly on reservation
                  const projectNameFromRes = res.projectName || res.project_name;
                  // Then try to find in projects array
                  const projectFromList = projects.find(p =>
                    p.projectId === res.projectId ||
                    p._id === res.projectId ||
                    p.id === res.projectId
                  );

                  // Determine project name and status
                  let projectName = 'Unknown Project';
                  let isDeleted = false;

                  // First priority: Look up in projects array (most current data)
                  if (projectFromList?.customerName || projectFromList?.name) {
                    projectName = projectFromList.customerName || projectFromList.name;
                    isDeleted = projectFromList.deleted || projectFromList.isDeleted;
                  } else if (projectFromRes?.customerName || projectFromRes?.name) {
                    // Project info embedded in reservation
                    projectName = projectFromRes.customerName || projectFromRes.name;
                    isDeleted = projectFromRes.deleted || projectFromRes.isDeleted;
                  } else if (projectNameFromRes) {
                    // Project name stored directly in reservation
                    projectName = projectNameFromRes;
                    // Mark as deleted if project not found in active projects list
                    isDeleted = true;
                  } else {
                    // Project not found anywhere - show ID as unknown but mark deleted
                    projectName = res.projectId || 'Unknown Project';
                    isDeleted = true;
                  }

                  const projectId = res.projectId || res.projectID || 'N/A';

                  return (
                    <div key={res.reservationId || res._id} className="flex items-center justify-between glass-card p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--primary)]/20 text-[var(--primary-light)] font-medium">
                          {res.status || 'active'}
                        </span>
                        <span className="text-xs font-medium text-[var(--text-primary)]">
                          {projectName}{' '}
                          <span className="text-[var(--text-muted)]">
                            ({projectId}{isDeleted ? ' - deleted' : ''})
                          </span>
                        </span>
                      </div>
                      <span className="text-xs font-bold text-amber-400">
                        {res.quantity} {selected.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}

      <Modal open={showCategoryModal} onClose={() => { setShowCategoryModal(false); setNewCategory(''); }} title="Add New Category"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => { setShowCategoryModal(false); setNewCategory(''); }}>Cancel</Button>
          <Button onClick={handleAddCategory} disabled={!newCategory.trim()}>Add Category</Button>
        </div>}>
        <FormField label="Category Name" required>
          <Input placeholder="Enter category name (e.g., Cables, Connectors)" value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }} />
        </FormField>
      </Modal>

      <Modal open={!!editingCategory} onClose={() => { setEditingCategory(null); setEditCategoryValue(''); }} title={`Edit Category — ${editingCategory}`}
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => { setEditingCategory(null); setEditCategoryValue(''); }}>Cancel</Button>
          <Button onClick={() => handleEditCategory(editingCategory)} disabled={!editCategoryValue.trim()}>Save Changes</Button>
        </div>}>
        <FormField label="Category Name" required>
          <Input placeholder="Enter new category name" value={editCategoryValue}
            onChange={(e) => setEditCategoryValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEditCategory(editingCategory); } }} />
        </FormField>
      </Modal>

      {/* View Category Modal */}
      <Modal open={!!viewingCategory} onClose={() => setViewingCategory(null)} title={`Category — ${viewingCategory}`}
        footer={<Button variant="ghost" onClick={() => setViewingCategory(null)}>Close</Button>}>
        <div className="space-y-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center">
                <Package size={24} className="text-[var(--primary)]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{viewingCategory}</h3>
                <p className="text-sm text-[var(--text-muted)]">{inventory.filter(i => i.category === viewingCategory).length} items</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Items in this category</h4>
            <div className="space-y-2">
              {inventory.filter(i => i.category === viewingCategory).length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No items in this category</p>
              ) : (
                inventory.filter(i => i.category === viewingCategory).map(item => (
                  <div key={item._id || `${item.itemId}-${item.warehouse}`} className="glass-card p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{item.name || item.description}</p>
                      <p className="text-xs text-[var(--text-muted)]">{item.itemId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[var(--text-primary)]">{item.stock} {item.unit}</p>
                      <p className="text-xs text-[var(--text-muted)]">₹{item.rate?.toLocaleString('en-IN') || 0}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>
      {/* View Unit Modal */}
      <Modal open={!!viewingUnit} onClose={() => setViewingUnit(null)} title={`Unit — ${viewingUnit}`}
        footer={<Button variant="ghost" onClick={() => setViewingUnit(null)}>Close</Button>}>
        <div className="space-y-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center">
                <Package size={24} className="text-[var(--primary)]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{viewingUnit}</h3>
                <p className="text-sm text-[var(--text-muted)]">{inventory.filter(i => i.unit === viewingUnit).length} items</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Items using this unit</h4>
            <div className="space-y-2">
              {inventory.filter(i => i.unit === viewingUnit).length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No items using this unit</p>
              ) : (
                inventory.filter(i => i.unit === viewingUnit).map(item => (
                  <div key={item._id || `${item.itemId}-${item.warehouse}`} className="glass-card p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{item.name || item.description}</p>
                      <p className="text-xs text-[var(--text-muted)]">{item.itemId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[var(--text-primary)]">{item.stock} {item.unit}</p>
                      <p className="text-xs text-[var(--text-muted)]">₹{item.rate?.toLocaleString('en-IN') || 0}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Unit Modal */}
      <Modal open={showUnitModal} onClose={() => { setShowUnitModal(false); setNewUnit(''); }} title="Add New Unit"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => { setShowUnitModal(false); setNewUnit(''); }}>Cancel</Button>
          <Button onClick={handleAddUnit} disabled={!newUnit.trim()}>Add Unit</Button>
        </div>}>
        <FormField label="Unit Name" required>
          <Input placeholder="Enter unit name (e.g., Liters, Pieces)" value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUnit(); } }} />
        </FormField>
      </Modal>

      {/* Edit Unit Modal */}
      <Modal open={!!editingUnit} onClose={() => { setEditingUnit(null); setEditUnitValue(''); }} title={`Edit Unit — ${editingUnit}`}
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => { setEditingUnit(null); setEditUnitValue(''); }}>Cancel</Button>
          <Button onClick={() => handleEditUnit(editingUnit)} disabled={!editUnitValue.trim()}>Save Changes</Button>
        </div>}>
        <FormField label="Unit Name" required>
          <Input placeholder="Enter new unit name" value={editUnitValue}
            onChange={(e) => setEditUnitValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEditUnit(editingUnit); } }} />
        </FormField>
      </Modal>
    </div>
  );
};

export default InventoryPage;
