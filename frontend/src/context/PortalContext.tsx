import React, { createContext, useContext, useState } from 'react';
import { PortalMode, DoctorTab, PatientTab, Language, ScreeningRecord } from '../types';
import { INITIAL_SCREENINGS } from '../data/mockData';
import { apiService } from '../services/apiService';

interface PortalContextType {
  portal: PortalMode;
  setPortal: (portal: PortalMode) => void;
  doctorTab: DoctorTab;
  setDoctorTab: (tab: DoctorTab) => void;
  patientTab: PatientTab;
  setPatientTab: (tab: PatientTab) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  
  // Selected state
  selectedScreeningId: string;
  setSelectedScreeningId: (id: string) => void;
  currentScreening: ScreeningRecord;
  setCurrentScreening: React.Dispatch<React.SetStateAction<ScreeningRecord>>;
  
  // Toast notifications
  toastMessage: string | null;
  showToast: (msg: string) => void;
  
  // Modals
  isAddPatientModalOpen: boolean;
  setIsAddPatientModalOpen: (open: boolean) => void;
  isTeleconsultModalOpen: boolean;
  setIsTeleconsultModalOpen: (open: boolean) => void;
  isExplainModalOpen: boolean;
  setIsExplainModalOpen: (open: boolean) => void;
  
  // Navigation helpers
  navigateToApproveReport: (screeningId?: string) => void;
  navigateToAiAnalysis: (screeningId?: string) => void;
  navigateToNewScreening: () => void;
  navigateToPatientReport: (screeningId?: string) => void;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [portal, setPortal] = useState<PortalMode>('doctor');
  const [doctorTab, setDoctorTab] = useState<DoctorTab>('dashboard');
  const [patientTab, setPatientTab] = useState<PatientTab>('home');
  const [language, setLanguage] = useState<Language>('en');
  const [selectedScreeningId, setSelectedScreeningId] = useState<string>(INITIAL_SCREENINGS[0].id);
  const [currentScreening, setCurrentScreening] = useState<ScreeningRecord>(INITIAL_SCREENINGS[0]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [isTeleconsultModalOpen, setIsTeleconsultModalOpen] = useState(false);
  const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  const toggleLanguage = () => {
    const nextLang: Language = language === 'en' ? 'hi' : 'en';
    setLanguage(nextLang);
    showToast(nextLang === 'hi' ? 'भाषा बदलकर हिन्दी की गई' : 'Language switched to English');
  };

  const syncScreeningSelection = (screeningId: string) => {
    setSelectedScreeningId(screeningId);
    if (currentScreening && currentScreening.id === screeningId) {
      return;
    }
    const found = INITIAL_SCREENINGS.find(s => s.id === screeningId);
    if (found) {
      setCurrentScreening(found);
    } else {
      apiService.getScreeningById(screeningId).then(res => {
        if (res) setCurrentScreening(res);
      }).catch(() => {});
    }
  };

  const navigateToApproveReport = (screeningId?: string) => {
    if (screeningId) {
      syncScreeningSelection(screeningId);
    }
    setPortal('doctor');
    setDoctorTab('approve-reports');
  };

  const navigateToAiAnalysis = (screeningId?: string) => {
    if (screeningId) {
      syncScreeningSelection(screeningId);
    }
    setPortal('doctor');
    setDoctorTab('ai-analysis');
  };

  const navigateToNewScreening = () => {
    setPortal('doctor');
    setDoctorTab('upload-images');
  };

  const navigateToPatientReport = (screeningId?: string) => {
    if (screeningId) {
      syncScreeningSelection(screeningId);
    }
    setPortal('patient');
    setPatientTab('my-results');
  };

  return (
    <PortalContext.Provider
      value={{
        portal,
        setPortal,
        doctorTab,
        setDoctorTab,
        patientTab,
        setPatientTab,
        language,
        setLanguage,
        toggleLanguage,
        selectedScreeningId,
        setSelectedScreeningId,
        currentScreening,
        setCurrentScreening,
        toastMessage,
        showToast,
        isAddPatientModalOpen,
        setIsAddPatientModalOpen,
        isTeleconsultModalOpen,
        setIsTeleconsultModalOpen,
        isExplainModalOpen,
        setIsExplainModalOpen,
        navigateToApproveReport,
        navigateToAiAnalysis,
        navigateToNewScreening,
        navigateToPatientReport,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
};

export const usePortal = () => {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
};
