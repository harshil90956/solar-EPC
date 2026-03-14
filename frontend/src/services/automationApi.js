/**
 * Automation API Service
 * Frontend API client for the production-grade automation engine
 */

import apiClient from './apiClient';

// Use /api as prefix if not already handled by proxy or axios baseURL
const BASE_URL = '/automation';

// ─────────────────────────────────────────────────────────────────────────
// Rules Management
// ─────────────────────────────────────────────────────────────────────────

export const getAutomationRules = async () => {
  try {
    const response = await apiClient.get(`${BASE_URL}/rules`);
    return response.data;
  } catch (error) {
    console.warn('Automation rules endpoint not found, returning empty list');
    return { success: true, data: [] };
  }
};

export const getAutomationRule = async (ruleId) => {
  const response = await apiClient.get(`${BASE_URL}/rules/${ruleId}`);
  return response.data;
};

export const createAutomationRule = async (ruleData) => {
  const response = await apiClient.post(`${BASE_URL}/rules`, ruleData);
  return response.data;
};

export const updateAutomationRule = async (ruleId, ruleData) => {
  const response = await apiClient.put(`${BASE_URL}/rules/${ruleId}`, ruleData);
  return response.data;
};

export const toggleAutomationRule = async (ruleId, enabled) => {
  const response = await apiClient.patch(`${BASE_URL}/rules/${ruleId}/toggle`, { enabled });
  return response.data;
};

export const deleteAutomationRule = async (ruleId) => {
  const response = await apiClient.delete(`${BASE_URL}/rules/${ruleId}`);
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────────────

export const getAutomationTemplates = async (category) => {
  try {
    const url = category 
      ? `${BASE_URL}/templates?category=${category}` 
      : `${BASE_URL}/templates`;
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.warn('Automation templates endpoint not found, returning empty list');
    return { success: true, data: [] };
  }
};

export const getTemplateCategories = async () => {
  const response = await apiClient.get(`${BASE_URL}/templates/categories`);
  return response.data;
};

export const getRecommendedTemplates = async () => {
  const response = await apiClient.get(`${BASE_URL}/templates/recommended`);
  return response.data;
};

export const applyTemplate = async (templateId) => {
  const response = await apiClient.post(`${BASE_URL}/templates/${templateId}/apply`);
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────
// Executions
// ─────────────────────────────────────────────────────────────────────────

export const getExecutions = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await apiClient.get(`${BASE_URL}/executions?${queryString}`);
  return response.data;
};

export const getExecution = async (executionId) => {
  const response = await apiClient.get(`${BASE_URL}/executions/${executionId}`);
  return response.data;
};

export const retryExecution = async (executionId, data = {}) => {
  const response = await apiClient.post(`${BASE_URL}/executions/${executionId}/retry`, data);
  return response.data;
};

export const cancelExecution = async (executionId) => {
  const response = await apiClient.post(`${BASE_URL}/executions/${executionId}/cancel`);
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────
// Manual Trigger & Testing
// ─────────────────────────────────────────────────────────────────────────

export const triggerEvent = async (eventData) => {
  const response = await apiClient.post(`${BASE_URL}/trigger`, eventData);
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────
// Health & Stats
// ─────────────────────────────────────────────────────────────────────────

export const getAutomationHealth = async () => {
  const response = await apiClient.get(`${BASE_URL}/health`);
  return response.data;
};

export const getAutomationStats = async () => {
  try {
    const response = await apiClient.get(`${BASE_URL}/stats`);
    return response.data;
  } catch (error) {
    console.warn('Automation stats endpoint not found, returning empty stats');
    return { success: true, data: { activeRules: 0, totalExecutions: 0, successRate: 0 } };
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Events Registry
// ─────────────────────────────────────────────────────────────────────────

export const getAvailableEvents = async () => {
  try {
    const response = await apiClient.get(`${BASE_URL}/events`);
    return response.data;
  } catch (error) {
    console.warn('Automation events endpoint not found, returning empty list');
    return { success: true, data: [] };
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Queue Management
// ─────────────────────────────────────────────────────────────────────────

export const getQueueStats = async () => {
  const response = await apiClient.get(`${BASE_URL}/queue/stats`);
  return response.data;
};

export const pauseQueue = async () => {
  const response = await apiClient.post(`${BASE_URL}/queue/pause`);
  return response.data;
};

export const resumeQueue = async () => {
  const response = await apiClient.post(`${BASE_URL}/queue/resume`);
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────
// Bulk Operations
// ─────────────────────────────────────────────────────────────────────────

export const bulkEnableRules = async (ruleIds) => {
  const response = await apiClient.post(`${BASE_URL}/rules/bulk/enable`, { ruleIds });
  return response.data;
};

export const bulkDisableRules = async (ruleIds) => {
  const response = await apiClient.post(`${BASE_URL}/rules/bulk/disable`, { ruleIds });
  return response.data;
};

export const bulkDeleteRules = async (ruleIds) => {
  const response = await apiClient.post(`${BASE_URL}/rules/bulk/delete`, { ruleIds });
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────
// Legacy Workflow API (Backward Compatibility)
// ─────────────────────────────────────────────────────────────────────────

export const getWorkflowRules = async () => {
  const response = await apiClient.get(`${BASE_URL}/rules`);
  return response.data;
};

export const createWorkflowRule = async (ruleData) => {
  // Convert old format to new format
  const newFormat = convertOldToNewFormat(ruleData);
  const response = await apiClient.post(`${BASE_URL}/rules`, newFormat);
  return response.data;
};

// Helper to convert old workflow format to new automation format
function convertOldToNewFormat(oldData) {
  return {
    name: oldData.label || 'Untitled Rule',
    description: oldData.description || '',
    enabled: oldData.enabled !== false,
    trigger: {
      event: `lead.${oldData.condition?.field === 'lead_stage' ? 'status_changed' : 'created'}`,
      module: 'leads',
      entityType: 'lead',
    },
    conditionTree: {
      type: 'condition',
      field: oldData.condition?.field || 'status',
      operator: mapOldOperator(oldData.condition?.operator),
      value: oldData.condition?.value,
    },
    actionNodes: [
      {
        nodeId: 'action_1',
        type: mapOldActionType(oldData.action?.type),
        config: { target: oldData.action?.target },
        dependencies: [],
        nextNodes: [],
      },
    ],
    variables: {},
  };
}

function mapOldOperator(op) {
  const map = { '=': 'eq', '!=': 'ne', '>': 'gt', '<': 'lt', '>=': 'gte', '<=': 'lte' };
  return map[op] || 'eq';
}

function mapOldActionType(type) {
  const map = {
    'enable_feature': 'enable_feature',
    'disable_feature': 'disable_feature',
    'create_record': 'create_record',
    'send_notification': 'send_notification',
    'assign_user': 'assign_user',
    'trigger_webhook': 'trigger_webhook',
  };
  return map[type] || 'send_notification';
}

const automationApi = {
  getAutomationRules,
  getAutomationRule,
  createAutomationRule,
  updateAutomationRule,
  toggleAutomationRule,
  deleteAutomationRule,
  getAutomationTemplates,
  getTemplateCategories,
  getRecommendedTemplates,
  applyTemplate,
  getExecutions,
  getExecution,
  retryExecution,
  cancelExecution,
  triggerEvent,
  getAutomationHealth,
  getAutomationStats,
  getAvailableEvents,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  bulkEnableRules,
  bulkDisableRules,
  bulkDeleteRules,
  // Legacy
  getWorkflowRules,
  createWorkflowRule,
};

export { automationApi };
export default automationApi;
