// Finance API Service — All finance-related API calls
import { api } from './apiClient';

// Helper to extract data from wrapped response { success: true, data: ... }
const extractData = (response) => {
  return response?.data ?? response;
};

// Helper to handle errors with better messages
const handleError = (err) => {
  console.error('API Error:', err);
  // Handle wrapped error response: { success: false, error: { message, statusCode } }
  if (err.raw?.response?.data?.error?.message) {
    throw new Error(err.raw.response.data.error.message);
  }
  if (err.raw?.response?.data?.message) {
    throw new Error(err.raw.response.data.message);
  }
  if (err.raw?.response?.data?.errors) {
    const errors = err.raw.response.data.errors;
    if (Array.isArray(errors) && errors[0]) {
      const firstError = errors[0];
      throw new Error(`${firstError.field || 'Error'}: ${firstError.message}`);
    }
  }
  throw new Error(err.message || 'An error occurred');
};

export const financeApi = {
  // Customers
  getCustomers: () => api.get('/finance/customers').then(extractData).catch(handleError),

  // Projects - using finance module endpoint
  getProject: (projectId) => api.get(`/finance/projects/${projectId}`).then(extractData).catch(handleError),
  getProjects: () => api.get('/finance/projects').then(extractData).catch(handleError),
  getAllowedPaymentTerms: (projectStatus) => api.get('/finance/allowed-payment-terms', { projectStatus }).then(extractData).catch(handleError),

  // Invoices
  getInvoices: (status) => api.get('/finance/invoices', { status }).then(extractData).catch(handleError),
  getInvoice: (id) => api.get(`/finance/invoices/${id}`).then(extractData).catch(handleError),
  createInvoice: (data) => {
    const invoiceData = {
      invoiceNumber: data.invoiceNumber.trim(),
      projectId: data.projectId || undefined,
      projectStatus: data.projectStatus || undefined,
      customerName: data.customerName.trim(),
      amount: parseFloat(data.amount),
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      ...(data.paymentTerms && { paymentTerms: data.paymentTerms }),
      ...(data.description && { description: data.description }),
    };
    return api.post('/finance/invoices', invoiceData).then(extractData).catch(handleError);
  },
  updateInvoice: (id, data) => api.patch(`/finance/invoices/${id}`, data).then(extractData).catch(handleError),
  deleteInvoice: (id) => api.delete(`/finance/invoices/${id}`).then(extractData).catch(handleError),
  updateInvoiceStatus: (id, status) => api.patch(`/finance/invoices/${id}/status`, { status }).then(extractData).catch(handleError),
  recordInvoicePayment: (data) => api.post('/finance/invoices/record-payment', data).then(extractData).catch(handleError),
  sendInvoiceReminder: (invoiceId, data) => api.post(`/finance/invoices/${invoiceId}/send-reminder`, {
    reminderType: data.reminderType,
    customerEmail: data.customerEmail,
    messageBody: data.messageBody,
  }).then(extractData).catch(handleError),
  getInvoiceTimeline: (invoiceId) => api.get(`/finance/invoices/${invoiceId}/timeline`).then(extractData).catch(handleError),

  // Payments
  getPayments: (invoiceId) => api.get('/finance/payments', { invoiceId }).then(extractData).catch(handleError),
  getPayment: (id) => api.get(`/finance/payments/${id}`).then(extractData).catch(handleError),
  createPayment: (data) => api.post('/finance/payments', data).then(extractData).catch(handleError),
  updatePayment: (id, data) => api.patch(`/finance/payments/${id}`, data).then(extractData).catch(handleError),
  deletePayment: (id) => api.delete(`/finance/payments/${id}`).then(extractData).catch(handleError),
  // Independent Payment Recording (Customer & Vendor) - lifecycle
  initiateFinancePayment: (data) => api.post('/finance/payments/initiate', data).then(extractData).catch(handleError),
  verifyFinancePayment: (id, data) => api.post(`/finance/payments/${id}/verify`, data).then(extractData).catch(handleError),
  completeFinancePayment: (id, data) => api.post(`/finance/payments/${id}/complete`, data).then(extractData).catch(handleError),

  // Expenses
  getExpenses: (status, category) => api.get('/finance/expenses', { status, category }).then(extractData).catch(handleError),
  getExpense: (id) => api.get(`/finance/expenses/${id}`).then(extractData).catch(handleError),
  createExpense: (data) => api.post('/finance/expenses', data).then(extractData).catch(handleError),
  updateExpense: (id, data) => api.patch(`/finance/expenses/${id}`, data).then(extractData).catch(handleError),
  deleteExpense: (id) => api.delete(`/finance/expenses/${id}`).then(extractData).catch(handleError),

  // Payables
  getPayablesSummary: () => api.get('/finance/payables-summary').then(extractData).catch(handleError),

  // Transactions
  getTransactions: (type) => api.get('/finance/transactions', { type }).then(extractData).catch(handleError),
  getTransaction: (id) => api.get(`/finance/transactions/${id}`).then(extractData).catch(handleError),
  createTransaction: (data) => api.post('/finance/transactions', data).then(extractData).catch(handleError),
  updateTransaction: (id, data) => api.patch(`/finance/transactions/${id}`, data).then(extractData).catch(handleError),
  deleteTransaction: (id) => api.delete(`/finance/transactions/${id}`).then(extractData).catch(handleError),

  // Dashboard & Analytics
  getDashboardStats: () => api.get('/finance/dashboard-stats').then(extractData).catch(handleError),
  getCashFlow: (months) => api.get('/finance/cash-flow', { months }).then(extractData).catch(handleError),
  getMonthlyRevenue: (months) => api.get('/finance/monthly-revenue', { months }).then(extractData).catch(handleError),
};
