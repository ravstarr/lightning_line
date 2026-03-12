import React from 'react';
import { mockCounters, mockTickets } from '../../services/mockData';
import Logo from '../../components/Logo';

const StaffDashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-darkblue-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Logo */}
        <div className="bg-darkblue-800 rounded-lg shadow-md p-6 mb-6 flex items-center justify-between border border-skyblue-700">
          <Logo size="md" />
          <h1 className="text-3xl font-bold text-white">Staff Dashboard</h1>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {mockCounters.map(counter => (
            <div key={counter.id} className="bg-darkblue-800 rounded-lg shadow p-6 border border-skyblue-700">
              <h2 className="text-xl font-semibold mb-4 text-white">Counter {counter.id}</h2>
              <div className="space-y-2">
                <p className="text-skyblue-200"><strong className="text-white">Staff:</strong> {counter.staffName}</p>
                <p className="text-skyblue-200"><strong className="text-white">Status:</strong>
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    counter.status === 'active' ? 'bg-green-800 text-green-200' :
                    counter.status === 'delayed' ? 'bg-yellow-800 text-yellow-200' :
                    counter.status === 'break' ? 'bg-skyblue-800 text-skyblue-200' :
                    'bg-red-800 text-red-200'
                  }`}>
                    {counter.status}
                  </span>
                </p>
                <p className="text-skyblue-200"><strong className="text-white">Current Ticket:</strong> {counter.currentTicket || 'None'}</p>
                <p className="text-skyblue-200"><strong className="text-white">Services:</strong> {counter.serviceTypes.join(', ')}</p>
                {counter.delay && (
                  <div className="mt-2 p-2 bg-yellow-900 rounded border border-yellow-700">
                    <p className="text-sm text-yellow-200"><strong>Delay:</strong> {counter.delay.reason}</p>
                    <p className="text-sm text-yellow-300">Estimated: {counter.delay.estimatedMinutes} min</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-darkblue-800 rounded-lg shadow p-6 border border-skyblue-700">
          <h2 className="text-2xl font-semibold mb-4 text-white">Current Queue</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-darkblue-700">
                  <th className="px-4 py-2 text-left text-skyblue-200">Queue #</th>
                  <th className="px-4 py-2 text-left text-skyblue-200">Service</th>
                  <th className="px-4 py-2 text-left text-skyblue-200">Priority</th>
                  <th className="px-4 py-2 text-left text-skyblue-200">Position</th>
                  <th className="px-4 py-2 text-left text-skyblue-200">Status</th>
                  <th className="px-4 py-2 text-left text-skyblue-200">Wait Time</th>
                </tr>
              </thead>
              <tbody>
                {mockTickets.map(ticket => (
                  <tr key={ticket.id} className="border-t border-skyblue-700">
                    <td className="px-4 py-2 text-white">{ticket.queueNumber}</td>
                    <td className="px-4 py-2 capitalize text-white">{ticket.serviceType}</td>
                    <td className="px-4 py-2 capitalize text-white">{ticket.priorityLevel}</td>
                    <td className="px-4 py-2 text-white">{ticket.position}</td>
                    <td className="px-4 py-2 capitalize text-white">{ticket.status}</td>
                    <td className="px-4 py-2 text-white">{ticket.estimatedWait} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboardPage;
