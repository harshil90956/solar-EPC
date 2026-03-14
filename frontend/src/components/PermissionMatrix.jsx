/**
 * Advanced HRM Permission Matrix Component
 * Admin interface for managing role permissions with column-level visibility
 */
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useSettings } from '../context/SettingsContext';
import { toast } from '../components/ui/Toast';
import { 
  Users, Shield, Check, X, Plus, Trash2, Edit2, 
  Save, Loader2, ChevronDown, ChevronRight, Eye, EyeOff,
  Columns, Copy, Search, LayoutGrid, Grid3X3,
  Calendar, Wallet, TrendingUp, Clock, Building2
} from 'lucide-react';

// Module definitions with columns
const MODULES = [
  {
    id: 'employees',
    name: 'Employee Management',
    icon: Users,
    columns: [
      { key: 'employee', label: 'Employee', description: 'Employee name and photo' },
      { key: 'contact', label: 'Contact', description: 'Email and phone number' },
      { key: 'department', label: 'Department', description: 'Department assignment' },
      { key: 'role', label: 'Role', description: 'Job role/position' },
      { key: 'joinDate', label: 'Join Date', description: 'Date of joining' },
      { key: 'salary', label: 'Salary', description: 'Salary information' },
      { key: 'status', label: 'Status', description: 'Active/Inactive status' },
      { key: 'actions', label: 'Actions', description: 'Edit/Delete buttons' },
    ],
    actions: ['view', 'create', 'edit', 'delete', 'export', 'assign'],
  },
  {
    id: 'leaves',
    name: 'Leave Management',
    icon: Calendar,
    columns: [
      { key: 'employee', label: 'Employee', description: 'Employee name' },
      { key: 'leaveType', label: 'Leave Type', description: 'Type of leave' },
      { key: 'startDate', label: 'Start Date', description: 'Leave start date' },
      { key: 'endDate', label: 'End Date', description: 'Leave end date' },
      { key: 'days', label: 'Days', description: 'Number of days' },
      { key: 'status', label: 'Status', description: 'Leave status' },
      { key: 'actions', label: 'Actions', description: 'Approve/Reject buttons' },
    ],
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'],
  },
  {
    id: 'attendance',
    name: 'Attendance Management',
    icon: Clock,
    columns: [
      { key: 'employee', label: 'Employee', description: 'Employee name' },
      { key: 'department', label: 'Department', description: 'Department name' },
      { key: 'date', label: 'Date', description: 'Attendance date' },
      { key: 'checkIn', label: 'Check-In', description: 'Check-in time' },
      { key: 'checkOut', label: 'Check-Out', description: 'Check-out time' },
      { key: 'totalHours', label: 'Total Hours', description: 'Total working hours' },
      { key: 'breakTime', label: 'Break Time', description: 'Break duration' },
      { key: 'overtime', label: 'Overtime', description: 'Overtime hours' },
      { key: 'status', label: 'Status', description: 'Present/Absent/Late' },
      { key: 'workMode', label: 'Work Mode', description: 'Office/Remote/Site' },
      { key: 'location', label: 'Location', description: 'GPS location' },
      { key: 'lateMark', label: 'Late Mark', description: 'Late arrival indicator' },
      { key: 'earlyExit', label: 'Early Exit', description: 'Early departure' },
      { key: 'actions', label: 'Actions', description: 'Edit/Delete buttons' },
    ],
    actions: ['view', 'create', 'edit', 'delete', 'export'],
  },
  {
    id: 'payroll',
    name: 'Payroll Management',
    icon: Wallet,
    columns: [
      { key: 'employee', label: 'Employee', description: 'Employee name' },
      { key: 'month', label: 'Month', description: 'Payroll month' },
      { key: 'year', label: 'Year', description: 'Payroll year' },
      { key: 'baseSalary', label: 'Base Salary', description: 'Base salary amount' },
      { key: 'allowances', label: 'Allowances', description: 'Allowance breakdown' },
      { key: 'deductions', label: 'Deductions', description: 'Deduction breakdown' },
      { key: 'netSalary', label: 'Net Salary', description: 'Final net salary' },
      { key: 'status', label: 'Status', description: 'Paid/Pending status' },
      { key: 'actions', label: 'Actions', description: 'Edit/Delete buttons' },
    ],
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'generate'],
  },
  {
    id: 'increments',
    name: 'Salary Increments',
    icon: TrendingUp,
    columns: [
      { key: 'employee', label: 'Employee', description: 'Employee name' },
      { key: 'previousSalary', label: 'Previous Salary', description: 'Salary before increment' },
      { key: 'increasePercent', label: 'Increase %', description: 'Percentage increase' },
      { key: 'newSalary', label: 'New Salary', description: 'Salary after increment' },
      { key: 'increaseAmount', label: 'Increase Amount', description: 'Amount increased' },
      { key: 'effectiveFrom', label: 'Effective From', description: 'Increment date' },
      { key: 'reason', label: 'Reason', description: 'Increment reason' },
      { key: 'actions', label: 'Actions', description: 'Edit/Delete buttons' },
    ],
    actions: ['view', 'create', 'edit', 'delete', 'export'],
  },
  {
    id: 'departments',
    name: 'Departments',
    icon: Building2,
    columns: [
      { key: 'departmentName', label: 'Department Name', description: 'Department name' },
      { key: 'code', label: 'Code', description: 'Department code' },
      { key: 'employees', label: 'Employees', description: 'Employee count' },
      { key: 'description', label: 'Description', description: 'Department description' },
      { key: 'status', label: 'Status', description: 'Active/Inactive status' },
      { key: 'created', label: 'Created', description: 'Creation date' },
      { key: 'actions', label: 'Actions', description: 'Edit/Delete buttons' },
    ],
    actions: ['view', 'create', 'edit', 'delete', 'export', 'assign'],
  },
];

