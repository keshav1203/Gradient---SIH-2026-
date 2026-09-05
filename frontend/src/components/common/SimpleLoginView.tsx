import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { DrishtikonLogo } from './DrishtikonLogo';

type LoginRole = 'doctor' | 'patient';

interface SimpleLoginViewProps {
  onLogin: () => void;
}

export const SimpleLoginView: React.FC<SimpleLoginViewProps> = ({ onLogin }) => {
  const { setPortal } = usePortal();
  const [role, setRole] = useState<LoginRole | null>(null);
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');

  const handleRoleSelect = (selectedRole: LoginRole) => {
    setRole(selectedRole);
    setPortal(selectedRole);
    setMobile('');
    setPassword('');
  };

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    // Demo-only login: no authentication/authorization is performed yet.
    onLogin();
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl">
          <div className="flex justify-center mb-10">
            <DrishtikonLogo size={48} />
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-on-background">Welcome to Drishtikon</h1>
            <p className="mt-3 text-on-surface-variant">Select your portal to continue</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <button
              type="button"
              onClick={() => handleRoleSelect('doctor')}
              className="group rounded-2xl border border-outline-variant bg-surface p-8 text-left shadow-sm hover:shadow-md hover:border-primary transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl mb-6">👨‍⚕️</div>
              <h2 className="text-2xl font-bold text-on-surface">Doctor Login</h2>
              <p className="mt-2 text-on-surface-variant">Access patient screening, AI analysis and reports.</p>
              <div className="mt-6 text-primary font-semibold">Continue as Doctor →</div>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('patient')}
              className="group rounded-2xl border border-outline-variant bg-surface p-8 text-left shadow-sm hover:shadow-md hover:border-primary transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl mb-6">👤</div>
              <h2 className="text-2xl font-bold text-on-surface">Patient Login</h2>
              <p className="mt-2 text-on-surface-variant">View your screening results and health information.</p>
              <div className="mt-6 text-primary font-semibold">Continue as Patient →</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <DrishtikonLogo size={48} />
        </div>

        <div className="bg-surface border border-outline-variant rounded-2xl shadow-sm p-6 sm:p-8">
          <button
            type="button"
            onClick={() => setRole(null)}
            className="text-sm text-primary font-medium mb-6"
          >
            ← Change portal
          </button>

          <h1 className="text-2xl font-bold text-on-surface">
            {role === 'doctor' ? 'Doctor Login' : 'Patient Login'}
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Enter your details to continue to the {role} portal.
          </p>

          <form onSubmit={handleLogin} className="mt-7 space-y-5">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-2">Mobile Number</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Enter mobile number"
                className="w-full rounded-xl border border-outline-variant bg-background px-4 py-3 text-on-background outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-xl border border-outline-variant bg-background px-4 py-3 text-on-background outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-primary text-on-primary py-3 font-semibold hover:opacity-90 transition-opacity"
            >
              Login as {role === 'doctor' ? 'Doctor' : 'Patient'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-on-surface-variant">
            Demo login • Authentication will be added later
          </p>
        </div>
      </div>
    </div>
  );
};
