import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import QRCode from 'qrcode.react';
import { getTicket } from '../../services/api';

const TicketDisplayPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [ticket, setTicket] = useState<any>(location.state?.ticket || null);
  const [loading, setLoading] = useState(!ticket);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ticket || !ticketId) return;

    getTicket(ticketId)
      .then((res) => setTicket(res.data.ticket))
      .catch(() => setError('Ticket not found.'))
      .finally(() => setLoading(false));
  }, [ticket, ticketId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
          <p>Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl">{error || 'Ticket not found'}</p>
          <button onClick={() => navigate('/')} className="mt-4 text-sky-400 underline">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-sky-600/10 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-teal-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>

      <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-2xl p-8 max-w-md w-full border border-sky-600/30 z-10">
        <h1 className="text-2xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-300">
          Your Digital Ticket
        </h1>

        <div className="text-center mb-8 bg-slate-900/50 p-6 rounded-lg border border-slate-700">
          <div className="text-5xl font-black text-white mb-2 tracking-wider">{ticket.queueNumber}</div>
          <div className="text-sm uppercase tracking-widest text-sky-400 font-semibold">Queue Number</div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center border-b border-slate-700 pb-3">
            <span className="font-medium text-slate-400">Service</span>
            <span className="capitalize text-white font-semibold">{ticket.serviceType}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-700 pb-3">
            <span className="font-medium text-slate-400">Priority Level</span>
            <span className={`capitalize font-semibold px-2 py-0.5 rounded text-sm ${
              ticket.priorityLevel === 'senior'   ? 'bg-amber-500/20 text-amber-300' :
              ticket.priorityLevel === 'disabled' ? 'bg-purple-500/20 text-purple-300' :
                                                    'bg-sky-500/20 text-sky-300'
            }`}>
              {ticket.priorityLevel}
            </span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-700 pb-3">
            <span className="font-medium text-slate-400">Estimated Wait</span>
            <span className="text-emerald-400 font-bold">{ticket.estimatedWait} min</span>
          </div>
          {ticket.position > 0 && (
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <span className="font-medium text-slate-400">Position in Line</span>
              <span className="text-white font-bold">{ticket.position}</span>
            </div>
          )}
        </div>

        <div className="flex justify-center mb-8 bg-white p-4 rounded-lg">
          <QRCode value={ticket.qrCode || ticket.queueNumber} size={160} />
        </div>

        <div className="text-center text-sm text-slate-400 mb-6">
          Please show this QR code when your number is called.
          <br />You will also receive an SMS notification.
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-sky-900/20"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default TicketDisplayPage;
