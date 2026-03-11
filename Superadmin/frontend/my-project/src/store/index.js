import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { tenantApi, subscriptionApi, backupApi } from '../services/api'

// Helper to handle API errors
const handleApiError = (error) => {
  console.error('API Error:', error);
  throw error;
};

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    {
      name: 'theme-storage',
    }
  )
)

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      role: null,

      login: (user, token) => set({
        user,
        token,
        isAuthenticated: true,
        role: user.role
      }),

      logout: () => set({
        user: null,
        token: null,
        isAuthenticated: false,
        role: null
      }),

      hasPermission: (permission) => {
        const { role } = get()
        const permissions = {
          superadmin: ['*'],
          admin: ['tenants.read', 'tenants.update', 'subscriptions.read', 'users.read'],
          manager: ['tenants.read', 'subscriptions.read'],
          user: ['tenants.read']
        }
        return permissions[role]?.includes('*') || permissions[role]?.includes(permission)
      }
    }),
    {
      name: 'auth-storage',
    }
  )
)

export const useAppStore = create((set, get) => ({
  // Tenants data
  tenants: [
    {
      id: 1,
      name: 'SolarMax Industries',
      adminName: 'John Anderson',
      email: 'admin@solarmax.com',
      phone: '+1 (555) 123-4567',
      domain: 'solarmax.solarios.com',
      plan: 'Enterprise',
      userLimit: 100,
      currentUsers: 78,
      status: 'Active',
      createdAt: '2024-01-15',
      revenue: 125000,
      logo: 'SM',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 2,
      name: 'GreenEnergy Solutions',
      adminName: 'Sarah Mitchell',
      email: 'sarah@greenenergy.com',
      phone: '+1 (555) 234-5678',
      domain: 'greenenergy.solarios.com',
      plan: 'Professional',
      userLimit: 50,
      currentUsers: 42,
      status: 'Active',
      createdAt: '2024-02-20',
      revenue: 67000,
      logo: 'GE',
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 3,
      name: 'SunPower Technologies',
      adminName: 'Michael Chen',
      email: 'mike@sunpower.com',
      phone: '+1 (555) 345-6789',
      domain: 'sunpower.solarios.com',
      plan: 'Starter',
      userLimit: 15,
      currentUsers: 12,
      status: 'Active',
      createdAt: '2024-03-10',
      revenue: 23000,
      logo: 'SP',
      color: 'from-amber-500 to-orange-500'
    },
    {
      id: 4,
      name: 'EcoSolar Systems',
      adminName: 'Emily Rodriguez',
      email: 'emily@ecosolar.com',
      phone: '+1 (555) 456-7890',
      domain: 'ecosolar.solarios.com',
      plan: 'Professional',
      userLimit: 50,
      currentUsers: 38,
      status: 'Suspended',
      createdAt: '2024-01-25',
      revenue: 52000,
      logo: 'ES',
      color: 'from-purple-500 to-violet-500'
    },
    {
      id: 5,
      name: 'Renewable Power Co',
      adminName: 'David Kim',
      email: 'david@renewable.com',
      phone: '+1 (555) 567-8901',
      domain: 'renewable.solarios.com',
      plan: 'Enterprise',
      userLimit: 200,
      currentUsers: 156,
      status: 'Active',
      createdAt: '2023-12-05',
      revenue: 198000,
      logo: 'RP',
      color: 'from-rose-500 to-pink-500'
    }
  ],

  // Pricing plans
  pricingPlans: [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for small solar businesses',
      pricePerUser: 29,
      monthlyPrice: 29,
      yearlyPrice: 290,
      userLimit: 15,
      features: [
        'Basic CRM Features',
        'Project Management',
        '5 Team Members',
        'Email Support',
        'Standard Reports',
        'Mobile App Access'
      ],
      highlighted: false,
      color: 'from-slate-500 to-slate-600'
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'For growing solar EPC companies',
      pricePerUser: 59,
      monthlyPrice: 59,
      yearlyPrice: 590,
      userLimit: 50,
      features: [
        'Advanced CRM Features',
        'Inventory Management',
        'AMC Contract Management',
        'Priority Support',
        'Custom Reports',
        'API Access',
        'Integrations',
        'White-label Options'
      ],
      highlighted: true,
      color: 'from-blue-500 to-indigo-500'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large-scale solar enterprises',
      pricePerUser: 99,
      monthlyPrice: 99,
      yearlyPrice: 990,
      userLimit: null,
      features: [
        'Full Feature Access',
        'Unlimited Users',
        'Dedicated Account Manager',
        '24/7 Phone Support',
        'Custom Integrations',
        'SSO & Advanced Security',
        'Multi-region Deployment',
        'SLA Guarantee'
      ],
      highlighted: false,
      color: 'from-violet-500 to-purple-500'
    }
  ],

  // Subscriptions
  subscriptions: [
    {
      id: 1,
      tenantId: 1,
      plan: 'Enterprise',
      billingCycle: 'Yearly',
      startDate: '2024-01-15',
      endDate: '2025-01-15',
      amount: 99000,
      status: 'Active',
      autoRenew: true
    },
    {
      id: 2,
      tenantId: 2,
      plan: 'Professional',
      billingCycle: 'Monthly',
      startDate: '2024-02-20',
      endDate: '2024-03-20',
      amount: 5900,
      status: 'Active',
      autoRenew: true
    }
  ],

  // Analytics data
  analytics: {
    revenueData: [
      { month: 'Jan', revenue: 45000, target: 50000 },
      { month: 'Feb', revenue: 52000, target: 55000 },
      { month: 'Mar', revenue: 48000, target: 55000 },
      { month: 'Apr', revenue: 61000, target: 60000 },
      { month: 'May', revenue: 58000, target: 60000 },
      { month: 'Jun', revenue: 67000, target: 65000 },
      { month: 'Jul', revenue: 72000, target: 70000 },
      { month: 'Aug', revenue: 69000, target: 70000 },
      { month: 'Sep', revenue: 75000, target: 75000 },
      { month: 'Oct', revenue: 82000, target: 80000 },
      { month: 'Nov', revenue: 78000, target: 80000 },
      { month: 'Dec', revenue: 89000, target: 85000 }
    ],
    tenantGrowth: [
      { month: 'Jan', tenants: 12 },
      { month: 'Feb', tenants: 18 },
      { month: 'Mar', tenants: 25 },
      { month: 'Apr', tenants: 32 },
      { month: 'May', tenants: 38 },
      { month: 'Jun', tenants: 45 },
      { month: 'Jul', tenants: 52 },
      { month: 'Aug', tenants: 58 },
      { month: 'Sep', tenants: 67 },
      { month: 'Oct', tenants: 74 },
      { month: 'Nov', tenants: 82 },
      { month: 'Dec', tenants: 91 }
    ],
    planDistribution: [
      { name: 'Starter', value: 35, color: '#64748b' },
      { name: 'Professional', value: 45, color: '#3b82f6' },
      { name: 'Enterprise', value: 20, color: '#8b5cf6' }
    ],
    userUsage: [
      { tenant: 'SolarMax', used: 78, limit: 100 },
      { tenant: 'GreenEnergy', used: 42, limit: 50 },
      { tenant: 'SunPower', used: 12, limit: 15 },
      { tenant: 'EcoSolar', used: 38, limit: 50 },
      { tenant: 'Renewable', used: 156, limit: 200 }
    ]
  },

  // Activity logs
  activities: [
    {
      id: 1,
      type: 'tenant_created',
      message: 'New tenant "SolarMax Industries" created',
      user: 'Super Admin',
      timestamp: '2024-03-10T14:32:15',
      icon: 'Building'
    },
    {
      id: 2,
      type: 'subscription_renewed',
      message: 'Enterprise subscription renewed for SolarMax',
      user: 'System',
      timestamp: '2024-03-10T12:15:42',
      icon: 'CreditCard'
    },
    {
      id: 3,
      type: 'user_limit_updated',
      message: 'User limit increased for GreenEnergy Solutions',
      user: 'Super Admin',
      timestamp: '2024-03-09T16:45:30',
      icon: 'Users'
    },
    {
      id: 4,
      type: 'backup_completed',
      message: 'Daily backup completed successfully',
      user: 'System',
      timestamp: '2024-03-09T02:00:00',
      icon: 'Database'
    },
    {
      id: 5,
      type: 'pricing_updated',
      message: 'Professional plan pricing updated',
      user: 'Super Admin',
      timestamp: '2024-03-08T09:22:18',
      icon: 'DollarSign'
    }
  ],

  // Notifications
  notifications: [
    {
      id: 1,
      title: 'New tenant signup',
      message: 'EcoSolar Systems has completed registration',
      type: 'success',
      timestamp: '2024-03-10T15:30:00',
      read: false
    },
    {
      id: 2,
      title: 'Subscription expiring',
      message: 'SunPower Technologies subscription expires in 7 days',
      type: 'warning',
      timestamp: '2024-03-09T10:15:00',
      read: false
    },
    {
      id: 3,
      title: 'Payment received',
      message: 'SolarMax Industries paid $99,000 for yearly subscription',
      type: 'success',
      timestamp: '2024-03-08T14:20:00',
      read: true
    },
    {
      id: 4,
      title: 'System alert',
      message: 'High CPU usage detected on server cluster B',
      type: 'error',
      timestamp: '2024-03-07T23:45:00',
      read: true
    }
  ],

  // Backups
  backups: [
    {
      id: 1,
      name: 'Full Database Backup',
      type: 'full',
      size: '2.4 GB',
      status: 'completed',
      createdAt: '2024-03-10T02:00:00',
      duration: '15m 32s'
    },
    {
      id: 2,
      name: 'Tenant Data - SolarMax',
      type: 'tenant',
      size: '450 MB',
      status: 'completed',
      createdAt: '2024-03-09T14:30:00',
      duration: '3m 45s'
    },
    {
      id: 3,
      name: 'Full Database Backup',
      type: 'full',
      size: '2.3 GB',
      status: 'completed',
      createdAt: '2024-03-09T02:00:00',
      duration: '14m 58s'
    }
  ],

  // System settings
  settings: {
    maintenanceMode: false,
    platformName: 'Solar OS',
    supportEmail: 'support@solarios.com',
    timezone: 'UTC',
    language: 'en',
    smtp: {
      host: 'smtp.solarios.com',
      port: 587,
      username: 'notifications@solarios.com',
      password: '********',
      fromEmail: 'noreply@solarios.com',
      fromName: 'Solar OS'
    },
    storage: {
      provider: 'AWS S3',
      bucket: 'solarios-assets',
      region: 'us-east-1',
      maxFileSize: 100
    },
    features: {
      enable3DVisualization: true,
      enableInventoryManagement: true,
      enableAMCContracts: true,
      enableVoucherSystem: true,
      enableMultiCurrency: false
    }
  },

  // Actions
  addTenant: async (tenant) => {
    console.log('Store: addTenant called with:', tenant);
    try {
      const newTenant = await tenantApi.create(tenant);
      console.log('Store: tenantApi.create returned:', newTenant);
      set((state) => ({
        tenants: [...state.tenants, newTenant]
      }));
      return newTenant;
    } catch (error) {
      console.error('Store: addTenant error:', error);
      throw error;
    }
  },

  updateTenant: async (id, updates) => {
    try {
      const updated = await tenantApi.update(id, updates);
      set((state) => ({
        tenants: state.tenants.map(t => t.id === id ? { ...t, ...updated } : t)
      }));
      return updated;
    } catch (error) {
      handleApiError(error);
    }
  },

  deleteTenant: async (id) => {
    try {
      await tenantApi.delete(id);
      set((state) => ({
        tenants: state.tenants.filter(t => t.id !== id)
      }));
    } catch (error) {
      handleApiError(error);
    }
  },

  updatePricing: (id, updates) => set((state) => ({
    pricingPlans: state.pricingPlans.map(p => p.id === id ? { ...p, ...updates } : p)
  })),

  addActivity: (activity) => set((state) => ({
    activities: [{ ...activity, id: Date.now() }, ...state.activities].slice(0, 50)
  })),

  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
  })),

  updateSettings: (updates) => set((state) => ({
    settings: { ...state.settings, ...updates }
  }))
}))
