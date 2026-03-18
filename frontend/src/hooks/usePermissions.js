/**
 * Simplified usePermissions Hook
 * SINGLE SOURCE OF TRUTH: Uses AuthContext user.permissions
 * NO dual permission system, NO fallback to API
 */
import { useCallback, useMemo } from 'react';
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

/**
 * Hook to check permissions for a specific module
 * @param {string} module - Module ID (e.g., 'employees', 'leaves', 'attendance')
 * @returns {Object} Permission check functions and column visibility
 */
export const usePermissions = (module) => {
  const { user, can, getDataScope } = useAuth();
  const { isModuleEnabled, isFeatureEnabled } = useSettings();

  const userRole = user?.role || 'Employee';
  const isAdminLike = userRole === 'Admin' || userRole === 'Super Admin' || user?.isSuperAdmin;

  // Get data scope for this module
  const dataScope = useMemo(() => {
    return getDataScope(module);
  }, [getDataScope, module]);

  // Permission check functions - use can() from AuthContext (single source of truth)
  const canDo = useCallback((action) => {
    // Admin/Super Admin have all permissions
    if (isAdminLike) return true;
    // Use AuthContext.can() which reads from user.permissions object
    return can(module, action);
  }, [can, module, isAdminLike]);

  const canView = useCallback(() => canDo('view'), [canDo]);
  const canCreate = useCallback(() => canDo('create'), [canDo]);
  const canEdit = useCallback(() => canDo('edit'), [canDo]);
  const canDelete = useCallback(() => canDo('delete'), [canDo]);
  const canExport = useCallback(() => canDo('export'), [canDo]);
  const canApprove = useCallback(() => canDo('approve'), [canDo]);
  const canAssign = useCallback(() => canDo('assign'), [canDo]);
  const canGenerate = useCallback(() => canDo('generate'), [canDo]);
  const canManage = useCallback(() => canDo('manage'), [canDo]);
  const canCheckin = useCallback(() => canDo('checkin') || canDo('checkout'), [canDo]);
  const canViewAll = useCallback(() => canDo('view_all') || canDo('viewAll'), [canDo]);

  // Check if a specific column should be visible
  const isColumnVisible = useCallback((columnKey) => {
    const allColumns = MODULE_COLUMNS[module] || [];
    if (isAdminLike) return true;
    // Check if user.permissions has column-specific settings
    return user?.permissions?.[module]?.columns?.[columnKey] !== false;
  }, [module, isAdminLike, user?.permissions]);

  // Get all visible columns
  const visibleColumns = useMemo(() => {
    const allColumns = MODULE_COLUMNS[module] || [];
    if (isAdminLike) return allColumns;
    return allColumns.filter(col => user?.permissions?.[module]?.columns?.[col] !== false);
  }, [module, isAdminLike, user?.permissions]);

  // Module/feature enabled checks from SettingsContext
  const moduleOn = useCallback((mod) => isModuleEnabled(mod), [isModuleEnabled]);
  const featureOn = useCallback((mod, featureName) => isFeatureEnabled(mod, featureName), [isFeatureEnabled]);
  
  // Backward compatibility: 'feature' function for legacy code
  const feature = useCallback((featureName) => isFeatureEnabled(module, featureName), [isFeatureEnabled, module]);

  return {
    // Permission checks
    can: canDo,
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
    // Data scope
    dataScope,
    // Module/Feature enabled checks
    moduleOn,
    featureOn,
    feature, // backward compatibility
    // Column visibility
    isColumnVisible,
    visibleColumns,
    // Meta
    isLoading: false,
    userRole,
  };
};

/**
 * Hook to check global permissions (not module-specific)
 * @returns {Object} Global permission check functions
 */
export const useGlobalPermissions = () => {
  const { user, can } = useAuth();
  const userRole = user?.role || 'Employee';
  const isAdminLike = userRole === 'Admin' || userRole === 'Super Admin' || user?.isSuperAdmin;

  const hasPermission = useCallback((module, action) => {
    if (isAdminLike) return true;
    return can(module, action);
  }, [can, isAdminLike]);

  const canAccessModule = useCallback((module) => {
    return hasPermission(module, 'view');
  }, [hasPermission]);

  return {
    hasPermission,
    canAccessModule,
    userRole,
    isAdmin: isAdminLike,
    isLoading: false,
  };
};

export default usePermissions;