// Permission labels for display
const PERMISSION_LABELS = {
  view: { label: 'View', color: 'bg-blue-500', description: 'Can view records' },
  create: { label: 'Create', color: 'bg-green-500', description: 'Can create new records' },
  edit: { label: 'Edit', color: 'bg-yellow-500', description: 'Can edit existing records' },
  delete: { label: 'Delete', color: 'bg-red-500', description: 'Can delete records' },
  export: { label: 'Export', color: 'bg-purple-500', description: 'Can export data' },
  approve: { label: 'Approve', color: 'bg-indigo-500', description: 'Can approve requests' },
  assign: { label: 'Assign', color: 'bg-pink-500', description: 'Can assign to users/departments' },
  generate: { label: 'Generate', color: 'bg-cyan-500', description: 'Can generate reports/payroll' },
};

const PermissionMatrix = () => {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState(null);
  const [activeTab, setActiveTab] = useState('permissions');
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedModules, setExpandedModules] = useState({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [copyFromRole, setCopyFromRole] = useState('');

  const { customRoles } = useSettings();

  // Fetch roles
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['hrm-roles'],
    queryFn: async () => {
      const response = await apiClient.get('/hrm/permissions/roles');
      return response.data || [];
    },
  });

  // Fetch permissions for selected role
  const { data: rolePermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['hrm-role-permissions', selectedRole?._id],
    queryFn: async () => {
      if (!selectedRole) return [];
      const response = await apiClient.get(`/hrm/permissions/roles/${selectedRole._id}/permissions`);
      return response.data || [];
    },
    enabled: !!selectedRole,
  });

  // Fetch column permissions for selected role
  const { data: columnPermissions, isLoading: columnsLoading } = useQuery({
    queryKey: ['hrm-column-permissions', selectedRole?._id],
    queryFn: async () => {
      if (!selectedRole) return {};
      const response = await apiClient.get(`/hrm/permissions/roles/${selectedRole._id}/column-permissions`);
      return response.data?.columns || {};
    },
    enabled: !!selectedRole,
  });

  // Update role permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissions }) => {
      const response = await apiClient.patch(`/hrm/permissions/roles/${roleId}`, { permissions });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-role-permissions', selectedRole?._id] });
      toast.success('Permissions updated successfully');
    },
    onError: () => {
      toast.error('Failed to update permissions');
    },
  });

  // Update column permissions mutation
  const updateColumnPermissionsMutation = useMutation({
    mutationFn: async ({ roleId, module, columns }) => {
      const response = await apiClient.post(
        `/hrm/permissions/roles/${roleId}/column-permissions/bulk`,
        { module, columns }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-column-permissions', selectedRole?._id] });
      toast.success('Column permissions updated successfully');
    },
    onError: () => {
      toast.error('Failed to update column permissions');
    },
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData) => {
      const response = await apiClient.post('/hrm/permissions/roles', roleData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-roles'] });
      setIsCreateModalOpen(false);
      setNewRoleName('');
      setNewRoleDescription('');
      setCopyFromRole('');
      toast.success('Role created successfully');
    },
    onError: () => {
      toast.error('Failed to create role');
    },
  });

  // Copy permissions mutation
  const copyPermissionsMutation = useMutation({
    mutationFn: async ({ sourceRoleId, targetRoleId }) => {
      const response = await apiClient.post(
        `/hrm/permissions/roles/${targetRoleId}/column-permissions/copy`,
        { sourceRoleId }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-column-permissions', selectedRole?._id] });
      toast.success('Permissions copied successfully');
    },
    onError: () => {
      toast.error('Failed to copy permissions');
    },
  });

  // Toggle permission
  const togglePermission = useCallback((module, action) => {
    if (!selectedRole || selectedRole.isSystem) return;
    
    const permissionKey = `${module}.${action}`;
    const currentPermissions = rolePermissions || [];
    const hasPermission = currentPermissions.includes(permissionKey);
    
    const newPermissions = hasPermission
      ? currentPermissions.filter(p => p !== permissionKey)
      : [...currentPermissions, permissionKey];
    
    updatePermissionsMutation.mutate({
      roleId: selectedRole._id,
      permissions: newPermissions,
    });
  }, [selectedRole, rolePermissions, updatePermissionsMutation]);

  // Toggle column visibility
  const toggleColumn = useCallback((module, columnKey) => {
    if (!selectedRole || selectedRole.isSystem) return;
    
    const moduleColumns = columnPermissions?.[module] || {};
    const currentColumns = Object.entries(moduleColumns).reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
    
    const newColumns = {
      ...currentColumns,
      [columnKey]: !currentColumns[columnKey],
    };
    
    updateColumnPermissionsMutation.mutate({
      roleId: selectedRole._id,
      module,
      columns: newColumns,
    });
  }, [selectedRole, columnPermissions, updateColumnPermissionsMutation]);

  // Select all permissions for a module
  const selectAllPermissions = useCallback((module) => {
    if (!selectedRole || selectedRole.isSystem) return;
    
    const moduleDef = MODULES.find(m => m.id === module);
    if (!moduleDef) return;
    
    const currentPermissions = rolePermissions || [];
    const modulePermissions = moduleDef.actions.map(action => `${module}.${action}`);
    
    const allGranted = modulePermissions.every(p => currentPermissions.includes(p));
    
    let newPermissions;
    if (allGranted) {
      newPermissions = currentPermissions.filter(p => !p.startsWith(`${module}.`));
    } else {
      newPermissions = [...new Set([...currentPermissions, ...modulePermissions])];
    }
    
    updatePermissionsMutation.mutate({
      roleId: selectedRole._id,
      permissions: newPermissions,
    });
  }, [selectedRole, rolePermissions, updatePermissionsMutation]);

  // Select all columns for a module
  const selectAllColumns = useCallback((module) => {
    if (!selectedRole || selectedRole.isSystem) return;
    
    const moduleDef = MODULES.find(m => m.id === module);
    if (!moduleDef) return;
    
    const moduleColumns = columnPermissions?.[module] || {};
    const allVisible = moduleDef.columns.every(col => moduleColumns[col.key] !== false);
    
    const newColumns = {};
    moduleDef.columns.forEach(col => {
      newColumns[col.key] = !allVisible;
    });
    
    updateColumnPermissionsMutation.mutate({
      roleId: selectedRole._id,
      module,
      columns: newColumns,
    });
  }, [selectedRole, columnPermissions, updateColumnPermissionsMutation]);

  // Handle role creation
  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      toast.error('Role name is required');
      return;
    }
    
    createRoleMutation.mutate({
      name: newRoleName.trim(),
      description: newRoleDescription.trim(),
      permissions: [],
    });
  };

  // Handle copy permissions
  const handleCopyPermissions = () => {
    if (!copyFromRole || !selectedRole) {
      toast.error('Please select a source role');
      return;
    }
    
    copyPermissionsMutation.mutate({
      sourceRoleId: copyFromRole,
      targetRoleId: selectedRole._id,
    });
  };

  // Toggle module expansion
  const toggleModuleExpansion = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  // Check if role has permission
  const hasPermission = (module, action) => {
    const permissionKey = `${module}.${action}`;
    return rolePermissions?.includes(permissionKey) || false;
  };

  // Check if column is visible
  const isColumnVisible = (module, columnKey) => {
    const moduleColumns = columnPermissions?.[module] || {};
    return moduleColumns[columnKey] !== false;
  };

  // Filter modules based on search
  const filteredModules = MODULES.filter(module => {
    if (!searchFilter) return true;
    const searchLower = searchFilter.toLowerCase();
    return (
      module.name.toLowerCase().includes(searchLower) ||
      module.columns.some(col => col.label.toLowerCase().includes(searchLower))
    );
  });

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        <span className="ml-2">Loading roles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Role Permission Matrix</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Manage module access, actions, and column visibility for each role
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Create Role
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-base)] p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Roles
            </h3>
            <div className="space-y-2">
              {roles?.map((role) => (
                <button
                  key={role._id}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedRole?._id === role._id
                      ? 'bg-[var(--primary)] text-white'
                      : 'hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{role.name}</span>
                    {role.isSystem && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-600 rounded">
                        System
                      </span>
                    )}
                  </div>
                  {role.description && (
                    <p className={`text-xs mt-1 ${
                      selectedRole?._id === role._id ? 'text-white/70' : 'text-[var(--text-muted)]'
                    }`}>
                      {role.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Copy Permissions */}
          {selectedRole && !selectedRole.isSystem && (
            <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-base)] p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Copy className="w-4 h-4" />
                Copy From Role
              </h3>
              <select
                value={copyFromRole}
                onChange={(e) => setCopyFromRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-secondary)] mb-2"
              >
                <option value="">Select source role...</option>
                {roles?.filter(r => r._id !== selectedRole._id).map((role) => (
                  <option key={role._id} value={role._id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCopyPermissions}
                disabled={!copyFromRole || copyPermissionsMutation.isPending}
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {copyPermissionsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Copy Permissions'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Permission Matrix */}
        <div className="lg:col-span-3">
          {selectedRole ? (
            <div className="space-y-4">
              {/* Role Info & Tabs */}
              <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-base)] p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedRole.name}</h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      {selectedRole.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('permissions')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'permissions'
                          ? 'bg-[var(--primary)] text-white'
                          : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4 inline mr-2" />
                      Module Permissions
                    </button>
                    <button
                      onClick={() => setActiveTab('columns')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'columns'
                          ? 'bg-[var(--primary)] text-white'
                          : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <Columns className="w-4 h-4 inline mr-2" />
                      Column Visibility
                    </button>
                  </div>
                </div>

                {/* Search Filter */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search modules or columns..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-secondary)]"
                  />
                </div>
              </div>

              {/* Permissions Tab */}
              {activeTab === 'permissions' && (
                <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-base)] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[var(--bg-secondary)]">
                        <tr>
                          <th className="text-left p-4 font-semibold">Module</th>
                          {Object.entries(PERMISSION_LABELS).map(([key, { label }]) => (
                            <th key={key} className="text-center p-4 font-semibold text-xs">
                              {label}
                            </th>
                          ))}
                          <th className="text-center p-4 font-semibold text-xs">All</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-base)]">
                        {filteredModules.map((module) => {
                          const Icon = module.icon;
                          const moduleActions = module.actions;
                          const allGranted = moduleActions.every(action => hasPermission(module.id, action));
                          
                          return (
                            <tr key={module.id} className="hover:bg-[var(--bg-secondary)]/50">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                                    <Icon className="w-5 h-5 text-[var(--primary)]" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{module.name}</p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                      {module.columns.length} columns
                                    </p>
                                  </div>
                                </div>
                              </td>
                              {Object.keys(PERMISSION_LABELS).map((actionKey) => (
                                <td key={actionKey} className="p-4 text-center">
                                  {moduleActions.includes(actionKey) ? (
                                    <button
                                      onClick={() => togglePermission(module.id, actionKey)}
                                      disabled={selectedRole.isSystem || permissionsLoading}
                                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                                        hasPermission(module.id, actionKey)
                                          ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                                          : 'border-[var(--border-base)] hover:border-[var(--primary)]'
                                      } ${selectedRole.isSystem ? 'cursor-not-allowed opacity-50' : ''}`}
                                      title={PERMISSION_LABELS[actionKey]?.description}
                                    >
                                      {hasPermission(module.id, actionKey) && <Check className="w-4 h-4" />}
                                    </button>
                                  ) : (
                                    <span className="text-[var(--text-muted)]">-</span>
                                  )}
                                </td>
                              ))}
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => selectAllPermissions(module.id)}
                                  disabled={selectedRole.isSystem}
                                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    allGranted
                                      ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                      : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                  } ${selectedRole.isSystem ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                  {allGranted ? 'Remove All' : 'Select All'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Columns Tab */}
              {activeTab === 'columns' && (
                <div className="space-y-4">
                  {filteredModules.map((module) => {
                    const Icon = module.icon;
                    const isExpanded = expandedModules[module.id] !== false;
                    const visibleColumns = module.columns.filter(col => isColumnVisible(module.id, col.key));
                    
                    return (
                      <div
                        key={module.id}
                        className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-base)] overflow-hidden"
                      >
                        {/* Module Header */}
                        <button
                          onClick={() => toggleModuleExpansion(module.id)}
                          className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg-secondary)]/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-[var(--primary)]" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium">{module.name}</p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {visibleColumns.length} of {module.columns.length} columns visible
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                selectAllColumns(module.id);
                              }}
                              disabled={selectedRole.isSystem}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                visibleColumns.length === module.columns.length
                                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                  : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                              } ${selectedRole.isSystem ? 'cursor-not-allowed opacity-50' : ''}`}
                            >
                              {visibleColumns.length === module.columns.length ? 'Hide All' : 'Show All'}
                            </button>
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                            )}
                          </div>
                        </button>

                        {/* Columns List */}
                        {isExpanded && (
                          <div className="border-t border-[var(--border-base)] p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {module.columns.map((column) => (
                                <label
                                  key={column.key}
                                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    isColumnVisible(module.id, column.key)
                                      ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                                      : 'border-[var(--border-base)] hover:border-[var(--primary)]/50'
                                  } ${selectedRole.isSystem ? 'cursor-not-allowed opacity-60' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isColumnVisible(module.id, column.key)}
                                    onChange={() => toggleColumn(module.id, column.key)}
                                    disabled={selectedRole.isSystem}
                                    className="mt-0.5 w-4 h-4 rounded border-[var(--border-base)] text-[var(--primary)] focus:ring-[var(--primary)]"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm">{column.label}</span>
                                      {isColumnVisible(module.id, column.key) ? (
                                        <Eye className="w-3.5 h-3.5 text-green-500" />
                                      ) : (
                                        <EyeOff className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                      )}
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                      {column.description}
                                    </p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-base)]">
              <Shield className="w-12 h-12 text-[var(--text-muted)] mb-4" />
              <p className="text-[var(--text-muted)]">Select a role to manage permissions</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-base)] max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Role</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Role Name *</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., HR Executive"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-secondary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Brief description of this role..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-secondary)] resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Copy From (Optional)</label>
                <select
                  value={copyFromRole}
                  onChange={(e) => setCopyFromRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-base)] bg-[var(--bg-secondary)]"
                >
                  <option value="">Start with empty permissions</option>
                  <optgroup label="HRM Roles">
                    {roles?.map((role) => (
                      <option key={role._id} value={role._id}>
                        {role.name}
                      </option>
                    ))}
                  </optgroup>
                  {Object.keys(customRoles || {}).length > 0 && (
                    <optgroup label="Custom Roles (Role Builder)">
                      {Object.values(customRoles).map((role) => (
                        <option key={role.id || role._id} value={role.id || role._id}>
                          {role.label || role.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewRoleName('');
                  setNewRoleDescription('');
                  setCopyFromRole('');
                }}
                className="px-4 py-2 rounded-lg border border-[var(--border-base)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                disabled={createRoleMutation.isPending || !newRoleName.trim()}
                className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {createRoleMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Create Role'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionMatrix;
