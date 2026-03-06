// Solar OS – EPC Edition — InventoryPage.js
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Package, Plus, AlertTriangle, Warehouse, ArrowUp, ArrowDown, Zap, LayoutGrid, List, Edit2, Trash2
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

const fmt = CURRENCY.format;
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api/v1';
const TENANT_ID = 'solarcorp';

const getStockStatus = (item) => {
  // If explicit status is set, return the stage ID format
  if (item.status) {
    const statusMap = {
      'In Stock': 'in-stock',
      'Partially Reserved': 'partially-reserved',
      'Low Stock': 'low-stock',
      'Out of Stock': 'out-of-stock'
    };
    return statusMap[item.status] || item.status;
  }
  // Otherwise calculate from stock values
  if (item.available === 0) return 'out-of-stock';
  if (item.available <= item.minStock) return 'low-stock';
  if (item.reserved > 0 && item.available > item.minStock) return 'partially-reserved';
  return 'in-stock';
};

// ── Kanban columns ─────────────────────────────────────────────────────────────
const INV_STAGES = [
  { id: 'in-stock', label: 'In Stock', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { id: 'partially-reserved', label: 'Partially Reserved', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
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
  const [dragOver, setDragOver] = useState(null);

  const handleDrop = (stageId) => {
    if (draggingId.current && onDrop) {
      onDrop(draggingId.current, stageId);
    }
    draggingId.current = null; setDragOver(null);
  };

  return (
    <div className="overflow-x-auto pb-3 -mx-2 px-2">
      <div className="flex gap-3 min-w-max">
        {INV_STAGES.map(stage => {
          const cards = items.filter(i => getStockStatus(i) === stage.id);
          const totalVal = cards.reduce((a, i) => a + i.available * i.rate, 0);
          return (
            <div key={stage.id}
              className={`flex flex-col w-72 sm:w-60 rounded-xl border transition-colors ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(stage.id)}>
              <div className="flex items-center justify-between p-3 border-b border-[var(--border-base)]">
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
  const [form, setForm] = useState({ name: '', category: '', unit: '', minStock: '', rate: '', warehouse: '' });
  const [stockInForm, setStockInForm] = useState({ itemId: '', quantity: '', poReference: '', receivedDate: '', remarks: '', projectId: '' });
  const [showEdit, setShowEdit] = useState(false);
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
  const [submitting, setSubmitting] = useState(false);

  // Fetch inventory stats from backend
  useEffect(() => {
    const fetchInventoryStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/inventory/stats?tenantId=${TENANT_ID}`);
        if (response.ok) {
          const data = await response.json();
          setInventoryStats(data.data || data);
        }
      } catch (err) {
        console.error('Error fetching inventory stats:', err);
      }
    };
    fetchInventoryStats();
  }, []);

  // Fetch items by category for chart
  useEffect(() => {
    const fetchByCategory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/inventory/by-category?tenantId=${TENANT_ID}`);
        if (response.ok) {
          const data = await response.json();
          setItemsByCategory(data.data || data || []);
        }
      } catch (err) {
        console.error('Error fetching items by category:', err);
      }
    };
    fetchByCategory();
  }, []);

  // Fetch items from Items module (instead of inventory)
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/items?tenantId=${TENANT_ID}`);
        if (!response.ok) {
          throw new Error('Failed to fetch items');
        }
        const data = await response.json();
        console.log('Items API Response:', data);

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
        console.error('Error fetching items:', err);
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
        const response = await fetch(`${API_BASE_URL}/items?tenantId=${TENANT_ID}`);
        if (response.ok) {
          const data = await response.json();
          const itemsArray = Array.isArray(data) ? data : (data.data || []);
          setItems(itemsArray);
        }
      } catch (err) {
        console.error('Error fetching items:', err);
      }
    };

    fetchItems();
  }, []);

  // Fetch projects for reservation display
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/projects?tenantId=${TENANT_ID}`);
        if (response.ok) {
          const data = await response.json();
          const projectsArray = Array.isArray(data) ? data : (data.data || []);
          setProjects(projectsArray);
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
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

    const stats = {
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems
    };
    setStats(stats);
    return stats;
  }, [inventory]);

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
        itemId: `INV${Date.now().toString().slice(-4)}`,
        description: form.name,  // items module uses 'description' not 'name'
        category: form.category,
        unit: form.unit,
        stock: 0,
        reserved: 0,
        minStock: parseInt(form.minStock) || 0,
        rate: parseFloat(form.rate) || 0,
        warehouse: form.warehouse,
        status: 'In Stock',
      };

      const response = await fetch(`${API_BASE_URL}/items?tenantId=${TENANT_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create item: ${errorText}`);
      }

      const createdItem = await response.json();
      const itemData = createdItem.data || createdItem;
      // Map to inventory format
      setInventory(prev => [...prev, {
        ...itemData,
        name: itemData.description,
        available: (itemData.stock || 0) - (itemData.reserved || 0)
      }]);
      setShowAdd(false);
      setForm({ name: '', category: '', unit: '', minStock: '', rate: '', warehouse: '' });
      alert('Item added successfully!');
    } catch (err) {
      console.error('Error adding item:', err);
      alert(err.message || 'Failed to add item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockIn = async () => {
    if (!stockInForm.itemId || !stockInForm.quantity) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/items/${stockInForm.itemId}/stock-in?tenantId=${TENANT_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: parseInt(stockInForm.quantity),
          poReference: stockInForm.poReference,
          receivedDate: stockInForm.receivedDate,
          remarks: stockInForm.remarks,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to stock in: ${errorText}`);
      }

      const updatedItem = await response.json();
      const itemData = updatedItem.data || updatedItem;
      setInventory(prev => prev.map(i => i._id === stockInForm.itemId ? itemData : i));
      setStockIn(false);
      setStockInForm({ itemId: '', quantity: '', poReference: '', receivedDate: '', remarks: '' });
      alert('Stock added successfully!');
    } catch (err) {
      console.error('Error adding stock:', err);
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
      const response = await fetch(`${API_BASE_URL}/inventory/reservations/by-item/${itemId}?tenantId=${TENANT_ID}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Reservation API response:', data);
        setItemReservations(data.data || data || []);
      } else {
        console.error('Reservation API error:', response.status, await response.text());
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
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

      const response = await fetch(`${API_BASE_URL}/inventory/${editingItem.itemId}?tenantId=${TENANT_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update item: ${errorText}`);
      }

      const updatedItem = await response.json();
      const itemData = updatedItem.data || updatedItem;
      setInventory(prev => prev.map(i => i.itemId === editingItem.itemId ? itemData : i));
      setShowEdit(false);
      setEditingItem(null);
      setEditForm({ name: '', category: '', unit: '', minStock: '', rate: '', warehouse: '' });
      alert('Item updated successfully!');
    } catch (err) {
      console.error('Error updating item:', err);
      alert(err.message || 'Failed to update item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/${itemId}?tenantId=${TENANT_ID}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      setInventory(prev => prev.filter(i => i.itemId !== itemId));
      alert('Item deleted successfully!');
    } catch (err) {
      console.error('Error deleting item:', err);
      alert(err.message || 'Failed to delete item. Please try again.');
    }
  };

  const handleStockOut = async () => {
    if (!stockOutForm.itemId || !stockOutForm.quantity) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/items/${stockOutForm.itemId}/stock-out?tenantId=${TENANT_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: parseInt(stockOutForm.quantity),
          projectId: stockOutForm.projectId,
          issuedDate: stockOutForm.issuedDate,
          remarks: stockOutForm.remarks,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to stock out: ${errorText}`);
      }

      const updatedItem = await response.json();
      const itemData = updatedItem.data || updatedItem;

      // Create reservation record for the project
      if (stockOutForm.projectId) {
        try {
          // Find the item to get its itemId (not _id)
          const item = inventory.find(i => i._id === stockOutForm.itemId);
          await fetch(`${API_BASE_URL}/inventory/reservations?tenantId=${TENANT_ID}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reservationId: `RES-${Date.now()}`,
              itemId: item?.itemId || stockOutForm.itemId,
              projectId: stockOutForm.projectId,
              quantity: parseInt(stockOutForm.quantity),
              notes: stockOutForm.remarks || `Stock issued on ${stockOutForm.issuedDate || new Date().toISOString().split('T')[0]}`,
            }),
          });
        } catch (resErr) {
          console.error('Error creating reservation record:', resErr);
          // Don't fail the whole operation if reservation creation fails
        }
      }

      setInventory(prev => prev.map(i => i._id === stockOutForm.itemId ? itemData : i));
      setShowStockOut(false);
      setStockOutForm({ itemId: '', quantity: '', projectId: '', issuedDate: '', remarks: '' });
      alert('Stock issued successfully! Project reservation recorded.');
    } catch (err) {
      console.error('Error issuing stock:', err);
      alert(err.message || 'Failed to issue stock. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle kanban drop - update item status
  const handleKanbanDrop = async (itemId, targetStage) => {
    // Map stage IDs to status values
    const stageToStatus = {
      'in-stock': 'In Stock',
      'partially-reserved': 'Partially Reserved',
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

      const response = await fetch(`${API_BASE_URL}/items/${item._id || itemId}?tenantId=${TENANT_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update status: ${errorText}`);
      }

      const updatedItem = await response.json();
      const itemData = updatedItem.data || updatedItem;
      setInventory(prev => prev.map(i => (i._id || i.itemId) === (itemData._id || itemData.itemId) ? { ...i, status: newStatus } : i));
      
      // Refresh stats
      const statsResponse = await fetch(`${API_BASE_URL}/inventory/stats?tenantId=${TENANT_ID}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setInventoryStats(statsData.data || statsData);
      }
    } catch (err) {
      console.error('Error updating stock status:', err);
      alert(err.message || 'Failed to update stock status. Please try again.');
    } finally {
      setSubmitting(false);
    }
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total Items" value={dynamicStats.totalItems} sub="SKUs tracked" icon={Package} accentColor="#3b82f6" />
        <KPICard label="Inventory Value" value={fmt(dynamicStats.totalValue)} sub="At current rates" icon={Warehouse} accentColor="#f59e0b" />
        <KPICard label="Low Stock Alerts" value={dynamicStats.lowStockItems} sub="Items need reorder" icon={AlertTriangle} accentColor="#f59e0b" />
        <KPICard label="Out of Stock" value={dynamicStats.outOfStockItems} sub="Immediate action needed" icon={AlertTriangle} accentColor="#ef4444" />
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

      {view === 'table' && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Inventory by Category</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={itemsByCategory.map(c => ({ category: c._id, count: c.count, value: c.totalValue / 100000 }))} barSize={20} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="category" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#22c55e" radius={[3, 3, 0, 0]} name="Items" />
              <Bar dataKey="value" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Value (₹ Lakhs)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

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
            rowActions={ROW_ACTIONS} emptyText="No inventory items found." />
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

      {/* Add Item Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Inventory Item"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button onClick={handleAddItem} disabled={submitting || !form.name || !form.category || !form.warehouse}>
            {submitting ? 'Adding...' : <><Plus size={13} /> Add Item</>}
          </Button>
        </div>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <option>WH-Ahmedabad</option><option>WH-Surat</option><option>WH-Mumbai</option>
            </Select>
          </FormField>
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
              {inventory.map(i => <option key={i._id} value={i._id}>{i.name || i.description} ({i.itemId})</option>)}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Quantity Received"><Input type="number" placeholder="100" value={stockInForm.quantity} onChange={e => setStockInForm(f => ({ ...f, quantity: e.target.value }))} /></FormField>
            <FormField label="Project">
              <Select value={stockInForm.projectId} onChange={e => setStockInForm(f => ({ ...f, projectId: e.target.value }))}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p._id || p.projectId} value={p.projectId}>{p.customerName || p.name} ({p.projectId})</option>)}
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
          <FormField label="Item Name"><Input placeholder="e.g. 400W Mono PERC Panel" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></FormField>
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
              <option value="Partially Reserved">Partially Reserved</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </Select>
          </FormField>
          <FormField label="Warehouse">
            <Select value={editForm.warehouse} onChange={e => setEditForm(f => ({ ...f, warehouse: e.target.value }))}>
              <option value="">Select Warehouse</option>
              <option>WH-Ahmedabad</option><option>WH-Surat</option><option>WH-Mumbai</option>
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
              {inventory.map(i => <option key={i._id} value={i._id}>{i.name || i.description} ({i.itemId})</option>)}
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
                  // First check if reservation has project details
                  const projectFromRes = res.project;
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
                    projectName = projectFromRes.customerName || projectFromRes.name;
                    isDeleted = projectFromRes.deleted || projectFromRes.isDeleted;
                  } else if (projectFromList?.customerName || projectFromList?.name) {
                    projectName = projectFromList.customerName || projectFromList.name;
                    isDeleted = projectFromList.deleted || projectFromList.isDeleted;
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
                            ({isDeleted ? 'deleted' : projectId})
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
    </div>
  );
};

export default InventoryPage;
