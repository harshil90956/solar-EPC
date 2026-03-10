import apiClient from '../lib/apiClient';

// ==================== EMPLOYEE APIs ====================
export const employeeApi = {
  getAll: () => apiClient.get('/hrm/employees'),
  getById: (id) => apiClient.get(`/hrm/employees/${id}`),
  create: (data) => apiClient.post('/hrm/employees', data),
  update: (id, data) => apiClient.patch(`/hrm/employees/${id}`, data),
  delete: (id) => apiClient.delete(`/hrm/employees/${id}`),
  getByDepartment: (department) => apiClient.get(`/hrm/employees/by-department/${department}`),
  getByRole: (roleId) => apiClient.get(`/hrm/employees/by-role/${roleId}`),
};

// ==================== ATTENDANCE APIs ====================
export const attendanceApi = {
  checkIn: (data) => apiClient.post('/hrm/attendance/checkin', data),
  checkOut: (data) => apiClient.post('/hrm/attendance/checkout', data),
  getAll: (params) => apiClient.get('/hrm/attendance', { params }),
  getByEmployee: (employeeId) => apiClient.get(`/hrm/attendance/employee/${employeeId}`),
  getMonthlySummary: (employeeId, month, year) =>
    apiClient.get(`/hrm/attendance/summary/${employeeId}`, { params: { month, year } }),
  getTodaySummary: () => apiClient.get('/hrm/attendance/today-summary'),
  update: (id, data) => apiClient.put(`/hrm/attendance/${id}`, data),
  delete: (id) => apiClient.delete(`/hrm/attendance/${id}`),
  bulkUpdate: (data) => apiClient.patch('/hrm/attendance/bulk-update', data),
};

// ==================== LEAVE APIs ====================
export const leaveApi = {
  getAll: (params) => apiClient.get('/hrm/leaves', { params }),
  getById: (id) => apiClient.get(`/hrm/leaves/${id}`),
  create: (data) => apiClient.post('/hrm/leaves', data),
  approve: (id, approvedBy) => apiClient.patch(`/hrm/leaves/${id}/approve`, { approvedBy }),
  reject: (id, data) => apiClient.patch(`/hrm/leaves/${id}/reject`, data),
  getBalance: (employeeId, year) =>
    apiClient.get(`/hrm/leaves/balance/${employeeId}`, { params: { year } }),
};

// ==================== PAYROLL APIs ====================
export const payrollApi = {
  getAll: (params) => apiClient.get('/hrm/payroll', { params }),
  getById: (id) => apiClient.get(`/hrm/payroll/${id}`),
  getByEmployee: (employeeId) => apiClient.get(`/hrm/payroll/employee/${employeeId}`),
  create: (data) => apiClient.post('/hrm/payroll/generate', data),
  generate: (data) => apiClient.post('/hrm/payroll/generate', data),
  generateBulk: (data) => apiClient.post('/hrm/payroll/generate-bulk', data),
  update: (id, data) => apiClient.patch(`/hrm/payroll/${id}`, data),
  delete: (id) => apiClient.delete(`/hrm/payroll/${id}`),
  markAsPaid: (id, paymentReference) =>
    apiClient.patch(`/hrm/payroll/${id}/mark-paid`, { paymentReference }),
  getBreakdown: (id) => apiClient.get(`/hrm/payroll/${id}/breakdown`),
  getSalarySlip: (payrollId) => apiClient.get(`/hrm/payroll/salary-slip/${payrollId}`),
};

// ==================== INCREMENT APIs ====================
export const incrementApi = {
  getAll: (params) => apiClient.get('/hrm/increments', { params }),
  getById: (id) => apiClient.get(`/hrm/increments/${id}`),
  getByEmployee: (employeeId) => apiClient.get(`/hrm/increments/employee/${employeeId}`),
  create: (data) => apiClient.post('/hrm/increments', data),
  update: (id, data) => apiClient.patch(`/hrm/increments/${id}`, data),
  delete: (id) => apiClient.delete(`/hrm/increments/${id}`),
  getHistory: (employeeId) => apiClient.get(`/hrm/increments/history/${employeeId}`),
  getLatestSalary: (employeeId) => apiClient.get(`/hrm/increments/latest-salary/${employeeId}`),
};

// ==================== DEPARTMENT APIs ====================
export const departmentApi = {
  getAll: () => apiClient.get('/hrm/departments'),
  getById: (id) => apiClient.get(`/hrm/departments/${id}`),
  create: (data) => apiClient.post('/hrm/departments', data),
  update: (id, data) => apiClient.patch(`/hrm/departments/${id}`),
  delete: (id) => apiClient.delete(`/hrm/departments/${id}`),
};

export default apiClient;
