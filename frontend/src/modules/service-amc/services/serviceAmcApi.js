// Service & AMC API Service
import { api } from '../../../lib/apiClient';

const BASE_PATH = '/service-amc';

// ============ TICKETS ============

export const getTickets = async (params = {}) => {
  const response = await api.get(`${BASE_PATH}/tickets`, params);
  return response;
};

export const getTicket = async (id) => {
  const response = await api.get(`${BASE_PATH}/tickets/${id}`);
  return response;
};

export const createTicket = async (data) => {
  const response = await api.post(`${BASE_PATH}/tickets`, data);
  return response;
};

export const updateTicket = async (id, data) => {
  const response = await api.patch(`${BASE_PATH}/tickets/${id}`, data);
  return response;
};

export const deleteTicket = async (id) => {
  const response = await api.delete(`${BASE_PATH}/tickets/${id}`);
  return response;
};

export const getTicketStats = async () => {
  const response = await api.get(`${BASE_PATH}/tickets/stats`);
  return response;
};

// ============ ENGINEERS ============

export const getEngineers = async () => {
  const response = await api.get(`${BASE_PATH}/engineers`);
  return response;
};

// ============ CUSTOMERS ============

export const getCustomers = async () => {
  const response = await api.get(`${BASE_PATH}/customers`);
  return response;
};

// ============ AMC CONTRACTS ============

export const getAmcContracts = async (params = {}) => {
  const response = await api.get(`${BASE_PATH}/contracts`, params);
  return response;
};

export const getAmcContract = async (id) => {
  const response = await api.get(`${BASE_PATH}/contracts/${id}`);
  return response;
};

export const createAmcContract = async (data) => {
  const response = await api.post(`${BASE_PATH}/contracts`, data);
  return response;
};

export const updateAmcContract = async (id, data) => {
  const response = await api.patch(`${BASE_PATH}/contracts/${id}`, data);
  return response;
};

export const deleteAmcContract = async (id) => {
  const response = await api.delete(`${BASE_PATH}/contracts/${id}`);
  return response;
};

export const getAmcContractStats = async () => {
  const response = await api.get(`${BASE_PATH}/contracts/stats`);
  return response;
};

export const autoGenerateAmcContracts = async () => {
  const response = await api.post(`${BASE_PATH}/contracts/auto-generate`);
  return response;
};

export const removeDuplicateContracts = async () => {
  const response = await api.post(`${BASE_PATH}/contracts/remove-duplicates`);
  return response;
};

// ============ AMC VISITS ============

export const getVisits = async (params = {}) => {
  const response = await api.get(`${BASE_PATH}/visits`, params);
  return response;
};

export const getVisit = async (id) => {
  const response = await api.get(`${BASE_PATH}/visits/${id}`);
  return response;
};

export const createVisit = async (data) => {
  const response = await api.post(`${BASE_PATH}/visits`, data);
  return response;
};

export const updateVisit = async (id, data) => {
  const response = await api.patch(`${BASE_PATH}/visits/${id}`, data);
  return response;
};

export const deleteVisit = async (id) => {
  const response = await api.delete(`${BASE_PATH}/visits/${id}`);
  return response;
};

export const getVisitStats = async () => {
  const response = await api.get(`${BASE_PATH}/visits/stats`);
  return response;
};

// ============ AI INSIGHT ============

export const getAiInsight = async () => {
  const response = await api.get(`${BASE_PATH}/ai-insight`);
  return response;
};

export default {
  // Tickets
  getTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  getTicketStats,
  // Engineers
  getEngineers,
  // Customers
  getCustomers,
  // AMC Contracts
  getAmcContracts,
  getAmcContract,
  createAmcContract,
  updateAmcContract,
  deleteAmcContract,
  getAmcContractStats,
  autoGenerateAmcContracts,
  removeDuplicateContracts,
  // AMC Visits
  getVisits,
  getVisit,
  createVisit,
  updateVisit,
  deleteVisit,
  getVisitStats,
  // AI Insight
  getAiInsight,
};
