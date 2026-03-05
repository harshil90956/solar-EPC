const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const leadsApi = {
  // Get all leads with optional filters
  async getAll(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/leads?${queryString}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch leads');
    return response.json();
  },

  // Get single lead by ID
  async getById(id) {
    const response = await fetch(`${API_BASE_URL}/leads/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch lead');
    return response.json();
  },

  // Create new lead
  async create(data) {
    const response = await fetch(`${API_BASE_URL}/leads`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create lead');
    return response.json();
  },

  // Update lead
  async update(id, data) {
    const response = await fetch(`${API_BASE_URL}/leads/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update lead');
    return response.json();
  },

  // Delete lead (soft delete)
  async delete(id) {
    const response = await fetch(`${API_BASE_URL}/leads/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete lead');
    return response.json();
  },

  // Get lead statistics
  async getStats() {
    const response = await fetch(`${API_BASE_URL}/leads/stats`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  // Add activity to lead
  async addActivity(id, activity) {
    const response = await fetch(`${API_BASE_URL}/leads/${id}/activities`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(activity),
    });
    if (!response.ok) throw new Error('Failed to add activity');
    return response.json();
  },

  // Duplicate lead
  async duplicate(id) {
    const response = await fetch(`${API_BASE_URL}/leads/${id}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to duplicate lead');
    return response.json();
  },

  // Archive lead
  async archive(id) {
    const response = await fetch(`${API_BASE_URL}/leads/${id}/archive`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to archive lead');
    return response.json();
  },

  // Unarchive lead
  async unarchive(id) {
    const response = await fetch(`${API_BASE_URL}/leads/${id}/unarchive`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to unarchive lead');
    return response.json();
  },

  // Get lead timeline
  async getTimeline(id) {
    const response = await fetch(`${API_BASE_URL}/leads/${id}/timeline`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch timeline');
    return response.json();
  },

  // Bulk archive leads
  async bulkArchive(ids) {
    const response = await fetch(`${API_BASE_URL}/leads/bulk/archive`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('Failed to archive leads');
    return response.json();
  },

  // Bulk delete leads
  async bulkDelete(ids) {
    const response = await fetch(`${API_BASE_URL}/leads/bulk/delete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('Failed to delete leads');
    return response.json();
  },

  // Bulk update stage
  async bulkUpdateStage(ids, stage) {
    const response = await fetch(`${API_BASE_URL}/leads/bulk/stage/${stage}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('Failed to update stages');
    return response.json();
  },

  // Recalculate all scores
  async recalculateScores() {
    const response = await fetch(`${API_BASE_URL}/leads/recalculate-scores`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to recalculate scores');
    return response.json();
  },

  // Export leads to CSV
  async exportCSV(ids = null) {
    const params = ids ? `?ids=${ids.join(',')}` : '';
    const response = await fetch(`${API_BASE_URL}/leads/export${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to export leads');
    return response.blob();
  },
};
