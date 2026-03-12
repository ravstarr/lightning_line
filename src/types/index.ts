export interface Ticket {
  id: string;
  trn?: string;
  name?: string;
  dob?: string;
  birthYear?: string;
  phone?: string;
  hasDisability?: boolean;
  serviceType: ServiceType;
  priorityLevel: PriorityLevel;
  queueNumber: string;
  estimatedWait: number;
  position: number;
  status: TicketStatus;
  createdAt: Date;
  qrCode: string;
  counterAssigned?: number;
}

export type ServiceType = 
  | 'payments'
  | 'documents'
  | 'inquiries'
  | 'registration'
  | 'other';

export type PriorityLevel = 
  | 'regular'
  | 'senior'      // 55+
  | 'disabled'    // Disability
  | 'emergency';  // Other priority

export type TicketStatus = 
  | 'waiting'
  | 'called'
  | 'serving'
  | 'completed'
  | 'cancelled';

export interface Counter {
  id: number;
  staffName: string;
  currentTicket?: string;
  status: CounterStatus;
  serviceTypes: ServiceType[];
  delay?: DelayInfo;
}

export type CounterStatus = 
  | 'active'
  | 'delayed'
  | 'break'
  | 'closed';

export interface DelayInfo {
  reason: string;
  estimatedMinutes: number;
  startedAt: Date;
  expectedResume: Date;
  message?: string;
}

export interface QueueMetrics {
  regular: number;
  priority: number;
  averageWait: number;
  peakHours: string[];
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: 'staff' | 'supervisor' | 'admin';
  counterId?: number;
}

export interface Service {
  id: ServiceType;
  name: string;
  description: string;
  estimatedTime: number;
  icon: string;
}