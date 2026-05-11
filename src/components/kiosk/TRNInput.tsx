import React, { useState, useEffect } from 'react';
import { lookupCustomer } from '../../services/api';

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

type LookupStatus = 'idle' | 'loading' | 'found' | 'not-found';

const TRNInput: React.FC<TRNInputProps> = ({ onTRNSubmit, onBack }) => {
  const [formData, setFormData] = useState({
    name: '',
    trn: '',
    dob: '',
    phone: '',
    hasDisability: false,
  });
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle');
  const [lookupAge, setLookupAge] = useState<number | null>(null);

  // Auto-lookup when TRN reaches 9 digits
  useEffect(() => {
    if (formData.trn.length !== 9) {
      if (lookupStatus !== 'idle') {
        setLookupStatus('idle');
        setLookupAge(null);
        setFormData((prev) => ({ ...prev, name: '', dob: '' }));
      }
      return;
    }

    let cancelled = false;
    setLookupStatus('loading');

    lookupCustomer(formData.trn)
      .then((res) => {
        if (cancelled) return;
        const { found, customer } = res.data;
        if (found) {
          setLookupStatus('found');
          setLookupAge(customer.age);
          setFormData((prev) => ({
            ...prev,
            name: `${customer.firstName} ${customer.lastName}`,
            dob: customer.dob ? customer.dob.split('T')[0] : prev.dob,
          }));
        } else {
          setLookupStatus('not-found');
        }
      })
      .catch(() => {
        if (!cancelled) setLookupStatus('not-found');
      });

    return () => { cancelled = true; };
  }, [formData.trn]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.trn && !formData.dob) {
      alert('If you do not have a TRN, please enter your Date of Birth.');
      return;
    }
    onTRNSubmit({
      name:          formData.name,
      trn:           formData.trn || undefined,
      dob:           formData.dob || undefined,
      phone:         formData.phone,
      hasDisability: formData.hasDisability,
    });
  };

  const dobRequired = !formData.trn || lookupStatus === 'not-found';
  const showDob = lookupStatus !== 'found' || !formData.dob;

  return (
    <div className="w-full max-w-md bg-darkblue-800 rounded-2xl shadow-xl p-8 border border-skyblue-700">

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-skyblue-400 mb-2">Lightning Line</h1>
        <h2 className="text-2xl font-bold text-white">Check In</h2>
        <p className="text-skyblue-200 mt-1">Join the digital queue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* TRN */}
        <div>
          <label className="block text-sm font-medium text-skyblue-100 mb-2">
            TRN Number <span className="text-xs text-skyblue-300">(Optional)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              pattern="[0-9]{9}"
              maxLength={9}
              value={formData.trn}
              onChange={(e) => setFormData({ ...formData, trn: e.target.value.replace(/\D/g, '') })}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 transition bg-darkblue-700 text-white placeholder-skyblue-400 ${
                lookupStatus === 'found'     ? 'border-green-500 focus:ring-green-500' :
                lookupStatus === 'not-found' ? 'border-yellow-500 focus:ring-yellow-500' :
                                               'border-skyblue-600 focus:ring-skyblue-500'
              }`}
              placeholder="Enter 9-digit TRN"
            />
            {/* Status indicator */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {lookupStatus === 'loading' && (
                <div className="w-5 h-5 border-2 border-skyblue-400 border-t-transparent rounded-full animate-spin" />
              )}
              {lookupStatus === 'found' && (
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {lookupStatus === 'not-found' && (
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                </svg>
              )}
            </div>
          </div>

          {/* Lookup result banner */}
          {lookupStatus === 'found' && lookupAge !== null && (
            <div className="mt-2 flex items-center space-x-2 text-sm text-green-400">
              <span>Record found</span>
              {lookupAge >= 65 && (
                <span className="bg-green-800 text-green-200 px-2 py-0.5 rounded text-xs font-medium">
                  Senior — Priority Queue
                </span>
              )}
            </div>
          )}
          {lookupStatus === 'not-found' && (
            <p className="mt-2 text-sm text-yellow-400">
              TRN not in our records — please enter your date of birth below.
            </p>
          )}
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-skyblue-100 mb-2">Full Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 transition bg-darkblue-700 text-white placeholder-skyblue-400 ${
              lookupStatus === 'found'
                ? 'border-green-500 focus:ring-green-500'
                : 'border-skyblue-600 focus:ring-skyblue-500'
            }`}
            placeholder="John Doe"
            required
          />
          {lookupStatus === 'found' && (
            <p className="mt-1 text-xs text-green-400">Pre-filled from TRN record</p>
          )}
        </div>

        {/* Date of Birth — hidden when TRN lookup succeeds and DOB is known */}
        {showDob && (
          <div>
            <label className="block text-sm font-medium text-skyblue-100 mb-2">
              Date of Birth{' '}
              <span className="text-xs text-skyblue-300">
                {dobRequired ? '(Required — no TRN)' : '(Optional)'}
              </span>
            </label>
            <input
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              className="w-full px-4 py-3 border border-skyblue-600 rounded-lg focus:ring-2 focus:ring-skyblue-500 transition bg-darkblue-700 text-white [color-scheme:dark]"
              required={dobRequired}
            />
          </div>
        )}

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-skyblue-100 mb-2">
            Phone Number <span className="text-xs text-skyblue-300">(For SMS updates)</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-3 border border-skyblue-600 rounded-lg focus:ring-2 focus:ring-skyblue-500 transition bg-darkblue-700 text-white placeholder-skyblue-400"
            placeholder="(876) 555-0123"
          />
        </div>

        {/* Disability */}
        <div
          className="flex items-center space-x-3 bg-darkblue-700 border border-skyblue-600 rounded-lg p-3 cursor-pointer hover:bg-darkblue-600 transition"
          onClick={() => setFormData({ ...formData, hasDisability: !formData.hasDisability })}
        >
          <input
            id="disability"
            type="checkbox"
            checked={formData.hasDisability}
            onChange={(e) => setFormData({ ...formData, hasDisability: e.target.checked })}
            className="h-5 w-5 text-skyblue-500 border-skyblue-600 rounded bg-darkblue-900"
          />
          <label htmlFor="disability" className="text-sm font-medium text-skyblue-100 cursor-pointer select-none">
            I have a disability / Require assistance
          </label>
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
