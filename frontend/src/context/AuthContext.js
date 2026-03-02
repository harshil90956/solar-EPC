import React, { createContext, useContext, useState, useCallback } from 'react';
import { USERS } from '../data/mockData';
import { getRolePermissions } from '../config/roles.config';

const AuthContext = createContext(null);

const SESSION_KEY = 'solar_session';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [error, setError] = useState('');

  const login = useCallback((email, password) => {
    const found = USERS.find(u => u.email === email && u.password === password);
    if (found) {
      const permissions = getRolePermissions(found.role);
      const authedUser = { ...found, permissions };
      setUser(authedUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(authedUser));
      setError('');
      return true;
    }
    setError('Invalid email or password');
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('solar_token');
    // Clear hash so login shows dashboard fresh
    window.location.hash = '';
  }, []);

  const can = useCallback((action) => user?.permissions?.[action] ?? false, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, error, can }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
