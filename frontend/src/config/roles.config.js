// ROLES CONFIG — Never hardcode roles or permissions in components

export const ROLES = {
    ADMIN: 'Admin',
    SALES: 'Sales',
    SURVEY_ENGINEER: 'Survey Engineer',
    DESIGN_ENGINEER: 'Design Engineer',
    PROJECT_MANAGER: 'Project Manager',
    STORE_MANAGER: 'Store Manager',
    PROCUREMENT_OFFICER: 'Procurement Officer',
    FINANCE: 'Finance',
    TECHNICIAN: 'Technician',
    SERVICE_MANAGER: 'Service Manager',
};

// All module keys
export const MODULES = {
    DASHBOARD: 'dashboard',
    REMINDERS: 'reminders',
    HRM: 'hrm',
    CRM: 'crm',
    SURVEY: 'survey',
    DESIGN: 'design',
    QUOTATION: 'quotation',
    PROJECT: 'project',
    INVENTORY: 'inventory',
    ITEMS: 'items',
    PROCUREMENT: 'procurement',
    LOGISTICS: 'logistics',
    INSTALLATION: 'installation',
    COMMISSIONING: 'commissioning',
    FINANCE: 'finance',
    SERVICE: 'service',
    COMPLIANCE: 'compliance',
    SETTINGS: 'settings',
    INTELLIGENCE: 'intelligence',
    HRM: 'hrm',
};

const ALL_MODULES = Object.values(MODULES);

// Permission matrix — config-driven, no inline conditions
export const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: {
        modules: ALL_MODULES,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canExport: true,
        canApprove: true,
    },
    [ROLES.SALES]: {
        modules: [MODULES.DASHBOARD, MODULES.REMINDERS, MODULES.CRM, MODULES.QUOTATION],
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canExport: false,
        canApprove: false,
    },
    [ROLES.SURVEY_ENGINEER]: {
        modules: [MODULES.DASHBOARD, MODULES.REMINDERS, MODULES.CRM, MODULES.SURVEY],
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canExport: false,
        canApprove: false,
    },
    [ROLES.DESIGN_ENGINEER]: {
        modules: [MODULES.DASHBOARD, MODULES.REMINDERS, MODULES.SURVEY, MODULES.DESIGN, MODULES.QUOTATION],
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canExport: true,
        canApprove: false,
    },
    [ROLES.PROJECT_MANAGER]: {
        modules: [MODULES.DASHBOARD, MODULES.REMINDERS, MODULES.PROJECT, MODULES.INSTALLATION, MODULES.COMMISSIONING, MODULES.LOGISTICS],
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canExport: true,
        canApprove: true,
    },
    [ROLES.STORE_MANAGER]: {
        modules: [MODULES.DASHBOARD, MODULES.REMINDERS, MODULES.INVENTORY, MODULES.PROCUREMENT, MODULES.LOGISTICS, MODULES.ITEMS],
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canExport: true,
        canApprove: false,
    },
    [ROLES.PROCUREMENT_OFFICER]: {
        modules: [MODULES.DASHBOARD, MODULES.REMINDERS, MODULES.PROCUREMENT, MODULES.INVENTORY, MODULES.LOGISTICS, MODULES.ITEMS],
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canExport: true,
        canApprove: true,
    },
    [ROLES.FINANCE]: {
        modules: [MODULES.DASHBOARD, MODULES.REMINDERS, MODULES.FINANCE, MODULES.COMPLIANCE],
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canExport: true,
        canApprove: true,
    },
    [ROLES.TECHNICIAN]: {
        modules: [MODULES.DASHBOARD, MODULES.REMINDERS, MODULES.INSTALLATION, MODULES.COMMISSIONING, MODULES.SERVICE],
        canCreate: false,
        canEdit: true,
        canDelete: false,
        canExport: false,
        canApprove: false,
    },
    [ROLES.SERVICE_MANAGER]: {
        modules: [MODULES.DASHBOARD, MODULES.REMINDERS, MODULES.SERVICE, MODULES.COMMISSIONING, MODULES.COMPLIANCE],
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canExport: true,
        canApprove: true,
    },
};

export const getRolePermissions = (role) =>
    ROLE_PERMISSIONS[role] ?? { modules: [MODULES.DASHBOARD], canCreate: false, canEdit: false, canDelete: false, canExport: false, canApprove: false };

export const canAccess = (role, module) =>
    getRolePermissions(role).modules.includes(module);
