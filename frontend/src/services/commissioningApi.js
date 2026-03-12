import { apiClient } from '../lib/apiClient';

export const commissioningApi = {
  list: () => apiClient.get('/commissionings'),
  checkOverdue: () => apiClient.post('/commissionings/check-overdue'),
  updateStatus: (id, status) =>
    apiClient.patch(`/commissionings/${id}/status`, { status }),
  updateTasks: (id, tasks) =>
    apiClient.patch(`/commissionings/${id}/tasks`, { tasks }),
  uploadTaskPhotos: (payload) =>
    apiClient.post('/commissionings/upload/task-photos', payload),
  deletePhoto: (id, key) =>
    apiClient.delete(`/commissionings/${id}/photos/${encodeURIComponent(key)}`),
  create: (data) => apiClient.post('/commissionings', data),
  update: (id, data) => apiClient.patch(`/commissionings/${id}`, data),
  remove: (id) => apiClient.delete(`/commissionings/${id}`),
};
