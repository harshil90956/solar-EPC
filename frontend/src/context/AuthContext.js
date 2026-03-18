import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../lib/apiClient';

const AuthContext = createContext(null);

const TOKEN_KEY = 'solar_token';
const USER_KEY = 'solar_user';

const shouldDebugLog = () => {
  const v = String(process.env.REACT_APP_PERMISSION_DEBUG_LOGS || process.env.REACT_APP_AUTH_DEBUG_LOGS || '').toLowerCase();
  return v === 'true';
};

const summarizePermissions = (perms) => {
  let modules = 0;
  let actions = 0;
  let granted = 0;

  if (!perms || typeof perms !== 'object') return { modules, actions, granted };

  Object.values(perms).forEach((modulePerms) => {
    modules += 1;
    if (!modulePerms || typeof modulePerms !== 'object') return;
    Object.values(modulePerms).forEach((v) => {
      actions += 1;
      if (v === true) granted += 1;
    });
  });

  return { modules, actions, granted };
};

const sanitizeUserForStorage = (u) => {
  if (!u || typeof u !== 'object') return u;
  const {
    permissions,
    modulePermissions,
    dataScope,
    effectivePermissions,
    effectiveDataScope,
    ...rest
  } = u;
  return rest;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      return sanitizeUserForStorage(parsed);
    } catch { return null; }
  });
  const [permissions, setPermissions] = useState(null);
  const [dataScope, setDataScope] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Extract tenantId from user object
  const tenantId = user?.tenantId || localStorage.getItem('tenantId');

  const fetchUser = useCallback(async () => {
    if (shouldDebugLog()) {
      const tokenPresent = Boolean(localStorage.getItem(TOKEN_KEY));
      const tenantHeader = localStorage.getItem('tenantId');
      console.log(
        `[AUTH_DEBUG] fetchUser start endpoint=/auth/me tokenPresent=${tokenPresent ? 'true' : 'false'} tenantIdLocal=${String(tenantHeader || '')}`,
      );
    }

    const res = await api.get('/auth/me');
    const data = res?.data || res;

    if (shouldDebugLog()) {
      const permSummary = summarizePermissions(data?.permissions);
      const scopeModules = data?.dataScope && typeof data?.dataScope === 'object' ? Object.keys(data.dataScope).length : 0;
      console.log(
        `[AUTH_DEBUG] fetchUser done endpoint=/auth/me permSummary=${JSON.stringify(permSummary)} scopeModules=${scopeModules} hasUser=${data?.user ? 'true' : 'false'}`,
      );
    }

    if (data?.user) setUser((prev) => sanitizeUserForStorage({ ...(prev || {}), ...(data.user || {}) }));
    setPermissions(data?.permissions || {});
    setDataScope(data?.dataScope || {});
    return data;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    fetchUser().catch(() => {});
  }, [fetchUser]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      localStorage.setItem(USER_KEY, JSON.stringify(sanitizeUserForStorage(parsed)));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (!user) return;
      localStorage.setItem(USER_KEY, JSON.stringify(sanitizeUserForStorage(user)));
    } catch {}
  }, [user]);

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

        const authedUser = {
          id: employeeData?.id || employeeData?._id,
          email: employeeData?.email,
          role: employeeData?.role || 'Employee',
          roleId: employeeData?.roleId,
          tenantId,
          isEmployee: true,
          token,
        };

        const safeUser = sanitizeUserForStorage(authedUser);
        
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(safeUser));
        if (tenantId) {
          localStorage.setItem('tenantId', tenantId);
        }
        setUser(safeUser);

        await fetchUser();

        setError('');
        return true;
      }
      
      // Regular user login
      const { accessToken, user: userData } = data || {};
      if (!accessToken) {
        throw new Error('Invalid response from server');
      }
      
      const authedUser = {
        id: userData?.id || userData?._id,
        email: userData?.email,
        role: userData?.role,
        roleId: userData?.roleId || userData?.role,
        tenantId: userData?.tenantId,
        isSuperAdmin: userData?.isSuperAdmin,
        token: accessToken,
      };

      const safeUser = sanitizeUserForStorage(authedUser);
      
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(safeUser));
      if (userData.tenantId) {
        localStorage.setItem('tenantId', userData.tenantId);
      }
      setUser(safeUser);

      await fetchUser();

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
    setPermissions(null);
    setDataScope(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('tenantId');
    window.location.hash = '';
  }, []);

  // Simple permission check - reads directly from user.permissions object
  const can = useCallback((module, action) => {
    if (!permissions) return false;
    return permissions[module]?.[action] === true;
  }, [permissions]);

  // Get data scope for a module
  const getDataScope = useCallback((module) => {
    if (!dataScope) return 'ALL';
    if (typeof dataScope === 'object') {
      return dataScope[module] || 'ALL';
    }
    return 'ALL';
  }, [dataScope]);

  return (
    <AuthContext.Provider value={{ user, setUser, tenantId, login, logout, error, can, getDataScope, fetchUser, permissions, dataScope, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
