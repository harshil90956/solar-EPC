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

  const buildBaseModulePermissions = useCallback((role) => {
    const rp = getRolePermissions(role);
    const modules = Array.isArray(rp?.modules) ? rp.modules : [];
    const perms = {};
    modules.forEach((m) => {
      perms[m] = {
        view: true,
        create: !!rp?.canCreate,
        edit: !!rp?.canEdit,
        delete: !!rp?.canDelete,
        export: !!rp?.canExport,
        approve: !!rp?.canApprove,
        assign: false,
      };
    });
    return perms;
  }, []);

  const normalizeHrmPermissions = useCallback((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out = {};
    Object.entries(raw).forEach(([module, config]) => {
      if (!module) return;
      const actionsRaw = config?.actions;
      const actions = Array.isArray(actionsRaw)
        ? actionsRaw
        : (actionsRaw && typeof actionsRaw === 'object')
          ? Object.entries(actionsRaw).filter(([, v]) => v === true).map(([k]) => k)
          : [];
      const actionMap = {};
      actions.forEach((a) => { actionMap[a] = true; });
      const dataScope = config?.dataScope;
      out[module] = {
        ...actionMap,
        ...(dataScope ? { dataScope } : {}),
      };
    });
    return out;
  }, []);

  const mergeStringPermissionsIntoMap = useCallback((permsMap, rawList) => {
    const out = { ...(permsMap || {}) };
    const list = Array.isArray(rawList) ? rawList : [];
    list.forEach((p) => {
      if (typeof p !== 'string') return;
      const norm = p.includes(':') ? p.replace(':', '.') : p;
      const [module, action] = norm.split('.');
      if (!module || !action) return;
      out[module] = { ...(out[module] || {}), [action]: true };
    });
    return out;
  }, []);

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
      
      const { success, data } = res || {};
      
      if (isEmployee) {
        // Employee login response structure
        const { token, id, employeeId, firstName, lastName, roleId, dataScope } = data || {};
        if (!token) {
          throw new Error('Invalid response from server');
        }
        // Decode JWT to extract tenantId
        let tenantId = null;
        let extractedRoleId = null;
        let jwtPermissions = [];
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          tenantId = payload.tenantId || null;
          // Extract roleId from JWT if available
          if (payload.roleId) {
            extractedRoleId = payload.roleId;
          }
          if (Array.isArray(payload.permissions)) {
            jwtPermissions = payload.permissions;
          }
        } catch (e) {}

        let hrmPermsByModule = {};
        let hrmModulePermissions = {};
        if (extractedRoleId) {
          try {
            const rawPerms = await fetchHrmPermissions(extractedRoleId);
            hrmPermsByModule = normalizeHrmPermissions(rawPerms);
            Object.entries(rawPerms || {}).forEach(([module, config]) => {
              const actionsRaw = config?.actions;
              const actions = Array.isArray(actionsRaw)
                ? actionsRaw
                : (actionsRaw && typeof actionsRaw === 'object')
                  ? Object.entries(actionsRaw).filter(([, v]) => v === true).map(([k]) => k)
                  : [];
              hrmModulePermissions[module] = {
                actions,
                dataScope: config?.dataScope,
              };
            });
          } catch (e) {}
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
          permissions: mergeStringPermissionsIntoMap(hrmPermsByModule, jwtPermissions),
          modulePermissions: hrmModulePermissions,
          token 
        };
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(authedUser));
        if (tenantId) {
          localStorage.setItem('tenantId', tenantId);
        }
        setUser(authedUser);

        // ─── FINAL LOG: ONLY ESSENTIAL INFO ───
        console.log('🚀 [AUTH_SUCCESS]', {
          role: authedUser.role,
          department: authedUser.department || 'N/A',
          tenantId: authedUser.tenantId,
          permissions: authedUser.permissions,
          sidebarModules: (window.NAV_CONFIG || []).map(s => s.items.map(i => i.id)).flat()
        });

        setError('');
        return true;
      }
      
      // Regular user login
      const { accessToken, user: userData } = data || {};
      if (!accessToken) {
        throw new Error('Invalid response from server');
      }
      const basePermsByModule = buildBaseModulePermissions(userData.role);
      // Normalize role
      const normalizedRole = userData.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1).toLowerCase() : userData.role;
      // Decode JWT
      let dataScope = userData.dataScope;
      let extractedTenantId = userData.tenantId;
      let jwtPermissions = [];
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        dataScope = payload.dataScope || userData.dataScope || null;
        extractedTenantId = payload.tenantId || userData.tenantId || null;
        if (Array.isArray(payload.permissions)) {
          jwtPermissions = payload.permissions;
        }
      } catch (e) { /* ignore */ }

      let hrmPermsByModule = {};
      let hrmModulePermissions = {};
      if (userData.roleId || normalizedRole === 'Employee') {
        try {
          const rawPerms = await fetchHrmPermissions(userData.roleId);
          hrmPermsByModule = normalizeHrmPermissions(rawPerms);
          Object.entries(rawPerms || {}).forEach(([module, config]) => {
            const actionsRaw = config?.actions;
            const actions = Array.isArray(actionsRaw)
              ? actionsRaw
              : (actionsRaw && typeof actionsRaw === 'object')
                ? Object.entries(actionsRaw).filter(([, v]) => v === true).map(([k]) => k)
                : [];
            hrmModulePermissions[module] = {
              actions,
              dataScope: config?.dataScope,
            };
          });
        } catch (e) {}
      }

      const authedUser = { 
        ...userData, 
        role: normalizedRole, 
        dataScope, 
        tenantId: extractedTenantId, 
        permissions: mergeStringPermissionsIntoMap({ ...basePermsByModule, ...hrmPermsByModule }, jwtPermissions),
        modulePermissions: hrmModulePermissions,
        token: accessToken,
        roleId: userData.roleId || null,
      };
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(authedUser));
      if (extractedTenantId) {
        localStorage.setItem('tenantId', extractedTenantId);
      }
      setUser(authedUser);

      // ─── FINAL LOG: ONLY ESSENTIAL INFO ───
      console.log('🚀 [AUTH_SUCCESS]', {
        role: authedUser.role,
        department: authedUser.department || 'N/A',
        tenantId: authedUser.tenantId,
        permissions: authedUser.permissions,
        sidebarModules: (window.NAV_CONFIG || []).map(s => s.items.map(i => i.id)).flat()
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

  // Fetch HRM permissions for the user
  const fetchHrmPermissions = useCallback(async (roleId) => {
    if (!roleId) return null;
    try {
      // Use module-permissions endpoint which returns object format
      const response = await api.get(`/hrm/permissions/roles/${roleId}/module-permissions`);
      // Backend returns: { permissions: { employees: { actions, dataScope }, leaves: { actions, dataScope } } }
      const data = response.data?.permissions;
      if (data && typeof data === 'object') {
        const permsObj = {};
        Object.entries(data).forEach(([module, config]) => {
          if (!module || !config) return;
          const actionsRaw = config.actions;
          const actions = Array.isArray(actionsRaw)
            ? actionsRaw
            : (actionsRaw && typeof actionsRaw === 'object')
              ? Object.entries(actionsRaw).filter(([, v]) => v === true).map(([k]) => k)
              : [];
          permsObj[module] = {
            actions,
            dataScope: config.dataScope,
          };
        });
        return permsObj;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch HRM permissions:', error);
      return null;
    }
  }, []);

  const can = useCallback((action) => {
    if (!user?.permissions) return false;
    if (typeof action === 'string' && action.includes('.')) {
      const [module, act] = action.split('.');
      return user.permissions?.[module]?.[act] === true;
    }
    return false;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, setUser, tenantId, login, logout, error, can, loading, fetchHrmPermissions }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
