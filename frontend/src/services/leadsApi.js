import apiClient, { api } from '../lib/apiClient';

export const leadsApi = {
  // Get all leads with optional filters
  async getAll(params = {}) {
    return api.get('/leads', params);
  },

  // Get ordered active lead status options
  async getStatusOptions() {
    return api.get('/leads/status-options');
  },

  // Get single lead by ID
  async getById(id) {
    return api.get(`/leads/${id}`);
  },

  // Create new lead
  async create(data) {
    return api.post('/leads', data);
  },

  // Update lead
  async update(id, data) {
    return api.put(`/leads/${id}`, data);
  },

  // Delete lead (soft delete)
  async delete(id) {
    // apiClient unwraps response.data; for 204 axios returns empty string/undefined.
    await api.delete(`/leads/${id}`);
    return { success: true };
  },

  // Get lead statistics
  async getStats() {
    return api.get('/leads/stats');
  },

  async getDashboardOverview() {
    return api.get('/leads/dashboard/overview');
  },

  async getDashboardFunnel() {
    return api.get('/leads/dashboard/funnel');
  },

  async getDashboardSource() {
    return api.get('/leads/dashboard/source');
  },

  async getDashboardTrend() {
    return api.get('/leads/dashboard/trend');
  },

  async getDashboardActivity() {
    return api.get('/leads/dashboard/activity');
  },

  // Add activity to lead
  async addActivity(id, activity) {
    return api.post(`/leads/${id}/activities`, activity);
  },

  // Duplicate lead
  async duplicate(id) {
    return api.post(`/leads/${id}/duplicate`);
  },

  // Archive lead
  async archive(id) {
    return api.post(`/leads/${id}/archive`);
  },

  // Unarchive lead
  async unarchive(id) {
    return api.post(`/leads/${id}/unarchive`);
  },

  // Get lead timeline
  async getTimeline(id) {
    return api.get(`/leads/${id}/timeline`);
  },

  // Get lead tracker / status progress
  async getTracker(id) {
    return api.get(`/leads/${id}/tracker`);
  },

  // Update lead stage (with tracker update)
  async updateStage(id, stage) {
    return api.patch(`/leads/${id}/stage`, { stage });
  },

  // Bulk archive leads
  async bulkArchive(ids) {
    return api.post('/leads/bulk/archive', { ids });
  },

  // Bulk delete leads
  async bulkDelete(ids) {
    return api.post('/leads/bulk/delete', { ids });
  },

  // Bulk update stage
  async bulkUpdateStage(ids, stage) {
    return api.post(`/leads/bulk/stage/${stage}`, { ids });
  },

  // Recalculate all scores
  async recalculateScores() {
    return api.post('/leads/recalculate-scores');
  },

  // Assign lead to user
  async assignLead(id, assignedTo) {
    return api.patch(`/leads/${id}/assign`, { assignedTo });
  },

  // Export leads to CSV
  async exportCSV(ids = null) {
    const params = ids ? { ids: ids.join(',') } : {};
    const res = await apiClient.get('/leads/export', { params, responseType: 'blob' });
    return res;
  },

  // Import leads from file (CSV, XLSX, JSON)
  async importLeads(file) {
    const formData = new FormData();
    formData.append('file', file);
    // Let axios/browser set multipart boundaries
    return apiClient.post('/leads/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
