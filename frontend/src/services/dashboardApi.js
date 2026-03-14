// Dashboard API Service - Fetches live data from all modules
import { api } from '../lib/apiClient';

const DashboardService = {
  // Overview Stats
  getOverviewStats: async () => {
    try {
      const [projects, inventory, leads, finance, hrm, surveys] = await Promise.allSettled([
        api.get('/projects/stats'),
        api.get('/inventory/stats'),
        api.get('/leads/stats'),
        api.get('/finance/stats'),
        api.get('/hrm/stats'),
        api.get('/surveys/stats'),
      ]);

      return {
        projects: projects.status === 'fulfilled' ? projects.value : null,
        inventory: inventory.status === 'fulfilled' ? inventory.value : null,
        leads: leads.status === 'fulfilled' ? leads.value : null,
        finance: finance.status === 'fulfilled' ? finance.value : null,
        hrm: hrm.status === 'fulfilled' ? hrm.value : null,
        surveys: surveys.status === 'fulfilled' ? surveys.value : null,
      };
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      return null;
    }
  },

  // Project Stats
  getProjectStats: async () => {
    try {
      const [stats, byStage] = await Promise.all([
        api.get('/projects/stats'),
        api.get('/projects/by-stage'),
      ]);
      return { stats, byStage };
    } catch (error) {
      console.error('Error fetching project stats:', error);
      return null;
    }
  },

  // Inventory Stats
  getInventoryStats: async () => {
    try {
      const [stats, byCategory] = await Promise.all([
        api.get('/inventory/stats'),
        api.get('/inventory/by-category'),
      ]);
      return { stats, byCategory };
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
      return null;
    }
  },

  // CRM/Leads Stats
  getCRMStats: async () => {
    try {
      const response = await api.get('/leads/stats');
      return response;
    } catch (error) {
      console.error('Error fetching CRM stats:', error);
      return null;
    }
  },

  // Finance Stats
  getFinanceStats: async () => {
    try {
      const response = await api.get('/finance/stats');
      return response;
    } catch (error) {
      console.error('Error fetching finance stats:', error);
      return null;
    }
  },

  // HRM Stats
  getHRMStats: async () => {
    try {
      const response = await api.get('/hrm/stats');
      return response;
    } catch (error) {
      console.error('Error fetching HRM stats:', error);
      return null;
    }
  },

  // Survey Stats
  getSurveyStats: async () => {
    try {
      const response = await api.get('/surveys/stats');
      return response;
    } catch (error) {
      console.error('Error fetching survey stats:', error);
      return null;
    }
  },

  // Installation Stats
  getInstallationStats: async () => {
    try {
      const response = await api.get('/installation/stats');
      return response;
    } catch (error) {
      console.error('Error fetching installation stats:', error);
      return null;
    }
  },

  // Commissioning Stats
  getCommissioningStats: async () => {
    try {
      const response = await api.get('/commissioning/stats');
      return response;
    } catch (error) {
      console.error('Error fetching commissioning stats:', error);
      return null;
    }
  },

  // Service AMC Stats
  getServiceStats: async () => {
    try {
      const response = await api.get('/service-amc/stats');
      return response;
    } catch (error) {
      console.error('Error fetching service stats:', error);
      return null;
    }
  },

  // Compliance Stats
  getComplianceStats: async () => {
    try {
      const response = await api.get('/compliance/stats');
      return response;
    } catch (error) {
      console.error('Error fetching compliance stats:', error);
      return null;
    }
  },

  // Procurement Stats
  getProcurementStats: async () => {
    try {
      const response = await api.get('/procurement/stats');
      return response;
    } catch (error) {
      console.error('Error fetching procurement stats:', error);
      return null;
    }
  },

  // Logistics Stats
  getLogisticsStats: async () => {
    try {
      const response = await api.get('/logistics/stats');
      return response;
    } catch (error) {
      console.error('Error fetching logistics stats:', error);
      return null;
    }
  },

  // Recent Activity
  getRecentActivity: async () => {
    try {
      const [projects, quotations, installations, tickets] = await Promise.allSettled([
        api.get('/projects?limit=5'),
        api.get('/quotations?limit=5'),
        api.get('/installation?limit=5'),
        api.get('/service-amc/tickets?limit=5'),
      ]);

      return {
        recentProjects: projects.status === 'fulfilled' ? projects.value : [],
        recentQuotations: quotations.status === 'fulfilled' ? quotations.value : [],
        recentInstallations: installations.status === 'fulfilled' ? installations.value : [],
        recentTickets: tickets.status === 'fulfilled' ? tickets.value : [],
      };
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return null;
    }
  },

  // Dashboard Widget Data (aggregated from ALL modules)
  getWidgetData: async () => {
    try {
      const results = await Promise.allSettled([
        api.get('/projects/stats'),
        api.get('/inventory/stats'),
        api.get('/leads/stats'),
        api.get('/finance/stats'),
        api.get('/surveys/stats'),
        api.get('/commissioning/stats'),
        api.get('/service-amc/stats'),
        api.get('/hrm/employees/stats'),
        api.get('/installation/stats'),
        api.get('/quotation/stats'),
        api.get('/estimates/stats'),
        api.get('/procurement/stats'),
        api.get('/logistics/stats'),
        api.get('/compliance/stats'),
        api.get('/document/stats'),
      ]);

      const [
        projects,
        inventory,
        leads,
        finance,
        surveys,
        commissioning,
        service,
        employees,
        installation,
        quotation,
        estimates,
        procurement,
        logistics,
        compliance,
        documents,
      ] = results;

      return {
        projects: projects.status === 'fulfilled' ? projects.value?.data || projects.value : { total: 0, active: 0, completed: 0 },
        inventory: inventory.status === 'fulfilled' ? inventory.value?.data || inventory.value : { totalItems: 0, lowStockItems: 0 },
        leads: leads.status === 'fulfilled' ? leads.value?.data || leads.value : { total: 0, hot: 0, new: 0, converted: 0 },
        finance: finance.status === 'fulfilled' ? finance.value?.data || finance.value : { totalRevenue: 0, outstanding: 0, totalInvoices: 0 },
        surveys: surveys.status === 'fulfilled' ? surveys.value?.data || surveys.value : { total: 0, pending: 0, completed: 0 },
        commissioning: commissioning.status === 'fulfilled' ? commissioning.value?.data || commissioning.value : { total: 0, completed: 0, pending: 0 },
        service: service.status === 'fulfilled' ? service.value?.data || service.value : { openTickets: 0, totalContracts: 0, amcContracts: 0 },
        employees: employees.status === 'fulfilled' ? employees.value?.data || employees.value : { total: 0, active: 0, onLeave: 0 },
        installation: installation.status === 'fulfilled' ? installation.value?.data || installation.value : { total: 0, inProgress: 0, completed: 0 },
        quotation: quotation.status === 'fulfilled' ? quotation.value?.data || quotation.value : { total: 0, pending: 0, approved: 0 },
        estimates: estimates.status === 'fulfilled' ? estimates.value?.data || estimates.value : { total: 0, approved: 0, pending: 0 },
        procurement: procurement.status === 'fulfilled' ? procurement.value?.data || procurement.value : { total: 0, pending: 0, completed: 0 },
        logistics: logistics.status === 'fulfilled' ? logistics.value?.data || logistics.value : { total: 0, inTransit: 0, delivered: 0 },
        compliance: compliance.status === 'fulfilled' ? compliance.value?.data || compliance.value : { total: 0, compliant: 0, pending: 0 },
        documents: documents.status === 'fulfilled' ? documents.value?.data || documents.value : { total: 0, pending: 0, approved: 0 },
      };
    } catch (error) {
      console.error('Error fetching widget data:', error);
      return {
        projects: { total: 0, active: 0, completed: 0 },
        inventory: { totalItems: 0, lowStockItems: 0 },
        leads: { total: 0, hot: 0, new: 0, converted: 0 },
        finance: { totalRevenue: 0, outstanding: 0, totalInvoices: 0 },
        surveys: { total: 0, pending: 0, completed: 0 },
        commissioning: { total: 0, completed: 0, pending: 0 },
        service: { openTickets: 0, totalContracts: 0, amcContracts: 0 },
        employees: { total: 0, active: 0, onLeave: 0 },
        installation: { total: 0, inProgress: 0, completed: 0 },
        quotation: { total: 0, pending: 0, approved: 0 },
        estimates: { total: 0, approved: 0, pending: 0 },
        procurement: { total: 0, pending: 0, completed: 0 },
        logistics: { total: 0, inTransit: 0, delivered: 0 },
        compliance: { total: 0, compliant: 0, pending: 0 },
        documents: { total: 0, pending: 0, approved: 0 },
      };
    }
  },
};

export default DashboardService;
