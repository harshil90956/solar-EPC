// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ADVANCED ATTENDANCE MANAGEMENT SYSTEM V3.0                              ║
// ║  Professional flat design · Maximum data visibility · 75/25 layout       ║
// ║  Comprehensive features · Real-time calendar · Bulk operations           ║
// ╚══════════════════════════════════════════════════════════════════════════╝

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Filter, Download, Calendar, Clock, LogIn, LogOut,
  RefreshCw, CheckCircle, XCircle, AlertCircle, Users,
  MapPin, Wifi, Building, Home, TrendingUp, ChevronLeft,
  ChevronRight, Plus, Edit, Trash2, X, Check, User, Building2,
  Timer, AlertTriangle, Navigation, QrCode, Camera,
  Settings
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, subDays, addDays, isSameDay } from 'date-fns';

import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { attendanceApi, employeeApi } from '../services/hrmApi';
import { useAuth } from '../context/AuthContext';
import { useDataScope } from '../hooks/useDataScope';
import { usePermissions } from '../hooks/usePermissions';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

// ==================== CONSTANTS ====================
const ATTENDANCE_STATUS = {
  present: { label: 'Present', color: '#22c55e', emoji: '✅', icon: CheckCircle },
  absent: { label: 'Absent', color: '#ef4444', emoji: '❌', icon: XCircle },
  late: { label: 'Late', color: '#f59e0b', emoji: '⚠️', icon: AlertTriangle },
  half_day: { label: 'Half Day', color: '#f59e0b', emoji: '🕐', icon: Clock },
  wfh: { label: 'Work From Home', color: '#3b82f6', emoji: '🏠', icon: Home },
  holiday: { label: 'Holiday', color: '#a855f7', emoji: '🎉', icon: Calendar },
  on_leave: { label: 'On Leave', color: '#6b7280', emoji: '📋', icon: AlertCircle },
};

const WORK_MODE = {
  office: { label: 'Office', color: '#3b82f6', icon: Building },
  remote: { label: 'Remote', color: '#22c55e', icon: Wifi },
  hybrid: { label: 'Hybrid', color: '#a855f7', icon: Building2 },
  site: { label: 'Site', color: '#f59e0b', icon: Navigation },
};

