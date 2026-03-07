const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api/v1';

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

export const documentsApi = {
  // Get all documents with optional filters
  async getAll(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/documents/all?${queryString}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch documents');
    return response.json();
  },

  // Get documents by tab type
  async getEstimatesProposalsQuotations(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/documents/estimates-proposals-quotations?${queryString}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch EPQ documents');
    return response.json();
  },

  async getContracts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/documents/contracts?${queryString}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch contracts');
    return response.json();
  },

  async getInvoices(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/documents/invoices?${queryString}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch invoices');
    return response.json();
  },

  // Get single document by ID
  async getById(id) {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch document');
    return response.json();
  },

  // Create new document
  async create(data) {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create document');
    return response.json();
  },

  // Update document
  async update(id, data) {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[documentsApi] Update failed:', response.status, errorText);
      throw new Error(`Failed to update document: ${errorText}`);
    }
    return response.json();
  },

  // Delete document (soft delete)
  async delete(id) {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete document');
    if (response.status === 204) return { success: true };
    return response.json();
  },

  // Get document statistics
  async getStats() {
    const response = await fetch(`${API_BASE_URL}/documents/all/stats`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  // Get EPQ stats
  async getEPQStats() {
    const response = await fetch(`${API_BASE_URL}/documents/estimates-proposals-quotations/stats`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch EPQ stats');
    return response.json();
  },

  // Get contracts stats
  async getContractsStats() {
    const response = await fetch(`${API_BASE_URL}/documents/contracts/stats`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch contracts stats');
    return response.json();
  },

  // Get invoices stats
  async getInvoicesStats() {
    const response = await fetch(`${API_BASE_URL}/documents/invoices/stats`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch invoices stats');
    return response.json();
  },

  // Send document
  async send(id, data = {}) {
    const response = await fetch(`${API_BASE_URL}/documents/${id}/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to send document');
    return response.json();
  },

  // Duplicate document
  async duplicate(id) {
    const response = await fetch(`${API_BASE_URL}/documents/${id}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to duplicate document');
    return response.json();
  },

  // Convert document type
  async convert(id, targetType) {
    const response = await fetch(`${API_BASE_URL}/documents/${id}/convert/${targetType}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to convert document');
    return response.json();
  },

  // Bulk delete documents
  async bulkDelete(ids) {
    const response = await fetch(`${API_BASE_URL}/documents/bulk/delete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('Failed to delete documents');
    return response.json();
  },

  // Bulk update status
  async bulkUpdateStatus(ids, status) {
    const response = await fetch(`${API_BASE_URL}/documents/bulk/status/${status}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('Failed to update status');
    return response.json();
  },

  // Export documents to CSV
  async exportCSV(ids = null) {
    const params = ids ? `?ids=${ids.join(',')}` : '';
    const response = await fetch(`${API_BASE_URL}/documents/export${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to export documents');
    return response.blob();
  },
};
