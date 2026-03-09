import { api } from '../lib/apiClient';

export const surveysApi = {
  // Get all surveys with optional filters
  async getAll(params = {}) {
    return api.get('/surveys', params);
  },

  // Get survey stats
  async getStats() {
    return api.get('/surveys/stats');
  },

  // Get single survey by ID
  async getById(id) {
    return api.get(`/surveys/${id}`);
  },

  // Create new survey
  async create(data) {
    return api.post('/surveys', data);
  },

  // Update survey
  async update(id, data) {
    return api.put(`/surveys/${id}`, data);
  },

  // Delete survey
  async delete(id) {
    await api.delete(`/surveys/${id}`);
    return { success: true };
  },
};
