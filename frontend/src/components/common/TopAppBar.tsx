import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { DrishtikonLogo } from './DrishtikonLogo';
import { DOCTOR_PROFILE, PATIENT_PROFILE } from '../../data/mockData';

interface TopAppBarProps {
  onToggleMobileSidebar?: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({ onToggleMobileSidebar }) => {
  const { portal, setPortal, language, toggleLanguage, showToast } = usePortal();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    showToast(language === 'hi' ? 'डेटा सिंक्रनाइज़ हो रहा है...' : 'Syncing medical records with cloud database...');
    setTimeout(() => {
      setIsSyncing(false);
      showToast(language === 'hi' ? 'सिंक पूरा हुआ - सभी रिकॉर्ड अपडेट हैं' : 'Sync completed. All screening records updated.');
    }, 1200);
  };

  const currentAvatar = portal === 'doctor' ? DOCTOR_PROFILE.avatar : PATIENT_PROFILE.avatar;
  const currentAvatarAlt = portal === 'doctor' ? 'Clinician Dr. Anita profile' : 'Patient Naresh Kumar profile';

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface/95 backdrop-blur-md shadow-sm border-b border-surface-container flex justify-between items-center px-container-margin md:px-stack-lg h-touch-target-min">
      {/* Brand & Mobile Menu Button */}
      <div className="flex items-center gap-3 sm:gap-4">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 -ml-2 rounded-full text-primary hover:bg-surface-container-high transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}
        <DrishtikonLogo size={32} />
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Portal Switcher Badge */}
        <div className="flex items-center bg-surface-container-low p-1 rounded-full border border-outline-variant/40 shadow-inner">
          <button
            onClick={() => {
              setPortal('doctor');
              showToast('Switched to Doctor / Clinician Portal');
            }}
            className={`px-3 py-1 rounded-full text-xs font-label-md transition-all duration-200 flex items-center gap-1.5 ${
              portal === 'doctor'
                ? 'bg-primary-container text-white shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">stethoscope</span>
            <span className="hidden sm:inline">Doctor Portal</span>
            <span className="sm:hidden">Doctor</span>
          </button>

          <button
            onClick={() => {
              setPortal('patient');
              showToast('Switched to Patient Portal');
            }}
            className={`px-3 py-1 rounded-full text-xs font-label-md transition-all duration-200 flex items-center gap-1.5 ${
              portal === 'patient'
                ? 'bg-primary-container text-white shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">person</span>
            <span className="hidden sm:inline">Patient Portal</span>
            <span className="sm:hidden">Patient</span>
          </button>
        </div>

        {/* Language Selector */}
        <button
          onClick={toggleLanguage}
          aria-label="Switch language between English and Hindi"
          className="flex items-center gap-1 bg-surface-container-low hover:bg-surface-container-high px-2.5 sm:px-3 py-1.5 rounded-full transition-colors text-primary border border-outline-variant/30 text-label-sm font-label-md"
        >
          <span className="material-symbols-outlined text-[18px]">language</span>
          <span className="text-xs font-semibold">
            {language === 'en' ? 'EN' : 'हिन्दी'}
          </span>
        </button>

        {/* Sync Button / Indicator */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          aria-label="Sync status"
          className="flex items-center gap-1.5 text-on-surface-variant hover:bg-surface-container-high p-2 sm:px-3 sm:py-1.5 rounded-full transition-colors active:opacity-80"
          title="Cloud Sync Status"
        >
          <span className={`material-symbols-outlined text-[18px] text-primary ${isSyncing ? 'animate-spin' : ''}`}>
            sync
          </span>
          <span className="font-label-sm text-label-sm text-primary hidden md:inline">
            {isSyncing ? 'Syncing...' : 'Synced'}
          </span>
        </button>

        {/* User Profile Avatar */}
        <div className="ml-1 flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-primary-container/40 shadow-sm flex-shrink-0">
            <img
              src={currentAvatar}
              alt={currentAvatarAlt}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-bold text-primary leading-tight">
              {portal === 'doctor' ? DOCTOR_PROFILE.name : PATIENT_PROFILE.name}
            </span>
            <span className="text-[10px] text-on-surface-variant leading-none">
              {portal === 'doctor' ? DOCTOR_PROFILE.hospital : 'Patient #8924'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
