import React from 'react';
import { usePortal } from '../../context/PortalContext';
import { PATIENT_PROFILE } from '../../data/mockData';

interface PatientSidebarProps {
  isMobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
}

export const PatientSidebar: React.FC<PatientSidebarProps> = ({
  isMobileDrawerOpen = false,
  onCloseMobileDrawer,
}) => {
  const { currentUser, language, logout } = usePortal();

  const patientName = currentUser?.patient?.name || PATIENT_PROFILE.name;
  const patientId = currentUser?.patient?.patientId || PATIENT_PROFILE.id;

  const navItems = [
    { id: 'reports', label: 'Reports', labelHi: 'रिपोर्ट्स', icon: 'description' },
  ];

  const handleNavClick = () => {
    if (onCloseMobileDrawer) onCloseMobileDrawer();
  };

  const content = (
    <div className="flex flex-col h-full p-stack-md pt-20">
      {/* Patient Avatar Header */}
      <div className="mb-6 px-2 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary-container/30 shadow-sm flex-shrink-0">
          <img
            src={PATIENT_PROFILE.avatar}
            alt={patientName}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-headline-md text-headline-md text-primary font-bold truncate">
            {patientName}
          </h2>
          <p className="font-label-sm text-xs text-on-surface-variant truncate">
            ID: {patientId}
          </p>
        </div>
      </div>

      {/* Nav List - Reports section ONLY (Point 3) */}
      <div className="flex flex-col gap-2 flex-grow">
        {navItems.map((item) => {
          return (
            <button
              key={item.id}
              onClick={handleNavClick}
              className="flex items-center gap-3 px-4 py-3 h-touch-target-min rounded-lg transition-colors text-left bg-secondary-container text-on-secondary-container font-bold shadow-sm"
            >
              <span
                className="material-symbols-outlined text-[22px] fill"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {item.icon}
              </span>
              <span className="font-label-md text-label-md">
                {language === 'hi' ? item.labelHi : item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer Support info & Logout */}
      <div className="mt-auto space-y-3">
        <div className="p-3.5 bg-surface-container-low rounded-xl border border-surface-container text-xs text-on-surface-variant">
          <div className="flex items-center gap-2 text-primary font-bold mb-1">
            <span className="material-symbols-outlined text-[18px]">support_agent</span>
            <span>{language === 'hi' ? 'हेल्पलाइन' : 'Patient Care Line'}</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Toll-free 24/7 AI Eye Screening Support: <span className="font-bold text-primary">1800-419-3333</span>
          </p>
        </div>

        <button
          onClick={() => {
            if (onCloseMobileDrawer) onCloseMobileDrawer();
            logout();
          }}
          className="w-full min-h-[44px] px-4 flex items-center gap-3 text-error hover:bg-error-container/30 rounded-lg text-left transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="font-label-md text-label-md font-semibold">
            {language === 'hi' ? 'साइन आउट' : 'Sign Out'}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <nav
        aria-label="Patient Desktop Navigation"
        className="fixed left-0 top-0 h-full w-64 hidden md:flex flex-col bg-surface-container-low border-r border-surface-container shadow-sm z-40"
      >
        {content}
      </nav>

      {/* Mobile Slide-in Drawer */}
      {isMobileDrawerOpen && (
        <div
          onClick={onCloseMobileDrawer}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden transition-opacity"
        />
      )}
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
