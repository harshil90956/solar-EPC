const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3000') + '/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const surveysApi = {
  // Get all surveys with optional filters
  async getAll(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/surveys?${queryString}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch surveys');
    return response.json();
  },

  // Get survey stats
  async getStats() {
    const response = await fetch(`${API_BASE_URL}/surveys/stats`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch survey stats');
    return response.json();
  },

  // Get single survey by ID
  async getById(id) {
    const response = await fetch(`${API_BASE_URL}/surveys/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch survey');
    return response.json();
  },

  // Create new survey
  async create(data) {
    const response = await fetch(`${API_BASE_URL}/surveys`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create survey');
    return response.json();
  },

  // Update survey
  async update(id, data) {
    const response = await fetch(`${API_BASE_URL}/surveys/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update survey');
    return response.json();
  },

  // Delete survey
  async delete(id) {
    const response = await fetch(`${API_BASE_URL}/surveys/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete survey');
    return response.json();
  },
};
