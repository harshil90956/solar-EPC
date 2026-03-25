import { useState, useCallback } from 'react';

/**
 * Custom hook for managing dashboard filters independently
 * These filters ONLY affect dashboard analytics data
 */
export function useDashboardFilters() {
  const [dateRangeFilter, setDateRangeFilter] = useState({
    type: 'thisWeek', // Default to this week (7 days)
    startDate: null, // Will be populated by quick filter
    endDate: null    // Will be populated by quick filter
  });

  console.log('[DASHBOARD HOOK] Initial state:', dateRangeFilter);

  const updateDateRangeFilter = useCallback((newFilter) => {
    console.log('[DASHBOARD HOOK] Updating filter:', newFilter);
    setDateRangeFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  const resetDateRangeFilter = useCallback(() => {
    console.log('[DASHBOARD HOOK] Resetting filter to default');
    setDateRangeFilter({
      type: 'thisWeek',
      startDate: null,
      endDate: null
    });
  }, []);

  return {
    dateRangeFilter,
    setDateRangeFilter: updateDateRangeFilter,
    resetDateRangeFilter
  };
}

/**
 * Custom hook for managing leads table filters independently
 * These filters ONLY affect the leads table data
 */
export function useLeadFilters() {
  const [dateRangeFilter, setDateRangeFilter] = useState({
    type: 'last7days', // Default to last 7 days
    startDate: null,
    endDate: null
  });

  console.log('[LEADS HOOK] Initial state:', dateRangeFilter);

  const updateDateRangeFilter = useCallback((newFilter) => {
    console.log('[LEADS HOOK] Updating filter:', newFilter);
    setDateRangeFilter(newFilter);
  }, []);

  const resetDateRangeFilter = useCallback(() => {
    console.log('[LEADS HOOK] Resetting filter to default');
    setDateRangeFilter({
      type: 'last7days', // Reset to last 7 days
      startDate: null,
      endDate: null
    });
  }, []);

  return {
    dateRangeFilter,
    setDateRangeFilter: updateDateRangeFilter,
    resetDateRangeFilter
  };
}
