import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../lib/apiClient';

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
      let res;
      let isEmployee = false;
      
      // Try main auth first
      try {
        res = await api.post('/auth/login', { email, password });
      } catch (authErr) {
        // If main auth fails, try employee login
        const empRes = await api.post('/hrm/employees/login', { email, password });
        res = empRes;
        isEmployee = true;
      }
      
      const { data } = res || {};
      
      if (isEmployee) {
        // Employee login response structure
        const { token, user: employeeData } = data || {};
        if (!token) {
          throw new Error('Invalid response from server');
        }
        
        // Decode JWT to extract tenantId if not in user data
        let tenantId = employeeData?.tenantId || null;
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          tenantId = payload.tenantId || tenantId;
        } catch (e) {}

        // Store user EXACTLY as received from backend (object format)
        const authedUser = { 
          ...employeeData,
          isEmployee: true,
          token 
        };
        
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(authedUser));
        if (tenantId) {
          localStorage.setItem('tenantId', tenantId);
        }
        setUser(authedUser);

        console.log(' [AUTH_SUCCESS - Employee]', {
          role: authedUser.role,
          permissions: authedUser.permissions,
          dataScope: authedUser.dataScope
        });

        setError('');
        return true;
      }
      
      // Regular user login
      const { accessToken, user: userData } = data || {};
      if (!accessToken) {
        throw new Error('Invalid response from server');
      }
      
      // Store user EXACTLY as received from backend (object format)
      const authedUser = { 
        ...userData,
        token: accessToken 
      };
      
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(authedUser));
      if (userData.tenantId) {
        localStorage.setItem('tenantId', userData.tenantId);
      }
      setUser(authedUser);

      console.log(' [AUTH_SUCCESS - User]', {
        role: authedUser.role,
        roleId: authedUser.roleId,
        isSuperAdmin: authedUser.isSuperAdmin,
        permissions: authedUser.permissions,
        dataScope: authedUser.dataScope
      });
      
      // DEBUG: Log specific HRM permissions
      console.log('[AUTH DEBUG] HRM Permissions received:', {
        employees: authedUser.permissions?.employees,
        departments: authedUser.permissions?.departments,
        leaves: authedUser.permissions?.leaves,
        attendance: authedUser.permissions?.attendance,
        payroll: authedUser.permissions?.payroll
      });

      setError('');
      return true;
    } catch (err) {
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

  // Simple permission check - reads directly from user.permissions object
  const can = useCallback((module, action) => {
    if (!user?.permissions) return false;
    return user.permissions[module]?.[action] === true;
  }, [user]);

  // Get data scope for a module
  const getDataScope = useCallback((module) => {
    if (!user?.dataScope) return 'ALL';
    // dataScope can be a string (legacy) or object (new format)
    if (typeof user.dataScope === 'object') {
      return user.dataScope[module] || 'ALL';
    }
    return user.dataScope || 'ALL';
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, setUser, tenantId, login, logout, error, can, getDataScope, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
