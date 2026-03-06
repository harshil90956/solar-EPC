import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../config/roles.config';
import { RoleDashboardProvider } from '../components/dashboards/RoleDashboardProvider';
import {
  SalesDashboard,
  SurveyEngineerDashboard,
  DesignEngineerDashboard,
  ProjectManagerDashboard,
  StoreManagerDashboard,
  ProcurementOfficerDashboard,
  FinanceDashboard,
  TechnicianDashboard,
  ServiceManagerDashboard
} from '../components/dashboards';
import AdminDashboard from '../components/dashboards/AdminDashboard';

// Role-based dashboard component selector (case-insensitive)
const getRoleDashboard = (userRole) => {
  const role = userRole?.toLowerCase();
  switch (role) {
    case ROLES.SALES.toLowerCase():
      return SalesDashboard;
    case ROLES.SURVEY_ENGINEER.toLowerCase():
      return SurveyEngineerDashboard;
    case ROLES.DESIGN_ENGINEER.toLowerCase():
      return DesignEngineerDashboard;
    case ROLES.PROJECT_MANAGER.toLowerCase():
      return ProjectManagerDashboard;
    case ROLES.STORE_MANAGER.toLowerCase():
      return StoreManagerDashboard;
    case ROLES.PROCUREMENT_OFFICER.toLowerCase():
      return ProcurementOfficerDashboard;
    case ROLES.FINANCE.toLowerCase():
      return FinanceDashboard;
    case ROLES.TECHNICIAN.toLowerCase():
      return TechnicianDashboard;
    case ROLES.SERVICE_MANAGER.toLowerCase():
      return ServiceManagerDashboard;
    case ROLES.ADMIN.toLowerCase():
      return AdminDashboard;
    default:
      return SalesDashboard;
  }
};

const Dashboard = ({ onNavigate }) => {
  const { user } = useAuth();

  // Get the appropriate dashboard component for the user's role
  const RoleDashboardComponent = getRoleDashboard(user?.role);

  return (
    <RoleDashboardProvider>
      <RoleDashboardComponent onNavigate={onNavigate} />
    </RoleDashboardProvider>
  );
};

export default Dashboard;
