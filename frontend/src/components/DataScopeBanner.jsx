import React from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * DataScopeBanner - Shows a notification banner when user has ASSIGNED data scope
 * This informs users they can only see their assigned data
 */
export function DataScopeBanner() {
  const { user } = useAuth();
  
  // Only show for users with ASSIGNED scope (not ALL or Admin)
  const isAssignedScope = user?.dataScope === 'ASSIGNED' && 
    user?.role !== 'Admin' && 
    user?.role !== 'admin';
  
  if (!isAssignedScope) return null;
  
  return (
    <div 
      style={{
        background: '#fff7ed',
        border: '1px solid #fdba74',
        borderRadius: '6px',
        padding: '12px 16px',
        margin: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '14px',
        color: '#9a3412',
      }}
    >
      <svg 
        width="20" 
        height="20" 
        viewBox="0 0 20 20" 
        fill="none" 
        style={{ flexShrink: 0 }}
      >
        <path 
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9V5h2v4H9zm0 4v-2h2v2H9z" 
          fill="#f97316"
        />
      </svg>
      <span>
        <strong>Limited View:</strong> You only have permission to view data assigned to you. 
        Contact your administrator for access to all records.
      </span>
    </div>
  );
}

export default DataScopeBanner;
