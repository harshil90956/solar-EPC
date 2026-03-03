const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3000') + '/api/v1';

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
};
