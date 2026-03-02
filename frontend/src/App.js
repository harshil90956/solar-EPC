import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { ReminderProvider } from './context/ReminderContext';
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
import ServicePage from './pages/ServicePage';
import CompliancePage from './pages/CompliancePage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import IntelligenceDashboardPage from './pages/IntelligenceDashboardPage';
import RemindersPage from './pages/RemindersPage';
import NotificationSystem from './components/NotificationSystem';
import { canAccess } from './config/roles.config';

// ── Page Map ──────────────────────────────────────────────────────────────────
const PAGE_MAP = {
  dashboard: { component: Dashboard, title: 'Dashboard' },
  admin: { component: AdminPage, title: 'Admin Dashboard' },
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
  service: { component: ServicePage, title: 'Service & AMC' },
  compliance: { component: CompliancePage, title: 'Compliance' },
  settings: { component: SettingsPage, title: 'Settings' },
  intelligence: { component: IntelligenceDashboardPage, title: 'AI Intelligence' },
};

const APP_NAME = 'Solar OS';

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
  const entry = PAGE_MAP[currentPage];
  if (!entry) {
    return (
      <Layout currentPage={currentPage} onNavigate={navigate}>
        <NotFoundPage onNavigate={navigate} type="404" />
      </Layout>
    );
  }

  if (currentPage !== 'dashboard' && !canAccess(user.role, currentPage)) {
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
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <ReminderProvider>
            <AppInner />
          </ReminderProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
