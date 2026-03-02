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

// Role-based dashboard component selector
const getRoleDashboard = (userRole) => {
  switch (userRole) {
    case ROLES.SALES:
      return SalesDashboard;
    case ROLES.SURVEY_ENGINEER:
      return SurveyEngineerDashboard;
    case ROLES.DESIGN_ENGINEER:
      return DesignEngineerDashboard;
    case ROLES.PROJECT_MANAGER:
      return ProjectManagerDashboard;
    case ROLES.STORE_MANAGER:
      return StoreManagerDashboard;
    case ROLES.PROCUREMENT_OFFICER:
      return ProcurementOfficerDashboard;
    case ROLES.FINANCE:
      return FinanceDashboard;
    case ROLES.TECHNICIAN:
      return TechnicianDashboard;
    case ROLES.SERVICE_MANAGER:
      return ServiceManagerDashboard;
    case ROLES.ADMIN:
      // Admin gets a special dashboard with role switching capability
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
