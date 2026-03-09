import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input, FormField, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { Search, RefreshCw, Plus, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { payrollApi, employeeApi } from '../services/hrmApi';

const PayrollPage = () => {
  const [mounted, setMounted] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [payrollSearch, setPayrollSearch] = useState('');
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [payrollForm, setPayrollForm] = useState({
    employeeId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    baseSalary: 0,
    allowances: 0,
    deductions: 0,
    bonus: 0,
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

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const response = await payrollApi.getAll();
      const payrollData = response.data?.data || response.data || [];
      setPayrolls(payrollData);
    } catch (error) {
      toast.error('Failed to fetch payrolls');
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchPayrolls();
    fetchEmployees();
  }, []);

  if (!mounted) return null;

  const handleGeneratePayroll = async () => {
    if (!payrollForm.employeeId || !payrollForm.baseSalary) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await payrollApi.create(payrollForm);
      toast.success('Payroll generated successfully');
      setShowPayrollModal(false);
      fetchPayrolls();
      setPayrollForm({
        employeeId: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        baseSalary: 0,
        allowances: 0,
        deductions: 0,
        bonus: 0,
      });
    } catch (error) {
      toast.error('Failed to generate payroll');
    }
  };

  const filteredPayrolls = payrolls.filter(payroll => {
    if (payrollSearch === '') return true;
    const search = payrollSearch.toLowerCase();
    const empName = `${payroll.employeeId?.firstName || ''} ${payroll.employeeId?.lastName || ''}`.toLowerCase();
    return empName.includes(search);
  });

  const totalNetSalary = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);

  const kpis = [
    {
      label: 'Total Payroll',
      value: `₹${totalNetSalary.toLocaleString()}`,
      icon: Wallet,
      color: '#22c55e'
    },
    {
      label: 'This Month',
      value: payrolls.filter(p => {
        const payrollMonth = new Date(p.createdAt).getMonth() + 1;
        const payrollYear = new Date(p.createdAt).getFullYear();
        return payrollMonth === new Date().getMonth() + 1 && payrollYear === new Date().getFullYear();
      }).length,
      icon: Wallet,
      color: '#3b82f6'
    },
    {
      label: 'Employees Paid',
      value: new Set(payrolls.map(p => p.employeeId?._id || p.employeeId)).size,
      icon: Wallet,
      color: '#f59e0b'
    },
    {
      label: 'Total Records',
      value: payrolls.length,
      icon: Wallet,
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
      key: 'month',
      header: 'Month',
      render: (val) => new Date(2000, val - 1, 1).toLocaleString('default', { month: 'long' }),
    },
    {
      key: 'year',
      header: 'Year',
      render: (val) => val,
    },
    {
      key: 'baseSalary',
      header: 'Base Salary',
      render: (val) => `₹${val?.toLocaleString() || 0}`,
    },
    {
      key: 'allowances',
      header: 'Allowances',
      render: (val) => `₹${val?.toLocaleString() || 0}`,
    },
    {
      key: 'deductions',
      header: 'Deductions',
      render: (val) => `₹${val?.toLocaleString() || 0}`,
    },
    {
      key: 'netSalary',
      header: 'Net Salary',
      render: (val) => <span className="font-bold text-emerald-600">₹{val?.toLocaleString() || 0}</span>,
    },
    {
      key: 'paymentStatus',
      header: 'Status',
      render: (val) => {
        const colors = {
          pending: 'bg-amber-500/10 text-amber-500',
          paid: 'bg-emerald-500/10 text-emerald-500',
          failed: 'bg-red-500/10 text-red-500',
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${colors[val] || colors.pending} capitalize`}>
            {val || 'pending'}
          </span>
        );
      },
    },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Payroll Management"
        subtitle="Generate and manage employee payroll"
        actions={[
          {
            type: 'button',
            label: 'Generate Payroll',
            icon: Plus,
            variant: 'primary',
            onClick: () => {
              setPayrollForm({
                employeeId: '',
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                baseSalary: 0,
                allowances: 0,
                deductions: 0,
                bonus: 0,
              });
              setShowPayrollModal(true);
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
            placeholder="Search payroll..."
            value={payrollSearch}
            onChange={(e) => setPayrollSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          {filteredPayrolls.length} of {payrolls.length} records
        </p>
        <Button variant="outline" onClick={fetchPayrolls} className="ml-auto">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Payroll Table */}
      <DataTable
        columns={columns}
        data={filteredPayrolls}
        emptyText="No payroll records found."
        loading={loading}
      />

      {/* Generate Payroll Modal */}
      {showPayrollModal && (
        <Modal
          open={showPayrollModal}
          onClose={() => setShowPayrollModal(false)}
          title="Generate Payroll"
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowPayrollModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleGeneratePayroll} disabled={!payrollForm.employeeId || !payrollForm.baseSalary}>
                <Plus size={13} /> Generate
              </Button>
            </div>
          }
        >
          <FormField label="Employee">
            <Select
              value={payrollForm.employeeId}
              onChange={(e) => setPayrollForm({ ...payrollForm, employeeId: e.target.value })}
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
            <FormField label="Month">
              <Select
                value={payrollForm.month}
                onChange={(e) => setPayrollForm({ ...payrollForm, month: parseInt(e.target.value) })}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Year">
              <Input
                type="number"
                value={payrollForm.year}
                onChange={(e) => setPayrollForm({ ...payrollForm, year: parseInt(e.target.value) })}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <FormField label="Base Salary (₹)">
              <Input
                type="number"
                value={payrollForm.baseSalary}
                onChange={(e) => setPayrollForm({ ...payrollForm, baseSalary: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
            <FormField label="Allowances (₹)">
              <Input
                type="number"
                value={payrollForm.allowances}
                onChange={(e) => setPayrollForm({ ...payrollForm, allowances: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
            <FormField label="Deductions (₹)">
              <Input
                type="number"
                value={payrollForm.deductions}
                onChange={(e) => setPayrollForm({ ...payrollForm, deductions: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
            <FormField label="Bonus (₹)">
              <Input
                type="number"
                value={payrollForm.bonus}
                onChange={(e) => setPayrollForm({ ...payrollForm, bonus: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-[var(--bg-elevated)]">
            <p className="text-sm text-[var(--text-muted)]">Net Salary Preview</p>
            <p className="text-2xl font-bold text-[var(--accent)]">
              ₹{(payrollForm.baseSalary + payrollForm.allowances + payrollForm.bonus - payrollForm.deductions).toLocaleString()}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PayrollPage;
