/**
 * Enhanced usePermissions Hook
 * Provides role-based access control with column-level permissions
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

// Module column definitions (must match backend)
const MODULE_COLUMNS = {
  employees: ['employee', 'contact', 'department', 'role', 'joinDate', 'salary', 'status', 'actions'],
  leaves: ['employee', 'leaveType', 'startDate', 'endDate', 'days', 'status', 'actions'],
  attendance: ['employee', 'department', 'date', 'checkIn', 'checkOut', 'totalHours', 'breakTime', 'overtime', 'status', 'workMode', 'location', 'lateMark', 'earlyExit', 'actions'],
  payroll: ['employee', 'month', 'year', 'baseSalary', 'allowances', 'deductions', 'netSalary', 'status', 'actions'],
  increments: ['employee', 'previousSalary', 'increasePercent', 'newSalary', 'increaseAmount', 'effectiveFrom', 'reason', 'actions'],
  departments: ['departmentName', 'code', 'employees', 'description', 'status', 'created', 'actions'],
};

// Map module names to backend module IDs
const MODULE_TO_BACKEND = {
  employees: 'employees',
  leaves: 'leaves',
  attendance: 'attendance',
  payroll: 'payroll',
  increments: 'increments',
  departments: 'departments',
};

/**
 * Hook to check permissions for a specific module
 * @param {string} module - Module ID (e.g., 'employees', 'leaves', 'attendance')
 * @returns {Object} Permission check functions and column visibility
 */
export const usePermissions = (module) => {
  const { user } = useAuth();
  const { isModuleEnabled, isFeatureEnabled } = useSettings();
  const [isLoading, setIsLoading] = useState(true);

  // Get user's role and permissions from auth context
  const userRole = user?.role || 'Employee';
  const userRoleId = user?.roleId || user?._id;
  const userPermissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const isAdminLike = userRole === 'Admin' || userRole === 'Super Admin' || user?.isSuperAdmin;

  // Fetch role permissions from API for ALL users with a roleId
  const { data: roleData, isLoading: roleLoading, error: roleError } = useQuery({
    queryKey: ['role-permissions', userRoleId],
    queryFn: async () => {
      if (!userRoleId) return { permissions: [], columns: {} };
      try {
        const [permsRes, columnsRes] = await Promise.all([
          apiClient.get(`/hrm/permissions/roles/${userRoleId}/permissions`),
          apiClient.get(`/hrm/permissions/roles/${userRoleId}/column-permissions`),
        ]);
        return {
          permissions: permsRes.data || [],
          columns: columnsRes.data?.columns || {},
        };
      } catch (error) {
        // Return empty permissions on error - will fallback to JWT permissions
        return { permissions: [], columns: {} };
      }
    },
    enabled: !!userRoleId,
    staleTime: 10 * 1000, // Cache for 10 seconds only
    cacheTime: 30 * 1000, // Keep in cache for 30 seconds
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });

  // Combine JWT permissions with API permissions (API takes precedence)
  const effectivePermissions = useMemo(() => {
    // Admin/Super Admin have all permissions
    if (userRole === 'Admin' || userRole === 'Super Admin') {
      return Object.keys(MODULE_TO_BACKEND).flatMap(mod => [
        `${mod}.view`,
        `${mod}.create`,
        `${mod}.edit`,
        `${mod}.delete`,
        `${mod}.export`,
        `${mod}.approve`,
        `${mod}.assign`,
        `${mod}.generate`,
      ]);
    }
    
    // Employee role gets installation permissions by default
    if (userRole === 'Employee') {
      const basePermissions = [
        'installation.view',
        'installation.edit',
        'installation.create',
        'commissioning.view',
        'commissioning.edit',
        'logistics.view',
        'logistics.edit',
      ];
      const apiPermissions = roleData?.permissions || [];
      return [...new Set([...basePermissions, ...userPermissions, ...apiPermissions])];
    }
    
    const apiPermissions = roleData?.permissions || [];
    // Merge API permissions with JWT permissions (API takes priority)
    const combined = [...new Set([...userPermissions, ...apiPermissions])];
    return combined;
  }, [userPermissions, roleData, userRole]);

  // Get column permissions for the module
  const columnPermissions = useMemo(() => {
    // Admin/Super Admin see all columns
    if (userRole === 'Admin' || userRole === 'Super Admin') {
      const allColumns = MODULE_COLUMNS[module] || [];
      return allColumns.reduce((acc, col) => ({ ...acc, [col]: true }), {});
    }

    // Use API column permissions or default to all visible
    const apiColumns = roleData?.columns?.[module] || {};
    const allColumns = MODULE_COLUMNS[module] || [];
    
    return allColumns.reduce((acc, col) => ({
      ...acc,
      [col]: apiColumns[col] !== false, // Default to true if not explicitly false
    }), {});
  }, [roleData, module, userRole]);

  // Permission check functions
  const can = useCallback((action) => {
    // Admin/Super Admin have all permissions
    if (userRole === 'Admin' || userRole === 'Super Admin') {
      return true;
    }

    // Employee role has installation/commissioning/logistics permissions
    if (userRole === 'Employee') {
      const employeePermissions = [
        'installation.view', 'installation.edit', 'installation.create',
        'commissioning.view', 'commissioning.edit',
        'logistics.view', 'logistics.edit',
      ];
      const permissionKey = `${module}.${action}`;
      if (employeePermissions.includes(permissionKey)) {
        return true;
      }
    }

    // Check if user has the specific permission
    const permissionKey = `${module}.${action}`;
    return effectivePermissions.includes(permissionKey);
  }, [effectivePermissions, module, userRole]);

  // Check if user can view the module
  const canView = useCallback(() => {
    return can('view');
  }, [can]);

  // Check if user can create
  const canCreate = useCallback(() => {
    return can('create');
  }, [can]);

  // Check if user can edit
  const canEdit = useCallback(() => {
    return can('edit');
  }, [can]);

  // Check if user can delete
  const canDelete = useCallback(() => {
    return can('delete');
  }, [can]);

  // Check if user can export
  const canExport = useCallback(() => {
    return can('export');
  }, [can]);

  // Check if user can approve
  const canApprove = useCallback(() => {
    return can('approve');
  }, [can]);

  // Check if user can assign
  const canAssign = useCallback(() => {
    return can('assign');
  }, [can]);

  // Check if user can generate (for payroll)
  const canGenerate = useCallback(() => {
    return can('generate');
  }, [can]);

  // Check if user can manage (generic management permission)
  const canManage = useCallback(() => {
    return can('manage');
  }, [can]);

  // Check if user can check-in/out (for attendance)
  const canCheckin = useCallback(() => {
    return can('checkin') || can('checkout') || can('checkin_checkout');
  }, [can]);

  // Check if user can view all records (for attendance)
  const canViewAll = useCallback(() => {
    return can('view_all') || can('viewAll');
  }, [can]);

  // Feature flags support - checks if a feature is enabled (e.g., 'kanban_view', 'analytics_view')
  const feature = useCallback((featureName) => {
    if (userRole === 'Admin' || userRole === 'Super Admin') {
      return true;
    }
    // Check if feature is in permissions (e.g., 'crm.kanban_view' or just 'kanban_view')
    const fullKey = `${module}.${featureName}`;
    return effectivePermissions.includes(featureName) || effectivePermissions.includes(fullKey);
  }, [effectivePermissions, module, userRole]);

  // Check if a specific column should be visible
  const isColumnVisible = useCallback((columnKey) => {
    return columnPermissions[columnKey] !== false;
  }, [columnPermissions]);

  // Get all visible columns
  const visibleColumns = useMemo(() => {
    return Object.entries(columnPermissions)
      .filter(([_, isVisible]) => isVisible)
      .map(([key]) => key);
  }, [columnPermissions]);

  // Get column configuration object for conditional rendering
  const columns = useMemo(() => {
    return columnPermissions;
  }, [columnPermissions]);

  // Loading state
  useEffect(() => {
    setIsLoading(roleLoading);
  }, [roleLoading]);

  // Module/feature enabled checks from SettingsContext
  const moduleOn = useCallback((mod) => isModuleEnabled(mod), [isModuleEnabled]);
  const featureOn = useCallback((mod, featureName) => isFeatureEnabled(mod, featureName), [isFeatureEnabled]);

  return {
    // Permission checks
    can,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canExport,
    canApprove,
    canAssign,
    canGenerate,
    canManage,
    canCheckin,
    canViewAll,
    // Feature flags
    feature,
    // Module/Feature enabled checks
    moduleOn,
    featureOn,
    // Column visibility
    columns,
    isColumnVisible,
    visibleColumns,
    // Meta
    isLoading,
    userRole,
    permissions: effectivePermissions,
    error: roleError,
  };
};

