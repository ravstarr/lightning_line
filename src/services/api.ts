import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request.
// Admin token lives in localStorage (shared, one admin at a time).
// Staff token lives in sessionStorage (per-tab, so multiple counters can be open simultaneously).
api.interceptors.request.use((config) => {
  const isAdminRoute = config.url?.includes('/admin/');
  const token = isAdminRoute
    ? localStorage.getItem('adminAuthToken')
    : sessionStorage.getItem('staffAuthToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────
export const loginStaff = (username: string, password: string) =>
  api.post('/auth/staff/login', { username, password });

export const loginAdmin = (username: string, password: string) =>
  api.post('/auth/admin/login', { username, password });

// ── Customers ─────────────────────────────────────────────────────────────
export const lookupCustomer = (trn: string) =>
  api.get(`/customers/lookup/${trn}`);

export const checkinCustomer = (data: {
  trn: string;
  firstName?: string;
  lastName?: string;
  middleInitial?: string;
  dob?: string;
  citizenship?: string;
  phone?: string;
}) => api.post('/customers/checkin', data);

// ── Tickets ───────────────────────────────────────────────────────────────
export const createTicket = (data: {
  trn?: string;
  name?: string;
  serviceType: string;
  priorityLevel: string;
  estimatedWait: number;
  phone?: string;
  hasDisability?: boolean;
}) => api.post('/tickets', data);

export const getTicket = (id: string) => api.get(`/tickets/${id}`);

export const getTicketPosition = (id: string) => api.get(`/tickets/position/${id}`);

// ── Staff ─────────────────────────────────────────────────────────────────
export const getStaffQueue = () => api.get('/staff/queue');

export const getCurrentTicket = () => api.get('/staff/current-ticket');

export const updateStaffStatus = (status: string, reason?: string, minutes?: number) =>
  api.post('/staff/status', { status, reason, minutes });

export const callNextCustomer = () => api.post('/staff/call-next');

export const completeService = (ticketId: string) =>
  api.post('/staff/complete', { ticketId });

export const customerArrived = (ticketId: string) =>
  api.post('/staff/customer-arrived', { ticketId });

export const markNoShow = (ticketId: string) =>
  api.post('/staff/no-show', { ticketId });

// ── Admin ─────────────────────────────────────────────────────────────────
export const getAdminStats = () => api.get('/admin/stats');

export const getAdminCounters = () => api.get('/admin/counters');

export const getAdminTickets = (params?: { serviceType?: string; status?: string }) =>
  api.get('/admin/tickets', { params });

export const updateCounterStatus = (counterId: number, status: string) =>
  api.post(`/admin/counters/${counterId}/status`, { status });

// ── Queue ─────────────────────────────────────────────────────────────────
export const getQueueMetrics = () => api.get('/queue/metrics');
export const getQueueEstimates = () => api.get('/queue/estimates');

export default api;
