import { api } from '../lib/apiClient';

export const tasksApi = {
  // Get all tasks with optional filters
  async getAll(params = {}) {
    return api.get('/tasks', params);
  },

  // Get single task by ID
  async getById(id) {
    return api.get(`/tasks/${id}`);
  },

  // Create new task (admin only)
  async create(data) {
    return api.post('/tasks', data);
  },

  // Update task
  async update(id, data) {
    return api.patch(`/tasks/${id}`, data);
  },

  // Delete task (admin only)
  async delete(id) {
    return api.delete(`/tasks/${id}`);
  },

  // Get task statistics
  async getStats() {
    return api.get('/tasks/stats/overview');
  },

  // Get users in tenant for assignment (admin only)
  async getAssignees() {
    return api.get('/tasks/users/assignees');
  },
};
