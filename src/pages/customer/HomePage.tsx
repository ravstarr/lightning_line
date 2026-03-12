import React from 'react';
import TRNInput from '../../components/kiosk/TRNInput';
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleTRNSubmit = (data: {
    trn?: string;
    name?: string;
    dob?: string;
    phone?: string;
    hasDisability?: boolean;
  }) => {
    // Determine priority
    let isPriority = false;
    let priorityType = 'regular';

    if (data.hasDisability) {
      isPriority = true;
      priorityType = 'disabled';
    } else {
      // Calculate Age
      let age = 0;
      if (data.dob) {
        const birthDate = new Date(data.dob);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
      }

      if (age >= 55 || (data.trn && data.trn.startsWith('55'))) {
        isPriority = true;
        priorityType = 'senior';
      }
    }

    navigate('/service-selection', {
      state: {
        ...data,
        isPriority,
        priorityType
      }
    });
  };

  return (
    <div className="min-h-screen bg-darkblue-900 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Logo is optional based on the clean design, but kept for branding context */}
        <div className="mb-8">
            <Logo size="lg" />
        </div>

        <TRNInput
          onTRNSubmit={handleTRNSubmit}
          onBack={() => navigate('/')}
        />

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-skyblue-300">
          <p>No physical ticket needed - all digital with QR code</p>
          <p className="mt-1">Questions? Ask at the information desk</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