/**
 * Hook to check global permissions (not module-specific)
 * @returns {Object} Global permission check functions
 */
export const useGlobalPermissions = () => {
  const { user } = useAuth();
  const userRole = user?.role || 'Employee';
  const userRoleId = user?.roleId || user?._id;
  const userPermissions = user?.permissions || [];

  // Fetch all role permissions
  const { data: roleData, isLoading, error } = useQuery({
    queryKey: ['role-permissions', userRoleId],
    queryFn: async () => {
      if (!userRoleId) return { permissions: [], columns: {} };
      try {
        const [permsRes, columnsRes] = await Promise.all([
          apiClient.get(`/hrm/permissions/roles/${userRoleId}/permissions`),
          apiClient.get(`/hrm/permissions/roles/${userRoleId}/column-permissions`),
        ]);
        return {
          permissions: permsRes.data || [],
          columns: columnsRes.data?.columns || {},
        };
      } catch (err) {
        console.error('Failed to fetch role permissions:', err);
        return { permissions: [], columns: {} };
      }
    },
    enabled: !!userRoleId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const effectivePermissions = useMemo(() => {
    if (userRole === 'Admin' || userRole === 'Super Admin') {
      return Object.keys(MODULE_TO_BACKEND).flatMap(mod => [
        `${mod}.view`, `${mod}.create`, `${mod}.edit`, `${mod}.delete`, 
        `${mod}.export`, `${mod}.approve`, `${mod}.assign`, `${mod}.generate`,
      ]);
    }
    const apiPermissions = roleData?.permissions || [];
    return [...new Set([...userPermissions, ...apiPermissions])];
  }, [userPermissions, roleData, userRole]);

  const hasPermission = useCallback((permissionKey) => {
    if (userRole === 'Admin' || userRole === 'Super Admin') {
      return true;
    }
    return effectivePermissions.includes(permissionKey);
  }, [userRole, effectivePermissions]);

  const canAccessModule = useCallback((module) => {
    return hasPermission(`${module}.view`);
  }, [hasPermission]);

  const getModuleColumns = useCallback((module) => {
    if (userRole === 'Admin' || userRole === 'Super Admin') {
      return MODULE_COLUMNS[module] || [];
    }
    const moduleColumns = roleData?.columns?.[module] || {};
    return Object.entries(moduleColumns)
      .filter(([_, isVisible]) => isVisible)
      .map(([key]) => key);
  }, [roleData, userRole]);

  return {
    hasPermission,
    canAccessModule,
    getModuleColumns,
    userRole,
    isAdmin: userRole === 'Admin' || userRole === 'Super Admin',
    permissions: effectivePermissions,
    isLoading,
    error,
  };
};

export default usePermissions;
