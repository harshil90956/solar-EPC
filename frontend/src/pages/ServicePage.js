import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Headphones, Plus, Clock, CheckCircle, AlertTriangle,
  Shield, Zap, Wrench, LayoutGrid, List, Tag, Loader2, Calendar, XCircle,
  FolderOpen, TrendingUp, CheckCircle2, BarChart3, PieChart, Activity, Trash2, Pencil,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { Avatar } from '../components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import DataTable from '../components/ui/DataTable';
import { APP_CONFIG } from '../config/app.config';
import { Progress } from '../components/ui/Progress';
import { Stepper } from '../components/ui/Stepper';
import {
  getTickets,
  createTicket,
  updateTicket,
  deleteTicket,
  getTicketStats,
  getAmcContracts,
  createAmcContract,
  updateAmcContract,
  deleteAmcContract,
  getAmcContractStats,
  getAiInsight,
  getEngineers,
  autoGenerateAmcContracts,
  createVisit,
  getCustomers,
  getVisits,
  getVisitStats,
} from '../modules/service-amc/services/serviceAmcApi';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api/v1';
const TENANT_ID = 'solarcorp';

/* ── Ticket stage defs ──────────────────────────────────────────────────────── */
const TICKET_STAGES = [
  { id: 'Open', label: 'Open', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  { id: 'Scheduled', label: 'Scheduled', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { id: 'In Progress', label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { id: 'Resolved', label: 'Resolved', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { id: 'Closed', label: 'Closed', color: '#64748b', bg: 'rgba(100,116,139,0.10)' },
];

/* ── Priority helpers ───────────────────────────────────────────────────────── */
const NEUTRAL_BADGE = 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-muted)]';
const PRIORITY_MAP = {
  High: { label: 'High', color: 'bg-red-500/15    text-red-400    border-red-500/30' },
  Medium: { label: 'Medium', color: 'bg-amber-500/15  text-amber-400  border-amber-500/30' },
  Low: { label: 'Low', color: NEUTRAL_BADGE },
};
const PriorityBadge = ({ value }) => {
  const meta = PRIORITY_MAP[value] ?? PRIORITY_MAP.Low;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>{meta.label}</span>;
};

/* ── AMC badge ──────────────────────────────────────────────────────────────── */
const AMC_MAP = {
  Active: { label: 'Active', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  Expired: { label: 'Expired', color: 'bg-red-500/15    text-red-400    border-red-500/30' },
  Expiring: { label: 'Expiring', color: 'bg-amber-500/15  text-amber-400  border-amber-500/30' },
};
const AmcBadge = ({ value }) => {
  const meta = AMC_MAP[value] ?? AMC_MAP.Active;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.color}`}>{meta.label}</span>;
};

/* ── Ticket card ────────────────────────────────────────────────────────────── */
const PRIORITY_BORDER = { High: 'border-l-red-500', Medium: 'border-l-amber-500', Low: 'border-l-[var(--border-muted)]' };

const TicketCard = ({ ticket, onDragStart, onDragEnd, onClick }) => (
  <div
    draggable
    onDragStart={(e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', ticket.id);
      onDragStart(e);
    }}
    onDragEnd={onDragEnd}
    onClick={() => onClick(ticket)}
    className={`glass-card p-3 cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-all space-y-2 border-l-2 ${PRIORITY_BORDER[ticket.priority] ?? 'border-l-[var(--border-muted)]'}`}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-mono text-[var(--accent-light)]">{ticket.id}</span>
      <PriorityBadge value={ticket.priority} />
    </div>
    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{ticket.customerName}</p>
    <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
      <Tag size={9} /><span className="truncate">{ticket.type}</span>
    </div>
    <p className="text-[10px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">{ticket.description}</p>
    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
      <Avatar name={ticket.assignedTo} size="xs" />
      <span className="truncate">{ticket.assignedTo}</span>
      <span className="ml-auto">{ticket.created}</span>
    </div>
  </div>
);

/* ── Ticket Kanban board ─────────────────────────────────────────────────────── */
const TicketKanbanBoard = ({ tickets, onStageChange, onCardClick }) => {
  const [dragOver, setDragOver] = useState(null);
  const ticketsArray = Array.isArray(tickets) ? tickets : [];

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOver !== stageId) {
      setDragOver(stageId);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(null);
  };

  const handleDrop = (e, stageId) => {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      // Get the ticket being dragged to check if status actually changed
      const draggedTicket = ticketsArray.find(t => t.id === id);
      if (draggedTicket && draggedTicket.status !== stageId) {
        onStageChange(id, stageId);
      }
    }
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDragOver(null);
  };

  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex gap-3 min-w-max">
        {TICKET_STAGES.map(stage => {
          const cards = ticketsArray.filter(t => t.status === stage.id);
          return (
            <div key={stage.id}
              className={`flex flex-col w-60 rounded-xl border transition-colors ${dragOver === stage.id ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : 'border-[var(--border-base)] bg-[var(--bg-surface)]'}`}
              onDragOver={e => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, stage.id)}
            >
              <div className="p-2.5 border-b border-[var(--border-base)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{stage.label}</span>
                </div>
                <span className="min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: stage.bg, color: stage.color }}>{cards.length}</span>
              </div>
              <div className="flex flex-col gap-2 p-2 flex-1 min-h-[120px]">
                {cards.map(t => (
                  <TicketCard key={t.id} ticket={t}
                    onDragStart={() => { }}
                    onDragEnd={handleDragEnd}
                    onClick={onCardClick}
                  />
                ))}
                {cards.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-[11px] text-[var(--text-faint)]">No tickets</p>
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

/* ── Table columns ──────────────────────────────────────────────────────────── */
const TICKET_COLUMNS = [
  { key: 'id', header: 'Ticket ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
  { key: 'customerName', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
  { key: 'type', header: 'Type', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },
  { key: 'description', header: 'Description', render: v => <span className="text-xs text-[var(--text-muted)] max-w-[200px] truncate block">{v}</span> },
  { key: 'priority', header: 'Priority', render: v => <PriorityBadge value={v} /> },
  { key: 'status', header: 'Status', render: v => <StatusBadge domain="ticket" value={v} /> },
  {
    key: 'assignedTo', header: 'Assigned To', render: v => (
      <div className="flex items-center gap-1.5">
        <Avatar name={v} size="xs" />
        <span className="text-xs text-[var(--text-muted)]">{v || '—'}</span>
      </div>
    )
  },
  { key: 'created', header: 'Created', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'resolved', header: 'Resolved', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },
];

const AMC_COLUMNS = [
  { key: 'id', header: 'Contract ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },
  { key: 'customer', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },
  { key: 'site', header: 'Site', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'systemSize', header: 'Size', render: v => <span className="text-xs font-bold text-[var(--solar)]">{v} kW</span> },
  { key: 'startDate', header: 'Start Date', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'endDate', header: 'End Date', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },
  { key: 'nextVisit', header: 'Next Visit', render: v => <span className="text-xs text-cyan-400">{v}</span> },
  { key: 'amount', header: 'AMC Value', sortable: true, render: v => <span className="text-xs font-bold text-[var(--text-primary)]">₹{v?.toLocaleString?.('en-IN') ?? v}</span> },
  { key: 'status', header: 'Status', render: v => <AmcBadge value={v} /> },
];

const TICKET_STATUS_FILTERS = ['All', 'Open', 'Scheduled', 'In Progress', 'Resolved', 'Closed'];

/* ══════════════════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════════════════ */
const ServicePage = () => {
  // Data states
  const [tickets, setTickets] = useState([]);
  const [amcContracts, setAmcContracts] = useState([]);
  const [ticketStats, setTicketStats] = useState({
    openTickets: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [amcStats, setAmcStats] = useState({
    activeContracts: 0,
  });
  const [aiInsight, setAiInsight] = useState({ insight: '', recommendations: [] });

  // UI states
  const [view, setView] = useState('kanban');
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatus, setTicketStatus] = useState('All');
  const [tPage, setTPage] = useState(1);
  const [tPageSize, setTPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [aPage, setAPage] = useState(1);
  const [aPageSize, setAPageSize] = useState(APP_CONFIG.defaultPageSize);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [assignModal, setAssignModal] = useState({ open: false, ticket: null });
  const [engineers, setEngineers] = useState([]);
  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [activeTab, setActiveTab] = useState('tickets');
  const [customers, setCustomers] = useState([]);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type });
    }, 5000);
  };

  // AMC Project View modal state
  const [amcProjectView, setAmcProjectView] = useState(null);
  const [amcProjectData, setAmcProjectData] = useState(null);
  const [loadingAmcProject, setLoadingAmcProject] = useState(false);

  // Edit Ticket modal state
  const [editModal, setEditModal] = useState({ open: false, ticket: null });
  const [editForm, setEditForm] = useState({
    customerName: '',
    type: '',
    priority: 'Low',
    status: 'Open',
    description: '',
    assignedTo: '',
  });
  const [updating, setUpdating] = useState(false);

  // Service Ticket from AMC modal state
  const [serviceTicketModal, setServiceTicketModal] = useState({ open: false, contract: null });
  const [serviceTicketForm, setServiceTicketForm] = useState({
    customerName: '',
    type: 'AMC',
    priority: 'Low',
    status: 'Open',
    description: '',
    assignedTo: '',
  });
  const [creatingServiceTicket, setCreatingServiceTicket] = useState(false);

  // AMC Contract Edit modal state
  const [amcEditModal, setAmcEditModal] = useState({ open: false, contract: null });
  const [amcEditForm, setAmcEditForm] = useState({
    customer: '',
    site: '',
    systemSize: 0,
    startDate: '',
    endDate: '',
    status: 'Active',
    amount: 0,
    nextVisit: '',
  });
  const [updatingAmc, setUpdatingAmc] = useState(false);
  const [scheduleVisitModal, setScheduleVisitModal] = useState({ open: false, contract: null });
  const [scheduleVisitProjectData, setScheduleVisitProjectData] = useState(null);
  const [loadingScheduleVisitProject, setLoadingScheduleVisitProject] = useState(false);
  const [visitForm, setVisitForm] = useState({
    visitType: 'Routine Maintenance',
    scheduledDate: '',
    scheduledTime: '',
    engineerId: '',
    priority: 'Low',
    notes: '',
  });
  const [schedulingVisit, setSchedulingVisit] = useState(false);
  const [scheduledVisitsCount, setScheduledVisitsCount] = useState(0);

  // Form state for new ticket
  const [newTicket, setNewTicket] = useState({
    customerId: '',
    customerName: '',
    type: '',
    priority: 'Low',
    status: 'Open',
    description: '',
    assignedTo: '',
  });

  // Loading states
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingAmc, setLoadingAmc] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState(null);

  // Dashboard state
  const [showDashboard, setShowDashboard] = useState(false);
  const [visits, setVisits] = useState([]);
  const [visitStats, setVisitStats] = useState({
    totalVisits: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
  });
  const [loadingVisits, setLoadingVisits] = useState(false);

  // Fetch tickets
  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const params = {};
      if (ticketStatus !== 'All') params.status = ticketStatus;
      if (ticketSearch) params.search = ticketSearch;
      params.page = tPage;
      params.limit = tPageSize;

      const response = await getTickets(params);
      console.log('Tickets response:', response);
      // Handle various response formats
      let ticketsData = [];
      if (Array.isArray(response)) {
        ticketsData = response;
      } else if (response?.data && Array.isArray(response.data)) {
        ticketsData = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        ticketsData = response.data.data;
      }
      console.log('Extracted tickets:', ticketsData);
      setTickets(ticketsData);
      setError(null);
    } catch (err) {
      console.error('Tickets fetch error:', err);
      setError(err.message || 'Failed to fetch tickets');
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  // Fetch AMC contracts
  const fetchAmcContracts = async () => {
    setLoadingAmc(true);
    try {
      // Fetch both AMC contracts and projects to check for deleted projects
      const [response, projectsResponse] = await Promise.all([
        getAmcContracts({ page: aPage, limit: aPageSize }),
        fetch(`${API_BASE_URL}/projects?tenantId=${TENANT_ID}`)
      ]);

      // Handle various response formats for contracts
      let contractsData = [];
      if (Array.isArray(response)) {
        contractsData = response;
      } else if (response?.data && Array.isArray(response.data)) {
        contractsData = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        contractsData = response.data.data;
      }

      // Parse projects response
      let projectsData = [];
      if (projectsResponse.ok) {
        const projectsJson = await projectsResponse.json();
        projectsData = Array.isArray(projectsJson) ? projectsJson : (projectsJson?.data || []);
      }

      // Filter out rutvik and prakash agraval permanently
      // Also filter out contracts where matching project with 100% progress was deleted
      const filteredContracts = contractsData.filter(c => {
        // Filter out specific customers
        if (['rutvik', 'prakash agraval', 'prakashagrawal', 'prakash agarwal'].includes(c.customer?.toLowerCase())) {
          return false;
        }

        // Find matching project by customer and site
        const matchingProject = projectsData.find(
          p => p.customerName === c.customer && p.site === c.site
        );

        // If no matching project exists (project was deleted with 100% progress), filter out this contract
        if (!matchingProject) {
          return false;
        }

        return true;
      });

      setAmcContracts(filteredContracts);
    } catch (err) {
      setAmcContracts([]);
    } finally {
      setLoadingAmc(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const [tStats, aStats] = await Promise.all([
        getTicketStats(),
        getAmcContractStats(),
      ]);
      setTicketStats(tStats || { openTickets: 0, inProgress: 0, resolved: 0 });
      setAmcStats(aStats || { activeContracts: 0 });
    } catch (err) {
      // Keep default stats on error
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch AI insight
  const fetchAiInsight = async () => {
    try {
      const response = await getAiInsight();
      setAiInsight(response || { insight: '', recommendations: [] });
    } catch (err) {
      setAiInsight({ insight: '', recommendations: [] });
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTickets();
    fetchAmcContracts();
    fetchStats();
    fetchAiInsight();
    fetchVisits();
    fetchVisitStats();
  }, []);

  // Fetch engineers when new ticket modal opens
  useEffect(() => {
    if (showAdd) {
      fetchEngineers();
      fetchCustomers();
    }
  }, [showAdd]);
  useEffect(() => {
    fetchTickets();
  }, [ticketStatus, ticketSearch, tPage, tPageSize]);

  useEffect(() => {
    fetchAmcContracts();
  }, [aPage, aPageSize]);

  // Auto-refresh data every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTickets();
      fetchAmcContracts();
      fetchStats();
      fetchVisits();
      fetchVisitStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle stage change (drag and drop)
  const handleStageChange = async (id, newStage) => {
    try {
      await updateTicket(id, { status: newStage });
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStage } : t));
      fetchStats();
      showToast(`Ticket status updated to "${newStage}" successfully`, 'success');
    } catch (err) {
      showToast('Failed to update ticket status: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  const fetchEngineers = async () => {
    try {
      const response = await getEngineers();
      setEngineers(Array.isArray(response) ? response : response?.data || []);
    } catch (err) {
      setEngineers([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await getCustomers();
      const customersData = Array.isArray(response) ? response : response?.data || [];
      setCustomers(customersData);
    } catch (err) {
      setCustomers([]);
    }
  };

  // Fetch visits
  const fetchVisits = async () => {
    setLoadingVisits(true);
    try {
      const response = await getVisits();
      let visitsData = [];
      if (Array.isArray(response)) {
        visitsData = response;
      } else if (response?.data && Array.isArray(response.data)) {
        visitsData = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        visitsData = response.data.data;
      }
      setVisits(visitsData);
    } catch (err) {
      console.error('Visits fetch error:', err);
      setVisits([]);
    } finally {
      setLoadingVisits(false);
    }
  };

  // Fetch visit stats
  const fetchVisitStats = async () => {
    try {
      const response = await getVisitStats();
      setVisitStats(response || { totalVisits: 0, scheduled: 0, completed: 0, cancelled: 0 });
    } catch (err) {
      setVisitStats({ totalVisits: 0, scheduled: 0, completed: 0, cancelled: 0 });
    }
  };

  const openAssignModal = (ticket) => {
    setAssignModal({ open: true, ticket });
    setSelectedEngineer(ticket?.assignedTo || '');
    fetchEngineers();
  };

  const closeAssignModal = () => {
    setAssignModal({ open: false, ticket: null });
    setSelectedEngineer('');
    setAssigning(false);
  };

  const handleAssignEngineer = async () => {
    if (!selectedEngineer || !assignModal.ticket) {
      console.log('Assign cancelled: no engineer or ticket selected');
      return;
    }

    console.log('Assigning engineer:', selectedEngineer, 'to ticket:', assignModal.ticket.id);
    setAssigning(true);
    try {
      const result = await updateTicket(assignModal.ticket.id, { assignedTo: selectedEngineer });
      console.log('Assign success:', result);
      setTickets(prev => prev.map(t => t.id === assignModal.ticket.id ? { ...t, assignedTo: selectedEngineer } : t));
      closeAssignModal();
      showToast(`Engineer "${selectedEngineer}" assigned successfully`, 'success');
    } catch (err) {
      console.error('Assign error:', err);
      showToast('Failed to assign engineer: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateTicket = async () => {
    try {
      await createTicket(newTicket);
      setShowAdd(false);
      setNewTicket({
        customerId: '',
        customerName: '',
        type: '',
        priority: 'Low',
        status: 'Open',
        description: '',
        assignedTo: '',
      });
      fetchTickets();
      fetchStats();
      showToast('New ticket created successfully', 'success');
    } catch (err) {
      showToast('Failed to create ticket: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  // Handle delete AMC contract
  const handleDeleteAmcContract = async (id) => {
    if (!window.confirm('Are you sure you want to delete this AMC contract?')) {
      return;
    }
    try {
      await deleteAmcContract(id);
      fetchAmcContracts();
      fetchStats();
      showToast('AMC contract deleted successfully', 'success');
    } catch (err) {
      showToast('Failed to delete AMC contract: ' + (err.message || 'Unknown error'), 'error');
    }
  };
  const handleDeleteTicket = async (id) => {
    try {
      await deleteTicket(id);
      fetchTickets();
      fetchStats();
      showToast('Ticket deleted successfully', 'success');
    } catch (err) {
      showToast('Failed to delete ticket: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  // Filtered tickets (client-side for kanban view, server provides all)
  const filteredTickets = useMemo(() => tickets, [tickets]);

  // Calculate stats dynamically from actual data
  const dynamicTicketStats = useMemo(() => {
    const ticketsArray = Array.isArray(tickets) ? tickets : [];
    return {
      openTickets: ticketsArray.filter(t => t.status === 'Open').length,
      scheduled: ticketsArray.filter(t => t.status === 'Scheduled').length,
      inProgress: ticketsArray.filter(t => t.status === 'In Progress').length,
      resolved: ticketsArray.filter(t => t.status === 'Resolved').length,
      closed: ticketsArray.filter(t => t.status === 'Closed').length,
    };
  }, [tickets]);

  const dynamicAmcStats = useMemo(() => {
    const contractsArray = Array.isArray(amcContracts) ? amcContracts : [];
    return {
      activeContracts: contractsArray.filter(c => c.status === 'Active').length,
    };
  }, [amcContracts]);

  const paginatedTickets = filteredTickets;
  const paginatedAMC = amcContracts;

  const openEditModal = (ticket) => {
    setEditModal({ open: true, ticket });
    setEditForm({
      customerName: ticket.customerName || '',
      type: ticket.type || '',
      priority: ticket.priority || 'Low',
      status: ticket.status || 'Open',
      description: ticket.description || '',
      assignedTo: ticket.assignedTo || '',
    });
    fetchEngineers();
    fetchCustomers();
  };

  const closeEditModal = () => {
    setEditModal({ open: false, ticket: null });
    setEditForm({
      customerName: '',
      type: '',
      priority: 'Low',
      status: 'Open',
      description: '',
      assignedTo: '',
    });
    setUpdating(false);
  };

  const handleUpdateTicket = async () => {
    if (!editModal.ticket) return;
    
    setUpdating(true);
    try {
      await updateTicket(editModal.ticket.id, editForm);
      setTickets(prev => prev.map(t => t.id === editModal.ticket.id ? { ...t, ...editForm } : t));
      closeEditModal();
      showToast('Ticket updated successfully', 'success');
    } catch (err) {
      showToast('Failed to update ticket: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Service Ticket from AMC functions
  const openServiceTicketModal = (contract) => {
    setServiceTicketModal({ open: true, contract });
    setServiceTicketForm({
      customerName: contract.customer || '',
      type: 'AMC',
      priority: 'Low',
      status: 'Open',
      description: `Service ticket created from AMC Contract ${contract.id} for ${contract.customer} at ${contract.site}`,
      assignedTo: '',
    });
    fetchEngineers();
    fetchCustomers();
  };

  const closeServiceTicketModal = () => {
    setServiceTicketModal({ open: false, contract: null });
    setServiceTicketForm({
      customerName: '',
      type: 'AMC',
      priority: 'Low',
      status: 'Open',
      description: '',
      assignedTo: '',
    });
    setCreatingServiceTicket(false);
  };

  const handleCreateServiceTicket = async () => {
    if (!serviceTicketModal.contract) return;
    
    setCreatingServiceTicket(true);
    try {
      const ticketData = {
        customerId: serviceTicketForm.customerName,
        customerName: serviceTicketForm.customerName,
        type: serviceTicketForm.type,
        priority: serviceTicketForm.priority,
        status: serviceTicketForm.status,
        description: serviceTicketForm.description,
        assignedTo: serviceTicketForm.assignedTo,
      };
      await createTicket(ticketData);
      closeServiceTicketModal();
      fetchTickets();
      fetchStats();
      showToast('Service ticket created successfully', 'success');
    } catch (err) {
      showToast('Failed to create service ticket: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setCreatingServiceTicket(false);
    }
  };

  // AMC Contract Edit functions
  const openAmcEditModal = (contract) => {
    setAmcEditModal({ open: true, contract });
    setAmcEditForm({
      customer: contract.customer || '',
      site: contract.site || '',
      systemSize: contract.systemSize || 0,
      startDate: contract.startDate || '',
      endDate: contract.endDate || '',
      status: contract.status || 'Active',
      amount: contract.amount || 0,
      nextVisit: contract.nextVisit || '',
    });
  };

  const closeAmcEditModal = () => {
    setAmcEditModal({ open: false, contract: null });
    setAmcEditForm({
      customer: '',
      site: '',
      systemSize: 0,
      startDate: '',
      endDate: '',
      status: 'Active',
      amount: 0,
      nextVisit: '',
    });
    setUpdatingAmc(false);
  };

  const handleUpdateAmcContract = async () => {
    if (!amcEditModal.contract) return;
    
    setUpdatingAmc(true);
    try {
      await updateAmcContract(amcEditModal.contract.id, amcEditForm);
      setAmcContracts(prev => prev.map(c => c.id === amcEditModal.contract.id ? { ...c, ...amcEditForm } : c));
      closeAmcEditModal();
      fetchStats();
      showToast('AMC contract updated successfully', 'success');
    } catch (err) {
      showToast('Failed to update AMC contract: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setUpdatingAmc(false);
    }
  };

  const TICKET_ACTIONS = [
    { label: 'View Ticket', icon: Headphones, onClick: row => setSelected(row) },
    { label: 'Edit', icon: Pencil, onClick: row => openEditModal(row) },
    { label: 'Assign Engineer', icon: Wrench, onClick: row => openAssignModal(row) },
    { label: 'Mark Resolved', icon: CheckCircle, onClick: (row) => handleStageChange(row.id, 'Resolved') },
    { label: 'Delete', icon: Trash2, danger: true, onClick: (row) => handleDeleteTicket(row.id) },
  ];

  const AMC_ACTIONS = [
    {
      label: 'View Contract',
      icon: Shield,
      onClick: (row) => {
        // Open project detail modal for this AMC contract
        setAmcProjectView(row);
        fetchProjectForAmc(row.customer, row.site);
      },
    },
    {
      label: 'Service Ticket',
      icon: Headphones,
      onClick: (row) => openServiceTicketModal(row),
    },
    {
      label: 'Schedule Visit',
      icon: Clock,
      onClick: (row) => openScheduleVisitModal(row),
    },
  ];

  // Fetch project data for AMC contract view
  const fetchProjectForAmc = async (customer, site) => {
    setLoadingAmcProject(true);
    try {
      const response = await fetch(`${API_BASE_URL}/projects?tenantId=${TENANT_ID}`);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      const projectsArray = Array.isArray(data) ? data : (data.data || []);
      const transformedProjects = projectsArray.map(p => ({
        ...p,
        id: p.projectId,
      }));
      // Find matching project by customer and site
      const matchingProject = transformedProjects.find(
        p => p.customerName === customer && p.site === site
      );
      setAmcProjectData(matchingProject || null);
    } catch (err) {
      console.error('Error fetching project for AMC:', err);
      setAmcProjectData(null);
    } finally {
      setLoadingAmcProject(false);
    }
  };

  // Open Schedule Visit modal - fetch project data for email/mobile
  const openScheduleVisitModal = async (contract) => {
    setScheduleVisitModal({ open: true, contract });
    setScheduleVisitProjectData(null);
    setVisitForm({
      visitType: 'Routine Maintenance',
      scheduledDate: '',
      scheduledTime: '',
      engineerId: '',
      priority: 'Low',
      notes: '',
    });
    fetchEngineers();

    // Fetch project data to get email and mobile
    setLoadingScheduleVisitProject(true);
    try {
      const response = await fetch(`${API_BASE_URL}/projects?tenantId=${TENANT_ID}`);
      if (response.ok) {
        const data = await response.json();
        const projectsArray = Array.isArray(data) ? data : (data.data || []);
        const matchingProject = projectsArray.find(
          p => p.customerName === contract.customer && p.site === contract.site
        );
        setScheduleVisitProjectData(matchingProject || null);
      }
    } catch (err) {
      console.error('Error fetching project for schedule visit:', err);
      setScheduleVisitProjectData(null);
    } finally {
      setLoadingScheduleVisitProject(false);
    }
  };

  // Close Schedule Visit modal
  const closeScheduleVisitModal = () => {
    setScheduleVisitModal({ open: false, contract: null });
    setScheduleVisitProjectData(null);
    setVisitForm({
      visitType: 'Routine Maintenance',
      scheduledDate: '',
      scheduledTime: '',
      engineerId: '',
      priority: 'Low',
      notes: '',
    });
    setSchedulingVisit(false);
  };

  // Handle Schedule Visit form submission
  const handleScheduleVisit = async () => {
    // Validate all required fields
    const contractId = scheduleVisitModal.contract?.id;
    const { visitType, scheduledDate, scheduledTime, engineerId } = visitForm;

    if (!contractId || !visitType || !scheduledDate || !scheduledTime || !engineerId) {
      alert('Please fill all required fields');
      return;
    }

    setSchedulingVisit(true);
    try {
      // Build visit data with exact format required by backend
      const visitData = {
        contract_id: String(contractId),
        visit_type: visitType,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        engineer_id: String(engineerId),
        priority: visitForm.priority,
        notes: visitForm.notes || '',
        customer: scheduleVisitModal.contract.customer,
        site: scheduleVisitModal.contract.site,
        system_size: scheduleVisitModal.contract.systemSize,
        engineer_name: engineers.find(e => e.id === engineerId)?.name || '',
        status: 'Scheduled',
        tenant_id: TENANT_ID,
        email: scheduleVisitProjectData?.email || '',
      };

      await createVisit(visitData);

      // Update scheduled visits count
      setScheduledVisitsCount(prev => prev + 1);

      // Update the next visit date in AMC contracts
      await updateAmcContract(scheduleVisitModal.contract.id, {
        nextVisit: visitForm.scheduledDate,
        tenant_id: TENANT_ID,
      });

      // Refresh AMC contracts to show updated next visit
      fetchAmcContracts();

      // Close modal and show success
      closeScheduleVisitModal();
      showToast('Visit scheduled successfully', 'success');
    } catch (err) {
      console.error('Schedule visit error:', err);
      showToast('Failed to schedule visit: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setSchedulingVisit(false);
    }
  };

  // Loading indicator component
  const LoadingState = () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
      <span className="ml-2 text-sm text-[var(--text-muted)]">Loading...</span>
    </div>
  );

  // Error state component
  const ErrorState = ({ message }) => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <AlertTriangle size={32} className="mx-auto text-red-400 mb-2" />
        <p className="text-sm text-[var(--text-muted)]">{message}</p>
        <Button variant="ghost" size="sm" onClick={fetchTickets} className="mt-2">Retry</Button>
      </div>
    </div>
  );

  // Build AI insight text
  const aiInsightText = aiInsight?.insight ||
    (aiInsight?.recommendations?.length > 0
      ? aiInsight.recommendations.join(' ')
      : 'No insights available at this time.');

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Service & AMC"
        subtitle="Support tickets · maintenance · AMC contracts · warranty claims"
        actions={[
          { type: 'button', label: 'Dashboard', icon: BarChart3, variant: 'secondary', onClick: () => setShowDashboard(true) },
          { type: 'button', label: 'New Ticket', icon: Plus, variant: 'primary', onClick: () => setShowAdd(true) }
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <KPICard
          label={<span className="text-sm font-semibold text-[var(--text-primary)]">Open Tickets</span>}
          value={dynamicTicketStats.openTickets}
          icon={AlertTriangle}
          trend={+1}
          trendLabel="need attention"
          color="red"
          loading={loadingStats}
        />
        <KPICard
          label={<span className="text-sm font-semibold text-[var(--text-primary)]">Scheduled</span>}
          value={dynamicTicketStats.scheduled}
          icon={Calendar}
          trend={0}
          trendLabel="planned visits"
          color="blue"
          loading={loadingStats}
        />
        <KPICard
          label={<span className="text-sm font-semibold text-[var(--text-primary)]">In Progress</span>}
          value={dynamicTicketStats.inProgress}
          icon={Wrench}
          trend={0}
          trendLabel="being handled"
          color="amber"
          loading={loadingStats}
        />
        <KPICard
          label={<span className="text-sm font-semibold text-[var(--text-primary)]">Resolved</span>}
          value={dynamicTicketStats.resolved}
          icon={CheckCircle}
          trend={+3}
          trendLabel="this month"
          color="emerald"
          loading={loadingStats}
        />
        <KPICard
          label={<span className="text-sm font-semibold text-[var(--text-primary)]">Closed</span>}
          value={dynamicTicketStats.closed}
          icon={XCircle}
          trend={0}
          trendLabel="completed"
          color="slate"
          loading={loadingStats}
        />
        <KPICard
          label={<span className="text-sm font-semibold text-[var(--text-primary)]">AMC Contracts</span>}
          value={dynamicAmcStats.activeContracts}
          icon={Shield}
          trend={+1}
          trendLabel="active contracts"
          color="accent"
          loading={loadingStats}
        />
      </div>

      <div className="ai-banner">
        <Zap size={14} className="text-[var(--accent-light)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="text-[var(--accent-light)] font-semibold">AI Insight:</span>{' '}
          {aiInsightText}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="tickets">
        <TabsList>
          <TabsTrigger value="tickets">Support Tickets ({tickets.length})</TabsTrigger>
          <TabsTrigger value="amc">AMC Contracts ({amcContracts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-[var(--text-muted)] mr-1">Status:</span>
              {TICKET_STATUS_FILTERS.map(s => (
                <button key={s} onClick={() => { setTicketStatus(s); setTPage(1); }}
                  className={`filter-chip ${ticketStatus === s ? 'filter-chip-active' : ''}`}>{s}</button>
              ))}
              <div className="flex items-center gap-2 ml-auto">
                <Input placeholder="Search tickets..." value={ticketSearch}
                  onChange={e => { setTicketSearch(e.target.value); setTPage(1); }}
                  className="h-8 text-xs w-44" />
                <div className="view-toggle-pill">
                  <button onClick={() => setView('kanban')} className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`} title="Kanban"><LayoutGrid size={13} /></button>
                  <button onClick={() => setView('table')} className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`} title="Table"><List size={13} /></button>
                </div>
              </div>
            </div>

            {loadingTickets ? (
              <LoadingState />
            ) : error ? (
              <ErrorState message={error} />
            ) : view === 'kanban' ? (
              <TicketKanbanBoard tickets={filteredTickets} onStageChange={handleStageChange} onCardClick={setSelected} />
            ) : (
              <DataTable
                columns={TICKET_COLUMNS}
                data={paginatedTickets}
                rowActions={TICKET_ACTIONS}
                pagination={{ page: tPage, pageSize: tPageSize, total: filteredTickets.length, onChange: setTPage, onPageSizeChange: setTPageSize }}
                emptyMessage="No tickets found."
                onRowClick={row => setSelected(row)}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="amc" className="!p-0 !m-0">
          {loadingAmc ? (
            <LoadingState />
          ) : (
            <DataTable
              columns={AMC_COLUMNS}
              data={paginatedAMC}
              rowActions={AMC_ACTIONS}
              pagination={{ page: aPage, pageSize: aPageSize, total: amcContracts.length, onChange: setAPage, onPageSizeChange: setAPageSize }}
              emptyMessage="No AMC contracts found."
            />
          )}
        </TabsContent>
      </Tabs>

      {/* New Ticket Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Raise Service Ticket"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleCreateTicket}><Plus size={13} /> Submit Ticket</Button>
          </div>
        }>
        <div className="space-y-3">
          <FormField label="Customer">
            <Select
              value={newTicket.customerName}
              onChange={e => setNewTicket(prev => ({ ...prev, customerName: e.target.value, customerId: e.target.value }))}
            >
              <option value="">Select Customer</option>
              {customers.map(customer => (
                <option key={customer} value={customer}>{customer}</option>
              ))}
            </Select>
            {customers.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] mt-1">Loading customers...</p>
            )}
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Ticket Type">
              <Select
                value={newTicket.type}
                onChange={e => setNewTicket(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="">Select Type</option>
                {['Maintenance', 'AMC', 'Warranty', 'Breakdown', 'Inspection'].map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Priority">
              <Select
                value={newTicket.priority}
                onChange={e => setNewTicket(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </Select>
            </FormField>
            <FormField label="Status">
              <Select
                value={newTicket.status}
                onChange={e => setNewTicket(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="Open">Open</option>
                <option value="Scheduled">Scheduled</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Description">
            <Textarea
              placeholder="Describe the issue in detail..."
              rows={3}
              value={newTicket.description}
              onChange={e => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
            />
          </FormField>
          <FormField label="Assigned To">
            <Select
              value={newTicket.assignedTo}
              onChange={e => setNewTicket(prev => ({ ...prev, assignedTo: e.target.value }))}
            >
              <option value="">Select User</option>
              {engineers.map(engineer => (
                <option key={engineer.id} value={engineer.name}>
                  {engineer.name} {engineer.email ? `(${engineer.email})` : ''}
                </option>
              ))}
            </Select>
            {engineers.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] mt-1">Loading users...</p>
            )}
          </FormField>
        </div>
      </Modal>

      {/* Ticket Detail Modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={`Ticket — ${selected.id}`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
              <Button onClick={() => { handleStageChange(selected.id, 'Resolved'); setSelected(null); }}>
                <CheckCircle size={13} /> Mark Resolved
              </Button>
            </div>
          }>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                ['Ticket ID', selected.id],
                ['Customer', selected.customerName],
                ['Type', selected.type],
                ['Priority', <PriorityBadge value={selected.priority} />],
                ['Status', <StatusBadge domain="ticket" value={selected.status} />],
                ['Assigned To', selected.assignedTo],
                ['Created', selected.created],
                ['Resolved', selected.resolved ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="glass-card p-2">
                  <div className="text-[var(--text-muted)] mb-0.5">{k}</div>
                  <div className="font-semibold text-[var(--text-primary)]">{v}</div>
                </div>
              ))}
            </div>
            <div className="glass-card p-3">
              <div className="text-[11px] text-[var(--text-muted)] mb-1">Description</div>
              <p className="text-xs text-[var(--text-secondary)]">{selected.description}</p>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Ticket Modal */}
      {editModal.open && editModal.ticket && (
        <Modal
          open={editModal.open}
          onClose={closeEditModal}
          title={`Edit Ticket — ${editModal.ticket.id}`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={closeEditModal}>Cancel</Button>
              <Button onClick={handleUpdateTicket} disabled={updating}>
                {updating ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
                {updating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <FormField label="Customer">
              <Select
                value={editForm.customerName}
                onChange={e => setEditForm(prev => ({ ...prev, customerName: e.target.value }))}
              >
                <option value="">Select Customer</option>
                {customers.map(customer => (
                  <option key={customer} value={customer}>{customer}</option>
                ))}
              </Select>
              {customers.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] mt-1">Loading customers...</p>
              )}
            </FormField>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Ticket Type">
                <Select
                  value={editForm.type}
                  onChange={e => setEditForm(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="">Select Type</option>
                  {['Maintenance', 'AMC', 'Warranty', 'Breakdown', 'Inspection'].map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Priority">
                <Select
                  value={editForm.priority}
                  onChange={e => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </Select>
              </FormField>
              <FormField label="Status">
                <Select
                  value={editForm.status}
                  onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="Open">Open</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </Select>
              </FormField>
            </div>
            <FormField label="Description">
              <Textarea
                placeholder="Describe the issue in detail..."
                rows={3}
                value={editForm.description}
                onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </FormField>
            <FormField label="Assigned To">
              <Select
                value={editForm.assignedTo}
                onChange={e => setEditForm(prev => ({ ...prev, assignedTo: e.target.value }))}
              >
                <option value="">Select User</option>
                {engineers.map(engineer => (
                  <option key={engineer.id} value={engineer.name}>
                    {engineer.name} {engineer.email ? `(${engineer.email})` : ''}
                  </option>
                ))}
              </Select>
              {engineers.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] mt-1">Loading users...</p>
              )}
            </FormField>
          </div>
        </Modal>
      )}

      {/* Service Ticket from AMC Modal */}
      {serviceTicketModal.open && serviceTicketModal.contract && (
        <Modal
          open={serviceTicketModal.open}
          onClose={closeServiceTicketModal}
          title={`Create Service Ticket — ${serviceTicketModal.contract.id}`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={closeServiceTicketModal}>Cancel</Button>
              <Button onClick={handleCreateServiceTicket} disabled={creatingServiceTicket}>
                {creatingServiceTicket ? <Loader2 size={13} className="animate-spin" /> : <Headphones size={13} />}
                {creatingServiceTicket ? 'Creating...' : 'Create Ticket'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="text-xs text-[var(--text-muted)] mb-2">
              AMC Contract: <span className="font-mono text-[var(--accent-light)]">{serviceTicketModal.contract.id}</span>
              <br />Customer: <span className="font-semibold">{serviceTicketModal.contract.customer}</span>
              <br />Site: <span className="font-semibold">{serviceTicketModal.contract.site}</span>
            </div>
            <FormField label="Customer">
              <Select
                value={serviceTicketForm.customerName}
                onChange={e => setServiceTicketForm(prev => ({ ...prev, customerName: e.target.value }))}
              >
                <option value="">Select Customer</option>
                {customers.map(customer => (
                  <option key={customer} value={customer}>{customer}</option>
                ))}
              </Select>
              {customers.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] mt-1">Loading customers...</p>
              )}
            </FormField>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Ticket Type">
                <Select
                  value={serviceTicketForm.type}
                  onChange={e => setServiceTicketForm(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="">Select Type</option>
                  {['Maintenance', 'AMC', 'Warranty', 'Breakdown', 'Inspection'].map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Priority">
                <Select
                  value={serviceTicketForm.priority}
                  onChange={e => setServiceTicketForm(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </Select>
              </FormField>
              <FormField label="Status">
                <Select
                  value={serviceTicketForm.status}
                  onChange={e => setServiceTicketForm(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="Open">Open</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </Select>
              </FormField>
            </div>
            <FormField label="Description">
              <Textarea
                placeholder="Describe the issue in detail..."
                rows={3}
                value={serviceTicketForm.description}
                onChange={e => setServiceTicketForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </FormField>
            <FormField label="Assigned To">
              <Select
                value={serviceTicketForm.assignedTo}
                onChange={e => setServiceTicketForm(prev => ({ ...prev, assignedTo: e.target.value }))}
              >
                <option value="">Select User</option>
                {engineers.map(engineer => (
                  <option key={engineer.id} value={engineer.name}>
                    {engineer.name} {engineer.email ? `(${engineer.email})` : ''}
                  </option>
                ))}
              </Select>
              {engineers.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] mt-1">Loading users...</p>
              )}
            </FormField>
          </div>
        </Modal>
      )}

      {/* AMC Contract Edit Modal */}
      {amcEditModal.open && amcEditModal.contract && (
        <Modal
          open={amcEditModal.open}
          onClose={closeAmcEditModal}
          title={`Edit AMC Contract — ${amcEditModal.contract.id}`}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={closeAmcEditModal}>Cancel</Button>
              <Button onClick={handleUpdateAmcContract} disabled={updatingAmc}>
                {updatingAmc ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
                {updatingAmc ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Customer">
                <Input
                  value={amcEditForm.customer}
                  onChange={e => setAmcEditForm(prev => ({ ...prev, customer: e.target.value }))}
                  className="h-8 text-xs"
                />
              </FormField>
              <FormField label="Site">
                <Input
                  value={amcEditForm.site}
                  onChange={e => setAmcEditForm(prev => ({ ...prev, site: e.target.value }))}
                  className="h-8 text-xs"
                />
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="System Size (kW)">
                <Input
                  type="number"
                  value={amcEditForm.systemSize}
                  onChange={e => setAmcEditForm(prev => ({ ...prev, systemSize: Number(e.target.value) }))}
                  className="h-8 text-xs"
                />
              </FormField>
              <FormField label="Status">
                <Select
                  value={amcEditForm.status}
                  onChange={e => setAmcEditForm(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Expiring">Expiring</option>
                </Select>
              </FormField>
              <FormField label="Amount (₹)">
                <Input
                  type="number"
                  value={amcEditForm.amount}
                  onChange={e => setAmcEditForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  className="h-8 text-xs"
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start Date">
                <Input
                  type="date"
                  value={amcEditForm.startDate}
                  onChange={e => setAmcEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="h-8 text-xs"
                />
              </FormField>
              <FormField label="End Date">
                <Input
                  type="date"
                  value={amcEditForm.endDate}
                  onChange={e => setAmcEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="h-8 text-xs"
                />
              </FormField>
            </div>
            <FormField label="Next Visit">
              <Input
                type="date"
                value={amcEditForm.nextVisit}
                onChange={e => setAmcEditForm(prev => ({ ...prev, nextVisit: e.target.value }))}
                className="h-8 text-xs"
              />
            </FormField>
          </div>
        </Modal>
      )}

      {/* Assign Engineer Modal */}
      {assignModal.open && assignModal.ticket && (
        <Modal
          open={assignModal.open}
          onClose={closeAssignModal}
          title="Assign Engineer"
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={closeAssignModal}>Cancel</Button>
              <Button onClick={handleAssignEngineer} disabled={!selectedEngineer || assigning}>
                {assigning ? <Loader2 size={13} className="animate-spin" /> : <Wrench size={13} />}
                {assigning ? 'Assigning...' : 'Assign'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="text-xs text-[var(--text-muted)] mb-2">
              Ticket: <span className="font-mono text-[var(--accent-light)]">{assignModal.ticket.id}</span>
            </div>
            <FormField label="Select Engineer">
              <Select
                value={selectedEngineer}
                onChange={e => setSelectedEngineer(e.target.value)}
              >
                <option value="">Select an engineer...</option>
                {engineers.map(engineer => (
                  <option key={engineer.id} value={engineer.name}>
                    {engineer.name} {engineer.email ? `(${engineer.email})` : ''}
                  </option>
                ))}
              </Select>
            </FormField>
            {engineers.length === 0 && (
              <p className="text-xs text-[var(--text-muted)]">No engineers found.</p>
            )}
          </div>
        </Modal>
      )}

      {/* AMC Project View Modal - Shows project details like Project Module View Details */}
      {amcProjectView && (
        <Modal
          open={!!amcProjectView}
          onClose={() => { setAmcProjectView(null); setAmcProjectData(null); }}
          title={amcProjectData ? `Project — ${amcProjectData.id}` : 'Project Details'}
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setAmcProjectView(null); setAmcProjectData(null); }}>Close</Button>
            </div>
          }
        >
          {loadingAmcProject ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
              <span className="ml-2 text-sm text-[var(--text-muted)]">Loading project...</span>
            </div>
          ) : amcProjectData ? (
            <div className="space-y-4">
              {/* Project Info Grid - Same as ProjectPage View Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[['Customer', amcProjectData.customerName], ['Email', amcProjectData.email || '—'], ['Mobile', amcProjectData.mobileNumber || '—'], ['Site', amcProjectData.site], ['System Size', `${amcProjectData.systemSize} kW`], ['Project Manager', amcProjectData.pm],
                ['Status', <StatusBadge domain="project" value={amcProjectData.status} />], ['Value', `₹${(amcProjectData.value / 100000).toFixed(1)}L`],
                ].map(([k, v]) => (
                  <div key={k} className="glass-card p-2">
                    <div className="text-[var(--text-muted)] mb-0.5">{k}</div>
                    <div className="font-semibold text-[var(--text-primary)]">{v}</div>
                  </div>
                ))}
              </div>

              {/* Progress Bar - Same as ProjectPage */}
              <div>
                <div className="text-xs flex items-center justify-between mb-1">
                  <span className="font-semibold text-[var(--text-primary)]">Overall Progress</span>
                  <span className="text-[var(--text-muted)]">{amcProjectData.progress}%</span>
                </div>
                <Progress value={amcProjectData.progress} className="h-2" />
              </div>

              {/* Milestone Tracker - Same as ProjectPage View Details */}
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)] mb-3">Milestone Tracker</div>
                <Stepper steps={amcProjectData.milestones?.map(m => ({ name: m.name, status: m.status, date: m.date })) ?? [
                  { name: 'Material Ready', status: 'Pending', date: null },
                  { name: 'Installation', status: 'Pending', date: null },
                  { name: 'Commission', status: 'Pending', date: null },
                  { name: 'Billing', status: 'Pending', date: null },
                  { name: 'Closure', status: 'Pending', date: null }
                ]} />
              </div>

              {/* Reserved Materials - Same as ProjectPage */}
              {amcProjectData.materials && amcProjectData.materials.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)] mb-3">Reserved Materials</div>
                  <div className="space-y-2">
                    {amcProjectData.materials.map((m, idx) => (
                      <div key={`mat-${idx}`} className="glass-card p-2 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-medium text-[var(--text-primary)]">{m.itemName}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">Qty: {m.quantity} | Issued: {m.issuedDate || '—'}</div>
                        </div>
                        {m.remarks && (
                          <div className="text-[10px] text-[var(--text-faint)] max-w-[150px] truncate" title={m.remarks}>
                            {m.remarks}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle size={32} className="mx-auto text-amber-400 mb-2" />
              <p className="text-sm text-[var(--text-muted)]">No matching project found for this AMC contract.</p>
              <p className="text-xs text-[var(--text-faint)] mt-1">Customer: {amcProjectView.customer}, Site: {amcProjectView.site}</p>
            </div>
          )}
        </Modal>
      )}

      {/* Schedule Visit Modal */}
      {scheduleVisitModal.open && scheduleVisitModal.contract && (
        <Modal
          open={scheduleVisitModal.open}
          onClose={closeScheduleVisitModal}
          title="Schedule Visit"
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={closeScheduleVisitModal}>Cancel</Button>
              <Button onClick={handleScheduleVisit} disabled={schedulingVisit}>
                {schedulingVisit ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />}
                {schedulingVisit ? 'Scheduling...' : 'Schedule Visit'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Auto-filled Read-only Fields */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="glass-card p-2 bg-[var(--bg-tertiary)]">
                <div className="text-[var(--text-muted)] mb-0.5">Contract ID</div>
                <div className="font-semibold text-[var(--text-primary)]">{scheduleVisitModal.contract.id}</div>
              </div>
              <div className="glass-card p-2 bg-[var(--bg-tertiary)]">
                <div className="text-[var(--text-muted)] mb-0.5">Email ID</div>
                <div className="font-semibold text-[var(--text-primary)]">
                  {loadingScheduleVisitProject ? (
                    <span className="text-[var(--text-muted)]">Loading...</span>
                  ) : (
                    scheduleVisitProjectData?.email || '—'
                  )}
                </div>
              </div>
              <div className="glass-card p-2 bg-[var(--bg-tertiary)]">
                <div className="text-[var(--text-muted)] mb-0.5">Mobile Number</div>
                <div className="font-semibold text-[var(--text-primary)]">
                  {loadingScheduleVisitProject ? (
                    <span className="text-[var(--text-muted)]">Loading...</span>
                  ) : (
                    scheduleVisitProjectData?.mobileNumber || '—'
                  )}
                </div>
              </div>
              <div className="glass-card p-2 bg-[var(--bg-tertiary)]">
                <div className="text-[var(--text-muted)] mb-0.5">Site</div>
                <div className="font-semibold text-[var(--text-primary)]">{scheduleVisitModal.contract.site}</div>
              </div>
              <div className="glass-card p-2 bg-[var(--bg-tertiary)]">
                <div className="text-[var(--text-muted)] mb-0.5">Customer Name</div>
                <div className="font-semibold text-[var(--text-primary)]">{scheduleVisitModal.contract.customer}</div>
              </div>
              <div className="glass-card p-2 bg-[var(--bg-tertiary)]">
                <div className="text-[var(--text-muted)] mb-0.5">Size (kW)</div>
                <div className="font-semibold text-[var(--text-primary)]">{scheduleVisitModal.contract.systemSize} kW</div>
              </div>
            </div>

            {/* Input Fields */}
            <div className="space-y-3">
              <FormField label="Visit Type">
                <Select
                  value={visitForm.visitType}
                  onChange={e => setVisitForm(prev => ({ ...prev, visitType: e.target.value }))}
                >
                  <option value="Routine Maintenance">Routine Maintenance</option>
                  <option value="Breakdown">Breakdown</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Follow-up">Follow-up</option>
                </Select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Scheduled Date *">
                  <Input
                    type="date"
                    value={visitForm.scheduledDate}
                    onChange={e => setVisitForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </FormField>
                <FormField label="Scheduled Time *">
                  <Input
                    type="time"
                    value={visitForm.scheduledTime}
                    onChange={e => setVisitForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </FormField>
              </div>

              <FormField label="Engineer Assign *">
                <Select
                  value={visitForm.engineerId}
                  onChange={e => setVisitForm(prev => ({ ...prev, engineerId: e.target.value }))}
                >
                  <option value="">Select Engineer</option>
                  {engineers.map(engineer => (
                    <option key={engineer.id} value={engineer.id}>
                      {engineer.name} {engineer.email ? `(${engineer.email})` : ''}
                    </option>
                  ))}
                </Select>
                {engineers.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">Loading engineers...</p>
                )}
              </FormField>

              <FormField label="Priority">
                <Select
                  value={visitForm.priority}
                  onChange={e => setVisitForm(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </Select>
              </FormField>

              <FormField label="Notes (Optional)">
                <Textarea
                  placeholder="Add any additional notes or instructions..."
                  rows={3}
                  value={visitForm.notes}
                  onChange={e => setVisitForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </FormField>
            </div>
          </div>
        </Modal>
      )}

      {/* Dashboard Modal */}
      {showDashboard && (
        <Modal
          open={showDashboard}
          onClose={() => setShowDashboard(false)}
          title="Service & AMC Dashboard"
          size="xl"
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowDashboard(false)}>Close</Button>
              <Button onClick={() => { fetchTickets(); fetchAmcContracts(); fetchStats(); fetchVisits(); fetchVisitStats(); }}>
                <TrendingUp size={13} /> Refresh Data
              </Button>
            </div>
          }
        >
          <div className="space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Overview Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="glass-card p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Headphones size={16} className="text-blue-400" />
                  <span className="text-xs text-[var(--text-muted)]">Total Tickets</span>
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{tickets.length}</div>
                <div className="text-[10px] text-blue-400 mt-1">All time tickets</div>
              </div>
              <div className="glass-card p-3 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-amber-400" />
                  <span className="text-xs text-[var(--text-muted)]">Visits Scheduled</span>
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{visitStats.scheduled}</div>
                <div className="text-[10px] text-amber-400 mt-1">Upcoming visits</div>
              </div>
              <div className="glass-card p-3 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={16} className="text-emerald-400" />
                  <span className="text-xs text-[var(--text-muted)]">AMC Contracts</span>
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{dynamicAmcStats.activeContracts}</div>
                <div className="text-[10px] text-emerald-400 mt-1">Active contracts</div>
              </div>
              <div className="glass-card p-3 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-purple-400" />
                  <span className="text-xs text-[var(--text-muted)]">Visits Completed</span>
                </div>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{visitStats.completed}</div>
                <div className="text-[10px] text-purple-400 mt-1">Total completed</div>
              </div>
            </div>

            {/* Tickets Status Breakdown */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <PieChart size={16} className="text-[var(--accent-light)]" />
                  Tickets Status Breakdown
                </h3>
                <span className="text-xs text-[var(--text-muted)]">Total: {tickets.length}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Open', count: dynamicTicketStats.openTickets, color: 'bg-red-500', text: 'text-red-400' },
                  { label: 'Scheduled', count: dynamicTicketStats.scheduled, color: 'bg-blue-500', text: 'text-blue-400' },
                  { label: 'In Progress', count: dynamicTicketStats.inProgress, color: 'bg-amber-500', text: 'text-amber-400' },
                  { label: 'Resolved', count: dynamicTicketStats.resolved, color: 'bg-emerald-500', text: 'text-emerald-400' },
                  { label: 'Closed', count: dynamicTicketStats.closed, color: 'bg-slate-500', text: 'text-slate-400' },
                ].map((item) => (
                  <div key={item.label} className="text-center p-2 rounded-lg bg-[var(--bg-tertiary)]">
                    <div className={`text-lg font-bold ${item.text}`}>{item.count}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{item.label}</div>
                    <div className={`h-1 rounded-full mt-2 ${item.color} opacity-50`} style={{ width: `${tickets.length > 0 ? (item.count / tickets.length) * 100 : 0}%`, margin: '8px auto 0' }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Visits Status */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Activity size={16} className="text-[var(--accent-light)]" />
                  Visit Statistics
                </h3>
                <span className="text-xs text-[var(--text-muted)]">Total: {visitStats.totalVisits}</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="text-lg font-bold text-blue-400">{visitStats.scheduled}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Scheduled</div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-lg font-bold text-emerald-400">{visitStats.completed}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Completed</div>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="text-lg font-bold text-red-400">{visitStats.cancelled}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Cancelled</div>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="text-lg font-bold text-purple-400">{visits.length}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Total Records</div>
                </div>
              </div>
            </div>

            {/* AMC Contracts Summary */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Shield size={16} className="text-[var(--accent-light)]" />
                  AMC Contracts Overview
                </h3>
                <span className="text-xs text-[var(--text-muted)]">Total: {amcContracts.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-lg font-bold text-emerald-400">
                    {amcContracts.filter(c => c.status === 'Active').length}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">Active</div>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="text-lg font-bold text-amber-400">
                    {amcContracts.filter(c => c.status === 'Expiring').length}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">Expiring Soon</div>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="text-lg font-bold text-red-400">
                    {amcContracts.filter(c => c.status === 'Expired').length}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">Expired</div>
                </div>
              </div>
              {/* Contract Value Summary */}
              <div className="mt-4 p-3 rounded-lg bg-[var(--bg-tertiary)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Total AMC Value</span>
                  <span className="text-sm font-bold text-[var(--accent-light)]">
                    ₹{amcContracts.reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-2 gap-4">
              {/* Recent Tickets */}
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Headphones size={16} className="text-[var(--accent-light)]" />
                  Recent Tickets ({Math.min(tickets.length, 5)})
                </h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {tickets.slice(0, 5).map((ticket) => (
                    <div key={ticket.id} className="p-2 rounded-lg bg-[var(--bg-tertiary)] text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[var(--accent-light)]">{ticket.id}</span>
                        <PriorityBadge value={ticket.priority} />
                      </div>
                      <div className="text-[var(--text-primary)] truncate">{ticket.customerName}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{ticket.status} • {ticket.assignedTo || 'Unassigned'}</div>
                    </div>
                  ))}
                  {tickets.length === 0 && (
                    <p className="text-xs text-[var(--text-muted)] text-center py-4">No tickets found</p>
                  )}
                </div>
              </div>

              {/* Recent Visits */}
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-[var(--accent-light)]" />
                  Recent Visits ({Math.min(visits.length, 5)})
                </h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {visits.slice(0, 5).map((visit) => (
                    <div key={visit.id || visit.visitId} className="p-2 rounded-lg bg-[var(--bg-tertiary)] text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[var(--accent-light)]">{visit.visitId || visit.id}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          visit.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                          visit.status === 'Scheduled' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>{visit.status}</span>
                      </div>
                      <div className="text-[var(--text-primary)] truncate">{visit.customer}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{visit.visitType} • {visit.scheduledDate}</div>
                    </div>
                  ))}
                  {visits.length === 0 && (
                    <p className="text-xs text-[var(--text-muted)] text-center py-4">No visits found</p>
                  )}
                </div>
              </div>
            </div>

            {/* AMC Contracts List */}
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Shield size={16} className="text-[var(--accent-light)]" />
                AMC Contracts ({Math.min(amcContracts.length, 5)})
              </h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {amcContracts.slice(0, 5).map((contract) => (
                  <div key={contract.id} className="p-2 rounded-lg bg-[var(--bg-tertiary)] text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[var(--accent-light)]">{contract.id}</span>
                      <AmcBadge value={contract.status} />
                    </div>
                    <div className="text-[var(--text-primary)] truncate">{contract.customer}</div>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                      <span>{contract.site}</span>
                      <span className="text-[var(--accent-light)]">₹{(contract.amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
                {amcContracts.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] text-center py-4">No AMC contracts found</p>
                )}
              </div>
            </div>

            {/* Engineers Summary */}
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Wrench size={16} className="text-[var(--accent-light)]" />
                Available Engineers ({engineers.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {engineers.slice(0, 10).map((engineer) => (
                  <div key={engineer.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--bg-tertiary)] text-xs">
                    <Avatar name={engineer.name} size="xs" />
                    <span className="text-[var(--text-primary)]">{engineer.name}</span>
                  </div>
                ))}
                {engineers.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)]">No engineers available</p>
                )}
              </div>
            </div>

            {/* Auto-refresh indicator */}
            <div className="text-center text-[10px] text-[var(--text-muted)]">
              <span className="flex items-center justify-center gap-1">
                <Activity size={12} className="animate-pulse" />
                Data auto-refreshes every 30 seconds for real-time updates
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicePage;
