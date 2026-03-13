import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/apiClient';

/**
 * Hook to check HRM feature permissions for the current user.
 * @param {string} featureName - The name of the HRM feature (e.g., 'employee_management').
 * @returns {boolean} - Whether the user has permission to access the feature.
 */
export const useHRMPermission = (featureName) => {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkPermission = useCallback(async () => {
    if (!user || !user.role) {
      setHasPermission(false);
      setLoading(false);
      return;
    }

    // Admins always have full access
    if (user.role.toLowerCase() === 'admin' || user.role.toLowerCase() === 'superadmin') {
      setHasPermission(true);
      setLoading(false);
      return;
    }

    try {
      // We fetch permissions for the role. 
      // In a more optimized version, this could be cached in a context.
      const response = await api.get(`/hrm/permissions/role/${user.role}`);
      const perms = response.permissions || {};
      
      // Support nested path like 'attendance.view_self'
      const parts = featureName.split('.');
      let current = perms;
      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          current = false;
          break;
        }
      }
      
      setHasPermission(!!current);
    } catch (err) {
      console.error(`Error checking HRM permission for ${featureName}:`, err);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  }, [user, featureName]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return { hasPermission, loading };
};

export default useHRMPermission;
