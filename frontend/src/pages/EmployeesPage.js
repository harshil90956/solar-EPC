import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Mail, Phone, MapPin, Calendar, Briefcase, DollarSign, Filter, Download, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Input, FormField, Select, Textarea } from '../components/ui/Input';
import { KPICard } from '../components/ui/KPICard';
import { toast } from '../components/ui/Toast';
import { employeeApi, departmentApi } from '../services/hrmApi';

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    employeeId: '',
    department: '',
    designation: '',
    joiningDate: '',
    salary: '',
    status: 'active',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    departments: 0
  });

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      console.log('[DEBUG] Fetching employees...');
      const response = await employeeApi.getAll();
      console.log('[DEBUG] Employee API response:', response);
      const data = response.data?.data || response.data || [];
      console.log('[DEBUG] Extracted employee data:', data);
      setEmployees(data);

      // Calculate stats
      const active = data.filter(e => e.status === 'active').length;
      const inactive = data.filter(e => e.status === 'inactive').length;
      const uniqueDepts = [...new Set(data.map(e => e.department))].filter(Boolean);

      setStats({
        total: data.length,
        active,
        inactive,
        departments: uniqueDepts.length
      });
    } catch (error) {
      console.error('[DEBUG] Error fetching employees:', error);
      console.error('[DEBUG] Error response:', error.response);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.getAll();
      const data = response.data?.data || response.data || [];
      setDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments');
    }
  };

  const handleSubmit = async () => {
    console.log('[DEBUG] Submitting employee data:', formData);
    try {
      if (editingEmployee) {
        await employeeApi.update(editingEmployee._id, formData);
        toast.success('Employee updated successfully');
      } else {
        await employeeApi.create(formData);
        toast.success('Employee created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      console.error('[DEBUG] Employee save error:', error);
      console.error('[DEBUG] Error response:', error.response?.data);
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to save employee');
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      phone: employee.phone || '',
      password: '',
      employeeId: employee.employeeId || '',
      department: employee.department || '',
      designation: employee.designation || '',
      joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : '',
      salary: employee.salary || '',
      status: employee.status || 'active',
      address: employee.address || '',
      emergencyContact: employee.emergencyContact || '',
      emergencyPhone: employee.emergencyPhone || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await employeeApi.delete(id);
      toast.success('Employee deleted successfully');
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to delete employee');
    }
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      employeeId: '',
      department: '',
      designation: '',
      joiningDate: '',
      salary: '',
      status: 'active',
      address: '',
      emergencyContact: '',
      emergencyPhone: '',
    });
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = ['Employee ID', 'Name', 'Email', 'Phone', 'Department', 'Designation', 'Join Date', 'Status', 'Salary'];
    const rows = filteredEmployees.map(emp => [
      emp.employeeId,
      `${emp.firstName} ${emp.lastName}`,
      emp.email,
      emp.phone,
      emp.department,
      emp.designation,
      emp.joinDate ? new Date(emp.joinDate).toLocaleDateString() : '',
      emp.status,
      emp.salary
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Employees exported successfully');
  };

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white flex items-center justify-center font-bold text-sm">
            {row.firstName?.[0]}{row.lastName?.[0]}
          </div>
          <div>
            <p className="font-semibold text-sm">{row.firstName} {row.lastName}</p>
            <p className="text-xs text-[var(--text-muted)]">{row.employeeId}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (_, row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Mail size={14} className="text-[var(--text-muted)]" />
            <span>{row.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone size={14} className="text-[var(--text-muted)]" />
            <span>{row.phone}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (val) => (
        <div className="flex items-center gap-2">
          <Briefcase size={14} className="text-[var(--text-muted)]" />
          <span className="text-sm">{val || '-'}</span>
        </div>
      ),
    },
    {
      key: 'designation',
      header: 'Designation',
      render: (val) => <span className="text-sm">{val || '-'}</span>,
    },
    {
      key: 'joinDate',
      header: 'Join Date',
      render: (val) => (
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[var(--text-muted)]" />
          <span className="text-sm">{val ? new Date(val).toLocaleDateString() : '-'}</span>
        </div>
      ),
    },
    {
      key: 'salary',
      header: 'Salary',
      render: (val) => (
        <div className="flex items-center gap-2">
          <DollarSign size={14} className="text-[var(--text-muted)]" />
          <span className="text-sm font-medium">{val ? `₹${Number(val).toLocaleString()}` : '-'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (val) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${val === 'active'
          ? 'bg-emerald-500/10 text-emerald-600'
          : 'bg-red-500/10 text-red-600'
          }`}>
          {val}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 rounded hover:bg-blue-500/10 text-blue-600"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDelete(row._id)}
            className="p-1.5 rounded hover:bg-red-500/10 text-red-600"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Employee Management"
        subtitle="Manage all employees and their details"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportToCSV} className="flex items-center gap-2">
              <Download size={16} />
              Export CSV
            </Button>
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <Plus size={16} />
              Add Employee
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Employees"
          value={stats.total}
          icon={Briefcase}
          accentColor="#3b82f6"
          sub="All employees"
        />
        <KPICard
          title="Active Employees"
          value={stats.active}
          icon={Briefcase}
          accentColor="#22c55e"
          trend={`${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%`}
          trendUp={true}
        />
        <KPICard
          title="Inactive"
          value={stats.inactive}
          icon={Briefcase}
          accentColor="#ef4444"
          trend={`${stats.total > 0 ? Math.round((stats.inactive / stats.total) * 100) : 0}%`}
          trendUp={false}
        />
        <KPICard
          title="Departments"
          value={stats.departments}
          icon={MapPin}
          accentColor="#f59e0b"
          sub="Unique depts"
        />
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              placeholder="Search by name, ID or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          <Select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-44 h-10"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept.name}>{dept.name}</option>
            ))}
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-36 h-10"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>

          <Button variant="outline" onClick={fetchEmployees} className="flex items-center gap-2">
            <RefreshCw size={16} />
            Refresh
          </Button>

          <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 ml-auto">
            <Plus size={16} />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-card p-4">
        <DataTable
          columns={columns}
          data={filteredEmployees}
          emptyText="No employees found."
          loading={loading}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
        size="lg"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingEmployee ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="First Name *">
            <Input
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="Enter first name"
            />
          </FormField>

          <FormField label="Last Name *">
            <Input
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Enter last name"
            />
          </FormField>

          <FormField label="Employee ID *">
            <Input
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              placeholder="e.g., EMP001"
            />
          </FormField>

          <FormField label="Email *">
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </FormField>

          <FormField label="Phone *">
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
              required
            />
          </FormField>

          {!editingEmployee && (
            <FormField label="Password *">
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
                required
              />
            </FormField>
          )}

          <FormField label="Department">
            <Select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept.name}>{dept.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Designation">
            <Input
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              placeholder="e.g., Software Engineer"
            />
          </FormField>

          <FormField label="Join Date *">
            <Input
              type="date"
              value={formData.joiningDate}
              onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
              required
            />
          </FormField>

          <FormField label="Salary">
            <Input
              type="number"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              placeholder="Enter salary"
            />
          </FormField>

          <FormField label="Status">
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>

          <FormField label="Address" className="md:col-span-2">
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter address"
              rows={2}
            />
          </FormField>

          <FormField label="Emergency Contact Name">
            <Input
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
              placeholder="Emergency contact name"
            />
          </FormField>

          <FormField label="Emergency Contact Phone">
            <Input
              value={formData.emergencyPhone}
              onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
              placeholder="Emergency contact phone"
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeesPage;
