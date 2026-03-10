import apiClient from '../lib/apiClient';

const BASE_URL = '/site-surveys';

export const siteSurveysApi = {
  // Get all surveys with filters
  getAll: (params = {}) => {
    return apiClient.get(BASE_URL, { params });
  },

  // Get survey statistics
  getStats: () => {
    return apiClient.get(`${BASE_URL}/stats`);
  },

  // Get single survey by ID
  getById: (id) => {
    return apiClient.get(`${BASE_URL}/${id}`);
  },

  // Get survey by lead ID
  getByLeadId: (leadId) => {
    return apiClient.get(`${BASE_URL}/lead/${leadId}`);
  },

  // Create new survey
  create: (data) => {
    return apiClient.post(BASE_URL, data);
  },

  // Update survey
  update: (id, data) => {
    return apiClient.put(`${BASE_URL}/${id}`, data);
  },

  // Move survey to Active status
  moveToActive: (id, data) => {
    return apiClient.patch(`${BASE_URL}/${id}/move-to-active`, data);
  },

  // Move survey to Complete status
  moveToComplete: (id, data) => {
    return apiClient.patch(`${BASE_URL}/${id}/move-to-complete`, data);
  },

  // Auto-create from lead
  createFromLead: (leadData) => {
    return apiClient.post(`${BASE_URL}/create-from-lead`, leadData);
  },

  // Delete survey
  delete: (id) => {
    return apiClient.delete(`${BASE_URL}/${id}`);
  },

  // Upload survey images
  uploadImages: async (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    
    const response = await apiClient.post('/upload/survey-images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Upload roof layout
  uploadRoofLayout: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/upload/roof-layout', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};

export default siteSurveysApi;
