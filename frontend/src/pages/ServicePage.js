import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Headphones, Plus, Clock, CheckCircle, AlertTriangle,
  Shield, Zap, Wrench, LayoutGrid, List, Tag, Loader2, Calendar, XCircle,
  FolderOpen, TrendingUp, CheckCircle2,
} from 'lucide-react';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
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
} from '../modules/service-amc/services/serviceAmcApi';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api/v1';
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
                    onDragStart={() => {}}
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

  // Schedule Visit modal state
  const [scheduleVisitModal, setScheduleVisitModal] = useState({ open: false, contract: null });
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

  // Loading states
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingAmc, setLoadingAmc] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState(null);

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
      const response = await getAmcContracts({ page: aPage, limit: aPageSize });
      // Handle various response formats
      let contractsData = [];
      if (Array.isArray(response)) {
        contractsData = response;
      } else if (response?.data && Array.isArray(response.data)) {
        contractsData = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        contractsData = response.data.data;
      }
      // Filter out rutvik and prakash agraval permanently
      const filteredContracts = contractsData.filter(
        c => !['rutvik', 'prakash agraval', 'prakashagrawal', 'prakash agarwal'].includes(c.customer?.toLowerCase())
      );
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

  // Auto-generate AMC from commissioned projects when AMC tab is viewed
  useEffect(() => {
    if (activeTab === 'amc') {
      autoGenerateAmcContracts().then((result) => {
        // Log sync results
        const created = result?.data?.created || 0;
        const removed = result?.data?.removed || 0;
        if (created > 0 || removed > 0) {
          console.log(`AMC Sync: ${created} created, ${removed} removed`);
        }
        // Refresh AMC contracts after auto-generation
        fetchAmcContracts();
      }).catch(() => {
        // Silent fail - contracts will still load normally
      });
    }
  }, [activeTab]);

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

  // Handle delete ticket
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

  const TICKET_ACTIONS = [
    { label: 'View Ticket', icon: Headphones, onClick: row => setSelected(row) },
    { label: 'Assign Engineer', icon: Wrench, onClick: row => openAssignModal(row) },
    { label: 'Mark Resolved', icon: CheckCircle, onClick: (row) => handleStageChange(row.id, 'Resolved') },
    { label: 'Delete', icon: AlertTriangle, onClick: (row) => handleDeleteTicket(row.id) },
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

  // Open Schedule Visit modal
  const openScheduleVisitModal = (contract) => {
    setScheduleVisitModal({ open: true, contract });
    setVisitForm({
      visitType: 'Routine Maintenance',
      scheduledDate: '',
      scheduledTime: '',
      engineerId: '',
      priority: 'Low',
      notes: '',
    });
    fetchEngineers();
  };

  // Close Schedule Visit modal
  const closeScheduleVisitModal = () => {
    setScheduleVisitModal({ open: false, contract: null });
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
      <div className="page-header">
        <div>
          <h1 className="heading-page">Service & AMC</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Support tickets · maintenance · AMC contracts · warranty claims</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={13} /> New Ticket</Button>
      </div>

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

      {/* AMC Project View Modal - Shows project details like Project Module */}
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
              {/* Project Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="glass-card p-2">
                  <div className="text-[var(--text-muted)] mb-0.5">Customer</div>
                  <div className="font-semibold text-[var(--text-primary)]">{amcProjectData.customerName}</div>
                </div>
                <div className="glass-card p-2">
                  <div className="text-[var(--text-muted)] mb-0.5">Site</div>
                  <div className="font-semibold text-[var(--text-primary)]">{amcProjectData.site}</div>
                </div>
                <div className="glass-card p-2">
                  <div className="text-[var(--text-muted)] mb-0.5">System Size</div>
                  <div className="font-semibold text-[var(--text-primary)]">{amcProjectData.systemSize} kW</div>
                </div>
                <div className="glass-card p-2">
                  <div className="text-[var(--text-muted)] mb-0.5">Project Manager</div>
                  <div className="font-semibold text-[var(--text-primary)]">{amcProjectData.pm}</div>
                </div>
                <div className="glass-card p-2">
                  <div className="text-[var(--text-muted)] mb-0.5">Status</div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    <StatusBadge domain="project" value={amcProjectData.status} />
                  </div>
                </div>
                <div className="glass-card p-2">
                  <div className="text-[var(--text-muted)] mb-0.5">Value</div>
                  <div className="font-semibold text-[var(--text-primary)]">₹{(amcProjectData.value / 100000).toFixed(1)}L</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="text-xs flex items-center justify-between mb-1">
                  <span className="font-semibold text-[var(--text-primary)]">Overall Progress</span>
                  <span className="text-[var(--text-muted)]">{amcProjectData.progress}%</span>
                </div>
                <Progress value={amcProjectData.progress} className="h-2" />
              </div>

              {/* Milestone Tracker */}
              {amcProjectData.milestones && amcProjectData.milestones.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)] mb-3">Milestone Tracker</div>
                  <div className="space-y-3">
                    {amcProjectData.milestones.map((milestone, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          milestone.status === 'Done' ? 'bg-green-500 text-white' : 
                          milestone.status === 'In Progress' ? 'bg-blue-500 text-white' : 
                          'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                        }`}>
                          {milestone.status === 'Done' ? <CheckCircle2 size={14} /> : <span className="text-xs">{idx + 1}</span>}
                        </div>
                        <div className="flex-1">
                          <div className={`text-xs font-medium ${
                            milestone.status === 'Done' ? 'text-green-500' :
                            milestone.status === 'In Progress' ? 'text-blue-500' :
                            'text-[var(--text-muted)]'
                          }`}>{milestone.name}</div>
                          {milestone.date && (
                            <div className="text-[10px] text-[var(--text-muted)]">{milestone.date}</div>
                          )}
                        </div>
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
                <div className="text-[var(--text-muted)] mb-0.5">Customer Name</div>
                <div className="font-semibold text-[var(--text-primary)]">{scheduleVisitModal.contract.customer}</div>
              </div>
              <div className="glass-card p-2 bg-[var(--bg-tertiary)]">
                <div className="text-[var(--text-muted)] mb-0.5">Site</div>
                <div className="font-semibold text-[var(--text-primary)]">{scheduleVisitModal.contract.site}</div>
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

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
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
