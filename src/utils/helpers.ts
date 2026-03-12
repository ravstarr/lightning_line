import { Ticket } from '../types';

export const generateQueueNumber = (priority: string, count: number): string => {
  const prefix = priority === 'senior' ? 'S' : 
                 priority === 'disabled' ? 'D' : 
                 priority === 'emergency' ? 'E' : 'A';
  return `${prefix}-${String(count).padStart(3, '0')}`;
};

export const calculateWaitTime = (position: number, priority: string): number => {
  const baseTime = priority === 'regular' ? 10 : 5;
  return position * baseTime;
};

export const validateTRN = (trn: string): boolean => {
  return /^\d{9,}$/.test(trn);
};

export const detectPriorityFromTRN = (trn: string): 'regular' | 'senior' => {
  // Mock detection: if TRN starts with 5-9, treat as senior (55+)
  const firstDigit = parseInt(trn.charAt(0));
  return firstDigit >= 5 ? 'senior' : 'regular';
};

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

export const generateQRData = (ticket: Ticket): string => {
  return JSON.stringify({
    id: ticket.id,
    queueNumber: ticket.queueNumber,
    trn: ticket.trn ? (ticket.trn.substring(0, 3) + '***' + ticket.trn.substring(ticket.trn.length - 3)) : 'N/A'
  });
};