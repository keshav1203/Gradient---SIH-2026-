import React from 'react';
import { usePortal } from '../../context/PortalContext';
import { PatientTab } from '../../types';

export const PatientBottomNav: React.FC = () => {
  const { patientTab, setPatientTab, language } = usePortal();

  const items: { id: PatientTab; label: string; labelHi: string; icon: string }[] = [
    { id: 'home', label: 'Home', labelHi: 'होम', icon: 'home' },
    { id: 'my-results', label: 'My Results', labelHi: 'परिणाम', icon: 'visibility' },
    { id: 'consult', label: 'Consult', labelHi: 'परामर्श', icon: 'medical_services' },
    { id: 'profile', label: 'Profile', labelHi: 'प्रोफाइल', icon: 'person' },
  ];

  return (
    <nav
      aria-label="Patient Mobile Navigation"
      className="fixed bottom-0 left-0 w-full z-50 rounded-t-2xl md:hidden bg-surface shadow-[0_-2px_12px_rgba(7,59,76,0.08)] border-t border-surface-container flex justify-around items-center h-16 px-4 pb-safe"
    >
      {items.map((item) => {
        const isActive = patientTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setPatientTab(item.id)}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-200 ${
              isActive
                ? 'bg-primary-container text-white shadow-sm font-bold min-w-[72px]'
                : 'text-on-surface-variant hover:text-primary active:scale-95'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[20px] ${isActive ? 'fill' : ''}`}
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="text-[11px] font-label-sm mt-0.5 whitespace-nowrap">
              {language === 'hi' ? item.labelHi : item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
