import React, { useState } from 'react';

interface TRNInputProps {
  onTRNSubmit: (data: {
    trn?: string;
    name: string;
    dob?: string;
    phone?: string;
    hasDisability?: boolean;
  }) => void;
  onBack: () => void;
}

const TRNInput: React.FC<TRNInputProps> = ({ onTRNSubmit, onBack }) => {
  const [formData, setFormData] = useState({
    name: '',
    trn: '',
    dob: '',
    phone: '',
    hasDisability: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.trn && !formData.dob) {
      alert('If you do not have a TRN, please enter your Date of Birth.');
      return;
    }

    onTRNSubmit({
      name: formData.name,
      trn: formData.trn || undefined,
      dob: formData.dob || undefined,
      phone: formData.phone,
      hasDisability: formData.hasDisability
    });
  };

  return (
    <div className="w-full max-w-md bg-darkblue-800 rounded-2xl shadow-xl p-8 border border-skyblue-700">

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-skyblue-400 mb-2">Lightning Line</h1>
        <h2 className="text-2xl font-bold text-white">Check In</h2>
        <p className="text-skyblue-200 mt-1">Join the digital queue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-skyblue-100 mb-2">Full Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full px-4 py-3 border border-skyblue-600 rounded-lg focus:ring-2 focus:ring-skyblue-500 focus:border-skyblue-500 transition bg-darkblue-700 text-white placeholder-skyblue-400"
            placeholder="John Doe"
            required
          />
        </div>

        {/* TRN */}
        <div>
          <label className="block text-sm font-medium text-skyblue-100 mb-2">
            TRN Number <span className="text-xs text-skyblue-300">(Optional)</span>
          </label>
          <input
            type="text"
            pattern="[0-9]{9}"
            value={formData.trn}
            onChange={(e) => setFormData({...formData, trn: e.target.value})}
            className="w-full px-4 py-3 border border-skyblue-600 rounded-lg focus:ring-2 focus:ring-skyblue-500 focus:border-skyblue-500 transition bg-darkblue-700 text-white placeholder-skyblue-400"
            placeholder="Enter 9-digit TRN"
          />
        </div>

        {/* Date of Birth */}
        <div >
          <label className="block text-sm font-medium text-skyblue-100 mb-2">
            Date of Birth <span className="text-xs text-skyblue-300">(Required if no TRN)</span>
          </label>
          <input
            type="date"
            value={formData.dob}
            onChange={(e) => setFormData({...formData, dob: e.target.value})}
            className="w-full px-4 py-3 border border-skyblue-600 rounded-lg focus:ring-2 focus:ring-skyblue-500 focus:border-skyblue-500 transition bg-darkblue-700 text-white placeholder-skyblue-400 [color-scheme:dark]"
            required={!formData.trn}
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-skyblue-100 mb-2">
            Phone Number <span className="text-xs text-skyblue-300">(For SMS updates)</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            className="w-full px-4 py-3 border border-skyblue-600 rounded-lg focus:ring-2 focus:ring-skyblue-500 focus:border-skyblue-500 transition bg-darkblue-700 text-white placeholder-skyblue-400"
            placeholder="(876) 555-0123"
          />
        </div>

        {/* Disability Checkbox - Styled to match inputs */}
        <div
          className="flex items-center space-x-3 bg-darkblue-700 border border-skyblue-600 rounded-lg p-3 cursor-pointer hover:bg-darkblue-600 transition"
          onClick={() => setFormData({...formData, hasDisability: !formData.hasDisability})}
        >
          <div className="flex items-center h-5">
            <input
              id="disability"
              name="disability"
              type="checkbox"
              checked={formData.hasDisability}
              onChange={(e) => setFormData({...formData, hasDisability: e.target.checked})}
              className="h-5 w-5 text-skyblue-500 focus:ring-skyblue-500 border-skyblue-600 rounded bg-darkblue-900"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="disability" className="font-medium text-skyblue-100 cursor-pointer select-none">
              I have a disability / Require assistance
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 bg-skyblue-500 hover:bg-skyblue-400 text-white rounded-lg font-bold transition shadow-md text-lg"
        >
          Check In
        </button>

        <div className="text-center pt-2">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-skyblue-400 hover:text-skyblue-300 hover:underline"
            >
              ← Back to Home
            </button>
        </div>
      </form>
    </div>
  );
};

export default TRNInput;



