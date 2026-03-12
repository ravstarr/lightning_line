import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SERVICE_TYPES } from '../../utils/constants';
import { createTicket } from '../../store/queueSlice';
import { useAppDispatch } from '../../store/hooks';
import Logo from '../Logo';

interface ServiceSelectionProps {
  onServiceSelect: (serviceType: string) => void;
}

const ServiceSelection: React.FC<ServiceSelectionProps> = ({ onServiceSelect }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const { trn, phone, name, dob, hasDisability, isPriority, priorityType } = location.state || {};
  const [selectedService, setSelectedService] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
  };

  const handleSubmit = async () => {
    if (!selectedService) return;
    
    setIsSubmitting(true);
    
    try {
      const result = await dispatch(createTicket({
        trn,
        name,
        dob,
        phone,
        hasDisability,
        serviceType: selectedService as any,
        priorityLevel: isPriority ? (priorityType === 'disabled' ? 'disabled' : 'senior') : 'regular',
        estimatedWait: SERVICE_TYPES.find(s => s.id === selectedService)?.estimatedTime || 15,
        status: 'waiting',
      })).unwrap();

      onServiceSelect(selectedService);
      navigate(`/ticket/${result.id}`, { state: { ticket: result } });
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-darkblue-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <Logo size="md" className="mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">Select Service Type</h1>
          <p className="text-lg text-skyblue-300">Choose the service you need from the tax office</p>

          {isPriority && (
            <div className="inline-flex items-center px-4 py-2 bg-green-800 text-green-200 rounded-full mt-4 border border-green-700">
              Priority Queue Access
            </div>
          )}
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {SERVICE_TYPES.map((service) => (
            <div
              key={service.id}
              onClick={() => handleServiceSelect(service.id)}
              className={`bg-darkblue-800 border rounded-lg p-6 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl border-skyblue-700 ${
                selectedService === service.id 
                  ? 'ring-2 ring-blue-500 transform scale-[1.02]' 
                  : ''
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`text-3xl text-aqua-400 p-3 rounded-lg bg-darkblue-700`}>
                  {service.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {service.name}
                  </h3>
                  <p className="text-skyblue-300 mb-3">{service.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">
                      Est. time: {service.estimatedTime} min
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      service.estimatedTime <= 15 ? 'bg-green-800 text-green-200' : 
                      service.estimatedTime <= 25 ? 'bg-yellow-800 text-yellow-200' : 'bg-red-800 text-red-200'
                    }`}>
                      {service.estimatedTime <= 15 ? 'Fast' :
                       service.estimatedTime <= 25 ? 'Medium' : 'Long'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Service Info */}
        {selectedService && (
          <div className="bg-skyblue-900 border border-blue-700 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Selected Service</h3>
                <p className="text-skyblue-200">
                  {SERVICE_TYPES.find(s => s.id === selectedService)?.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-skyblue-300">Estimated Wait</p>
                <p className="text-2xl font-bold text-aqua-400">
                  {isPriority ? '5-10' : '15-25'} minutes
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 border border-skyblue-600 text-skyblue-200 rounded-lg font-medium hover:bg-darkblue-700 transition"
          >
            ← Back
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-skyblue-300">
              TRN: <span className="font-mono font-semibold text-white">{trn}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!selectedService || isSubmitting}
              className={`px-6 py-3 rounded-lg font-medium transition ${
                (!selectedService || isSubmitting) ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-skyblue-800 hover:bg-skyblue-700 text-white shadow-md'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                'Get Queue Number'
              )}
            </button>
          </div>
        </div>

        {/* Information Section */}
        <div className="mt-12 p-6 bg-darkblue-700 rounded-xl border border-skyblue-600">
          <h4 className="text-lg font-semibold text-white mb-4">How It Works</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="bg-skyblue-900 text-aqua-400 p-2 rounded-lg border border-blue-700">
                <span className="text-xl font-bold">1</span>
              </div>
              <div>
                <h5 className="font-medium text-white">Select Service</h5>
                <p className="text-sm text-skyblue-300">Choose the service you need from available options</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-skyblue-900 text-aqua-400 p-2 rounded-lg border border-blue-700">
                <span className="text-xl font-bold">2</span>
              </div>
              <div>
                <h5 className="font-medium text-white">Get Digital Ticket</h5>
                <p className="text-sm text-skyblue-300">Receive a QR code and queue number on your phone</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-skyblue-900 text-aqua-400 p-2 rounded-lg border border-blue-700">
                <span className="text-xl font-bold">3</span>
              </div>
              <div>
                <h5 className="font-medium text-white">Wait & Get Called</h5>
                <p className="text-sm text-skyblue-300">Monitor your position and get notified when called</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceSelection;

