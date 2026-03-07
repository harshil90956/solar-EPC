import React, { createContext, useContext, useState, useCallback } from 'react';
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

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError('');
    try {
      console.log('Attempting login...', { email });
      const res = await api.post('/hrm/employees/login', { email, password });
      console.log('Login API response:', res);
      const { data } = res || {};
      if (!data || !data.token) {
        console.error('Invalid response structure:', res);
        throw new Error('Invalid response from server');
      }

      const rawRole = data.roleId || data.role;
      const permissions = getRolePermissions(rawRole);
      // Normalize role: capitalize first letter (admin -> Admin)
      const normalizedRole = rawRole
        ? rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase()
        : rawRole;

      const normalizedId = data.id || data._id || data.userId;
      const authedUser = { ...data, id: normalizedId, role: normalizedRole, permissions };
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(authedUser));
      setUser(authedUser);
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
    window.location.hash = '';
  }, []);

  const can = useCallback((action) => user?.permissions?.[action] ?? false, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, error, can, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
