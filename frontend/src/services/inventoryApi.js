import api from '../lib/apiClient';

export const inventoryApi = {
  // Get all inventory items
  getAll: (params = {}) => {
    return api.get('/inventory', { params });
  },

  // Get categories
  getCategories: () => {
    return api.get('/inventory/categories');
  },

  // Get units
  getUnits: () => {
    return api.get('/inventory/units');
  },

  // Get items by category
  getByCategory: () => {
    return api.get('/inventory/by-category');
  },

  // Get single item
  getOne: (itemId) => {
    return api.get(`/inventory/${itemId}`);
  },

  // Create item
  create: (data) => {
    return api.post('/inventory', data);
  },

  // Update item
  update: (itemId, data) => {
    return api.patch(`/inventory/${itemId}`, data);
  },

  // Delete item
  delete: (itemId) => {
    return api.delete(`/inventory/${itemId}`);
  },

  // Stock in
  stockIn: (itemId, data) => {
    return api.post(`/inventory/${itemId}/stock-in`, data);
  },

  // Stock out
  stockOut: (itemId, data) => {
    return api.post(`/inventory/${itemId}/stock-out`, data);
  },

  // Get stats
  getStats: () => {
    return api.get('/inventory/stats');
  },

  // Transfer stock between warehouses
  transferStock: (data) => {
    return api.post('/inventory/transfers', {
      fromInventoryId: data.itemId,
      toWarehouseId: data.toWarehouse,
      quantity: data.quantity,
      remarks: data.remarks || `Transfer from ${data.fromWarehouse} to ${data.toWarehouse}`,
      reference: data.reference,
      referenceType: data.referenceType,
      projectId: data.projectId,
      projectName: data.projectName
    });
  },
};
