import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
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

// ── Admin ─────────────────────────────────────────────────────────────────
export const getAdminStats = () => api.get('/admin/stats');

export const getAdminCounters = () => api.get('/admin/counters');

export const getAdminTickets = (params?: { serviceType?: string; status?: string }) =>
  api.get('/admin/tickets', { params });

export const updateCounterStatus = (counterId: number, status: string) =>
  api.post(`/admin/counters/${counterId}/status`, { status });

// ── Queue ─────────────────────────────────────────────────────────────────
export const getQueueMetrics = () => api.get('/queue/metrics');

export default api;
