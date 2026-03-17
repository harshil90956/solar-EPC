import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../lib/apiClient';
import { getRolePermissions } from '../config/roles.config';

const AuthContext = createContext(null);

const TOKEN_KEY = 'solar_token';
const USER_KEY = 'solar_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Extract tenantId from user object
  const tenantId = user?.tenantId || localStorage.getItem('tenantId');

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError('');
    try {
      console.log('Attempting login...', { email });
      let res;
      let isEmployee = false;
      
      // Try main auth first
      try {
        res = await api.post('/auth/login', { email, password });
      } catch (authErr) {
        // If main auth fails, try employee login
        console.log('Main auth failed, trying employee login...');
        const empRes = await api.post('/hrm/employees/login', { email, password });
        res = empRes;
        isEmployee = true;
      }
      
      console.log('Login API response:', res);
      const { success, data } = res || {};
      
      if (isEmployee) {
        // Employee login response structure
        const { token, id, employeeId, firstName, lastName, roleId, dataScope } = data || {};
        if (!token) {
          console.error('Invalid employee response:', res);
          throw new Error('Invalid response from server');
        }
        // Decode JWT to extract tenantId
        let tenantId = null;
        let extractedRoleId = null;
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          tenantId = payload.tenantId || null;
          // Extract roleId from JWT if available
          if (payload.roleId) {
            extractedRoleId = payload.roleId;
          }
          console.log('[AUTH] Employee JWT payload:', payload);
        } catch (e) {
          console.warn('[AUTH] Failed to decode JWT payload:', e);
        }
        // For employees, fetch HRM permissions
        let hrmPermissions = [];
        if (isEmployee && extractedRoleId) {
          try {
            hrmPermissions = await fetchHrmPermissions(extractedRoleId);
            console.log('[AUTH] Fetched HRM permissions for employee:', hrmPermissions);
          } catch (e) {
            console.warn('[AUTH] Failed to fetch HRM permissions:', e);
          }
        }

        const authedUser = { 
          id, 
          employeeId, 
          firstName, 
          lastName, 
          email,
          role: 'Employee',
          roleId,
          dataScope,
          tenantId,
          isEmployee: true,
          permissions: hrmPermissions, // Use HRM permissions array
          token 
        };
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(authedUser));
        if (tenantId) {
          localStorage.setItem('tenantId', tenantId);
        }
        setUser(authedUser);
        setError('');
        return true;
      }
      
      // Regular user login
      const { accessToken, user: userData } = data || {};
      if (!accessToken) {
        console.error('Invalid response structure:', res);
        throw new Error('Invalid response from server');
      }
      const permissions = getRolePermissions(userData.role);
      // Normalize role: capitalize first letter (admin -> Admin)
      const normalizedRole = userData.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1).toLowerCase() : userData.role;
      // Decode JWT to extract dataScope and tenantId
      let dataScope = userData.dataScope;
      let extractedTenantId = userData.tenantId;
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        dataScope = payload.dataScope || userData.dataScope || null;
        extractedTenantId = payload.tenantId || userData.tenantId || null;
      } catch (e) { /* ignore */ }
      // Fetch HRM permissions for regular users too
      let hrmPermissions = [];
      if (userData.roleId || normalizedRole === 'Employee') {
        try {
          hrmPermissions = await fetchHrmPermissions(userData.roleId);
          console.log('[AUTH] Fetched HRM permissions for user:', hrmPermissions);
        } catch (e) {
          console.warn('[AUTH] Failed to fetch HRM permissions for user:', e);
        }
      }

      const authedUser = { 
        ...userData, 
        role: normalizedRole, 
        dataScope, 
        tenantId: extractedTenantId, 
        permissions: hrmPermissions.length > 0 ? hrmPermissions : permissions, 
        token: accessToken,
        roleId: userData.roleId || null, // Include custom role ID if present
      };
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(authedUser));
      if (extractedTenantId) {
        localStorage.setItem('tenantId', extractedTenantId);
      }
      setUser(authedUser);
      console.log('[AUTH] User saved with tenantId:', extractedTenantId, 'dataScope:', dataScope, 'roleId:', userData.roleId);
      setError('');
      return true;
    } catch (err) {
      console.error('Login error:', err);
      const msg = err?.message || err?.response?.data?.message || 'Login failed';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('tenantId');
    window.location.hash = '';
  }, []);

  // Fetch HRM permissions for the user
  const fetchHrmPermissions = useCallback(async (roleId) => {
    if (!roleId) return [];
    try {
      const response = await api.get(`/hrm/permissions/roles/${roleId}/permissions`);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch HRM permissions:', error);
      return [];
    }
  }, []);

  const can = useCallback((action) => {
    if (!user?.permissions) return false;
    // Handle array permissions (HRM style)
    if (Array.isArray(user.permissions)) {
      return user.permissions.includes(action);
    }
    // Handle object permissions (legacy style)
    return user.permissions[action] ?? false;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, setUser, tenantId, login, logout, error, can, loading, fetchHrmPermissions }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
