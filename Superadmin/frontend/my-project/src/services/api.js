// API service for Superadmin operations
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token');
  const fullUrl = `${API_URL}${url}`;
  console.log('API Call:', fullUrl, options.method || 'GET');

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    console.log('API Response:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('API Error:', error);
      throw new ApiError(error.message || `HTTP ${response.status}`, response.status);
    }

    return response.json();
  } catch (err) {
    console.error('Fetch Error:', err);
    throw err;
  }
}

// Tenant API
export const tenantApi = {
  getAll: (query = {}) => {
    const params = new URLSearchParams(query).toString();
    return fetchWithAuth(`/api/superadmin/tenants?${params}`);
  },

  getById: (id) => fetchWithAuth(`/api/superadmin/tenants/${id}`),

  getStats: () => fetchWithAuth('/api/superadmin/tenants/stats'),

  create: (data) => fetchWithAuth('/api/superadmin/tenants', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id, data) => fetchWithAuth(`/api/superadmin/tenants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  updateStatus: (id, status) => fetchWithAuth(`/api/superadmin/tenants/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),

  updatePlan: (id, plan) => fetchWithAuth(`/api/superadmin/tenants/${id}/plan`, {
    method: 'PUT',
    body: JSON.stringify({ plan }),
  }),

  delete: (id) => fetchWithAuth(`/api/superadmin/tenants/${id}`, {
    method: 'DELETE',
  }),
};

// Subscription API
export const subscriptionApi = {
  getAll: (query = {}) => {
    const params = new URLSearchParams(query).toString();
    return fetchWithAuth(`/api/superadmin/subscriptions?${params}`);
  },

  getById: (id) => fetchWithAuth(`/api/superadmin/subscriptions/${id}`),

  getStats: () => fetchWithAuth('/api/superadmin/subscriptions/stats'),

  create: (data) => fetchWithAuth('/api/superadmin/subscriptions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id, data) => fetchWithAuth(`/api/superadmin/subscriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  cancel: (id, reason) => fetchWithAuth(`/api/superadmin/subscriptions/${id}/cancel`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  }),

  delete: (id) => fetchWithAuth(`/api/superadmin/subscriptions/${id}`, {
    method: 'DELETE',
  }),
};

// Backup API
export const backupApi = {
  getAll: (query = {}) => {
    const params = new URLSearchParams(query).toString();
    return fetchWithAuth(`/api/superadmin/backups?${params}`);
  },

  getById: (id) => fetchWithAuth(`/api/superadmin/backups/${id}`),

  getStats: () => fetchWithAuth('/api/superadmin/backups/stats'),

  create: (data) => fetchWithAuth('/api/superadmin/backups', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateStatus: (id, status, metadata) => fetchWithAuth(`/api/superadmin/backups/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, metadata }),
  }),

  delete: (id) => fetchWithAuth(`/api/superadmin/backups/${id}`, {
    method: 'DELETE',
  }),
};
