import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';

const PriorityAccess: React.FC = () => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect to service selection with priority flag
    navigate('/service-selection', { 
      state: { 
        isPriority: true, 
        priorityType: selectedOption,
        additionalInfo 
      } 
    });
  };

  return (
    <div className="min-h-screen bg-darkblue-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-darkblue-800 rounded-2xl shadow-xl p-8 border border-skyblue-700">
        <div className="text-center mb-8">
          <Logo size="md" className="mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Priority Access</h1>
          <p className="text-skyblue-300">Special assistance request</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-skyblue-200 mb-3">
              Please select your priority category:
            </label>
            <div className="space-y-3">
              {[
                { id: '55plus', label: 'Age 55+', description: 'Senior citizen priority access' },
                { id: 'disabled', label: 'Person with Disability', description: 'Mobility or special needs assistance' },
                { id: 'pregnant', label: 'Pregnant', description: 'Expecting mother priority' },
                { id: 'veteran', label: 'Military Veteran', description: 'Veteran priority service' },
                { id: 'other', label: 'Other Special Need', description: 'Other medical or special requirement' }
              ].map((option) => (
                <label
                  key={option.id}
                  className={`flex items-start p-4 border rounded-lg cursor-pointer transition ${
                    selectedOption === option.id
                      ? 'border-aqua-500 bg-aqua-900 ring-2 ring-aqua-500'
                      : 'border-skyblue-600 hover:bg-darkblue-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={option.id}
                    checked={selectedOption === option.id}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    className="mt-1 h-4 w-4 text-aqua-600 border-skyblue-500 focus:ring-aqua-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center">
                      <span className="font-medium text-white">{option.label}</span>
                    </div>
                    <p className="mt-1 text-sm text-skyblue-300">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {selectedOption && (
            <div>
              <label htmlFor="additionalInfo" className="block text-sm font-medium text-skyblue-200 mb-2">
                Additional Information (Optional)
              </label>
              <textarea
                id="additionalInfo"
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Please specify any special requirements..."
                rows={3}
                className="w-full px-4 py-3 border border-skyblue-600 rounded-lg focus:ring-2 focus:ring-skyblue-500 focus:border-skyblue-500 transition bg-darkblue-700 text-white placeholder-skyblue-400"
              />
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 py-3 px-4 border-2 border-skyblue-600 text-skyblue-200 rounded-lg font-medium hover:bg-darkblue-700 transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!selectedOption}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                selectedOption
                  ? 'bg-skyblue-600 hover:bg-skyblue-700 text-white shadow-md'
                  : 'bg-darkblue-600 text-skyblue-400 cursor-not-allowed'
              }`}
            >
              Continue to Service Selection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PriorityAccess;