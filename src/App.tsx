import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import {
  LandingPage,
  HomePage,
  PriorityAccess,
  TicketDisplayPage,
  StaffDashboardPage,
  StaffLoginPage,
  StaffPersonalDashboard,
  AdminLoginPage,
  AdminDashboard
} from './pages';
import { ServiceSelection } from './components';

const App: React.FC = () => {
  const handleServiceSelect = (serviceType: string) => {
    console.log('Service selected:', serviceType);
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Customer Routes */}
          <Route path="/customer" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/priority-access" element={<PriorityAccess />} />
          <Route 
            path="/service-selection" 
            element={<ServiceSelection onServiceSelect={handleServiceSelect} />} 
          />
          <Route path="/ticket/:ticketId" element={<TicketDisplayPage />} />

          {/* Staff Routes */}
          <Route path="/staff" element={<StaffDashboardPage />} />
          <Route path="/staff/login" element={<StaffLoginPage />} />
          <Route path="/staff/dashboard" element={<StaffPersonalDashboard />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;