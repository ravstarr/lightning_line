import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';
import { getAdminStats, getAdminCounters, getAdminTickets } from '../../services/api';
import { getSocket, disconnectSocket } from '../../services/socket';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('currentAdmin');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'customers'>('overview');
  const [counters, setCounters] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState({ waiting: 0, serving: 0, completed: 0, priority: 0 });
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, countersRes, ticketsRes] = await Promise.all([
        getAdminStats(),
        getAdminCounters(),
        getAdminTickets(),
      ]);
      setStats(statsRes.data);
      setCounters(countersRes.data.counters || []);
      setTickets(ticketsRes.data.tickets || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  }, []);

  useEffect(() => {
    if (!admin) {
      navigate('/admin/login');
      return;
    }
    fetchData();

    // Poll every 15 seconds as a fallback
    const interval = setInterval(fetchData, 15000);

    // Real-time updates via WebSocket
    const socket = getSocket();
    socket.on('queue:update', fetchData);
    socket.on('ticket:called', fetchData);
    socket.on('counter:status', fetchData);

    return () => {
      clearInterval(interval);
      socket.off('queue:update', fetchData);
      socket.off('ticket:called', fetchData);
      socket.off('counter:status', fetchData);
      disconnectSocket();
    };
  }, [admin, navigate, fetchData]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentAdmin');
    navigate('/admin/login');
  };

  if (!admin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
          <p>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-darkblue-800 rounded-lg shadow-md p-6 mb-6 flex items-center justify-between border border-skyblue-700">
          <div className="flex items-center space-x-4">
            <Logo size="sm" />
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-skyblue-300">{admin.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchData}
              className="px-3 py-2 border border-skyblue-600 text-skyblue-200 rounded-lg hover:bg-darkblue-700 transition text-sm"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-skyblue-600 text-skyblue-200 rounded-lg hover:bg-darkblue-700 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {[
            { label: 'Waiting',      value: stats.waiting,   color: 'text-skyblue-400', bg: 'bg-skyblue-900' },
            { label: 'Being Served', value: stats.serving,   color: 'text-aqua-400',    bg: 'bg-aqua-900' },
            { label: 'Completed',    value: stats.completed, color: 'text-aqua-400',    bg: 'bg-aqua-900' },
            { label: 'Priority Queue', value: stats.priority, color: 'text-yellow-400', bg: 'bg-yellow-900' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="bg-darkblue-800 border border-skyblue-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-skyblue-300 mb-1">{label}</p>
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                </div>
                <div className={`${bg} p-3 rounded-lg`}>
                  <div className={`w-8 h-8 ${color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-darkblue-800 border border-skyblue-700 rounded-lg mb-6">
          <div className="flex border-b border-skyblue-700">
            {(['overview', 'staff', 'customers'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 px-6 font-medium transition capitalize ${
                  activeTab === tab
                    ? 'text-aqua-400 border-b-2 border-aqua-400'
                    : 'text-skyblue-300 hover:text-skyblue-200'
                }`}
              >
                {tab === 'staff' ? 'Staff Management' : tab === 'customers' ? 'Customer Queue' : 'Overview'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Counter Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {counters.map((counter) => (
                      <div key={counter.id} className="bg-darkblue-700 border border-skyblue-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-white">Counter {counter.id}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            counter.status === 'active'  ? 'bg-green-800 text-green-200' :
                            counter.status === 'delayed' ? 'bg-yellow-800 text-yellow-200' :
                            counter.status === 'break'   ? 'bg-skyblue-800 text-skyblue-200' :
                                                           'bg-red-800 text-red-200'
                          }`}>
                            {counter.status}
                          </span>
                        </div>
                        <p className="text-sm text-skyblue-300 mb-2">{counter.staffName}</p>
                        <p className="text-xs text-gray-500">
                          Current: {counter.currentTicket || 'None'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
                  <div className="space-y-2">
                    {tickets.slice(0, 5).map((ticket) => (
                      <div key={ticket.id} className="bg-darkblue-700 border border-skyblue-700 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{ticket.queueNumber}</p>
                          <p className="text-sm text-skyblue-300 capitalize">{ticket.serviceType}</p>
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-medium ${
                          ticket.status === 'waiting'   ? 'bg-skyblue-800 text-skyblue-200' :
                          ticket.status === 'serving'   ? 'bg-green-800 text-green-200' :
                                                          'bg-gray-700 text-skyblue-200'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                    ))}
                    {tickets.length === 0 && (
                      <p className="text-skyblue-400 text-center py-8">No tickets today</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Staff Management Tab */}
            {activeTab === 'staff' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">Staff & Counters</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-darkblue-700">
                        <th className="px-4 py-3 text-left text-skyblue-200">Counter</th>
                        <th className="px-4 py-3 text-left text-skyblue-200">Staff Name</th>
                        <th className="px-4 py-3 text-left text-skyblue-200">Status</th>
                        <th className="px-4 py-3 text-left text-skyblue-200">Current Ticket</th>
                        <th className="px-4 py-3 text-left text-skyblue-200">Services</th>
                        <th className="px-4 py-3 text-left text-skyblue-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {counters.map((counter) => (
                        <tr key={counter.id} className="border-t border-skyblue-700">
                          <td className="px-4 py-3 text-white">{counter.id}</td>
                          <td className="px-4 py-3 text-white">{counter.staffName}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              counter.status === 'active'  ? 'bg-green-800 text-green-200' :
                              counter.status === 'delayed' ? 'bg-yellow-800 text-yellow-200' :
                              counter.status === 'break'   ? 'bg-skyblue-800 text-skyblue-200' :
                                                             'bg-red-800 text-red-200'
                            }`}>
                              {counter.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white">{counter.currentTicket || '-'}</td>
                          <td className="px-4 py-3 text-skyblue-300 text-sm">
                            {(counter.serviceTypes || []).slice(0, 2).join(', ')}
                            {(counter.serviceTypes || []).length > 2 && '...'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => { setSelectedStaff(counter); setShowStaffModal(true); }}
                              className="text-aqua-400 hover:text-aqua-300 text-sm"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Customer Queue Tab */}
            {activeTab === 'customers' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">All Customers in Queue</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-darkblue-700">
                        <th className="px-4 py-3 text-left text-skyblue-200">Queue #</th>
                        <th className="px-4 py-3 text-left text-skyblue-200">TRN</th>
                        <th className="px-4 py-3 text-left text-skyblue-200">Service</th>
                        <th className="px-4 py-3 text-left text-skyblue-200">Priority</th>
                        <th className="px-4 py-3 text-left text-skyblue-200">Wait</th>
                        <th className="px-4 py-3 text-left text-skyblue-200">Status</th>
                        <th className="px-4 py-3 text-left text-skyblue-200">Counter</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((ticket) => (
                        <tr key={ticket.id} className="border-t border-skyblue-700">
                          <td className="px-4 py-3 text-white font-medium">{ticket.queueNumber}</td>
                          <td className="px-4 py-3 text-white font-mono text-sm">{ticket.trn || '-'}</td>
                          <td className="px-4 py-3 text-white capitalize">{ticket.serviceType}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              ticket.priorityLevel !== 'regular'
                                ? 'bg-green-800 text-green-200'
                                : 'bg-gray-700 text-skyblue-200'
                            }`}>
                              {ticket.priorityLevel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white">{ticket.estimatedWait} min</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              ticket.status === 'waiting'   ? 'bg-skyblue-800 text-skyblue-200' :
                              ticket.status === 'serving'   ? 'bg-green-800 text-green-200' :
                              ticket.status === 'completed' ? 'bg-gray-700 text-skyblue-200' :
                                                              'bg-red-800 text-red-200'
                            }`}>
                              {ticket.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white">{ticket.counterAssigned || '-'}</td>
                        </tr>
                      ))}
                      {tickets.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-skyblue-400">
                            No tickets today
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Staff Details Modal */}
      {showStaffModal && selectedStaff && (
        <div className="fixed inset-0 bg-darkblue-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-darkblue-800 rounded-lg p-6 max-w-2xl w-full border border-skyblue-700">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Counter {selectedStaff.id}</h3>
                <p className="text-skyblue-300">{selectedStaff.staffName}</p>
              </div>
              <button
                onClick={() => setShowStaffModal(false)}
                className="text-skyblue-300 hover:text-skyblue-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-darkblue-700 border border-skyblue-700 rounded-lg p-4">
                  <p className="text-sm text-skyblue-300 mb-1">Status</p>
                  <p className="text-lg font-semibold text-white capitalize">{selectedStaff.status}</p>
                </div>
                <div className="bg-darkblue-700 border border-skyblue-700 rounded-lg p-4">
                  <p className="text-sm text-skyblue-300 mb-1">Current Ticket</p>
                  <p className="text-lg font-semibold text-white">{selectedStaff.currentTicket || 'None'}</p>
                </div>
              </div>

              <div className="bg-darkblue-700 border border-skyblue-700 rounded-lg p-4">
                <p className="text-sm text-skyblue-300 mb-2">Service Types</p>
                <div className="flex flex-wrap gap-2">
                  {(selectedStaff.serviceTypes || []).map((service: string) => (
                    <span key={service} className="px-3 py-1 bg-skyblue-900 text-skyblue-200 rounded text-sm">
                      {service}
                    </span>
                  ))}
                </div>
              </div>

              {selectedStaff.delay && (
                <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
                  <p className="text-sm text-yellow-200 font-medium mb-2">Current Delay</p>
                  <p className="text-white">{selectedStaff.delay.reason}</p>
                  <p className="text-sm text-yellow-300 mt-1">
                    Estimated: {selectedStaff.delay.estimatedMinutes} minutes
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowStaffModal(false)}
                  className="flex-1 py-2 border border-skyblue-600 text-skyblue-200 rounded-lg hover:bg-darkblue-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
