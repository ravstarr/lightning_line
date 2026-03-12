import { Ticket, Counter, QueueMetrics, Service } from '../types';

export const mockTickets: Ticket[] = [
  {
    id: '1',
    trn: '123456789',
    phone: '8765551234',
    serviceType: 'payments',
    priorityLevel: 'senior',
    queueNumber: 'S-001',
    estimatedWait: 15,
    position: 1,
    status: 'called',
    createdAt: new Date('2024-01-15T09:30:00'),
    qrCode: 'mock-qr-1',
    counterAssigned: 2
  },
  {
    id: '2',
    trn: '987654321',
    phone: '8765555678',
    serviceType: 'documents',
    priorityLevel: 'disabled',
    queueNumber: 'D-001',
    estimatedWait: 10,
    position: 2,
    status: 'waiting',
    createdAt: new Date('2024-01-15T09:35:00'),
    qrCode: 'mock-qr-2'
  },
  {
    id: '3',
    trn: '555555555',
    phone: '8765559999',
    serviceType: 'inquiries',
    priorityLevel: 'regular',
    queueNumber: 'A-042',
    estimatedWait: 25,
    position: 8,
    status: 'waiting',
    createdAt: new Date('2024-01-15T09:40:00'),
    qrCode: 'mock-qr-3'
  }
];

export const mockCounters: Counter[] = [
  {
    id: 1,
    staffName: 'Sarah Johnson',
    currentTicket: 'A-038',
    status: 'active',
    serviceTypes: ['payments', 'inquiries']
  },
  {
    id: 2,
    staffName: 'Michael Brown',
    currentTicket: 'S-001',
    status: 'active',
    serviceTypes: ['payments', 'documents', 'registration']
  },
  {
    id: 3,
    staffName: 'Lisa Chen',
    currentTicket: undefined,
    status: 'break',
    serviceTypes: ['inquiries', 'other'],
    delay: {
      reason: 'Staff Break',
      estimatedMinutes: 15,
      startedAt: new Date('2024-01-15T10:00:00'),
      expectedResume: new Date('2024-01-15T10:15:00'),
      message: 'Back in 15 minutes'
    }
  },
  {
    id: 4,
    staffName: 'Robert Davis',
    currentTicket: 'D-008',
    status: 'delayed',
    serviceTypes: ['documents', 'registration'],
    delay: {
      reason: 'Technical Issue',
      estimatedMinutes: 10,
      startedAt: new Date('2024-01-15T09:55:00'),
      expectedResume: new Date('2024-01-15T10:05:00'),
      message: 'Printer malfunction, fixing now'
    }
  }
];

export const mockQueueMetrics: QueueMetrics = {
  regular: 12,
  priority: 3,
  averageWait: 22,
  peakHours: ['09:00-10:00', '13:00-14:00', '15:00-16:00']
};

export const mockServices: Service[] = [
  {
    id: 'payments',
    name: 'Tax Payments',
    description: 'Make tax payments, settle balances, payment plans',
    estimatedTime: 15,
    icon: ''
  },
  {
    id: 'documents',
    name: 'Document Processing',
    description: 'Submit forms, file returns, process documents',
    estimatedTime: 25,
    icon: ''
  },
  {
    id: 'inquiries',
    name: 'General Inquiries',
    description: 'Ask questions, get information, status checks',
    estimatedTime: 10,
    icon: ''
  },
  {
    id: 'registration',
    name: 'New Registration',
    description: 'Register new taxpayers, TRN applications, updates',
    estimatedTime: 30,
    icon: ''
  },
  {
    id: 'other',
    name: 'Other Services',
    description: 'Miscellaneous tax office services',
    estimatedTime: 20,
    icon: ''
  }
];