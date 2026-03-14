/**
 * HRM Permissions Management Page
 * Admin interface for managing HRM role permissions
 */
import React from 'react';
import PermissionMatrix from '../components/PermissionMatrix';

const HrmPermissionsPage = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PermissionMatrix />
    </div>
  );
};

export default HrmPermissionsPage;
