import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input, FormField, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { Search, RefreshCw, Plus, TrendingUp, X, ArrowUp, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { incrementApi, employeeApi } from '../services/hrmApi';

// ── Increment Detail View Modal ───────────────────────────────────────────
const IncrementViewModal = ({ increment, onClose }) => {
  if (!increment) return null;
  const emp = increment.employeeId || {};
  const initial = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase() || 'I';
  const amount = (increment.newSalary || 0) - (increment.previousSalary || 0);
  return (
    <Modal open={!!increment} onClose={onClose} title="" size="md" footer={
      <button onClick={onClose} className="px-4 py-1.5 text-xs rounded-xl border border-[var(--border-base)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"><X size={13} className="inline mr-1" />Close</button>
    }>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl mb-4 p-5 bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-transparent border border-[var(--border-base)]">
        <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-purple-500/10 -translate-y-6 translate-x-6" />
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">{initial}</div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{emp.firstName} {emp.lastName}</h2>
            <p className="text-xs text-[var(--text-muted)]">{emp.employeeId} · {emp.department}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 flex items-center gap-1"><ArrowUp size={11} />{increment.incrementPercentage}% Increment</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-500">+₹{amount.toLocaleString()}</p>
            <p className="text-xs text-[var(--text-faint)]">Increase Amount</p>
          </div>
        </div>
      </div>
      {/* Salary Comparison */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Previous Salary', value: `₹${Number(increment.previousSalary||0).toLocaleString()}`, color: 'bg-red-500/10 border-red-500/20 text-red-500' },
          { label: 'Increment %',     value: `${increment.incrementPercentage}%`,                        color: 'bg-amber-500/10 border-amber-500/20 text-amber-500' },
          { label: 'New Salary',      value: `₹${Number(increment.newSalary||0).toLocaleString()}`,      color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' },
        ].map(item => (
          <div key={item.label} className={`p-3 rounded-xl border text-center ${item.color}`}>
            <p className="text-[10px] uppercase tracking-wide opacity-70 font-medium">{item.label}</p>
            <p className="text-base font-bold mt-1">{item.value}</p>
          </div>
        ))}
      </div>
      {/* Details */}
      <div className="glass-card p-4 space-y-2.5">
        <div className="flex items-center justify-between py-1.5 border-b border-[var(--border-muted)]">
          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5"><Calendar size={12} /> Effective From</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{increment.effectiveFrom ? format(new Date(increment.effectiveFrom), 'dd MMM yyyy') : '—'}</span>
        </div>
        {increment.reason && (
          <div className="pt-1">
            <p className="text-[11px] text-[var(--text-faint)] uppercase tracking-wide font-medium mb-1">Reason</p>
            <p className="text-sm text-[var(--text-primary)]">{increment.reason}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

const IncrementsPage = () => {
  const [mounted, setMounted] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [increments, setIncrements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [incrementSearch, setIncrementSearch] = useState('');
  const [showIncrementModal, setShowIncrementModal] = useState(false);
  const [viewIncrement, setViewIncrement] = useState(null);
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
      variant: 'emerald',
      onClick: () => {
        // Auto-expand first increment
        setTimeout(() => {
          if (filteredIncrements.length > 0) {
            setViewIncrement(filteredIncrements[0]);
          } else {
            setViewIncrement(null);
          }
        }, 100);
      }
    },
    {
      label: 'This Month',
      value: increments.filter(inc => {
        const incMonth = new Date(inc.effectiveFrom).getMonth() + 1;
        const incYear = new Date(inc.effectiveFrom).getFullYear();
        return incMonth === new Date().getMonth() + 1 && incYear === new Date().getFullYear();
      }).length,
      icon: TrendingUp,
      variant: 'blue',
      onClick: () => {
        // Auto-expand first increment this month
        setTimeout(() => {
          const firstThisMonth = increments.find(inc => {
            const incMonth = new Date(inc.effectiveFrom).getMonth() + 1;
            const incYear = new Date(inc.effectiveFrom).getFullYear();
            return incMonth === new Date().getMonth() + 1 && incYear === new Date().getFullYear();
          });
          setViewIncrement(firstThisMonth || null);
        }, 100);
      }
    },
    {
      label: 'Avg Increase',
      value: `${increments.length > 0 ? Math.round(increments.reduce((sum, inc) => sum + inc.incrementPercentage, 0) / increments.length) : 0}%`,
      icon: TrendingUp,
      variant: 'amber'
    },
    {
      label: 'Total Amount',
      value: `₹${totalIncrementAmount.toLocaleString()}`,
      icon: TrendingUp,
      variant: 'purple'
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
            variant={kpi.variant}
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
        expandedRowKey={viewIncrement?._id}
        renderExpanded={(increment) => (
          <div className="p-4 border-t border-[var(--border-muted)] bg-gradient-to-b from-white to-[var(--bg-elevated)]">
            <IncrementViewModal increment={increment} onClose={() => setViewIncrement(null)} inline />
          </div>
        )}
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
