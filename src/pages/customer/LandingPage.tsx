import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-darkblue-900 flex flex-col items-center justify-center p-6">
      <div className="bg-darkblue-800 rounded-lg shadow-lg p-12 max-w-2xl w-full border border-skyblue-700">
        <div className="text-center mb-12">
          <Logo size="lg" />
          <p className="text-skyblue-200 mt-6 text-lg">
            Digital Queue Management System for Tax Offices
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/customer')}
            className="w-full bg-skyblue-600 hover:bg-skyblue-700 text-white py-6 px-8 rounded-lg text-xl font-semibold transition-colors shadow-md"
          >
            Customer Check-In
          </button>

          <button
            onClick={() => navigate('/staff/login')}
            className="w-full bg-aqua-600 hover:bg-aqua-700 text-white py-6 px-8 rounded-lg text-xl font-semibold transition-colors shadow-md"
          >
            Staff Login
          </button>

          <button
            onClick={() => navigate('/admin/login')}
            className="w-full bg-darkblue-700 hover:bg-darkblue-600 text-white py-6 px-8 rounded-lg text-xl font-semibold transition-colors border border-skyblue-600 shadow-md"
          >
            Admin Login
          </button>
        </div>

        <div className="mt-8 text-center text-skyblue-300 text-sm">
          <p>No physical tickets • Digital queue management</p>
          <p className="mt-2">Priority service for 55+ and disabled visitors</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

