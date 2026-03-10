import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input, FormField, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { Search, RefreshCw, Plus, Calendar, TrendingUp, PieChart } from 'lucide-react';
import { format } from 'date-fns';
import { leaveApi, employeeApi } from '../services/hrmApi';

const LeavesPage = () => {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [leaveSearch, setLeaveSearch] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('all');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveType: 'paid',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Functions defined before useEffect
  const fetchEmployees = async () => {
    try {
      console.log('[DEBUG] Fetching employees from API...');
      const response = await employeeApi.getAll();
      console.log('[DEBUG] Employee API response:', response);
      const data = response.data?.data || response.data || [];
      console.log('[DEBUG] Setting employees:', data.length, 'employees');
      setEmployees(data);
    } catch (error) {
      console.error('[DEBUG] Error fetching employees:', error);
      console.error('[DEBUG] Error details:', error.response?.data || error.message);
      toast.error('Failed to fetch employees');
    }
  };

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const response = await leaveApi.getAll();
      const leavesData = response.data?.data || response.data || [];
      setLeaves(leavesData);
    } catch (error) {
      toast.error('Failed to fetch leaves');
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchLeaves();
    fetchEmployees();
  }, []);

  if (!mounted) return null;

  const handleApplyLeave = async () => {
    if (!leaveForm.employeeId || !leaveForm.startDate || !leaveForm.endDate) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await leaveApi.create(leaveForm);
      toast.success('Leave application submitted');
      setShowLeaveModal(false);
      fetchLeaves();
      setLeaveForm({
        employeeId: '',
        leaveType: 'paid',
        startDate: '',
        endDate: '',
        reason: '',
      });
    } catch (error) {
      toast.error('Failed to apply leave');
    }
  };

  const handleApproveLeave = async (leaveId) => {
    console.log('[DEBUG] Approving leave:', leaveId);
    console.log('[DEBUG] User:', user);

    const approverId = user?._id || user?.id;
    if (!approverId) {
      toast.error('User not authenticated. Please login again.');
      return;
    }

    try {
      const response = await leaveApi.approve(leaveId, approverId);
      console.log('[DEBUG] Approve response:', response);
      toast.success('Leave approved successfully');
      fetchLeaves();
    } catch (error) {
      console.error('[DEBUG] Approve error:', error);
      console.error('[DEBUG] Error response:', error.response);
      toast.error(error.response?.data?.message || error.message || 'Failed to approve leave');
    }
  };

  const handleRejectLeave = async (leaveId) => {
    console.log('[DEBUG] Rejecting leave:', leaveId);
    try {
      const response = await leaveApi.reject(leaveId, {
        status: 'rejected',
        rejectionReason: 'Rejected by admin'
      });
      console.log('[DEBUG] Reject response:', response);
      toast.success('Leave rejected successfully');
      fetchLeaves();
    } catch (error) {
      console.error('[DEBUG] Reject error:', error);
      console.error('[DEBUG] Error response:', error.response);
      toast.error(error.response?.data?.message || error.message || 'Failed to reject leave');
    }
  };

  const filteredLeaves = leaves.filter(leave => {
    const matchesSearch = leaveSearch === '' ||
      `${leave.employeeId?.firstName || ''} ${leave.employeeId?.lastName || ''}`.toLowerCase().includes(leaveSearch.toLowerCase());
    const matchesStatus = leaveStatusFilter === 'all' || leave.status === leaveStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const kpis = [
    {
      label: 'Pending Leaves',
      value: leaves.filter(l => l.status === 'pending').length,
      icon: Calendar,
      color: '#f59e0b'
    },
    {
      label: 'Approved Leaves',
      value: leaves.filter(l => l.status === 'approved').length,
      icon: Calendar,
      color: '#22c55e'
    },
    {
      label: 'Rejected Leaves',
      value: leaves.filter(l => l.status === 'rejected').length,
      icon: Calendar,
      color: '#ef4444'
    },
    {
      label: 'Total Leaves',
      value: leaves.length,
      icon: Calendar,
      color: '#3b82f6'
    },
  ];

  const columns = [
    {
      key: 'employeeId',
      header: 'Employee',
      render: (val) => (
        <div>
          <p className="font-medium text-sm">{val?.firstName} {val?.lastName}</p>
          <p className="text-xs text-[var(--text-muted)]">{val?.employeeId}</p>
        </div>
      ),
    },
    {
      key: 'leaveType',
      header: 'Leave Type',
      render: (val) => (
        <span className="px-2 py-1 rounded-full text-xs bg-[var(--bg-elevated)] border border-[var(--border-color)] capitalize">
          {val || 'paid'}
        </span>
      ),
    },
    {
      key: 'startDate',
      header: 'Start Date',
      render: (val) => format(new Date(val), 'dd MMM yyyy'),
    },
    {
      key: 'endDate',
      header: 'End Date',
      render: (val) => format(new Date(val), 'dd MMM yyyy'),
    },
    {
      key: 'days',
      header: 'Days',
      render: (_, row) => {
        const start = new Date(row.startDate);
        const end = new Date(row.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return <span className="font-medium">{days}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => {
        const colors = {
          pending: 'bg-amber-500/10 text-amber-500',
          approved: 'bg-emerald-500/10 text-emerald-500',
          rejected: 'bg-red-500/10 text-red-500',
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${colors[val] || colors.pending} capitalize`}>
            {val || 'pending'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => {
        if (row.status === 'pending') {
          return (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApproveLeave(row._id);
                }}
                className="text-emerald-600 border-emerald-600/30 hover:bg-emerald-600/10"
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRejectLeave(row._id);
                }}
                className="text-red-600 border-red-600/30 hover:bg-red-600/10"
              >
                Reject
              </Button>
            </div>
          );
        }
        return (
          <span className="px-2 py-1 text-xs text-[var(--text-muted)]">
            {row.status === 'approved' ? 'Approved' : 'Rejected'}
          </span>
        );
      },
    },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header with Apply Leave + Calendar Button */}
      <div className="flex items-center justify-between">
        <PageHeader
          title="Leave Management"
          subtitle="Manage employee leave applications and approvals"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCalendarModal(true)}
            className="h-9 px-3"
          >
            <Calendar size={16} className="mr-1.5" /> View Calendar
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setLeaveForm({
                employeeId: '',
                leaveType: 'paid',
                startDate: '',
                endDate: '',
                reason: '',
              });
              setShowLeaveModal(true);
            }}
          >
            <Plus size={16} className="mr-1.5" /> Apply Leave
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi, index) => (
          <KPICard
            key={index}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            accentColor={kpi.color}
          />
        ))}
      </div>

      {/* Calendar Modal */}
      {showCalendarModal && (
        <Modal
          open={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          title="Leave Calendar"
          size="lg"
        >
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))}
                className="w-10 h-10 rounded-lg hover:bg-[var(--bg-hover)] flex items-center justify-center text-lg"
              >
                ‹
              </button>
              <span className="text-lg font-bold">{format(calendarDate, 'MMMM yyyy')}</span>
              <button
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))}
                className="w-10 h-10 rounded-lg hover:bg-[var(--bg-hover)] flex items-center justify-center text-lg"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center py-2 bg-[var(--bg-elevated)] rounded-lg">
                  <p className="text-sm font-bold text-[var(--text-muted)]">{day}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }, (_, i) => {
                const dayNum = (i % 31) + 1;
                const dateStr = format(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), dayNum), 'yyyy-MM-dd');

                const dayLeaves = leaves.filter(leave => {
                  const start = new Date(leave.startDate);
                  const end = new Date(leave.endDate);
                  const current = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), dayNum);
                  return current >= start && current <= end;
                });

                const hasLeave = dayLeaves.length > 0;
                const isToday = dayNum === new Date().getDate() && calendarDate.getMonth() === new Date().getMonth();
                const leaveStatus = dayLeaves[0]?.status;

                let statusColor = 'from-amber-400 to-orange-500';
                if (leaveStatus === 'approved') statusColor = 'from-emerald-400 to-emerald-600';
                if (leaveStatus === 'rejected') statusColor = 'from-red-400 to-red-600';

                return (
                  <div
                    key={i}
                    className={`
                      aspect-square rounded-xl p-2 flex flex-col items-center justify-center transition-all
                      ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                      ${hasLeave
                        ? `bg-gradient-to-br ${statusColor} text-white shadow-md`
                        : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}
                    `}
                  >
                    <span className="text-lg font-semibold">{dayNum > 31 ? '' : dayNum}</span>
                    {hasLeave && (
                      <span className="text-[10px] font-medium mt-1">
                        {dayLeaves.length} leave{dayLeaves.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Date Leaves List */}
            <div className="mt-6 border-t border-[var(--border-base)] pt-4">
              <h4 className="text-sm font-bold mb-3">Leaves this month</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {leaves.filter(leave => {
                  const start = new Date(leave.startDate);
                  return start.getMonth() === calendarDate.getMonth() && start.getFullYear() === calendarDate.getFullYear();
                }).map((leave, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                      {leave.employeeId?.firstName?.[0]}{leave.employeeId?.lastName?.[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{leave.employeeId?.firstName} {leave.employeeId?.lastName}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {format(new Date(leave.startDate), 'dd MMM')} - {format(new Date(leave.endDate), 'dd MMM')} • {leave.leaveType}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${leave.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                      leave.status === 'rejected' ? 'bg-red-100 text-red-600' :
                        'bg-amber-100 text-amber-600'
                      }`}>
                      {leave.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            placeholder="Search leaves..."
            value={leaveSearch}
            onChange={(e) => setLeaveSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select
          value={leaveStatusFilter}
          onChange={(e) => setLeaveStatusFilter(e.target.value)}
          className="w-32 h-9"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
        <p className="text-sm text-[var(--text-muted)]">
          {filteredLeaves.length} of {leaves.length} records
        </p>
        <Button variant="outline" onClick={fetchLeaves} className="ml-auto">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Leaves Table */}
      <DataTable
        columns={columns}
        data={filteredLeaves}
        emptyText="No leave records found."
        loading={loading}
      />

      {/* Apply Leave Modal */}
      {showLeaveModal && (
        <Modal
          open={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          title="Apply for Leave"
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowLeaveModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleApplyLeave}>
                <Plus size={13} /> Apply
              </Button>
            </div>
          }
        >
          <FormField label="Employee">
            <Select
              value={leaveForm.employeeId}
              onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeId})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Leave Type" className="mt-3">
            <Select
              value={leaveForm.leaveType}
              onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
            >
              <option value="paid">Paid Leave</option>
              <option value="unpaid">Unpaid Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="casual">Casual Leave</option>
              <option value="earned">Earned Leave</option>
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <FormField label="Start Date">
              <Input
                type="date"
                value={leaveForm.startDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
              />
            </FormField>
            <FormField label="End Date">
              <Input
                type="date"
                value={leaveForm.endDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="Reason" className="mt-3">
            <textarea
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              placeholder="Reason for leave..."
              rows={3}
              className="w-full p-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)]"
            />
          </FormField>
        </Modal>
      )}
    </div>
  );
};

export default LeavesPage;
