import React from 'react';
import { usePortal } from '../../context/PortalContext';
import { DoctorTab } from '../../types';

export const DoctorBottomNav: React.FC = () => {
  const { doctorTab, setDoctorTab, language } = usePortal();

  const items: { id: DoctorTab; label: string; labelHi: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', labelHi: 'डैशबोर्ड', icon: 'dashboard' },
    { id: 'patient-queue', label: 'Queue', labelHi: 'कतार', icon: 'group' },
    { id: 'upload-images', label: 'Screening', labelHi: 'स्क्रीनिंग', icon: 'cloud_upload' },
    { id: 'ai-analysis', label: 'AI Results', labelHi: 'एआई', icon: 'psychology' },
    { id: 'reports', label: 'Reports', labelHi: 'रिपोर्ट', icon: 'description' },
  ];

  return (
    <nav
      aria-label="Doctor Mobile Navigation"
      className="fixed bottom-0 left-0 w-full z-50 rounded-t-2xl md:hidden bg-surface shadow-[0_-2px_12px_rgba(7,59,76,0.08)] border-t border-surface-container flex justify-around items-center h-16 px-2 pb-safe"
    >
      {items.map((item) => {
        const isActive = doctorTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setDoctorTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
              isActive
                ? 'bg-primary-container text-white shadow-sm scale-100 font-bold'
                : 'text-on-surface-variant hover:text-primary active:scale-95'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[20px] ${isActive ? 'fill' : ''}`}
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-label-sm mt-0.5 whitespace-nowrap">
              {language === 'hi' ? item.labelHi : item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
