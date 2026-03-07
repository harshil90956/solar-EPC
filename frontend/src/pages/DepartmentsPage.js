import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import DataTable from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { Input, FormField, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { Search, RefreshCw, Plus, Building } from 'lucide-react';
import { format } from 'date-fns';
import { departmentApi } from '../services/hrmApi';

const DepartmentsPage = () => {
  const [mounted, setMounted] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    code: '',
    description: '',
    managerId: '',
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

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentApi.getAll();
      const departmentData = response.data?.data || response.data || [];
      setDepartments(departmentData);
    } catch (error) {
      toast.error('Failed to fetch departments');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchDepartments();
    fetchEmployees();
  }, []);

  if (!mounted) return null;

  const handleCreateDepartment = async () => {
    if (!departmentForm.name) {
      toast.error('Department name is required');
      return;
    }
    try {
      await departmentApi.create(departmentForm);
      toast.success('Department created successfully');
      setShowDepartmentModal(false);
      fetchDepartments();
      setDepartmentForm({
        name: '',
        code: '',
        description: '',
        managerId: '',
      });
    } catch (error) {
      toast.error('Failed to create department');
    }
  };

  const handleUpdateDepartment = async (id, data) => {
    try {
      await departmentApi.update(id, data);
      toast.success('Department updated successfully');
      fetchDepartments();
    } catch (error) {
      toast.error('Failed to update department');
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await departmentApi.delete(id);
      toast.success('Department deleted successfully');
      fetchDepartments();
    } catch (error) {
      toast.error('Failed to delete department');
    }
  };

  const filteredDepartments = departments.filter(dept => {
    if (departmentSearch === '') return true;
    const search = departmentSearch.toLowerCase();
    return (
      dept.name.toLowerCase().includes(search) ||
      dept.code?.toLowerCase().includes(search) ||
      dept.description?.toLowerCase().includes(search)
    );
  });

  const getDepartmentStats = () => {
    const deptCounts = {};
    employees.forEach(emp => {
      if (emp.department) {
        deptCounts[emp.department] = (deptCounts[emp.department] || 0) + 1;
      }
    });
    return deptCounts;
  };

  const deptStats = getDepartmentStats();

  const kpis = [
    {
      label: 'Total Departments',
      value: departments.length,
      icon: Building,
      color: '#22c55e'
    },
    {
      label: 'Active Departments',
      value: departments.filter(d => d.isActive !== false).length,
      icon: Building,
      color: '#3b82f6'
    },
    {
      label: 'Employees in Depts',
      value: Object.keys(deptStats).length,
      icon: Building,
      color: '#f59e0b'
    },
    {
      label: 'Avg Team Size',
      value: departments.length > 0 ? Math.round(employees.length / departments.length) : 0,
      icon: Building,
      color: '#a855f7'
    },
  ];

  const columns = [
    {
      key: 'name',
      header: 'Department Name',
      render: (val) => (
        <div>
          <p className="font-medium text-sm">{val}</p>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Code',
      render: (val) => (
        <span className="px-2 py-1 rounded-full text-xs bg-[var(--bg-elevated)] border border-[var(--border-color)]">
          {val || '-'}
        </span>
      ),
    },
    {
      key: 'managerId',
      header: 'Manager',
      render: (val) => {
        const manager = employees.find(emp => emp._id === val);
        return manager ? (
          <div>
            <p className="font-medium text-sm">{manager.firstName} {manager.lastName}</p>
            <p className="text-xs text-[var(--text-muted)]">{manager.employeeId}</p>
          </div>
        ) : (
          <span className="text-[var(--text-muted)]">Not Assigned</span>
        );
      },
    },
    {
      key: 'employeeCount',
      header: 'Employees',
      render: (_, row) => {
        const count = deptStats[row.name] || 0;
        return <span className="font-medium">{count}</span>;
      },
    },
    {
      key: 'description',
      header: 'Description',
      render: (val) => (
        <div className="max-w-xs truncate" title={val}>
          {val || '-'}
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-xs ${val !== false ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
          }`}>
          {val !== false ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (val) => format(new Date(val), 'dd MMM yyyy'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDepartmentForm({
                name: row.name,
                code: row.code || '',
                description: row.description || '',
                managerId: row.managerId || '',
              });
              setShowDepartmentModal(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDeleteDepartment(row._id)}
            className="text-red-600 border-red-600/30 hover:bg-red-600/10"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Departments"
        subtitle="Manage organizational departments and teams"
        actions={[
          {
            type: 'button',
            label: 'Add Department',
            icon: Plus,
            variant: 'primary',
            onClick: () => {
              setDepartmentForm({
                name: '',
                code: '',
                description: '',
                managerId: '',
              });
              setShowDepartmentModal(true);
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
            placeholder="Search departments..."
            value={departmentSearch}
            onChange={(e) => setDepartmentSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          {filteredDepartments.length} of {departments.length} departments
        </p>
        <Button variant="outline" onClick={fetchDepartments} className="ml-auto flex items-center gap-2">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Departments Table */}
      <DataTable
        columns={columns}
        data={filteredDepartments}
        emptyText="No departments found."
        loading={loading}
      />

      {/* Add/Edit Department Modal */}
      {showDepartmentModal && (
        <Modal
          open={showDepartmentModal}
          onClose={() => setShowDepartmentModal(false)}
          title="Add Department"
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowDepartmentModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDepartment} disabled={!departmentForm.name}>
                <Plus size={13} /> Create
              </Button>
            </div>
          }
        >
          <FormField label="Department Name *">
            <Input
              value={departmentForm.name}
              onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
              placeholder="Engineering"
            />
          </FormField>
          <FormField label="Department Code" className="mt-3">
            <Input
              value={departmentForm.code}
              onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value })}
              placeholder="ENG"
            />
          </FormField>
          <FormField label="Manager" className="mt-3">
            <Select
              value={departmentForm.managerId}
              onChange={(e) => setDepartmentForm({ ...departmentForm, managerId: e.target.value })}
            >
              <option value="">Select Manager</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeId})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Description" className="mt-3">
            <textarea
              value={departmentForm.description}
              onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
              placeholder="Department description..."
              rows={3}
              className="w-full p-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)]"
            />
          </FormField>
        </Modal>
      )}
    </div>
  );
};

export default DepartmentsPage;