// ==================== ATTENDANCE VIEW MODAL ====================
const AttendanceViewModal = ({ record, onClose, onEdit }) => {
  if (!record) return null;
  const emp = record.employeeId || {};
  const initial = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase() || '?';
  const statusCfg = ATTENDANCE_STATUS[record.status] || ATTENDANCE_STATUS.absent;
  const workCfg = WORK_MODE[record.type] || WORK_MODE.office;
  const StatusIcon = statusCfg.icon;
  const WorkIcon = workCfg.icon;

  const InfoRow = ({ icon: Icon, label, value, color }) => value ? (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)]">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color || 'var(--primary)'}15` }}>
        <Icon size={14} style={{ color: color || 'var(--primary)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{value}</p>
      </div>
    </div>
  ) : null;

  return (
    <Modal open={!!record} onClose={onClose} title="" size="lg" footer={
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-[var(--border-base)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">
          <X size={13} /> Close
        </button>
        <button onClick={() => { onClose(); onEdit(record); }} className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-[var(--primary)] text-white hover:opacity-90">
          <Edit size={13} /> Edit Record
        </button>
      </div>
    }>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl mb-4 p-5 border border-[var(--border-base)]"
        style={{ background: `linear-gradient(135deg, ${statusCfg.color}18, ${statusCfg.color}05, transparent)` }}>
        <div className="absolute top-0 right-0 w-28 h-28 rounded-full -translate-y-6 translate-x-6" style={{ background: `${statusCfg.color}10` }} />
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl text-white flex items-center justify-center font-bold text-lg shadow-lg"
            style={{ background: `linear-gradient(135deg, var(--primary), var(--accent))` }}>{initial}</div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{emp.firstName} {emp.lastName}</h2>
            <p className="text-sm text-[var(--text-muted)]">{emp.employeeId} · {emp.department || 'N/A'}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                style={{ color: statusCfg.color, background: `${statusCfg.color}15`, borderColor: `${statusCfg.color}30` }}>
                <StatusIcon size={11} /> {statusCfg.label}
              </span>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ color: workCfg.color, background: `${workCfg.color}15` }}>
                <WorkIcon size={11} /> {workCfg.label}
              </span>
              {record.status === 'late' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">⚠️ Late Mark</span>
              )}
              {record.isEarlyExit && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">🚨 Early Exit</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">{record.date ? format(new Date(record.date), 'EEE') : ''}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{record.date ? format(new Date(record.date), 'dd') : '-'}</p>
            <p className="text-xs text-[var(--text-muted)]">{record.date ? format(new Date(record.date), 'MMM yyyy') : ''}</p>
          </div>
        </div>
      </div>

      {/* Time Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1"><LogIn size={14} className="text-emerald-500" /><span className="text-xs text-emerald-500 font-medium">Check-In</span></div>
          <p className="text-2xl font-bold text-emerald-500">{record.checkIn ? format(new Date(record.checkIn), 'hh:mm') : '--:--'}</p>
          <p className="text-[10px] text-emerald-500/70">{record.checkIn ? format(new Date(record.checkIn), 'a') : ''}</p>
        </div>
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1"><LogOut size={14} className="text-blue-500" /><span className="text-xs text-blue-500 font-medium">Check-Out</span></div>
          <p className="text-2xl font-bold text-blue-500">{record.checkOut ? format(new Date(record.checkOut), 'hh:mm') : '--:--'}</p>
          <p className="text-[10px] text-blue-500/70">{record.checkOut ? format(new Date(record.checkOut), 'a') : 'Not checked out'}</p>
        </div>
      </div>

      {/* Hours Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Total Hours', value: `${record.totalHours || 0}h`, color: 'var(--primary)' },
          { label: 'Break Time', value: `${record.breakTime || 0}m`, color: '#f59e0b' },
          { label: 'Overtime', value: record.overtimeHours > 0 ? `+${record.overtimeHours}h` : '-', color: '#22c55e' },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl border border-[var(--border-base)] bg-[var(--bg-elevated)] text-center">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="space-y-2">
        {record.location && <InfoRow icon={MapPin} label="Location" value={record.location} color="#f59e0b" />}
        {record.notes && (
          <div className="p-3 rounded-xl bg-[var(--bg-elevated)]">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-[var(--text-primary)]">{record.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ==================== MAIN COMPONENT ====================
const AttendancePageV3 = () => {
  const [mounted, setMounted] = useState(false);

  // Get permissions and user info
  const { 
    canView, 
    canCreate, 
    canEdit, 
    canDelete, 
    canExport,
    columns: permissionColumns 
  } = usePermissions('attendance');
  
  const { user, getDataScope } = useAuth();
  
  // Check if data scope is OWN (only view own data)
  const attendanceDataScope = getDataScope('attendance');
  const isOwnScope = attendanceDataScope === 'OWN';
  const currentEmployee = user?.employee;

  // ==================== CORE STATE ====================
  const [loading, setLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);

  // ==================== FILTER STATE ====================
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [workModeFilter, setWorkModeFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState({ start: '', end: '' });
  const [lateFilter, setLateFilter] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  // ==================== CALENDAR STATE ====================
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedCalendarDateForView, setSelectedCalendarDateForView] = useState(null);
  const calendarRef = useRef(null);

  // ==================== PAGINATION STATE ====================
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  // ==================== MODAL STATE ====================
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [attendanceForm, setAttendanceForm] = useState({
    employeeId: '',
    type: 'office',
    location: '',
    notes: '',
  });

  // ==================== BULK OPERATIONS STATE ====================
  const [selectedIds, setSelectedIds] = useState([]);

  // ==================== VIEW STATE ====================
  const [viewAttendance, setViewAttendance] = useState(null);

  // ==================== MOUNT EFFECT ====================
  useEffect(() => {
    setMounted(true);
    fetchEmployees();
    fetchTodaySummary();
    fetchAttendance();
  }, []);

  useEffect(() => {
    if (mounted) fetchAttendance();
  }, [mounted, dateRangeFilter, selectedCalendarDate]);

  // ==================== FETCH DATA ====================
  const fetchEmployees = async () => {
    try {
      const response = await employeeApi.getAll();
      const data = response.data?.data || response.data || [];
      setEmployees(data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast.error('Failed to fetch employees');
    }
  };

  const fetchTodaySummary = async () => {
    try {
      console.log('[DEBUG] Fetching today summary...');
      const response = await attendanceApi.getTodaySummary();
      console.log('[DEBUG] Today summary response:', response);
      const data = response.data?.data || response.data || response;
      console.log('[DEBUG] Setting today summary:', data);
      setTodaySummary(data);
    } catch (error) {
      console.error('[DEBUG] Failed to fetch today summary:', error);
      console.error('[DEBUG] Error response:', error.response?.data);
      // Set default values on error
      setTodaySummary({
        date: new Date(),
        total: 0,
        present: 0,
        late: 0,
        halfDay: 0,
        absent: 0,
        checkedOut: 0,
      });
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);

      let startDate, endDate;

      if (selectedCalendarDate) {
        const d = new Date(selectedCalendarDate);
        startDate = startOfDay(d);
        endDate = endOfDay(d);
      } else if (dateRangeFilter.start && dateRangeFilter.end) {
        startDate = startOfDay(new Date(dateRangeFilter.start));
        endDate = endOfDay(new Date(dateRangeFilter.end));
      } else {
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
      }

      const response = await attendanceApi.getAll({ startDate, endDate });
      const data = response.data?.data || response.data || [];
      setAttendanceRecords(data);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      toast.error('Failed to fetch attendance records');
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // ==================== HANDLERS ====================
  const handleCheckIn = async () => {
    if (!attendanceForm.employeeId) {
      toast.error('Please select an employee');
      return;
    }

    try {
      await attendanceApi.checkIn(attendanceForm);
      toast.success('Check-in successful');
      setShowCheckInModal(false);
      resetForm();
      fetchAttendance();
      fetchTodaySummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to check in');
    }
  };

  const handleCheckOut = async (employeeId) => {
    try {
      await attendanceApi.checkOut({ employeeId });
      toast.success('Check-out successful');
      fetchAttendance();
      fetchTodaySummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to check out');
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setAttendanceForm({
      employeeId: record.employeeId?._id || record.employeeId,
      type: record.type || 'office',
      location: record.location || '',
      notes: record.notes || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingRecord) return;

    try {
      await attendanceApi.update(editingRecord._id, attendanceForm);
      toast.success('Attendance updated successfully');
      setShowEditModal(false);
      setEditingRecord(null);
      resetForm();
      fetchAttendance();
    } catch (error) {
      toast.error('Failed to update attendance');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) return;

    try {
      await attendanceApi.delete(id);
      toast.success('Attendance record deleted');
      fetchAttendance();
      fetchTodaySummary();
    } catch (error) {
      toast.error('Failed to delete attendance record');
    }
  };

  const resetForm = () => {
    setAttendanceForm({ employeeId: '', type: 'office', location: '', notes: '' });
  };

  // ==================== BULK OPERATIONS ====================
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedRecords.map(r => r._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkMarkPresent = async () => {
    if (selectedIds.length === 0) return;

    try {
      await attendanceApi.bulkUpdate({ ids: selectedIds, status: 'present' });
      toast.success(`${selectedIds.length} record(s) marked as present`);
      setSelectedIds([]);
      fetchAttendance();
    } catch (error) {
      toast.error('Failed to update records');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} attendance record(s)?`)) return;

    try {
      await Promise.all(selectedIds.map(id => attendanceApi.delete(id)));
      toast.success(`${selectedIds.length} record(s) deleted`);
      setSelectedIds([]);
      fetchAttendance();
    } catch (error) {
      toast.error('Failed to delete records');
    }
  };

  // ==================== EXPORT ====================
  const handleExport = (format) => {
    toast.success(`Exporting to ${format.toUpperCase()}...`);

    const headers = ['Employee Name', 'Employee ID', 'Department', 'Date', 'Check In', 'Check Out',
      'Total Hours', 'Break Time', 'Overtime', 'Status', 'Work Mode', 'Location', 'Late Mark', 'Early Exit'];

    const rows = filteredRecords.map(record => [
      `${record.employeeId?.firstName || ''} ${record.employeeId?.lastName || ''}`,
      record.employeeId?.employeeId || '',
      record.employeeId?.department || '',
      format(new Date(record.date), 'dd MMM yyyy'),
      record.checkIn ? format(new Date(record.checkIn), 'hh:mm a') : '-',
      record.checkOut ? format(new Date(record.checkOut), 'hh:mm a') : '-',
      record.totalHours || 0,
      record.breakTime || 0,
      record.overtimeHours || 0,
      record.status || 'absent',
      record.type || 'office',
      record.location || '-',
      record.isLate ? 'Yes' : 'No',
      record.isEarlyExit ? 'Yes' : 'No',
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // ==================== RESET FILTERS ====================
  const resetFilters = () => {
    setSearchQuery('');
    setDepartmentFilter('all');
    setStatusFilter('all');
    setWorkModeFilter('all');
    setDateRangeFilter({ start: '', end: '' });
    setLateFilter(false);
    setSelectedCalendarDate(null);
  };

  // ==================== CALENDAR DATE CLICK ====================
  const handleCalendarDateClick = (dateStr) => {
    if (selectedCalendarDate === dateStr) {
      setSelectedCalendarDate(null);
    } else {
      setSelectedCalendarDate(dateStr);
    }
  };

  // ==================== DEPARTMENTS ====================
  const departments = useMemo(() => {
    const depts = new Set(employees.map(emp => emp.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  // ==================== KPI CALCULATIONS ====================
  const kpiData = useMemo(() => {
    const totalEmployees = employees.length;
    const presentToday = todaySummary?.present || 0;
    const absentToday = todaySummary?.absent || 0;
    const lateToday = todaySummary?.late || 0;
    const halfDayToday = todaySummary?.halfDay || 0;
    const checkedOut = todaySummary?.checkedOut || 0;

    return [
      { label: 'Total Employees', value: totalEmployees, icon: Users, variant: 'blue' },
      { label: 'Present Today', value: presentToday, icon: CheckCircle, variant: 'emerald' },
      { label: 'Absent Today', value: absentToday, icon: XCircle, variant: 'red' },
      { label: 'Late Today', value: lateToday, icon: AlertTriangle, variant: 'amber' },
      { label: 'Half Day', value: halfDayToday, icon: Clock, variant: 'amber' },
      { label: 'Checked Out', value: checkedOut, icon: LogOut, variant: 'blue' },
    ];
  }, [employees, todaySummary]);

  // ==================== FILTERED DATA ====================
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter(record => {
      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const empName = `${record.employeeId?.firstName || ''} ${record.employeeId?.lastName || ''}`.toLowerCase();
        const empId = record.employeeId?.employeeId?.toLowerCase() || '';
        if (!empName.includes(search) && !empId.includes(search)) return false;
      }

      // Department filter
      if (departmentFilter !== 'all') {
        if (record.employeeId?.department !== departmentFilter) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (record.status !== statusFilter) return false;
      }

      // Work mode filter
      if (workModeFilter !== 'all') {
        if (record.type !== workModeFilter) return false;
      }

      // Late filter
      if (lateFilter) {
        if (record.status !== 'late') return false;
      }

      // Calendar date filter
      if (selectedCalendarDate) {
        const recordDate = format(new Date(record.date), 'yyyy-MM-dd');
        if (recordDate !== selectedCalendarDate) return false;
      }

      return true;
    });
  }, [attendanceRecords, searchQuery, departmentFilter, statusFilter, workModeFilter, lateFilter, selectedCalendarDate]);

  // ==================== PAGINATION ====================
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  // ==================== TABLE COLUMNS ====================
  const tableColumns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={selectedIds.length === paginatedRecords.length && paginatedRecords.length > 0}
          onChange={handleSelectAll}
          className="w-3 h-3 rounded border-[var(--border-base)]"
        />
      ),
      render: (_, record) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(record._id)}
          onChange={() => handleSelectOne(record._id)}
          className="w-3 h-3 rounded border-[var(--border-base)]"
        />
      ),
    },
    {
      key: 'employeeId',
      header: 'Employee',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
            style={{ background: 'var(--primary)' }}>
            {record.employeeId?.firstName?.[0]}{record.employeeId?.lastName?.[0]}
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              {record.employeeId?.firstName} {record.employeeId?.lastName}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">{record.employeeId?.employeeId}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (_, record) => (
        <div className="flex items-center gap-1.5">
          <Building2 size={12} style={{ color: 'var(--primary)' }} />
          <span className="text-xs text-[var(--text-secondary)]">{record.employeeId?.department || '-'}</span>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (val) => (
        <div>
          <p className="text-xs font-medium text-[var(--text-primary)]">{format(new Date(val), 'dd MMM yyyy')}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{format(new Date(val), 'EEEE')}</p>
        </div>
      ),
    },
    {
      key: 'checkIn',
      header: 'Check-In',
      render: (val) => val ? (
        <div className="flex items-center gap-1.5 text-[#22c55e]">
          <LogIn size={12} />
          <span className="text-xs font-medium">{format(new Date(val), 'hh:mm a')}</span>
        </div>
      ) : <span className="text-xs text-[var(--text-muted)]">-</span>,
    },
    {
      key: 'checkOut',
      header: 'Check-Out',
      render: (val) => val ? (
        <div className="flex items-center gap-1.5 text-[#3b82f6]">
          <LogOut size={12} />
          <span className="text-xs font-medium">{format(new Date(val), 'hh:mm a')}</span>
        </div>
      ) : <span className="text-xs text-[var(--text-muted)]">-</span>,
    },
    {
      key: 'totalHours',
      header: 'Total Hours',
      render: (val) => (
        <div className="flex items-center gap-1">
          <Timer size={12} style={{ color: 'var(--primary)' }} />
          <span className="text-xs font-semibold text-[var(--text-primary)]">{val || 0}h</span>
        </div>
      ),
    },
    {
      key: 'breakTime',
      header: 'Break Time',
      render: (val) => (
        <span className="text-xs text-[var(--text-secondary)]">{val || 0}m</span>
      ),
    },
    {
      key: 'overtimeHours',
      header: 'Overtime',
      render: (val) => val > 0 ? (
        <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>+{val}h</span>
      ) : <span className="text-xs text-[var(--text-muted)]">-</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => {
        const config = ATTENDANCE_STATUS[val] || ATTENDANCE_STATUS.absent;
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold"
            style={{ color: config.color, background: `${config.color}15`, border: `1px solid ${config.color}30` }}>
            <Icon size={10} />
            {config.label}
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Work Mode',
      render: (val) => {
        const config = WORK_MODE[val] || WORK_MODE.office;
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium"
            style={{ color: config.color, background: `${config.color}10` }}>
            <Icon size={10} />
            {config.label}
          </div>
        );
      },
    },
    {
      key: 'location',
      header: 'Location',
      render: (val) => val ? (
        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
          <MapPin size={10} />
          <span className="text-[10px] truncate max-w-[80px]" title={val}>{val}</span>
        </div>
      ) : <span className="text-xs text-[var(--text-muted)]">-</span>,
    },
    {
      key: 'isLate',
      header: 'Late Mark',
      render: (_, record) => record.status === 'late' ? (
        <span className="text-xs font-semibold text-[#f59e0b]">⚠️ Late</span>
      ) : <span className="text-xs text-[var(--text-muted)]">-</span>,
    },
    {
      key: 'isEarlyExit',
      header: 'Early Exit',
      render: (_, record) => record.isEarlyExit ? (
        <span className="text-xs font-semibold text-[#ef4444]">🚨 Early</span>
      ) : <span className="text-xs text-[var(--text-muted)]">-</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, record) => (
        <div className="flex items-center gap-1">
          {!record.checkOut && record.checkIn && (
            <button
              onClick={() => handleCheckOut(record.employeeId?._id || record.employeeId)}
              className="p-1 rounded hover:bg-[#3b82f6]/10 text-[var(--text-muted)] hover:text-[#3b82f6]"
              title="Check Out"
            >
              <LogOut size={12} />
            </button>
          )}
          <button
            onClick={() => handleEdit(record)}
            className="p-1 rounded hover:bg-[var(--primary)]/10 text-[var(--text-muted)] hover:text-[var(--primary)]"
            title="Edit"
          >
            <Edit size={12} />
          </button>
          <button
            onClick={() => handleDelete(record._id)}
            className="p-1 rounded hover:bg-[#ef4444]/10 text-[var(--text-muted)] hover:text-[#ef4444]"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ];

  // ==================== RENDER ====================
  if (!mounted) return null;

  // Guard against undefined user (auth context not initialized yet)
  if (!user) {
    return <div className="p-4 text-center text-[var(--text-muted)]">Loading...</div>;
  }

  return (
    <div className="p-3 space-y-3">
      {/* ==================== HEADER ==================== */}
      <PageHeader
        title="Advanced Attendance Management"
        subtitle="Real-time tracking · GPS location · Face recognition · Bulk operations"
        actions={[
          {
            type: 'button',
            label: 'Policy Settings',
            icon: Settings,
            variant: 'outline',
            onClick: () => {
              // Navigate to HRM page with attendance policy tab
              window.location.href = '/hrm?tab=attendance-policy';
            },
          },
          {
            type: 'button',
            label: 'View Calendar',
            icon: Calendar,
            variant: 'outline',
            onClick: () => setShowCalendarModal(true),
          },
          {
            type: 'button',
            label: 'Mark Attendance',
            icon: Plus,
            variant: 'primary',
            onClick: () => {
              resetForm();
              // Auto-populate employeeId for OWN scope users
              if (isOwnScope && currentEmployee?._id) {
                setAttendanceForm(prev => ({ ...prev, employeeId: currentEmployee._id }));
              }
              setShowCheckInModal(true);
            },
          },
          {
            type: 'button',
            label: 'Refresh',
            icon: RefreshCw,
            variant: 'outline',
            onClick: fetchAttendance,
          },
        ]}
      />

      {/* ==================== KPI CARDS ==================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiData.map((kpi, idx) => (
          <KPICard
            key={idx}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            variant={kpi.variant}
            onClick={() => {
              // Auto-expand first matching record
              setTimeout(() => {
                if (paginatedRecords.length > 0) {
                  setViewAttendance(paginatedRecords[0]);
                } else {
                  setViewAttendance(null);
                }
              }, 100);
            }}
          />
        ))}
      </div>

      {/* ==================== MAIN LAYOUT: FULL WIDTH TABLE ==================== */}
      <div className="space-y-3">
        {/* ==================== ATTENDANCE TABLE (FULL WIDTH) ==================== */}
        <div className="bg-white border border-[var(--border-base)]">
          {/* ==================== COMPACT FILTERS ROW ==================== */}
          <div className="bg-white border border-[var(--border-base)] p-2 space-y-2">
            {/* First Row - 6 Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2">
              <Input
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 text-xs"
                icon={Search}
              />

              <Select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="h-7 text-xs"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </Select>

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-7 text-xs"
              >
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
                <option value="wfh">Work From Home</option>
              </Select>

              <Select
                value={workModeFilter}
                onChange={(e) => setWorkModeFilter(e.target.value)}
                className="h-7 text-xs"
              >
                <option value="all">All Work Mode</option>
                <option value="office">Office</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="site">Site</option>
              </Select>

              <Input
                type="date"
                value={dateRangeFilter.start}
                onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, start: e.target.value })}
                className="h-7 text-xs"
                placeholder="Start Date"
              />

              <Input
                type="date"
                value={dateRangeFilter.end}
                onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, end: e.target.value })}
                className="h-7 text-xs"
                placeholder="End Date"
              />
            </div>

            {/* Second Row - Actions */}
            <div className="flex items-center justify-between pt-1 border-t border-[var(--border-base)]">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={lateFilter}
                    onChange={(e) => setLateFilter(e.target.checked)}
                    className="w-3 h-3 rounded border-[var(--border-base)]"
                  />
                  Late Only
                </label>

                {selectedCalendarDate && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--primary)]/10 text-xs">
                    <Calendar size={10} style={{ color: 'var(--primary)' }} />
                    {format(new Date(selectedCalendarDate), 'dd MMM yyyy')}
                    <button onClick={() => setSelectedCalendarDate(null)} className="ml-1">
                      <X size={10} />
                    </button>
                  </div>
                )}

                <span className="text-xs text-[var(--text-muted)]">
                  {filteredRecords.length} record(s)
                </span>
              </div>

              <div className="flex items-center gap-1">
                {selectedIds.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkMarkPresent}
                      className="h-6 text-xs px-2"
                    >
                      <Check size={10} /> Mark Present ({selectedIds.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="h-6 text-xs px-2 text-[#ef4444] border-[#ef4444] hover:bg-[#ef4444]/10"
                    >
                      <Trash2 size={10} /> Delete ({selectedIds.length})
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('excel')}
                  className="h-6 text-xs px-2"
                >
                  <Download size={10} /> Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('csv')}
                  className="h-6 text-xs px-2"
                >
                  <Download size={10} /> CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('pdf')}
                  className="h-6 text-xs px-2"
                >
                  <Download size={10} /> PDF
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-6 text-xs px-2"
                >
                  <X size={10} /> Reset
                </Button>
              </div>
            </div>
          </div>

          {/* ==================== DATA TABLE ==================== */}
          <div className="bg-white border border-[var(--border-base)]">
            <DataTable
              columns={tableColumns}
              data={paginatedRecords}
              loading={loading}
              emptyMessage="No attendance records found"
              rowKey="_id"
              onRowClick={(row) => setViewAttendance(row)}
              expandedRowKey={viewAttendance?._id}
              renderExpanded={(record) => (
                <div className="p-4 border-t border-[var(--border-muted)] bg-gradient-to-b from-white to-[var(--bg-elevated)]">
                  <AttendanceViewModal record={record} onClose={() => setViewAttendance(null)} onEdit={() => {}} inline />
                </div>
              )}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--border-base)]">
                <p className="text-xs text-[var(--text-muted)]">
                  Page {currentPage} of {totalPages} · {filteredRecords.length} total records
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-6 px-2"
                  >
                    <ChevronLeft size={12} />
                  </Button>
                  <span className="text-xs text-[var(--text-secondary)] px-2">{currentPage}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-6 px-2"
                  >
                    <ChevronRight size={12} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* ==================== CALENDAR MODAL (ONLY IN MODAL, NOT ON PAGE) ==================== */}
      {showCalendarModal && (
        <Modal
          open={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          title="Attendance Calendar"
          size="xl"
        >
          <div className="p-4">
            {/* Month/Year Filter Controls */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[var(--border-base)]">
              <Select
                value={calendarMonth}
                onChange={(e) => {
                  const newMonth = parseInt(e.target.value);
                  setCalendarMonth(newMonth);
                  if (calendarRef.current) {
                    calendarRef.current.getApi().gotoDate(new Date(calendarYear, newMonth, 1));
                  }
                }}
                className="h-9 flex-1"
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                  <option key={idx} value={idx}>{month}</option>
                ))}
              </Select>
              <Select
                value={calendarYear}
                onChange={(e) => {
                  const newYear = parseInt(e.target.value);
                  setCalendarYear(newYear);
                  if (calendarRef.current) {
                    calendarRef.current.getApi().gotoDate(new Date(newYear, calendarMonth, 1));
                  }
                }}
                className="h-9 w-24"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </Select>
              <div className="ml-auto text-sm text-[var(--text-muted)]">
                {attendanceRecords.filter(r => {
                  const date = new Date(r.date);
                  return date.getMonth() === calendarMonth && date.getFullYear() === calendarYear;
                }).length} records this month
              </div>
            </div>

            <style>{`
              .fc {
                font-family: inherit;
                font-size: 0.75rem;
              }
              .fc .fc-toolbar-title {
                font-size: 0.875rem;
                font-weight: 600;
                color: var(--primary);
              }
              .fc .fc-button {
                background: #f3f4f6;
                border: 1px solid #d1d5db;
                color: #374151;
                font-weight: 500;
                padding: 0.25rem 0.5rem;
                border-radius: 0.25rem;
                font-size: 0.75rem;
              }
              .fc .fc-button:hover {
                background: #e5e7eb;
              }
              .fc .fc-button-primary {
                background: var(--primary);
                border-color: var(--primary);
                color: white;
              }
              .fc .fc-button-primary:hover {
                background: var(--primary-hover, var(--primary));
              }
              .fc .fc-col-header-cell {
                padding: 0.25rem 0;
                font-weight: 600;
                color: #374151;
                font-size: 0.7rem;
              }
              .fc .fc-col-header-cell.fc-day-sun {
                color: #ef4444;
              }
              .fc .fc-daygrid-day {
                border: 1px solid #e5e7eb;
              }
              .fc .fc-daygrid-day-number {
                font-size: 0.75rem;
                color: #6b7280;
                padding: 0.25rem;
              }
              .fc .fc-day-today {
                background: #fef3c7 !important;
              }
              .fc .fc-event {
                font-size: 0.65rem;
                padding: 0.0625rem 0.125rem;
                border-radius: 0.125rem;
                cursor: pointer;
              }
              .fc .fc-h-event .fc-event-main {
                font-weight: 500;
              }
              .fc .fc-daygrid-event-harness {
                margin: 1px 0;
              }
              .fc .fc-daygrid-day-events {
                min-height: 1.5em;
              }
            `}</style>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              initialDate={new Date(calendarYear, calendarMonth, 1)}
              headerToolbar={{
                left: 'title',
                center: '',
                right: 'prev,next'
              }}
              datesSet={(dateInfo) => {
                setCalendarMonth(dateInfo.view.currentStart.getMonth());
                setCalendarYear(dateInfo.view.currentStart.getFullYear());
              }}
              events={attendanceRecords.map(record => ({
                id: record._id,
                title: `${record.employeeId?.firstName || ''} ${record.employeeId?.lastName || ''}`,
                start: record.date,
                allDay: true,
                backgroundColor: record.status === 'present' ? '#86efac' :
                  record.status === 'absent' ? '#fca5a5' :
                    record.status === 'late' ? '#fde68a' :
                      record.status === 'half_day' ? '#fde68a' : '#bfdbfe',
                borderColor: record.status === 'present' ? '#22c55e' :
                  record.status === 'absent' ? '#ef4444' :
                    record.status === 'late' ? '#f59e0b' :
                      record.status === 'half_day' ? '#f59e0b' : '#60a5fa',
                textColor: record.status === 'present' ? '#166534' :
                  record.status === 'absent' ? '#991b1b' :
                    record.status === 'late' ? '#92400e' :
                      record.status === 'half_day' ? '#92400e' : '#1e40af',
                extendedProps: {
                  status: record.status,
                  employee: `${record.employeeId?.firstName || ''} ${record.employeeId?.lastName || ''}`,
                  checkIn: record.checkIn,
                  checkOut: record.checkOut
                }
              }))}
              height="auto"
              dayMaxEvents={2}
              eventClick={(info) => {
                toast.info(`${info.event.extendedProps.employee} - ${info.event.extendedProps.status}`);
              }}
              dateClick={(info) => {
                const clickedDate = format(info.date, 'yyyy-MM-dd');
                setSelectedCalendarDateForView(clickedDate);
                handleCalendarDateClick(clickedDate);
              }}
            />

            {/* Calendar Legend */}
            <div className="pt-3 border-t border-[var(--border-base)] mt-3 space-y-2">
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase">Legend</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
                  <span className="text-xs text-[var(--text-secondary)]">Present</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                  <span className="text-xs text-[var(--text-secondary)]">Absent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                  <span className="text-xs text-[var(--text-secondary)]">Late</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
                  <span className="text-xs text-[var(--text-secondary)]">WFH</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================== CHECK-IN MODAL ==================== */}
      {showCheckInModal && (
        <Modal
          open={showCheckInModal}
          onClose={() => {
            setShowCheckInModal(false);
            resetForm();
          }}
          title="Mark Attendance - Check In"
          footer={
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCheckInModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCheckIn} disabled={!attendanceForm.employeeId}>
                <LogIn size={14} /> Check In
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            {/* Show employee dropdown for ALL/DEPARTMENT scope, show current user for OWN scope */}
            {isOwnScope && currentEmployee ? (
              <div className="p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-base)]">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-2">Employee</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-sm font-medium">
                    {currentEmployee.firstName?.[0]}{currentEmployee.lastName?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {currentEmployee.firstName} {currentEmployee.lastName}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {currentEmployee.employeeId} · {currentEmployee.role || 'Employee'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <FormField label="Select Employee">
                <Select
                  value={attendanceForm.employeeId}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, employeeId: e.target.value })}
                >
                  <option value="">Choose an employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </option>
                  ))}
                </Select>
              </FormField>
            )}

            <FormField label="Work Mode">
              <Select
                value={attendanceForm.type}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, type: e.target.value })}
              >
                <option value="office">Office</option>
                <option value="remote">Remote / Work From Home</option>
                <option value="hybrid">Hybrid</option>
                <option value="site">Site</option>
              </Select>
            </FormField>

            <FormField label="Location (Optional)">
              <Input
                value={attendanceForm.location}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, location: e.target.value })}
                placeholder="GPS location will be auto-captured"
              />
            </FormField>

            <FormField label="Notes (Optional)">
              <Textarea
                value={attendanceForm.notes}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
                placeholder="Any notes about today..."
                rows={2}
              />
            </FormField>
          </div>
        </Modal>
      )}

      {/* ==================== EDIT MODAL ==================== */}
      {showEditModal && (
        <Modal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingRecord(null);
            resetForm();
          }}
          title="Edit Attendance Record"
          footer={
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingRecord(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdate}>
                <Edit size={14} /> Update
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="p-2 bg-[var(--bg-elevated)] rounded">
              <p className="text-xs text-[var(--text-muted)]">Employee</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {editingRecord?.employeeId?.firstName} {editingRecord?.employeeId?.lastName}
              </p>
            </div>

            <FormField label="Work Mode">
              <Select
                value={attendanceForm.type}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, type: e.target.value })}
              >
                <option value="office">Office</option>
                <option value="remote">Remote / Work From Home</option>
                <option value="hybrid">Hybrid</option>
                <option value="site">Site</option>
              </Select>
            </FormField>

            <FormField label="Location">
              <Input
                value={attendanceForm.location}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, location: e.target.value })}
                placeholder="Update location"
              />
            </FormField>

            <FormField label="Notes">
              <Textarea
                value={attendanceForm.notes}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
                placeholder="Update notes..."
                rows={2}
              />
            </FormField>
          </div>
        </Modal>
      )}
      </div>
      </div>
  );
};

export default AttendancePageV3;