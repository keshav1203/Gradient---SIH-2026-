import React from 'react';
import { usePortal } from '../../context/PortalContext';

export const PatientBottomNav: React.FC = () => {
  const { language } = usePortal();

  return (
    <nav
      aria-label="Patient Mobile Navigation"
      className="fixed bottom-0 left-0 w-full z-50 rounded-t-2xl md:hidden bg-surface shadow-[0_-2px_12px_rgba(7,59,76,0.08)] border-t border-surface-container flex justify-around items-center h-16 px-4 pb-safe"
    >
      <div className="flex flex-col items-center justify-center py-1.5 px-6 rounded-full bg-primary-container text-white shadow-sm font-bold min-w-[72px]">
        <span
          className="material-symbols-outlined text-[20px] fill"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          description
        </span>
        <span className="text-[11px] font-label-sm mt-0.5 whitespace-nowrap">
          {language === 'hi' ? 'रिपोर्ट्स' : 'Reports'}
        </span>
      </div>
    </nav>
  );
};

