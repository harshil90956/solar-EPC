import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import Tenants from '@/pages/Tenants';
import Subscriptions from '@/pages/Subscriptions';
import UserLimits from '@/pages/UserLimits';
import Pricing from '@/pages/Pricing';
import BackupRestore from '@/pages/BackupRestore';
import SystemSettings from '@/pages/SystemSettings';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tenants" element={<Tenants />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="user-limits" element={<UserLimits />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="backup-restore" element={<BackupRestore />} />
            <Route path="system-settings" element={<SystemSettings />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
