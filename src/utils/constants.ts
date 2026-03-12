export const SERVICE_TYPES = [
  {
    id: 'payments' as const,
    name: 'Tax Payments',
    description: 'Make tax payments, settle balances',
    estimatedTime: 15,
    icon: '',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'documents' as const,
    name: 'Document Processing',
    description: 'Submit forms, file returns, process documents',
    estimatedTime: 25,
    icon: '',
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'inquiries' as const,
    name: 'General Inquiries',
    description: 'Ask questions, get information',
    estimatedTime: 10,
    icon: '',
    color: 'bg-purple-100 text-purple-800'
  },
  {
    id: 'registration' as const,
    name: 'New Registration',
    description: 'Register new taxpayers, TRN applications',
    estimatedTime: 30,
    icon: '',
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    id: 'other' as const,
    name: 'Other Services',
    description: 'Miscellaneous tax office services',
    estimatedTime: 20,
    icon: '',
    color: 'bg-gray-100 text-gray-800'
  }
];

export const PRIORITY_LEVELS = {
  regular: { name: 'Regular', color: 'bg-gray-100 text-gray-800', icon: '' },
  senior: { name: 'Senior (55+)', color: 'bg-green-100 text-green-800', icon: '' },
  disabled: { name: 'Disabled', color: 'bg-blue-100 text-blue-800', icon: '' },
  emergency: { name: 'Emergency', color: 'bg-red-100 text-red-800', icon: '' }
};

export const DELAY_REASONS = [
  { id: 'technical', name: 'Technical Issue', icon: '' },
  { id: 'complex', name: 'Complex Case', icon: '' },
  { id: 'consultation', name: 'Supervisor Consultation', icon: '' },
  { id: 'documents', name: 'Waiting for Documents', icon: '' },
  { id: 'break', name: 'Staff Break', icon: '' },
  { id: 'meeting', name: 'Meeting', icon: '' },
  { id: 'training', name: 'Training', icon: '' },
  { id: 'other', name: 'Other', icon: '' }
];

