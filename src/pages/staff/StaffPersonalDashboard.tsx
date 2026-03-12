import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockTickets, mockCounters } from '../../services/mockData';
import Logo from '../../components/Logo';

const StaffPersonalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<any>(null);
  const [status, setStatus] = useState<'active' | 'break' | 'delayed'>('active');
  const [breakReason, setBreakReason] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<any>(null);
  const [myQueue, setMyQueue] = useState<any[]>([]);

  useEffect(() => {
    const staffData = localStorage.getItem('currentStaff');
    if (!staffData) {
      navigate('/staff/login');
      return;
    }

    const parsedStaff = JSON.parse(staffData);
    setStaff(parsedStaff);

    // Get counter info
    const counter = mockCounters.find(c => c.id === parsedStaff.counterId);
    if (counter) {
      setStatus(counter.status as any);

      // Get current ticket
      if (counter.currentTicket) {
        const ticket = mockTickets.find(t => t.queueNumber === counter.currentTicket);
        setCurrentTicket(ticket);
      }

      // Get queue for this counter's service types
      const queue = mockTickets.filter(t =>
        counter.serviceTypes.includes(t.serviceType as any) &&
        t.status === 'waiting'
      );
      setMyQueue(queue);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('currentStaff');
    navigate('/staff/login');
  };

  const handleStatusChange = (newStatus: 'active' | 'break' | 'delayed') => {
    if (newStatus === 'break') {
      setShowBreakModal(true);
    } else if (newStatus === 'delayed') {
      setShowDelayModal(true);
    } else {
      setStatus(newStatus);
    }
  };

  const confirmBreak = () => {
    setStatus('break');
    setShowBreakModal(false);
    setCurrentTicket(null);
    // In real app, this would notify the backend
  };

  const confirmDelay = () => {
    setStatus('delayed');
    setShowDelayModal(false);
    // In real app, this would notify the backend and update wait times
  };

  const callNextCustomer = () => {
    if (myQueue.length > 0) {
      const nextTicket = myQueue[0];
      setCurrentTicket(nextTicket);
      setMyQueue(myQueue.slice(1));
      // In real app, this would update the backend
    }
  };

  const completeService = () => {
    setCurrentTicket(null);
    // In real app, this would mark ticket as completed in backend
  };

  if (!staff) return null;

  return (
    <div className="min-h-screen bg-darkblue-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-darkblue-800 rounded-lg shadow-md p-6 mb-6 flex items-center justify-between border border-skyblue-700">
          <div className="flex items-center space-x-4">
            <Logo size="sm" />
            <div>
              <h1 className="text-2xl font-bold text-white">Counter {staff.counterId}</h1>
              <p className="text-skyblue-300">{staff.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right mr-4">
              <p className="text-sm text-skyblue-300">Status</p>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                status === 'active' ? 'bg-green-800 text-green-200' :
                status === 'break' ? 'bg-skyblue-800 text-skyblue-200' :
                'bg-yellow-800 text-yellow-200'
              }`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-skyblue-600 text-skyblue-200 rounded-lg hover:bg-darkblue-700 transition"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Customer */}
          <div className="bg-darkblue-800 rounded-lg shadow p-6 border border-skyblue-700">
            <h2 className="text-xl font-semibold mb-4 text-white">Current Customer</h2>

            {currentTicket ? (
              <div className="space-y-4">
                <div className="bg-skyblue-900 border border-blue-700 rounded-lg p-6 text-center">
                  <div className="text-5xl font-bold text-aqua-400 mb-2">
                    {currentTicket.queueNumber}
                  </div>
                  <div className="text-sm text-skyblue-200">Queue Number</div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between border-b border-skyblue-700 pb-2">
                    <span className="text-skyblue-300">Service:</span>
                    <span className="text-white capitalize">{currentTicket.serviceType}</span>
                  </div>
                  <div className="flex justify-between border-b border-skyblue-700 pb-2">
                    <span className="text-skyblue-300">Priority:</span>
                    <span className={`capitalize font-medium ${
                      currentTicket.priorityLevel === 'senior' || currentTicket.priorityLevel === 'disabled' 
                        ? 'text-green-400' 
                        : 'text-white'
                    }`}>
                      {currentTicket.priorityLevel}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-skyblue-700 pb-2">
                    <span className="text-skyblue-300">TRN:</span>
                    <span className="text-white font-mono">{currentTicket.trn}</span>
                  </div>
                  {currentTicket.phone && (
                    <div className="flex justify-between border-b border-skyblue-700 pb-2">
                      <span className="text-skyblue-300">Phone:</span>
                      <span className="text-white">{currentTicket.phone}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={completeService}
                  className="w-full py-3 bg-green-800 hover:bg-green-700 text-white rounded-lg font-medium transition"
                >
                  Complete Service
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-skyblue-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-skyblue-400 mb-4">No customer being served</p>
                <button
                  onClick={callNextCustomer}
                  disabled={myQueue.length === 0 || status !== 'active'}
                  className={`px-6 py-3 rounded-lg font-medium transition ${
                    myQueue.length === 0 || status !== 'active'
                      ? 'bg-gray-700 text-skyblue-400 cursor-not-allowed'
                      : 'bg-skyblue-800 hover:bg-skyblue-700 text-white'
                  }`}
                >
                  Call Next Customer
                </button>
              </div>
            )}
          </div>

          {/* Queue & Status Controls */}
          <div className="space-y-6">
            {/* Status Controls */}
            <div className="bg-darkblue-800 rounded-lg shadow p-6 border border-skyblue-700">
              <h2 className="text-xl font-semibold mb-4 text-white">Status Controls</h2>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleStatusChange('active')}
                  className={`py-3 rounded-lg font-medium transition ${
                    status === 'active'
                      ? 'bg-green-800 text-white'
                      : 'bg-darkblue-700 text-skyblue-200 hover:bg-darkblue-600'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => handleStatusChange('break')}
                  className={`py-3 rounded-lg font-medium transition ${
                    status === 'break'
                      ? 'bg-skyblue-800 text-white'
                      : 'bg-darkblue-700 text-skyblue-200 hover:bg-darkblue-600'
                  }`}
                >
                  On Break
                </button>
                <button
                  onClick={() => handleStatusChange('delayed')}
                  className={`py-3 rounded-lg font-medium transition ${
                    status === 'delayed'
                      ? 'bg-yellow-800 text-white'
                      : 'bg-darkblue-700 text-skyblue-200 hover:bg-darkblue-600'
                  }`}
                >
                  Delayed
                </button>
              </div>
            </div>

            {/* My Queue */}
            <div className="bg-darkblue-800 rounded-lg shadow p-6 border border-skyblue-700">
              <h2 className="text-xl font-semibold mb-4 text-white">
                My Queue ({myQueue.length})
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {myQueue.length === 0 ? (
                  <p className="text-center text-skyblue-400 py-8">No customers in queue</p>
                ) : (
                  myQueue.slice(0, 10).map((ticket, index) => (
                    <div
                      key={ticket.id}
                      className="bg-darkblue-700 border border-skyblue-700 rounded-lg p-4 hover:bg-darkblue-600 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="bg-skyblue-900 text-aqua-400 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-white">{ticket.queueNumber}</p>
                            <p className="text-sm text-skyblue-300 capitalize">{ticket.serviceType}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {(ticket.priorityLevel === 'senior' || ticket.priorityLevel === 'disabled') && (
                            <span className="text-xs bg-green-800 text-green-200 px-2 py-1 rounded">
                              Priority
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Break Modal */}
      {showBreakModal && (
        <div className="fixed inset-0 bg-darkblue-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-darkblue-900 rounded-lg p-6 max-w-md w-full border border-skyblue-700">
            <h3 className="text-xl font-bold text-white mb-4">Take a Break</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-skyblue-200 mb-2">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={breakReason}
                onChange={(e) => setBreakReason(e.target.value)}
                placeholder="e.g., Lunch break"
                className="w-full px-4 py-2 border border-skyblue-600 rounded-lg bg-darkblue-700 text-white"
              />
            </div>
            <p className="text-sm text-skyblue-300 mb-6">
              Your queue will be temporarily paused. Current customer will be completed first.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBreakModal(false)}
                className="flex-1 py-2 border border-skyblue-600 text-skyblue-200 rounded-lg hover:bg-darkblue-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmBreak}
                className="flex-1 py-2 bg-skyblue-800 hover:bg-skyblue-700 text-white rounded-lg transition"
              >
                Confirm Break
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delay Modal */}
      {showDelayModal && (
        <div className="fixed inset-0 bg-darkblue-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-darkblue-900 rounded-lg p-6 max-w-md w-full border border-skyblue-700">
            <h3 className="text-xl font-bold text-white mb-4">Report Delay</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-skyblue-200 mb-2">
                Reason
              </label>
              <select
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                className="w-full px-4 py-2 border border-skyblue-600 rounded-lg bg-darkblue-700 text-white"
              >
                <option value="">Select reason</option>
                <option value="technical">Technical Issue</option>
                <option value="complex">Complex Case</option>
                <option value="system">System Problem</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-skyblue-200 mb-2">
                Estimated Delay (minutes)
              </label>
              <input
                type="number"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(parseInt(e.target.value))}
                min="5"
                max="60"
                className="w-full px-4 py-2 border border-skyblue-600 rounded-lg bg-darkblue-700 text-white"
              />
            </div>
            <p className="text-sm text-skyblue-300 mb-6">
              Customers will be notified of updated wait times.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDelayModal(false)}
                className="flex-1 py-2 border border-skyblue-600 text-skyblue-200 rounded-lg hover:bg-darkblue-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelay}
                disabled={!delayReason}
                className={`flex-1 py-2 rounded-lg transition ${
                  !delayReason
                    ? 'bg-gray-700 text-skyblue-400 cursor-not-allowed'
                    : 'bg-yellow-800 hover:bg-yellow-700 text-white'
                }`}
              >
                Confirm Delay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPersonalDashboard;

