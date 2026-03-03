const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3000') + '/api/v1';

const getTenantId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('solar_user') || '{}');
    return user?.tenantId || user?.tenant?.id || user?.id || null;
  } catch {
    return null;
  }
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('solar_token') || localStorage.getItem('token');
  const tenantId = getTenantId();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(tenantId && { 'x-tenant-id': tenantId }),
  };
};

export const settingsApi = {
  // ── Full Settings ─────────────────────────────────────────────────────────
  async getFullSettings() {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch settings');
    return response.json();
  },

  // ── Feature Flags ─────────────────────────────────────────────────────────
  async getFeatureFlags() {
    const response = await fetch(`${API_BASE_URL}/settings/flags`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch feature flags');
    return response.json();
  },

  async updateFeatureFlag(moduleId, update) {
    const response = await fetch(`${API_BASE_URL}/settings/flags/${moduleId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(update),
    });
    if (!response.ok) throw new Error('Failed to update feature flag');
    return response.json();
  },

  async toggleModule(moduleId, enabled) {
    const response = await fetch(`${API_BASE_URL}/settings/flags/${moduleId}/toggle`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ enabled }),
    });
    if (!response.ok) throw new Error('Failed to toggle module');
    return response.json();
  },

  async toggleFeature(moduleId, featureId, enabled) {
    const response = await fetch(`${API_BASE_URL}/settings/flags/${moduleId}/features/${featureId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ enabled }),
    });
    if (!response.ok) throw new Error('Failed to toggle feature');
    return response.json();
  },

  async toggleAction(moduleId, actionId, enabled) {
    const response = await fetch(`${API_BASE_URL}/settings/flags/${moduleId}/actions/${actionId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ enabled }),
    });
    if (!response.ok) throw new Error('Failed to toggle action');
    return response.json();
  },

  // ── RBAC ─────────────────────────────────────────────────────────────────
  async getRBACConfigs() {
    const response = await fetch(`${API_BASE_URL}/settings/rbac`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch RBAC configs');
    return response.json();
  },

  async updateRBAC(roleId, moduleId, permissions) {
    const response = await fetch(`${API_BASE_URL}/settings/rbac/${roleId}/${moduleId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ permissions }),
    });
    if (!response.ok) throw new Error('Failed to update RBAC');
    return response.json();
  },

  async toggleRBAC(roleId, moduleId, actionId, enabled) {
    const response = await fetch(`${API_BASE_URL}/settings/rbac/${roleId}/${moduleId}/${actionId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ enabled }),
    });
    if (!response.ok) throw new Error('Failed to toggle RBAC');
    return response.json();
  },

  // ── Workflow Rules ───────────────────────────────────────────────────────
  async getWorkflowRules() {
    const response = await fetch(`${API_BASE_URL}/settings/workflows`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch workflow rules');
    return response.json();
  },

  async createWorkflowRule(rule) {
    const response = await fetch(`${API_BASE_URL}/settings/workflows`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(rule),
    });
    if (!response.ok) throw new Error('Failed to create workflow rule');
    return response.json();
  },

  async updateWorkflowRule(wfId, updates) {
    const response = await fetch(`${API_BASE_URL}/settings/workflows/${wfId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update workflow rule');
    return response.json();
  },

  async deleteWorkflowRule(wfId) {
    const response = await fetch(`${API_BASE_URL}/settings/workflows/${wfId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete workflow rule');
    return response.json();
  },

  // ── Audit Logs ────────────────────────────────────────────────────────────
  async getAuditLogs() {
    const response = await fetch(`${API_BASE_URL}/settings/audit`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch audit logs');
    return response.json();
  },

  async createAuditLog(log) {
    const response = await fetch(`${API_BASE_URL}/settings/audit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(log),
    });
    if (!response.ok) throw new Error('Failed to create audit log');
    return response.json();
  },

  // ── Custom Roles ─────────────────────────────────────────────────────────
  async getCustomRoles() {
    const response = await fetch(`${API_BASE_URL}/settings/roles`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch custom roles');
    return response.json();
  },

  async createCustomRole(role) {
    const response = await fetch(`${API_BASE_URL}/settings/roles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(role),
    });
    if (!response.ok) throw new Error('Failed to create custom role');
    return response.json();
  },

  async updateCustomRole(roleId, updates) {
    const response = await fetch(`${API_BASE_URL}/settings/roles/${roleId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update custom role');
    return response.json();
  },

  async deleteCustomRole(roleId) {
    const response = await fetch(`${API_BASE_URL}/settings/roles/${roleId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete custom role');
    return response.json();
  },

  // ── Project Type Configs ────────────────────────────────────────────────
  async getProjectTypeConfigs() {
    const response = await fetch(`${API_BASE_URL}/settings/project-types`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch project type configs');
    return response.json();
  },

  async updateProjectTypeConfig(typeId, config) {
    const response = await fetch(`${API_BASE_URL}/settings/project-types/${typeId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error('Failed to update project type config');
    return response.json();
  },

  // ── Lead Statuses (CRM → Lead) ───────────────────────────────────────────
  async getLeadStatuses(activeOnly = false) {
    const url = new URL(`${API_BASE_URL}/settings/lead-statuses`);
    if (activeOnly) url.searchParams.set('active', 'true');
    const response = await fetch(url.toString(), {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch lead statuses');
    return response.json();
  },

  async createLeadStatus(payload) {
    const response = await fetch(`${API_BASE_URL}/settings/lead-statuses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to create lead status');
    return response.json();
  },

  async updateLeadStatus(id, payload) {
    const response = await fetch(`${API_BASE_URL}/settings/lead-statuses/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to update lead status');
    return response.json();
  },

  async deleteLeadStatus(id) {
    const response = await fetch(`${API_BASE_URL}/settings/lead-statuses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete lead status');
    return response.json();
  },

  async reorderLeadStatuses(statusIds) {
    const response = await fetch(`${API_BASE_URL}/settings/lead-statuses/reorder`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ statusIds }),
    });
    if (!response.ok) throw new Error('Failed to reorder lead statuses');
    return response.json();
  },
};
