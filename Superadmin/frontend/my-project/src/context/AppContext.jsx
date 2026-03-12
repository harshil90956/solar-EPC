import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  // Start with empty arrays - no dummy data
  const [tenants, setTenants] = useState([]);
  
  const [pricingPlans, setPricingPlans] = useState([
    {
      id: 1,
      name: 'Starter',
      monthlyPrice: 29,
      yearlyPrice: 290,
      userLimit: 10,
      features: ['Basic CRM Features', 'Email Support', 'Standard Reports', 'Mobile App Access'],
    },
    {
      id: 2,
      name: 'Professional',
      monthlyPrice: 49,
      yearlyPrice: 490,
      userLimit: 50,
      features: ['Advanced CRM Features', 'Priority Support', 'Custom Reports', 'API Access', 'Integrations'],
    },
    {
      id: 3,
      name: 'Enterprise',
      monthlyPrice: 79,
      yearlyPrice: 790,
      userLimit: null,
      features: ['Full Feature Access', '24/7 Support', 'White-label Options', 'Dedicated Account Manager', 'Custom Integrations', 'SSO'],
    },
  ]);
  
  const [backups, setBackups] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    emailSettings: {
      smtpHost: 'smtp.solarios.com',
      smtpPort: 587,
      smtpUser: 'notifications@solarios.com',
      smtpPassword: '********',
      fromEmail: 'noreply@solarios.com',
      fromName: 'Solar OS',
    },
    storageSettings: {
      provider: 'AWS S3',
      bucket: 'solarios-assets',
      region: 'us-east-1',
      maxFileSize: 100,
    },
    featureFlags: {
      enable3DVisualization: true,
      enableInventoryManagement: true,
      enableAMCContracts: true,
      enableVoucherSystem: true,
      enableMultiCurrency: false,
    },
  });

  const addTenant = (tenant) => {
    setTenants([...tenants, { ...tenant, id: Date.now(), currentUsers: 0 }])
  };

  const updateTenant = (id, updates) => {
    setTenants(tenants.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTenant = (id) => {
    setTenants(tenants.filter(t => t.id !== id));
  };

  const updatePricingPlan = (id, updates) => {
    setPricingPlans(pricingPlans.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const addBackup = (backup) => {
    setBackups([{ ...backup, id: Date.now() }, ...backups]);
  };

  const updateSystemSettings = (updates) => {
    setSystemSettings({ ...systemSettings, ...updates });
  };

  const addActivity = (activity) => {
    setRecentActivity([{ ...activity, id: Date.now() }, ...recentActivity.slice(0, 19)]);
  };

  const stats = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter(t => t.status === 'Active').length,
    expiredSubscriptions: tenants.filter(t => t.status === 'Expired').length,
    totalUsers: tenants.reduce((acc, t) => acc + t.currentUsers, 0),
    monthlyRevenue: tenants
      .filter(t => t.status === 'Active' && t.billingType === 'Monthly')
      .reduce((acc, t) => acc + (t.currentUsers * t.pricePerUser), 0),
    yearlyRevenue: tenants
      .filter(t => t.status === 'Active' && t.billingType === 'Yearly')
      .reduce((acc, t) => acc + (t.currentUsers * t.pricePerUser * 12), 0),
  };

  const value = {
    tenants,
    pricingPlans,
    backups,
    recentActivity,
    systemSettings,
    stats,
    addTenant,
    updateTenant,
    deleteTenant,
    updatePricingPlan,
    addBackup,
    updateSystemSettings,
    addActivity,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
