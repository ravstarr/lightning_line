import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';
import {
  getAdminStats,
  getAdminCounters,
  getAdminTickets,
  createStaff,
  updateStaffServices,
  removeStaff,
} from '../../services/api';
import { getSocket, disconnectSocket } from '../../services/socket';

const ALL_SERVICES = ['payments', 'documents', 'inquiries', 'registration', 'other'];

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

  // Add staff modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    firstName: '', lastName: '', username: '', password: '',
    counterId: '', serviceTypes: [] as string[], role: 'clerk',
  });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Edit services modal
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [editServices, setEditServices] = useState<string[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

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
    localStorage.removeItem('adminAuthToken');
    localStorage.removeItem('currentAdmin');
    navigate('/admin/login');
  };

  const handleAddStaff = async () => {
    setAddError('');
    if (!addForm.firstName || !addForm.lastName || !addForm.username || !addForm.password || !addForm.counterId) {
      setAddError('All fields are required.');
      return;
    }
    setAddLoading(true);
    try {
      await createStaff({
        firstName: addForm.firstName,
        lastName: addForm.lastName,
        username: addForm.username,
        password: addForm.password,
        counterId: parseInt(addForm.counterId),
        serviceTypes: addForm.serviceTypes,
        role: addForm.role,
      });
      setShowAddModal(false);
      setAddForm({ firstName: '', lastName: '', username: '', password: '', counterId: '', serviceTypes: [], role: 'clerk' });
      fetchData();
    } catch (err: any) {
      setAddError(err.response?.data?.error || 'Failed to create staff member.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdateServices = async () => {
    if (!editingStaff) return;
    setServicesLoading(true);
    try {
      await updateStaffServices(editingStaff.staffId, editServices);
      setShowServicesModal(false);
      fetchData();
    } catch (err) {
      console.error('Update services error:', err);
    } finally {
      setServicesLoading(false);
    }
  };

  const handleRemoveStaff = async (counter: any) => {
    if (!window.confirm(`Remove ${counter.staffName} from Counter ${counter.id}? This cannot be undone.`)) return;
    try {
      await removeStaff(counter.staffId);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove staff member.');
    }
  };

  const toggleAddService = (service: string) => {
    setAddForm((prev) => ({
      ...prev,
      serviceTypes: prev.serviceTypes.includes(service)
        ? prev.serviceTypes.filter((s) => s !== service)
        : [...prev.serviceTypes, service],
    }));
  };

  const toggleEditService = (service: string) => {
    setEditServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
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
                        {counter.delay?.reason && (
                          <p className="text-xs text-yellow-300 mb-2 italic">
                            {counter.status === 'delayed'
                              ? `Delayed: ${counter.delay.reason}${counter.delay.estimatedMinutes ? ` (~${counter.delay.estimatedMinutes} min)` : ''}`
                              : `On break: ${counter.delay.reason}`}
                          </p>
                        )}
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
                  <button
                    onClick={() => { setAddError(''); setShowAddModal(true); }}
                    className="px-4 py-2 bg-aqua-700 hover:bg-aqua-600 text-white rounded-lg text-sm font-medium transition"
                  >
                    + Add Staff
                  </button>
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
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => { setSelectedStaff(counter); setShowStaffModal(true); }}
                                className="text-aqua-400 hover:text-aqua-300 text-sm"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => {
                                  setEditingStaff(counter);
                                  setEditServices(counter.serviceTypes || []);
                                  setShowServicesModal(true);
                                }}
                                className="text-skyblue-400 hover:text-skyblue-300 text-sm"
                              >
                                Edit Services
                              </button>
                              <button
                                onClick={() => handleRemoveStaff(counter)}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {counters.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-skyblue-400">
                            No staff assigned. Click "+ Add Staff" to get started.
                          </td>
                        </tr>
                      )}
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

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-darkblue-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-darkblue-900 rounded-lg p-6 max-w-lg w-full border border-skyblue-700">
            <h3 className="text-xl font-bold text-white mb-4">Add Staff Member</h3>

            {addError && (
              <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
                {addError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              {[
                { label: 'First Name', key: 'firstName' },
                { label: 'Last Name',  key: 'lastName'  },
                { label: 'Username',   key: 'username'  },
                { label: 'Password',   key: 'password'  },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-skyblue-200 mb-1">{label}</label>
                  <input
                    type={key === 'password' ? 'password' : 'text'}
                    value={(addForm as any)[key]}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-skyblue-600 rounded-lg bg-darkblue-700 text-white text-sm"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-skyblue-200 mb-1">Counter ID</label>
                <input
                  type="number"
                  min="1"
                  value={addForm.counterId}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, counterId: e.target.value }))}
                  className="w-full px-3 py-2 border border-skyblue-600 rounded-lg bg-darkblue-700 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-skyblue-200 mb-1">Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-skyblue-600 rounded-lg bg-darkblue-700 text-white text-sm"
                >
                  <option value="clerk">Clerk</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-skyblue-200 mb-2">Services Handled</label>
              <div className="flex flex-wrap gap-2">
                {ALL_SERVICES.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleAddService(s)}
                    className={`px-3 py-1 rounded text-sm font-medium transition capitalize ${
                      addForm.serviceTypes.includes(s)
                        ? 'bg-aqua-700 text-white'
                        : 'bg-darkblue-700 text-skyblue-300 border border-skyblue-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 border border-skyblue-600 text-skyblue-200 rounded-lg hover:bg-darkblue-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStaff}
                disabled={addLoading}
                className="flex-1 py-2 bg-aqua-700 hover:bg-aqua-600 text-white rounded-lg transition disabled:opacity-50"
              >
                {addLoading ? 'Creating...' : 'Create Staff'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Services Modal */}
      {showServicesModal && editingStaff && (
        <div className="fixed inset-0 bg-darkblue-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-darkblue-900 rounded-lg p-6 max-w-md w-full border border-skyblue-700">
            <h3 className="text-xl font-bold text-white mb-1">Edit Services</h3>
            <p className="text-skyblue-300 text-sm mb-6">
              Counter {editingStaff.id} — {editingStaff.staffName}
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
              {ALL_SERVICES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleEditService(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                    editServices.includes(s)
                      ? 'bg-aqua-700 text-white'
                      : 'bg-darkblue-700 text-skyblue-300 border border-skyblue-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowServicesModal(false)}
                className="flex-1 py-2 border border-skyblue-600 text-skyblue-200 rounded-lg hover:bg-darkblue-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateServices}
                disabled={servicesLoading}
                className="flex-1 py-2 bg-skyblue-800 hover:bg-skyblue-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {servicesLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

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
