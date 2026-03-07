import axios from 'axios';
import { API_URL } from '../config/app.config';

const hrmApi = axios.create({
  baseURL: `${API_URL}/hrm`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
hrmApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`[HRM API] ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params);
  return config;
});

// Response interceptor for error handling
hrmApi.interceptors.response.use(
  (response) => {
    console.log(`[HRM API] Response:`, response.data);
    return response;
  },
  (error) => {
    console.error(`[HRM API] Error:`, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ==================== EMPLOYEE APIs ====================
export const employeeApi = {
  getAll: () => hrmApi.get('/employees'),
  getById: (id) => hrmApi.get(`/employees/${id}`),
  create: (data) => hrmApi.post('/employees', data),
  update: (id, data) => hrmApi.patch(`/employees/${id}`, data),
  delete: (id) => hrmApi.delete(`/employees/${id}`),
  getByDepartment: (department) => hrmApi.get(`/employees/by-department/${department}`),
  getByRole: (roleId) => hrmApi.get(`/employees/by-role/${roleId}`),
};

// ==================== ATTENDANCE APIs ====================
export const attendanceApi = {
  checkIn: (data) => hrmApi.post('/attendance/checkin', data),
  checkOut: (data) => hrmApi.post('/attendance/checkout', data),
  getAll: (params) => hrmApi.get('/attendance', { params }),
  getByEmployee: (employeeId) => hrmApi.get(`/attendance/employee/${employeeId}`),
  getTodaySummary: () => hrmApi.get('/attendance/today-summary'),
  getMonthlySummary: (employeeId, month, year) =>
    hrmApi.get(`/attendance/summary/${employeeId}`, { params: { month, year } }),
  update: (id, data) => hrmApi.put(`/attendance/${id}`, data),
  delete: (id) => hrmApi.delete(`/attendance/${id}`),
};

// ==================== LEAVE APIs ====================
export const leaveApi = {
  getAll: (params) => hrmApi.get('/leaves', { params }),
  getById: (id) => hrmApi.get(`/leaves/${id}`),
  create: (data) => hrmApi.post('/leaves', data),
  approve: (id, approvedBy) => hrmApi.patch(`/leaves/${id}/approve`, { approvedBy }),
  reject: (id, data) => hrmApi.patch(`/leaves/${id}/reject`, data),
  getBalance: (employeeId, year) =>
    hrmApi.get(`/leaves/balance/${employeeId}`, { params: { year } }),
};

// ==================== PAYROLL APIs ====================
export const payrollApi = {
  getAll: (params) => hrmApi.get('/payroll', { params }),
  getById: (id) => hrmApi.get(`/payroll/${id}`),
  getByEmployee: (employeeId) => hrmApi.get(`/payroll/employee/${employeeId}`),
  generate: (data) => hrmApi.post('/payroll/generate', data),
  generateBulk: (data) => hrmApi.post('/payroll/generate-bulk', data),
  update: (id, data) => hrmApi.patch(`/payroll/${id}`, data),
  delete: (id) => hrmApi.delete(`/payroll/${id}`),
  markAsPaid: (id, paymentReference) =>
    hrmApi.patch(`/payroll/${id}/mark-paid`, { paymentReference }),
  getBreakdown: (id) => hrmApi.get(`/payroll/${id}/breakdown`),
  getSalarySlip: (payrollId) => hrmApi.get(`/payroll/salary-slip/${payrollId}`),
};

// ==================== INCREMENT APIs ====================
export const incrementApi = {
  getAll: (params) => hrmApi.get('/increments', { params }),
  getById: (id) => hrmApi.get(`/increments/${id}`),
  getByEmployee: (employeeId) => hrmApi.get(`/increments/employee/${employeeId}`),
  create: (data) => hrmApi.post('/increments', data),
  update: (id, data) => hrmApi.patch(`/increments/${id}`, data),
  delete: (id) => hrmApi.delete(`/increments/${id}`),
  getHistory: (employeeId) => hrmApi.get(`/increments/history/${employeeId}`),
  getLatestSalary: (employeeId) => hrmApi.get(`/increments/latest-salary/${employeeId}`),
};

// ==================== DEPARTMENT APIs ====================
export const departmentApi = {
  getAll: () => hrmApi.get('/departments'),
  getById: (id) => hrmApi.get(`/departments/${id}`),
  create: (data) => hrmApi.post('/departments', data),
  update: (id, data) => hrmApi.patch(`/departments/${id}`, data),
  delete: (id) => hrmApi.delete(`/departments/${id}`),
};

export default hrmApi;
