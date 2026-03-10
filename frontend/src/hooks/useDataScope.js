/**
 * useDataScope hook - Filters data based on user dataScope (ASSIGNED vs ALL)
 * 
 * Usage:
 *   const { filterByScope, canAccessRecord, dataScope } = useDataScope();
 *   const filteredData = filterByScope(allData, 'assignedTo', 'createdBy');
 */
import { useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export function useDataScope() {
  const { user } = useAuth();
  const { customRoles } = useSettings();

  // Get user's dataScope from their custom role or default to ASSIGNED
  const dataScope = useMemo(() => {
    if (!user) return 'ASSIGNED';
    
    // Admin sees all data
    if (user.role === 'Admin' || user.role === 'admin') {
      return 'ALL';
    }
    
    // Get custom role dataScope
    if (user.roleId && customRoles[user.roleId]) {
      return customRoles[user.roleId].dataScope || 'ASSIGNED';
    }
    
    return 'ASSIGNED';
  }, [user, customRoles]);

  const userId = user?.id || user?._id;

  /**
   * Check if user can access a specific record
   * @param {Object} record - The record to check
   * @param {string} assignedField - Field name for assigned user (default: 'assignedTo')
   * @param {string} createdField - Field name for creator (default: 'createdBy')
   * @returns {boolean}
   */
  const canAccessRecord = useCallback((record, assignedField = 'assignedTo', createdField = 'createdBy') => {
    if (!user || !record) return false;
    
    // Admin or ALL scope sees everything
    if (dataScope === 'ALL' || user.role === 'Admin' || user.role === 'admin') {
      return true;
    }
    
    // ASSIGNED scope: can only see records assigned to them or created by them
    const assignedTo = record[assignedField]?.toString?.() || record[assignedField];
    const createdBy = record[createdField]?.toString?.() || record[createdField];
    
    return assignedTo === userId || createdBy === userId;
  }, [user, dataScope, userId]);

  /**
   * Filter array of data based on dataScope
   * @param {Array} data - Array of records to filter
   * @param {string} assignedField - Field name for assigned user
   * @param {string} createdField - Field name for creator
   * @returns {Array} Filtered data
   */
  const filterByScope = useCallback((data, assignedField = 'assignedTo', createdField = 'createdBy') => {
    if (!data || !Array.isArray(data)) return [];
    
    // ALL scope or admin: return all data
    if (dataScope === 'ALL' || user?.role === 'Admin' || user?.role === 'admin') {
      return data;
    }
    
    // ASSIGNED scope: filter to only records for this user
    return data.filter(record => canAccessRecord(record, assignedField, createdField));
  }, [dataScope, user, canAccessRecord]);

  /**
   * Check if user has ALL scope
   * @returns {boolean}
   */
  const hasAllScope = useMemo(() => {
    return dataScope === 'ALL' || user?.role === 'Admin' || user?.role === 'admin';
  }, [dataScope, user]);

  /**
   * Check if user has ASSIGNED scope
   * @returns {boolean}
   */
  const hasAssignedScope = useMemo(() => {
    return dataScope === 'ASSIGNED' && user?.role !== 'Admin' && user?.role !== 'admin';
  }, [dataScope, user]);

  return {
    dataScope,
    userId,
    canAccessRecord,
    filterByScope,
    hasAllScope,
    hasAssignedScope,
  };
}

export default useDataScope;
