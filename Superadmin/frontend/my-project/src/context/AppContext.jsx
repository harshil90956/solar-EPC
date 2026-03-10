import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [tenants, setTenants] = useState([
    {
      id: 1,
      name: 'Acme Solar Solutions',
      adminEmail: 'admin@acmesolar.com',
      plan: 'Professional',
      userLimit: 25,
      currentUsers: 18,
      subscriptionExpiry: '2025-04-15',
      status: 'Active',
      billingType: 'Monthly',
      pricePerUser: 49,
      subscriptionStart: '2024-04-15',
    },
    {
      id: 2,
      name: 'SunTech Energy',
      adminEmail: 'admin@suntech.com',
      plan: 'Enterprise',
      userLimit: 100,
      currentUsers: 67,
      subscriptionExpiry: '2025-06-30',
      status: 'Active',
      billingType: 'Yearly',
      pricePerUser: 39,
      subscriptionStart: '2024-06-30',
    },
    {
      id: 3,
      name: 'GreenPower Systems',
      adminEmail: 'admin@greenpower.com',
      plan: 'Starter',
      userLimit: 10,
      currentUsers: 8,
      subscriptionExpiry: '2025-02-28',
      status: 'Expired',
      billingType: 'Monthly',
      pricePerUser: 29,
      subscriptionStart: '2024-02-28',
    },
    {
      id: 4,
      name: 'EcoSolar Innovations',
      adminEmail: 'admin@ecosolar.com',
      plan: 'Professional',
      userLimit: 50,
      currentUsers: 42,
      subscriptionExpiry: '2025-05-20',
      status: 'Active',
      billingType: 'Yearly',
      pricePerUser: 44,
      subscriptionStart: '2024-05-20',
    },
    {
      id: 5,
      name: 'SolarMax Technologies',
      adminEmail: 'admin@solarmax.com',
      plan: 'Enterprise',
      userLimit: 200,
      currentUsers: 156,
      subscriptionExpiry: '2025-08-12',
      status: 'Suspended',
      billingType: 'Yearly',
      pricePerUser: 35,
      subscriptionStart: '2024-08-12',
    },
  ]);

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

  const [backups, setBackups] = useState([
    {
      id: 1,
      date: '2025-03-08 02:00:00',
      size: '2.4 GB',
      type: 'Full Database',
      status: 'Completed',
    },
    {
      id: 2,
      date: '2025-03-07 02:00:00',
      size: '2.3 GB',
      type: 'Full Database',
      status: 'Completed',
    },
    {
      id: 3,
      date: '2025-03-06 14:30:00',
      size: '450 MB',
      type: 'Tenant Specific - Acme Solar',
      status: 'Completed',
    },
    {
      id: 4,
      date: '2025-03-05 02:00:00',
      size: '2.3 GB',
      type: 'Full Database',
      status: 'Completed',
    },
  ]);

  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      type: 'tenant_created',
      message: 'New tenant "EcoSolar Innovations" created',
      timestamp: '2025-03-08 14:32:15',
      user: 'Super Admin',
    },
    {
      id: 2,
      type: 'subscription_renewed',
      message: 'Subscription renewed for "SunTech Energy"',
      timestamp: '2025-03-08 11:15:42',
      user: 'Super Admin',
    },
    {
      id: 3,
      type: 'backup_completed',
      message: 'Daily backup completed successfully',
      timestamp: '2025-03-08 02:00:00',
      user: 'System',
    },
    {
      id: 4,
      type: 'tenant_suspended',
      message: 'Tenant "SolarMax Technologies" suspended',
      timestamp: '2025-03-07 16:45:30',
      user: 'Super Admin',
    },
    {
      id: 5,
      type: 'pricing_updated',
      message: 'Pricing plan "Professional" updated',
      timestamp: '2025-03-07 09:22:18',
      user: 'Super Admin',
    },
  ]);

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
