import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input, FormField, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { Search, RefreshCw, Plus, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { leaveApi, employeeApi } from '../services/hrmApi';

const LeavesPage = () => {
  const [mounted, setMounted] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [leaveSearch, setLeaveSearch] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('all');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
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
    try {
      await leaveApi.update(leaveId, { status: 'approved' });
      toast.success('Leave approved');
      fetchLeaves();
    } catch (error) {
      toast.error('Failed to approve leave');
    }
  };

  const handleRejectLeave = async (leaveId) => {
    try {
      await leaveApi.update(leaveId, { status: 'rejected' });
      toast.success('Leave rejected');
      fetchLeaves();
    } catch (error) {
      toast.error('Failed to reject leave');
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
                onClick={() => handleApproveLeave(row._id)}
                className="text-emerald-600 border-emerald-600/30 hover:bg-emerald-600/10"
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRejectLeave(row._id)}
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
      <PageHeader
        title="Leave Management"
        subtitle="Manage employee leave applications and approvals"
        actions={[
          {
            type: 'button',
            label: 'Apply Leave',
            icon: Plus,
            variant: 'primary',
            onClick: () => {
              setLeaveForm({
                employeeId: '',
                leaveType: 'paid',
                startDate: '',
                endDate: '',
                reason: '',
              });
              setShowLeaveModal(true);
            },
          },
        ]}
      />

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
