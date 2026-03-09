import apiClient, { api } from '../lib/apiClient';

export const documentsApi = {
  // Get all documents with optional filters
  async getAll(params = {}) {
    return api.get('/documents/all', params);
  },

  // Get documents by tab type
  async getEstimatesProposalsQuotations(params = {}) {
    return api.get('/documents/estimates-proposals-quotations', params);
  },

  async getContracts(params = {}) {
    return api.get('/documents/contracts', params);
  },

  async getInvoices(params = {}) {
    return api.get('/documents/invoices', params);
  },

  // Get single document by ID
  async getById(id) {
    return api.get(`/documents/${id}`);
  },

  // Create new document
  async create(data) {
    return api.post('/documents', data);
  },

  // Update document
  async update(id, data) {
    return api.put(`/documents/${id}`, data);
  },

  // Delete document (soft delete)
  async delete(id) {
    await api.delete(`/documents/${id}`);
    return { success: true };
  },

  // Get document statistics
  async getStats() {
    return api.get('/documents/all/stats');
  },

  // Get EPQ stats
  async getEPQStats() {
    return api.get('/documents/estimates-proposals-quotations/stats');
  },

  // Get contracts stats
  async getContractsStats() {
    return api.get('/documents/contracts/stats');
  },

  // Get invoices stats
  async getInvoicesStats() {
    return api.get('/documents/invoices/stats');
  },

  // Send document
  async send(id, data = {}) {
    return api.post(`/documents/${id}/send`, data);
  },

  // Duplicate document
  async duplicate(id) {
    return api.post(`/documents/${id}/duplicate`);
  },

  // Convert document type
  async convert(id, targetType) {
    return api.post(`/documents/${id}/convert/${targetType}`);
  },

  // Bulk delete documents
  async bulkDelete(ids) {
    return api.post('/documents/bulk/delete', { ids });
  },

  // Bulk update status
  async bulkUpdateStatus(ids, status) {
    return api.post(`/documents/bulk/status/${status}`, { ids });
  },

  // Export documents to CSV
  async exportCSV(ids = null) {
    const params = ids ? { ids: ids.join(',') } : {};
    const res = await apiClient.get('/documents/export', { params, responseType: 'blob' });
    return res;
  },
};
