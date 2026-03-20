import apiClient from '../lib/apiClient';

const TENANT_ID = 'solarcorp';

export const projectsApi = {
  // Create a new project
  create: (data) => {
    return apiClient.post('/projects', data, {
      headers: { 'x-tenant-id': TENANT_ID }
    });
  },

  // Get all projects
  getAll: (params = {}) => {
    return apiClient.get('/projects', {
      params,
      headers: { 'x-tenant-id': TENANT_ID }
    });
  },

  // Get project by ID
  getById: (id) => {
    return apiClient.get(`/projects/${id}`, {
      headers: { 'x-tenant-id': TENANT_ID }
    });
  },

  // Update project
  update: (id, data) => {
    return apiClient.patch(`/projects/${id}`, data, {
      headers: { 'x-tenant-id': TENANT_ID }
    });
  },

  // Delete project
  delete: (id) => {
    return apiClient.delete(`/projects/${id}`, {
      headers: { 'x-tenant-id': TENANT_ID }
    });
  },

  // Update project status
  updateStatus: (id, status) => {
    return apiClient.patch(`/projects/${id}/status`, { status }, {
      headers: { 'x-tenant-id': TENANT_ID }
    });
  },

  // Get project BOQ items
  getBoqItems: (projectId) => {
    return apiClient.get(`/projects/${projectId}/boq`, {
      headers: { 'x-tenant-id': TENANT_ID }
    });
  },

  // Add BOQ item to project
  addBoqItem: (projectId, item) => {
    return apiClient.post(`/projects/${projectId}/boq`, item, {
      headers: { 'x-tenant-id': TENANT_ID }
    });
  },

  // Update BOQ item
  updateBoqItem: (projectId, itemId, data) => {
    return apiClient.patch(`/projects/${projectId}/boq/${itemId}`, data, {
      headers: { 'x-tenant-id': TENANT_ID }
    });
  },

  // Remove BOQ item
  removeBoqItem: (projectId, itemId) => {
    return apiClient.delete(`/projects/${projectId}/boq/${itemId}`, {
      headers: { 'x-tenant-id': TENANT_ID }
    });
  }
};

export default projectsApi;
