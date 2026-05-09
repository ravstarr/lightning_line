import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Ticket, Counter, QueueMetrics } from '../types';
import * as api from '../services/api';

interface QueueState {
  tickets: Ticket[];
  counters: Counter[];
  metrics: QueueMetrics;
  loading: boolean;
  error: string | null;
}

const initialState: QueueState = {
  tickets: [],
  counters: [],
  metrics: { regular: 0, priority: 0, averageWait: 15, peakHours: ['9-10am', '1-2pm', '3-4pm'] },
  loading: false,
  error: null,
};

export const fetchQueueData = createAsyncThunk('queue/fetchData', async () => {
  const [ticketsRes, countersRes, metricsRes] = await Promise.all([
    api.getAdminTickets(),
    api.getAdminCounters(),
    api.getQueueMetrics(),
  ]);
  return {
    tickets: ticketsRes.data.tickets as Ticket[],
    counters: countersRes.data.counters as Counter[],
    metrics: metricsRes.data as QueueMetrics,
  };
});

export const createTicket = createAsyncThunk(
  'queue/createTicket',
  async (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'qrCode' | 'queueNumber' | 'position'>) => {
    const response = await api.createTicket({
      trn: ticketData.trn,
      serviceType: ticketData.serviceType,
      priorityLevel: ticketData.priorityLevel,
      estimatedWait: ticketData.estimatedWait,
      phone: ticketData.phone,
      hasDisability: ticketData.hasDisability,
    });
    return response.data.ticket as Ticket;
  }
);

const queueSlice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    addTicket: (state, action: PayloadAction<Ticket>) => {
      state.tickets.push(action.payload);
    },
    updateTicketStatus: (
      state,
      action: PayloadAction<{ ticketId: string; status: Ticket['status']; counterId?: number }>
    ) => {
      const ticket = state.tickets.find((t) => t.id === action.payload.ticketId);
      if (ticket) {
        ticket.status = action.payload.status;
        if (action.payload.counterId) ticket.counterAssigned = action.payload.counterId;
      }
    },
    updateCounterStatus: (
      state,
      action: PayloadAction<{ counterId: number; status: Counter['status']; delay?: any }>
    ) => {
      const counter = state.counters.find((c) => c.id === action.payload.counterId);
      if (counter) {
        counter.status = action.payload.status;
        counter.delay = action.payload.delay;
      }
    },
    callNextTicket: (
      state,
      action: PayloadAction<{ counterId: number; ticketId: string }>
    ) => {
      const counter = state.counters.find((c) => c.id === action.payload.counterId);
      const ticket = state.tickets.find((t) => t.id === action.payload.ticketId);
      if (counter && ticket) {
        counter.currentTicket = ticket.queueNumber;
        ticket.status = 'called';
        ticket.counterAssigned = counter.id;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQueueData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQueueData.fulfilled, (state, action) => {
        state.loading = false;
        state.tickets = action.payload.tickets;
        state.counters = action.payload.counters;
        state.metrics = action.payload.metrics;
      })
      .addCase(fetchQueueData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch queue data';
      })
      .addCase(createTicket.fulfilled, (state, action) => {
        state.tickets.push(action.payload);
      });
  },
});

export const { addTicket, updateTicketStatus, updateCounterStatus, callNextTicket } =
  queueSlice.actions;

export default queueSlice.reducer;
