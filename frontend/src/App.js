import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { ReminderProvider } from './context/ReminderContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import CRMPage from './pages/CRMPage';
import SurveyPage from './pages/SurveyPage';
import DesignPage from './pages/DesignPage';
import QuotationPage from './pages/QuotationPage';
import ProjectPage from './pages/ProjectPage';
import InventoryPage from './pages/InventoryPage';
import ProcurementPage from './pages/ProcurementPage';
import LogisticsPage from './pages/LogisticsPage';
import InstallationPage from './pages/InstallationPage';
import CommissioningPage from './pages/CommissioningPage';
import FinancePage from './pages/FinancePage';
import FinanceDashboardPage from './pages/FinanceDashboardPage';
import ServicePage from './pages/ServicePage';
import ServiceDashboardPage from './pages/ServiceDashboardPage';
import CompliancePage from './pages/CompliancePage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import HRMPage from './pages/HRMPage';
import IntelligenceDashboardPage from './pages/IntelligenceDashboardPage';
import RemindersPage from './pages/RemindersPage';
import ItemsPage from './pages/ItemsPage';
import NotificationSystem from './components/NotificationSystem';

// ── Page Map ──────────────────────────────────────────────────────────────────
const PAGE_MAP = {
  dashboard: { component: Dashboard, title: 'Dashboard' },
  admin: { component: AdminPage, title: 'Admin Dashboard' },
  hrm: { component: HRMPage, title: 'Human Resource Management' },
  reminders: { component: RemindersPage, title: 'Reminder Center' },
  crm: { component: CRMPage, title: 'CRM & Sales' },
  survey: { component: SurveyPage, title: 'Survey Management' },
  design: { component: DesignPage, title: 'Design & BOQ' },
  quotation: { component: QuotationPage, title: 'Quotation' },
  project: { component: ProjectPage, title: 'Projects' },
  inventory: { component: InventoryPage, title: 'Inventory' },
  procurement: { component: ProcurementPage, title: 'Procurement' },
  logistics: { component: LogisticsPage, title: 'Logistics' },
  installation: { component: InstallationPage, title: 'Installation' },
  commissioning: { component: CommissioningPage, title: 'Commissioning' },
  finance: { component: FinancePage, title: 'Finance' },
  'finance-dashboard': { component: FinanceDashboardPage, title: 'Finance Dashboard' },
  service: { component: ServicePage, title: 'Service & AMC' },
  'service-dashboard': { component: ServiceDashboardPage, title: 'Service & AMC Dashboard' },
  compliance: { component: CompliancePage, title: 'Compliance' },
  settings: { component: SettingsPage, title: 'Settings' },
  intelligence: { component: IntelligenceDashboardPage, title: 'AI Intelligence' },
  items: { component: ItemsPage, title: 'Items' },
};

const APP_NAME = 'Solar OS';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ── 404 / Unauthorized Fallback ───────────────────────────────────────────────
const NotFoundPage = ({ onNavigate, type = '404' }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 animate-fade-in">
    <div className="w-20 h-20 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-base)] flex items-center justify-center text-4xl">
      {type === 'unauthorized' ? '🔒' : '🛸'}
    </div>
    <div className="text-center">
      <h2 className="text-2xl font-black text-[var(--text-primary)]">
        {type === 'unauthorized' ? 'Access Denied' : 'Page Not Found'}
      </h2>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        {type === 'unauthorized'
          ? "You don't have permission to view this page."
          : "This route doesn't exist in Solar OS."}
      </p>
    </div>
    <button
      onClick={() => onNavigate('dashboard')}
      className="px-5 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-bold hover:opacity-90 transition-opacity"
    >
      ← Go to Dashboard
    </button>
  </div>
);

// ── Read initial page from URL hash ──────────────────────────────────────────
const getInitialPage = () => {
  const hash = window.location.hash.replace('#', '').replace('/', '').trim();
  return (hash && PAGE_MAP[hash]) ? hash : 'dashboard';
};

// ── Main App Inner ────────────────────────────────────────────────────────────
const AppInner = () => {
  const { user } = useAuth();
  const { resolvePermission, isModuleEnabled } = useSettings();
  const [currentPage, setCurrentPage] = useState(getInitialPage);

  // ── Sync URL hash on page change ──
  const navigate = useCallback((page) => {
    if (!PAGE_MAP[page]) return; // guard unknown routes
    setCurrentPage(page);
    window.location.hash = `#${page}`;
  }, []);

  // ── Listen for browser back/forward ──
  useEffect(() => {
    const handleHashChange = () => {
      const page = window.location.hash.replace('#', '').replace('/', '').trim();
      if (PAGE_MAP[page]) setCurrentPage(page);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // ── Update document title on navigation ──
  useEffect(() => {
    const entry = PAGE_MAP[currentPage];
    document.title = entry ? `${entry.title} — ${APP_NAME}` : APP_NAME;
  }, [currentPage]);

  // ── Auth guard: redirect to login if no user ──
  if (!user) return <LoginPage />;

  // ── Role guard: redirect to dashboard if no access ──
  // Uses resolvePermission for custom role support (User Override → Custom Role → Base RBAC)
  const hasAccess = (page) => {
    if (page === 'dashboard') return true;
    if (!isModuleEnabled(page)) return false;
    // Check view permission using resolvePermission
    return resolvePermission(user?.id, user?.role, page, 'view');
  };

  const entry = PAGE_MAP[currentPage];
  if (!entry) {
    return (
      <Layout currentPage={currentPage} onNavigate={navigate}>
        <NotFoundPage onNavigate={navigate} type="404" />
      </Layout>
    );
  }

  if (!hasAccess(currentPage)) {
    return (
      <Layout currentPage="dashboard" onNavigate={navigate}>
        <NotFoundPage onNavigate={navigate} type="unauthorized" />
      </Layout>
    );
  }

  const PageComponent = entry.component;

  return (
    <Layout currentPage={currentPage} onNavigate={navigate}>
      <PageComponent onNavigate={navigate} />
      <NotificationSystem />
    </Layout>
  );
};

// ── Root ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <ReminderProvider>
              <AppInner />
            </ReminderProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
