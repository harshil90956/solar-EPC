import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input, FormField, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { Search, RefreshCw, Plus, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { incrementApi } from '../services/hrmApi';

const IncrementsPage = () => {
  const [mounted, setMounted] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [increments, setIncrements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [incrementSearch, setIncrementSearch] = useState('');
  const [showIncrementModal, setShowIncrementModal] = useState(false);
  const [incrementForm, setIncrementForm] = useState({
    employeeId: '',
    previousSalary: 0,
    incrementPercentage: 0,
    newSalary: 0,
    effectiveFrom: '',
    reason: '',
  });

  // Functions defined before useEffect
  const fetchEmployees = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/v1/hrm/employees');
      const data = await response.json();
      setEmployees(data.data || []);
    } catch (error) {
      console.error('Failed to fetch employees');
    }
  };

  const fetchIncrements = async () => {
    try {
      setLoading(true);
      const response = await incrementApi.getAll();
      const incrementData = response.data?.data || response.data || [];
      setIncrements(incrementData);
    } catch (error) {
      toast.error('Failed to fetch increments');
      setIncrements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchIncrements();
    fetchEmployees();
  }, []);

  if (!mounted) return null;

  const handleCreateIncrement = async () => {
    if (!incrementForm.employeeId || !incrementForm.previousSalary || !incrementForm.newSalary) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await incrementApi.create(incrementForm);
      toast.success('Increment added successfully');
      setShowIncrementModal(false);
      fetchIncrements();
      setIncrementForm({
        employeeId: '',
        previousSalary: 0,
        incrementPercentage: 0,
        newSalary: 0,
        effectiveFrom: '',
        reason: '',
      });
    } catch (error) {
      toast.error('Failed to add increment');
    }
  };

  const filteredIncrements = increments.filter(increment => {
    if (incrementSearch === '') return true;
    const search = incrementSearch.toLowerCase();
    const empName = `${increment.employeeId?.firstName || ''} ${increment.employeeId?.lastName || ''}`.toLowerCase();
    return empName.includes(search);
  });

  const totalIncrementAmount = increments.reduce((sum, inc) => sum + (inc.newSalary - inc.previousSalary), 0);

  const kpis = [
    { 
      label: 'Total Increments', 
      value: increments.length, 
      icon: TrendingUp, 
      color: '#22c55e' 
    },
    { 
      label: 'This Month', 
      value: increments.filter(inc => {
        const incMonth = new Date(inc.effectiveFrom).getMonth() + 1;
        const incYear = new Date(inc.effectiveFrom).getFullYear();
        return incMonth === new Date().getMonth() + 1 && incYear === new Date().getFullYear();
      }).length, 
      icon: TrendingUp, 
      color: '#3b82f6' 
    },
    { 
      label: 'Avg Increase', 
      value: `${increments.length > 0 ? Math.round(increments.reduce((sum, inc) => sum + inc.incrementPercentage, 0) / increments.length) : 0}%`, 
      icon: TrendingUp, 
      color: '#f59e0b' 
    },
    { 
      label: 'Total Amount', 
      value: `₹${totalIncrementAmount.toLocaleString()}`, 
      icon: TrendingUp, 
      color: '#a855f7' 
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
      key: 'previousSalary',
      header: 'Previous Salary',
      render: (val) => `₹${val?.toLocaleString() || 0}`,
    },
    {
      key: 'incrementPercentage',
      header: 'Increase %',
      render: (val) => <span className="font-bold text-emerald-600">{val}%</span>,
    },
    {
      key: 'newSalary',
      header: 'New Salary',
      render: (val) => <span className="font-bold text-blue-600">₹{val?.toLocaleString() || 0}</span>,
    },
    {
      key: 'incrementAmount',
      header: 'Increase Amount',
      render: (_, row) => {
        const amount = row.newSalary - row.previousSalary;
        return <span className="font-medium text-emerald-600">₹{amount.toLocaleString()}</span>;
      },
    },
    {
      key: 'effectiveFrom',
      header: 'Effective From',
      render: (val) => format(new Date(val), 'dd MMM yyyy'),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (val) => (
        <div className="max-w-xs truncate" title={val}>
          {val || '-'}
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Salary Increments"
        subtitle="Manage employee salary increments and promotions"
        actions={[
          {
            type: 'button',
            label: 'Add Increment',
            icon: Plus,
            variant: 'primary',
            onClick: () => {
              setIncrementForm({
                employeeId: '',
                previousSalary: 0,
                incrementPercentage: 0,
                newSalary: 0,
                effectiveFrom: '',
                reason: '',
              });
              setShowIncrementModal(true);
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
            placeholder="Search increments..."
            value={incrementSearch}
            onChange={(e) => setIncrementSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          {filteredIncrements.length} of {increments.length} records
        </p>
        <Button variant="outline" onClick={fetchIncrements} className="ml-auto">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Increments Table */}
      <DataTable
        columns={columns}
        data={filteredIncrements}
        emptyText="No increment records found."
        loading={loading}
      />

      {/* Add Increment Modal */}
      {showIncrementModal && (
        <Modal
          open={showIncrementModal}
          onClose={() => setShowIncrementModal(false)}
          title="Add Salary Increment"
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowIncrementModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateIncrement} disabled={!incrementForm.employeeId || !incrementForm.previousSalary || !incrementForm.newSalary}>
                <Plus size={13} /> Add
              </Button>
            </div>
          }
        >
          <FormField label="Employee">
            <Select
              value={incrementForm.employeeId}
              onChange={(e) => setIncrementForm({ ...incrementForm, employeeId: e.target.value })}
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeId})
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <FormField label="Previous Salary (₹)">
              <Input
                type="number"
                value={incrementForm.previousSalary}
                onChange={(e) => {
                  const prev = parseFloat(e.target.value) || 0;
                  const percent = incrementForm.incrementPercentage;
                  const newSal = prev + (prev * percent / 100);
                  setIncrementForm({
                    ...incrementForm,
                    previousSalary: prev,
                    newSalary: Math.round(newSal),
                  });
                }}
              />
            </FormField>
            <FormField label="Increment %">
              <Input
                type="number"
                value={incrementForm.incrementPercentage}
                onChange={(e) => {
                  const percent = parseFloat(e.target.value) || 0;
                  const prev = incrementForm.previousSalary;
                  const newSal = prev + (prev * percent / 100);
                  setIncrementForm({
                    ...incrementForm,
                    incrementPercentage: percent,
                    newSalary: Math.round(newSal),
                  });
                }}
              />
            </FormField>
          </div>
          <FormField label="New Salary (₹)" className="mt-3">
            <Input
              type="number"
              value={incrementForm.newSalary}
              onChange={(e) => setIncrementForm({ ...incrementForm, newSalary: parseFloat(e.target.value) || 0 })}
            />
          </FormField>
          <FormField label="Effective From" className="mt-3">
            <Input
              type="date"
              value={incrementForm.effectiveFrom}
              onChange={(e) => setIncrementForm({ ...incrementForm, effectiveFrom: e.target.value })}
            />
          </FormField>
          <FormField label="Reason" className="mt-3">
            <textarea
              value={incrementForm.reason}
              onChange={(e) => setIncrementForm({ ...incrementForm, reason: e.target.value })}
              placeholder="Reason for increment..."
              rows={2}
              className="w-full p-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)]"
            />
          </FormField>
        </Modal>
      )}
    </div>
  );
};

export default IncrementsPage;
