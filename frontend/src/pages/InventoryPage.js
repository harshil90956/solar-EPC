// Solar OS – EPC Edition — InventoryPage.js
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Package, Plus, AlertTriangle, Warehouse, ArrowUp, ArrowDown, Zap, LayoutGrid, List, Edit2, Trash2, Eye, ArrowRightLeft
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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

const fmt = CURRENCY.format;
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api/v1';
const PROJECT_API_BASE_URL = process.env.REACT_APP_PROJECT_API_BASE_URL || 'http://localhost:3000/api/v1';
const TENANT_ID = 'solarcorp';

const getStockStatus = (item) => {
  // If explicit status is set, return the stage ID format
  if (item.status) {
    const statusMap = {
      'In Stock': 'available',
      'Reserved': 'reserved',
      'Partially Reserved': 'reserved',
      'Available': 'available',
      'Low Stock': 'low-stock',
      'Out of Stock': 'out-of-stock'
    };
    return statusMap[item.status] || item.status;
  }
  // Otherwise calculate from stock values
  // Priority: Reserved > Out of Stock > Low Stock > In Stock
  if (item.reserved > 0) return 'reserved';
  if (item.available === 0) return 'out-of-stock';
  if (item.available <= item.minStock) return 'low-stock';
  return 'available';
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
        <span className="text-[10px] font-mono text-[var(--accent-light)]">{item.itemId}</span>
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
          const totalVal = cards.reduce((a, i) => a + i.available * i.rate, 0);
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
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'warehouse', 'items', 'category'
  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showAdd, setShowAdd] = useState(false);
  const [showStockIn, setStockIn] = useState(false);
  const [selected, setSelected] = useState(null);
  const [itemReservations, setItemReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [form, setForm] = useState({ itemId: '', name: '', category: '', unit: '', minStock: '', rate: '', warehouse: '' });
  const [stockInForm, setStockInForm] = useState({ itemId: '', quantity: '', poReference: '', receivedDate: '', remarks: '', warehouse: '' });
  const [warehouses, setWarehouses] = useState(() => {
    const saved = localStorage.getItem('warehouses');
    return saved ? JSON.parse(saved) : ['WH-Ahmedabad', 'WH-Surat', 'WH-Mumbai'];
  });
  const [newWarehouse, setNewWarehouse] = useState('');
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [editWarehouseValue, setEditWarehouseValue] = useState('');
  const [viewingWarehouse, setViewingWarehouse] = useState(null);
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('itemCategories');
    return saved ? JSON.parse(saved) : ['Panel', 'Inverter', 'BOS', 'Structure', 'Cable', 'Other'];
  });
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');
  const [viewingCategory, setViewingCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', category: '', unit: '', minStock: '', rate: '', warehouse: '' });
  const [showStockOut, setShowStockOut] = useState(false);
  const [stockOutForm, setStockOutForm] = useState({ itemId: '', quantity: '', projectId: '', issuedDate: '', remarks: '' });
  const [inventory, setInventory] = useState([]);
  const [items, setItems] = useState([]); // Items from Items module
  const [projects, setProjects] = useState([]); // Projects for reservation display
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

  // Save categories to localStorage
  useEffect(() => {
    localStorage.setItem('itemCategories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('warehouses', JSON.stringify(warehouses));
  }, [warehouses]);

  const handleAddWarehouse = () => {
    const name = newWarehouse.trim();
    if (!name) {
      alert('Please enter a warehouse name');
      return;
    }
    if (warehouses.includes(name)) {
      alert('Warehouse already exists');
      return;
    }
    setWarehouses([...warehouses, name]);
    setNewWarehouse('');
    setShowWarehouseModal(false);
    alert('Warehouse added successfully');
  };

  const handleEditWarehouse = (oldName) => {
    const name = editWarehouseValue.trim();
    if (!name) {
      alert('Please enter a warehouse name');
      return;
    }
    if (warehouses.includes(name) && name !== oldName) {
      alert('Warehouse already exists');
      return;
    }
    setWarehouses(warehouses.map(w => (w === oldName ? name : w)));
    setInventory(prev => prev.map(i => (i.warehouse === oldName ? { ...i, warehouse: name } : i)));
    setEditingWarehouse(null);
    setEditWarehouseValue('');
    alert('Warehouse updated successfully');
  };

  const handleDeleteWarehouse = (name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" warehouse?`)) return;
    setWarehouses(warehouses.filter(w => w !== name));
    setInventory(prev => prev.map(i => (i.warehouse === name ? { ...i, warehouse: '' } : i)));
    alert('Warehouse deleted successfully');
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

    if ((item.available || 0) < qty) {
      alert(`Insufficient stock. Available: ${item.available} ${item.unit}`);
      return;
    }

    setSubmitting(true);
    try {
      // First, check if item exists in destination warehouse
      const existingItemInDest = inventory.find(i => i.itemId === transferItem && i.warehouse === transferToWarehouse);

      if (existingItemInDest) {
        // Transfer between existing items - stock out from source, stock in to dest
        // Use itemId for API calls since backend looks up by ID
        await api.post(`/items/${item._id || item.itemId}/stock-out`, {
          quantity: qty,
          remarks: `Transferred to ${transferToWarehouse}: ${transferRemarks || 'Stock transfer'}`,
        }, { headers: { 'x-tenant-id': TENANT_ID } });

        await api.post(`/items/${existingItemInDest._id || existingItemInDest.itemId}/stock-in`, {
          quantity: qty,
          warehouse: transferToWarehouse,
          remarks: `Transferred from ${transferFromWarehouse}: ${transferRemarks || 'Stock transfer'}`,
        }, { headers: { 'x-tenant-id': TENANT_ID } });
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
      const data = await api.get('/items');
      const itemsArray = Array.isArray(data) ? data : (data.data || []);
      const inventoryData = itemsArray.map(item => ({
        ...item,
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
        const inventoryData = itemsArray.map(item => ({
          ...item,
          name: item.description || item.name || 'Unnamed Item',
          reserved: item.reserved || 0,
          available: (item.stock || 0) - (item.reserved || 0),
          lastUpdated: item.updatedAt || new Date().toISOString().split('T')[0]
        }));

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

    fetchProjects();
  }, []);

  // Calculate dynamic stats from inventory
  const dynamicStats = useMemo(() => {
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((a, i) => a + (i.stock || 0) * (i.rate || 0), 0);
    const lowStockItems = inventory.filter(i => ((i.stock || 0) - (i.reserved || 0)) <= (i.minStock || 0) && ((i.stock || 0) - (i.reserved || 0)) > 0).length;
    const outOfStockItems = inventory.filter(i => (i.stock || 0) === 0).length;

    return { totalItems, totalValue, lowStockItems, outOfStockItems };
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

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const chartData = inventory.slice(0, 10).map(i => ({
    name: (i.name || i.description || 'Unknown').length > 14 ? (i.name || i.description || 'Unknown').slice(0, 14) + '…' : (i.name || i.description || 'Unknown'),
    available: i.available, reserved: i.reserved,
  }));

  const handleAddItem = async () => {
    setSubmitting(true);
    try {
      const newItem = {
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
      };

      const createdItem = await api.post('/items', newItem);
      const itemData = createdItem.data || createdItem;
      // Map to inventory format
      setInventory(prev => [...prev, {
        ...itemData,
        name: itemData.description,
        available: (itemData.stock || 0) - (itemData.reserved || 0)
      }]);
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
      const updatedItem = await api.post(`/items/${stockInForm.itemId}/stock-in`, {
        quantity: parseInt(stockInForm.quantity),
        poReference: stockInForm.poReference,
        receivedDate: stockInForm.receivedDate,
        remarks: stockInForm.remarks,
        warehouse: stockInForm.warehouse,
      }, { headers: { 'x-tenant-id': TENANT_ID } });
      const itemData = updatedItem.data || updatedItem;
      setInventory(prev => prev.map(i => i._id === stockInForm.itemId ? itemData : i));
      setStockIn(false);
      setStockInForm({ itemId: '', quantity: '', poReference: '', receivedDate: '', remarks: '', warehouse: '' });
      alert('Stock added successfully!');
    } catch (err) {
      alert(err.message || 'Failed to add stock. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch reservations when item is selected
  useEffect(() => {
    if (selected?.itemId) {
      fetchItemReservations(selected.itemId);
    } else {
      setItemReservations([]);
    }
  }, [selected?.itemId]);

  const fetchItemReservations = async (itemId) => {
    setLoadingReservations(true);
    try {
      const data = await api.get(`/inventory/reservations/by-item/${itemId}`);
      setItemReservations(data.data || data || []);
    } catch (err) {
      // Error fetching reservations
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
        name: editForm.name,
        category: editForm.category,
        unit: editForm.unit,
        minStock: parseInt(editForm.minStock) || 0,
        rate: parseFloat(editForm.rate) || 0,
        warehouse: editForm.warehouse,
        status: editForm.status || undefined
      };

      const updatedItem = await apiClient.patch(`/inventory/${editingItem.itemId}`, updateData, { params: { tenantId: TENANT_ID } });
      const itemData = updatedItem.data || updatedItem;
      setInventory(prev => prev.map(i => i.itemId === editingItem.itemId ? itemData : i));
      setShowEdit(false);
      setEditingItem(null);
      setEditForm({ name: '', category: '', unit: '', minStock: '', rate: '', warehouse: '' });
      alert('Item updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to update item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await apiClient.delete(`/inventory/${itemId}`, { params: { tenantId: TENANT_ID } });

      setInventory(prev => prev.filter(i => i.itemId !== itemId));
      alert('Item deleted successfully!');
    } catch (err) {
      alert(err.message || 'Failed to delete item. Please try again.');
    }
  };

  const handleStockOut = async () => {
    if (!stockOutForm.itemId || !stockOutForm.quantity) return;

    setSubmitting(true);
    try {
      const updatedItem = await api.post(`/items/${stockOutForm.itemId}/stock-out`, {
        quantity: parseInt(stockOutForm.quantity),
        projectId: stockOutForm.projectId,
        issuedDate: stockOutForm.issuedDate,
        remarks: stockOutForm.remarks,
      }, { headers: { 'x-tenant-id': TENANT_ID } });
      const itemData = updatedItem.data || updatedItem;

      // Create reservation record for the project
      if (stockOutForm.projectId) {
        try {
          // Find the item by itemId (not _id since stockOutForm.itemId now contains itemId)
          const item = inventory.find(i => i.itemId === stockOutForm.itemId);
          // Find project name
          const project = projects.find(p => p.projectId === stockOutForm.projectId);
          const projectName = project?.customerName || project?.name || 'Unknown Project';
          
          await apiClient.post('/inventory/reservations', {
            reservationId: `RES-${Date.now()}`,
            itemId: item?.itemId || stockOutForm.itemId,
            projectId: stockOutForm.projectId,
            projectName: projectName,
            quantity: parseInt(stockOutForm.quantity),
            notes: stockOutForm.remarks || `Stock issued on ${stockOutForm.issuedDate || new Date().toISOString().split('T')[0]}`,
          }, { params: { tenantId: TENANT_ID } });
        } catch (resErr) {
          // Don't fail the whole operation if reservation creation fails
        }
      }

      setInventory(prev => prev.map(i => i.itemId === stockOutForm.itemId ? itemData : i));
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
  const handleAddCategory = () => {
    if (!newCategory.trim()) {
      alert('Please enter a category name');
      return;
    }
    if (categories.includes(newCategory.trim())) {
      alert('Category already exists');
      return;
    }
    setCategories([...categories, newCategory.trim()]);
    setNewCategory('');
    setShowCategoryModal(false);
    alert('Category added successfully');
  };

  const handleEditCategory = (oldCategory) => {
    if (!editCategoryValue.trim()) {
      alert('Please enter a category name');
      return;
    }
    if (categories.includes(editCategoryValue.trim()) && editCategoryValue.trim() !== oldCategory) {
      alert('Category already exists');
      return;
    }
    setCategories(categories.map(cat => cat === oldCategory ? editCategoryValue.trim() : cat));
    setEditingCategory(null);
    setEditCategoryValue('');
    alert('Category updated successfully');
  };

  const handleDeleteCategory = (categoryToDelete) => {
    if (!window.confirm(`Are you sure you want to delete "${categoryToDelete}" category?`)) {
      return;
    }
    setCategories(categories.filter(cat => cat !== categoryToDelete));
    alert('Category deleted successfully');
  };

  const ROW_ACTIONS = [
    { label: 'View Details', icon: Package, onClick: row => setSelected(row) },
    { label: 'Edit', icon: Edit2, onClick: row => handleEditClick(row) },
    { label: 'Stock In', icon: ArrowUp, onClick: row => { setStockInForm({ ...stockInForm, itemId: row.itemId }); setStockIn(true); } },
    { label: 'Stock Out', icon: ArrowDown, onClick: row => { setStockOutForm({ ...stockOutForm, itemId: row.itemId }); setShowStockOut(true); } },
    { label: 'Delete', icon: Trash2, onClick: row => handleDeleteItem(row.itemId), danger: true },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <div className="page-header flex-col sm:flex-row gap-3">
        <div>
          <h1 className="heading-page text-lg sm:text-xl">Inventory Management</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Stock levels · reservations · low-stock alerts · warehouses</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Main Tabs - Now at top right */}
          <div className="flex items-center gap-1 p-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-base)]">
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
          </div>
        </div>
      </div>

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
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl p-5 shadow-lg shadow-blue-500/20">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-50 uppercase tracking-wider">Total Items</p>
                  <p className="text-3xl font-bold text-white mt-2">{dynamicStats.totalItems}</p>
                  <p className="text-xs text-blue-100/80 mt-1">SKUs tracked</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Package size={24} className="text-white" />
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-400 rounded-2xl p-5 shadow-lg shadow-emerald-500/20">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-50 uppercase tracking-wider">Inventory Value</p>
                  <p className="text-xl font-bold text-white mt-2">₹{(dynamicStats.totalValue / 100000).toFixed(1)}L</p>
                  <p className="text-xs text-emerald-100/80 mt-1">At current rates</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Warehouse size={24} className="text-white" />
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-400 rounded-2xl p-5 shadow-lg shadow-amber-500/20">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-50 uppercase tracking-wider">Low Stock</p>
                  <p className="text-3xl font-bold text-white mt-2">{dynamicStats.lowStockItems}</p>
                  <p className="text-xs text-amber-100/80 mt-1">Items need reorder</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <AlertTriangle size={24} className="text-white" />
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-red-600 to-rose-500 rounded-2xl p-5 shadow-lg shadow-red-500/20">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-red-50 uppercase tracking-wider">Out of Stock</p>
                  <p className="text-3xl font-bold text-white mt-2">{dynamicStats.outOfStockItems}</p>
                  <p className="text-xs text-red-100/80 mt-1">Immediate action needed</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <AlertTriangle size={24} className="text-white" />
                </div>
              </div>
            </div>
          </div>

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
              <DataTable columns={COLUMNS} data={paginated} total={filtered.length}
                page={page} pageSize={pageSize} onPageChange={setPage}
                onPageSizeChange={s => { setPageSize(s); setPage(1); }}
                search={search} onSearch={v => { setSearch(v); setPage(1); }}
                rowActions={ROW_ACTIONS} emptyText="No inventory items found."
                onRowClick={setSelected} />
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
                <InvKanbanBoard items={filtered} onCardClick={setSelected} onDrop={handleKanbanDrop} />
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'warehouse' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Warehouse Management</h2>
            <Button onClick={() => setShowWarehouseModal(true)}>
              <Plus size={14} /> Add Warehouse
            </Button>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border-base)] bg-[var(--bg-elevated)]">
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Items</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-muted)]">No warehouses</td>
                  </tr>
                ) : (
                  warehouses.map((w) => (
                    <tr
                      key={w}
                      className="border-b border-[var(--border-base)] last:border-0 hover:bg-[var(--bg-hover)] cursor-pointer"
                      onClick={() => setViewingWarehouse(w)}
                    >
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ITEMS TAB CONTENT */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Search items..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-xs w-64"
              />
            </div>
            <div className="flex gap-2">
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
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Item ID</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Description</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Category</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Unit</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Rate (₹)</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                        Loading items...
                      </div>
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
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
                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.itemId); }}
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
          </div>
        </div>
      )}

      {/* CATEGORY TAB CONTENT */}
      {activeTab === 'category' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Category Management</h2>
            <Button onClick={() => setShowCategoryModal(true)}>
              <Plus size={14} /> Add Category
            </Button>
          </div>

          {/* Items by Category - Now at TOP as colored cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories.map((cat, index) => {
              const catItems = inventory.filter(i => i.category === cat);
              if (catItems.length === 0) return null;
              const colors = ['bg-blue-50 border-blue-200', 'bg-amber-50 border-amber-200', 'bg-green-50 border-green-200', 'bg-purple-50 border-purple-200', 'bg-pink-50 border-pink-200', 'bg-cyan-50 border-cyan-200', 'bg-orange-50 border-orange-200', 'bg-teal-50 border-teal-200'];
              const iconColors = ['text-blue-500', 'text-amber-500', 'text-green-500', 'text-purple-500', 'text-pink-500', 'text-cyan-500', 'text-orange-500', 'text-teal-500'];
              const bgColors = ['bg-blue-100', 'bg-amber-100', 'bg-green-100', 'bg-purple-100', 'bg-pink-100', 'bg-cyan-100', 'bg-orange-100', 'bg-teal-100'];
              return (
                <div key={cat} className={`${colors[index % colors.length]} border rounded-xl p-4 flex flex-col gap-2 hover:shadow-md transition-all`}>
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-lg ${bgColors[index % bgColors.length]} flex items-center justify-center`}>
                      <Package size={20} className={iconColors[index % iconColors.length]} />
                    </div>
                    <span className="text-xs font-medium text-[var(--text-muted)]">{catItems.length} items</span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{cat}</span>
                  <div className="flex flex-wrap gap-1">
                    {catItems.slice(0, 3).map((item) => (
                      <span key={item.itemId} className="text-[10px] px-2 py-1 bg-white rounded text-[var(--text-secondary)] border border-[var(--border-base)]">
                        {item.name || item.description}
                      </span>
                    ))}
                    {catItems.length > 3 && (
                      <span className="text-[10px] px-2 py-1 text-[var(--text-muted)]">
                        +{catItems.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Categories Table - Now at BOTTOM */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Categories</h3>
            <div className="glass-card overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border-base)] bg-[var(--bg-elevated)]">
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center">
                            <Package size={16} className="text-[var(--primary)]" />
                          </div>
                          <span className="text-sm font-medium text-[var(--text-primary)]">{cat}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[var(--text-secondary)]">{inventory.filter(i => i.category === cat).length} items</span>
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
              {['Panel', 'Inverter', 'BOS', 'Structure', 'Cable', 'Other'].map(c => <option key={c}>{c}</option>)}
            </Select>
          </FormField>
          <FormField label="Unit">
            <Select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
              <option value="">Select Unit</option>
              {['Nos', 'Mtr', 'Kg', 'Set', 'Pairs', 'Box'].map(u => <option key={u}>{u}</option>)}
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
            <Select value={stockInForm.itemId} onChange={e => setStockInForm(f => ({ ...f, itemId: e.target.value }))}>
              <option value="">Select Item</option>
              {inventory.map(i => <option key={i._id} value={i.itemId}>{i.name || i.description} ({i.itemId})</option>)}
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
          <Button onClick={handleUpdateItem} disabled={submitting || !editForm.name || !editForm.category || !editForm.warehouse}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Item ID"><Input value={editingItem?.itemId || ''} disabled className="bg-[var(--bg-muted)]" /></FormField>
            <FormField label="Item Name"><Input placeholder="e.g. 400W Mono PERC Panel" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <Select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">Select Category</option>
                {['Panel', 'Inverter', 'BOS', 'Structure', 'Cable', 'Other'].map(c => <option key={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="Unit">
              <Select value={editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))}>
                <option value="">Select Unit</option>
                {['Nos', 'Mtr', 'Kg', 'Set', 'Pairs', 'Box'].map(u => <option key={u}>{u}</option>)}
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Min Stock Level"><Input type="number" placeholder="100" value={editForm.minStock} onChange={e => setEditForm(f => ({ ...f, minStock: e.target.value }))} /></FormField>
            <FormField label="Unit Rate (₹)"><Input type="number" placeholder="14500" value={editForm.rate} onChange={e => setEditForm(f => ({ ...f, rate: e.target.value }))} /></FormField>
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
          <FormField label="Warehouse">
            <Select value={editForm.warehouse} onChange={e => setEditForm(f => ({ ...f, warehouse: e.target.value }))}>
              <option value="">Select Warehouse</option>
              {warehouses.map(w => <option key={w}>{w}</option>)}
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
              {inventory.map(i => <option key={i._id} value={i.itemId}>{i.name || i.description} ({i.itemId})</option>)}
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
              ['Item ID', selected.itemId], ['Category', selected.category], ['Warehouse', selected.warehouse],
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
                  
                  if (projectFromRes?.customerName || projectFromRes?.name) {
                    // Project info embedded in reservation
                    projectName = projectFromRes.customerName || projectFromRes.name;
                    isDeleted = projectFromRes.deleted || projectFromRes.isDeleted;
                  } else if (projectNameFromRes) {
                    // Project name stored in reservation
                    projectName = projectNameFromRes;
                    // Mark as deleted if project not found in active projects list
                    isDeleted = !projectFromList;
                  } else if (projectFromList?.customerName || projectFromList?.name) {
                    // Project found in active list
                    projectName = projectFromList.customerName || projectFromList.name;
                    isDeleted = projectFromList.deleted || projectFromList.isDeleted;
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
                  <div key={item.itemId} className="glass-card p-3 flex items-center justify-between">
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
    </div>
  );
};

export default InventoryPage;
