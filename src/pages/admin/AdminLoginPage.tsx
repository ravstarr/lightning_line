import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Mock admin credentials
  const mockAdmin = {
    username: 'admin',
    password: 'admin123',
    name: 'System Administrator'
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (username === mockAdmin.username && password === mockAdmin.password) {
      localStorage.setItem('currentAdmin', JSON.stringify(mockAdmin));
      navigate('/admin/dashboard');
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-darkblue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-darkblue-800 rounded-2xl shadow-xl p-8 border border-skyblue-700">
        <div className="text-center mb-8">
          <Logo size="md" className="mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Admin Login</h1>
          <p className="text-skyblue-300">Queue Management System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-skyblue-200 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="Enter admin username"
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
              placeholder="Enter password"
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
            Login as Admin
          </button>

          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => navigate('/staff/login')}
              className="text-sm text-aqua-400 hover:text-aqua-300"
            >
              ← Back to Staff Login
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-skyblue-700">
            <p className="text-center text-sm text-skyblue-300 mb-3">Demo Credentials:</p>
            <div className="bg-darkblue-700 rounded-lg p-3 space-y-1 text-xs text-skyblue-200">
              <p>Username: admin</p>
              <p>Password: admin123</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;
