import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Save, 
  RefreshCcw, 
  Check, 
  X,
  Loader2,
  Users,
  Calendar,
  Clock,
  Wallet,
  TrendingUp,
  Building,
  LayoutDashboard,
  Settings
} from 'lucide-react';
import api from '../lib/apiClient';
import { toast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';

const PERMISSION_COLUMNS = [
  { id: 'view', label: 'View' },
  { id: 'manage', label: 'Create/Edit' },
  { id: 'delete', label: 'Delete' },
  { id: 'approve', label: 'Approve' },
  { id: 'reject', label: 'Reject' },
  { id: 'checkin_checkout', label: 'Check In/Out' },
];

const MODULES = [
  {
    id: 'employees',
    label: 'HRM — Employees',
    icon: Users,
    availablePermissions: ['view', 'manage', 'delete']
  },
  {
    id: 'leaves',
    label: 'HRM — Leaves',
    icon: Calendar,
    availablePermissions: ['view', 'apply', 'approve', 'reject']
  },
  {
    id: 'attendance',
    label: 'HRM — Attendance',
    icon: Clock,
    availablePermissions: ['view_self', 'view_all', 'checkin_checkout', 'manage']
  },
  {
    id: 'payroll',
    label: 'HRM — Payroll',
    icon: Wallet,
    availablePermissions: ['view', 'manage', 'approve']
  },
  {
    id: 'increments',
    label: 'HRM — Increments',
    icon: TrendingUp,
    availablePermissions: ['view', 'manage']
  },
  {
    id: 'departments',
    label: 'HRM — Departments',
    icon: Building,
    availablePermissions: ['view', 'manage']
  },
  {
    id: 'dashboard',
    label: 'HRM — Dashboard',
    icon: LayoutDashboard,
    availablePermissions: ['view']
  }
];

// Map internal permission IDs to the visual column IDs for the table display
const PERM_MAP = {
  'manage': ['manage', 'apply'], // 'manage' in schema covers 'apply' for leaves
  'approve': ['approve'],
  'reject': ['reject'],
  'checkin_checkout': ['checkin_checkout'],
};

const ROLES = ['Employee', 'HR', 'Manager', 'Admin'];

const HRMPermissionsPage = () => {
  const [selectedRole, setSelectedRole] = useState('Employee');
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPermissions = useCallback(async (role) => {
    setLoading(true);
    try {
      const response = await api.get(`/hrm/permissions/role/${role}`);
      setPermissions(response.permissions || {});
    } catch (err) {
      console.error('Error fetching HRM permissions:', err);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions(selectedRole);
  }, [selectedRole, fetchPermissions]);

  const handleTogglePermission = (moduleId, permId) => {
    // Determine which internal permission key to toggle based on column
    let internalKey = permId;
    
    // Custom mapping for complex modules like Attendance
    if (moduleId === 'attendance') {
      if (permId === 'view') internalKey = 'view_all';
    }
    if (moduleId === 'leaves' && permId === 'manage') internalKey = 'apply';

    setPermissions(prev => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || {}),
        [internalKey]: !prev[moduleId]?.[internalKey]
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/hrm/permissions/role/${selectedRole}`, {
        permissions
      });
      toast.success('Permissions updated successfully');
    } catch (err) {
      console.error('Error saving HRM permissions:', err);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const isChecked = (moduleId, colId) => {
    const modPerms = permissions[moduleId] || {};
    if (colId === 'view') {
      return modPerms.view || modPerms.view_all || modPerms.view_self;
    }
    if (colId === 'manage') {
      return modPerms.manage || modPerms.apply;
    }
    return modPerms[colId];
  };

  const isEnabled = (moduleId, colId) => {
    const module = MODULES.find(m => m.id === moduleId);
    if (colId === 'view') return true;
    if (colId === 'manage') return module.availablePermissions.some(p => p === 'manage' || p === 'apply');
    return module.availablePermissions.includes(colId);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <Settings size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">HRM Permissions</h2>
            <p className="text-xs text-gray-500">Configure access levels for organizational roles</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Active Role:</span>
            <select 
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer"
            >
              {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
            </select>
          </div>
          
          <Button 
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-100"
          >
            {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/30 text-[11px] uppercase tracking-wider text-gray-400 font-bold border-b border-gray-100">
              <th className="px-6 py-4 font-bold">Module / Feature</th>
              {PERMISSION_COLUMNS.map(col => (
                <th key={col.id} className="px-4 py-4 text-center">{col.label}</th>
              ))}
              <th className="px-6 py-4 text-right">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {MODULES.map(module => {
              const Icon = module.icon;
              const activeCount = Object.values(permissions[module.id] || {}).filter(Boolean).length;
              const totalAvailable = module.availablePermissions.length;
              const progress = Math.round((activeCount / totalAvailable) * 100) || 0;

              return (
                <tr key={module.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-100 text-gray-400 group-hover:bg-orange-100 group-hover:text-orange-500 transition-colors">
                        <Icon size={16} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{module.label}</span>
                    </div>
                  </td>

                  {PERMISSION_COLUMNS.map(col => {
                    const enabled = isEnabled(module.id, col.id);
                    const checked = isChecked(module.id, col.id);

                    return (
                      <td key={col.id} className="px-4 py-4 text-center">
                        {enabled ? (
                          <button
                            onClick={() => handleTogglePermission(module.id, col.id)}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                              checked 
                                ? 'bg-orange-50 border-orange-200 text-orange-500 shadow-sm shadow-orange-100' 
                                : 'bg-white border-gray-200 text-gray-300 hover:border-orange-300 hover:text-orange-300'
                            }`}
                          >
                            {checked ? <Check size={14} strokeWidth={3} /> : <X size={12} />}
                          </button>
                        ) : (
                          <div className="w-6 h-6 mx-auto flex items-center justify-center text-gray-100">
                            <X size={12} />
                          </div>
                        )}
                      </td>
                    );
                  })}

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-gray-400 w-4">{activeCount}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
          <Loader2 className="text-orange-500 animate-spin" size={32} />
        </div>
      )}
    </div>
  );
};

export default HRMPermissionsPage;
