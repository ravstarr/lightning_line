import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';

const StaffLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Mock staff credentials
  const mockStaff = [
    { id: '1', name: 'John Smith', password: 'staff123', counterId: 1 },
    { id: '2', name: 'Sarah Johnson', password: 'staff123', counterId: 2 },
    { id: '3', name: 'Michael Brown', password: 'staff123', counterId: 3 },
    { id: '4', name: 'Lisa Chen', password: 'staff123', counterId: 4 },
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    const staff = mockStaff.find(s => s.id === staffId && s.password === password);

    if (staff) {
      // Store staff info in localStorage (temporary until backend is ready)
      localStorage.setItem('currentStaff', JSON.stringify(staff));
      navigate('/staff/dashboard');
    } else {
      setError('Invalid staff ID or password');
    }
  };

  return (
    <div className="min-h-screen bg-darkblue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-darkblue-800 rounded-2xl shadow-xl p-8 border border-skyblue-700">
        <div className="text-center mb-8">
          <Logo size="md" className="mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Staff Login</h1>
          <p className="text-skyblue-300">Access your service counter</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="staffId" className="block text-sm font-medium text-skyblue-200 mb-2">
              Staff ID
            </label>
            <input
              type="text"
              id="staffId"
              value={staffId}
              onChange={(e) => {
                setStaffId(e.target.value);
                setError('');
              }}
              placeholder="Enter your staff ID"
              className="w-full px-4 py-3 border border-skyblue-600 rounded-lg focus:ring-2 focus:ring-skyblue-500 focus:border-skyblue-500 transition bg-darkblue-700 text-white placeholder-skyblue-400"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-skyblue-200 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-skyblue-600 rounded-lg focus:ring-2 focus:ring-skyblue-500 focus:border-skyblue-500 transition bg-darkblue-700 text-white placeholder-skyblue-400"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900 border border-red-700 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-skyblue-600 hover:bg-skyblue-700 text-white rounded-lg font-medium transition shadow-md"
          >
            Login
          </button>

          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/login')}
              className="text-sm text-aqua-400 hover:text-aqua-300"
            >
              Admin Login →
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-skyblue-700">
            <p className="text-center text-sm text-skyblue-300 mb-3">Demo Credentials:</p>
            <div className="bg-darkblue-700 rounded-lg p-3 space-y-1 text-xs text-skyblue-200">
              <p>Staff ID: 1, 2, 3, or 4</p>
              <p>Password: staff123</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffLoginPage;

