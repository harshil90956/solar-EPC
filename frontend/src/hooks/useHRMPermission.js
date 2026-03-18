import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Hook to check HRM feature permissions for the current user.
 * @param {string} featureName - The name of the HRM feature (e.g., 'employee_management').
 * @returns {boolean} - Whether the user has permission to access the feature.
 */
export const useHRMPermission = (featureName) => {
  const { can } = useAuth();

  const { hasPermission, loading } = useMemo(() => {
    const raw = String(featureName || '').trim();
    if (!raw) return { hasPermission: false, loading: false };

    const parts = raw.split('.');
    const moduleId = parts[0];
    const actionId = parts[1] || 'view';
    return { hasPermission: can(moduleId, actionId), loading: false };
  }, [can, featureName]);

  return { hasPermission, loading };
};

export default useHRMPermission;
