import React from 'react';
import { usePortal } from '../../context/PortalContext';
import { DoctorTab } from '../../types';
import { DOCTOR_PROFILE } from '../../data/mockData';

interface DoctorSidebarProps {
  isMobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
}

export const DoctorSidebar: React.FC<DoctorSidebarProps> = ({
  isMobileDrawerOpen = false,
  onCloseMobileDrawer,
}) => {
  const { doctorTab, setDoctorTab, navigateToNewScreening, showToast, language } = usePortal();

  const navItems: { id: DoctorTab; label: string; labelHi: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', labelHi: 'डैशबोर्ड', icon: 'dashboard' },
    { id: 'patient-queue', label: 'Patient Queue', labelHi: 'मरीज कतार', icon: 'group' },
    { id: 'upload-images', label: 'Upload Images', labelHi: 'चित्र अपलोड', icon: 'cloud_upload' },
    { id: 'ai-analysis', label: 'AI Analysis', labelHi: 'एआई विश्लेषण', icon: 'psychology' },
    { id: 'reports', label: 'Reports', labelHi: 'रिपोर्ट्स', icon: 'description' },
  ];

  const handleNavClick = (tab: DoctorTab) => {
    setDoctorTab(tab);
    if (onCloseMobileDrawer) onCloseMobileDrawer();
  };

  const content = (
    <div className="flex flex-col h-full p-stack-md pt-20">
      {/* Clinician Profile */}
      <div className="mb-6 px-2 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary-container shadow-sm flex-shrink-0">
          <img
            src={DOCTOR_PROFILE.avatar}
            alt="Clinician Dr. Anita profile"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-headline-md text-headline-md text-primary font-bold truncate">
            {DOCTOR_PROFILE.name}
          </h2>
          <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
            {DOCTOR_PROFILE.hospital}
          </p>
        </div>
      </div>

      {/* Primary Action Button: New Screening */}
      <button
        onClick={() => {
          navigateToNewScreening();
          if (onCloseMobileDrawer) onCloseMobileDrawer();
        }}
        className="mb-6 w-full min-h-[48px] bg-primary text-white font-label-md text-label-md rounded-lg flex items-center justify-center gap-2 shadow-sm hover:bg-primary-container transition-all active:scale-[0.98]"
      >
        <span className="material-symbols-outlined text-[20px]">add</span>
        <span>{language === 'hi' ? 'नई स्क्रीनिंग' : 'New Screening'}</span>
      </button>

      {/* Nav List */}
      <ul className="flex flex-col gap-1.5 flex-grow">
        {navItems.map((item) => {
          const isActive = doctorTab === item.id;
          return (
            <li key={item.id}>
              <button
                onClick={() => handleNavClick(item.id)}
                className={`w-full min-h-[48px] px-4 flex items-center gap-3 rounded-lg transition-all duration-200 text-left ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container font-bold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[22px] ${
                    isActive ? 'fill' : ''
                  }`}
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="font-label-md text-label-md">
                  {language === 'hi' ? item.labelHi : item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Footer Links */}
      <ul className="flex flex-col gap-1 mt-auto pt-4 border-t border-surface-container">
        <li>
          <button
            onClick={() => {
              showToast(language === 'hi' ? 'सहायता केंद्र खोला गया' : 'Drishtikon Help & Guidance Center');
              if (onCloseMobileDrawer) onCloseMobileDrawer();
            }}
            className="w-full min-h-[44px] px-4 flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-high rounded-lg text-left transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
            <span className="font-label-md text-label-md">
              {language === 'hi' ? 'सहायता केंद्र' : 'Help Center'}
            </span>
          </button>
        </li>
        <li>
          <button
            onClick={() => {
              showToast(language === 'hi' ? 'सत्र समाप्त किया गया' : 'Signed out of Doctor Session');
              if (onCloseMobileDrawer) onCloseMobileDrawer();
            }}
            className="w-full min-h-[44px] px-4 flex items-center gap-3 text-error hover:bg-error-container/30 rounded-lg text-left transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="font-label-md text-label-md">
              {language === 'hi' ? 'साइन आउट' : 'Sign Out'}
            </span>
          </button>
        </li>
      </ul>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <nav
        aria-label="Desktop Clinician Navigation"
        className="fixed left-0 top-0 h-full w-64 hidden md:flex flex-col bg-surface-container-low border-r border-surface-container shadow-sm z-40"
      >
        {content}
      </nav>

      {/* Mobile Drawer Backdrop */}
      {isMobileDrawerOpen && (
        <div
          onClick={onCloseMobileDrawer}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden transition-opacity"
        />
      )}

      {/* Mobile Slide-in Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-surface z-50 transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={onCloseMobileDrawer}
          aria-label="Close navigation"
          className="absolute top-4 right-4 p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        {content}
      </div>
    </>
  );
};
