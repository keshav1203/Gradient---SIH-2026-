import React, { createContext, useContext, useState, useEffect } from 'react';
import { PortalMode, DoctorTab, PatientTab, Language, ScreeningRecord, AuthSession } from '../types';
import { INITIAL_SCREENINGS } from '../data/mockData';
import { apiService, setAuthSession } from '../services/apiService';

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
  
  // Auth state
  currentUser: AuthSession | null;
  isAuthenticated: boolean;
  loginDoctor: (doctorId: string, dobPassword: string) => Promise<void>;
  loginPatient: (identifier: string, phone?: string) => Promise<void>;
  logout: () => void;

  // Data sync & refresh
  dataVersion: number;
  refreshData: () => void;

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
  const [currentUser, setCurrentUser] = useState<AuthSession | null>(() => {
    try {
      const storedToken = localStorage.getItem('drishtikon_auth_token');
      const storedRole = localStorage.getItem('drishtikon_auth_role') as 'doctor' | 'patient' | null;
      const docId = localStorage.getItem('drishtikon_doctor_id');
      const patId = localStorage.getItem('drishtikon_patient_id');

      if (storedToken && storedRole === 'doctor' && docId) {
        const storedName = localStorage.getItem('drishtikon_doctor_name');
        const storedHosp = localStorage.getItem('drishtikon_doctor_hospital');
        const storedDept = localStorage.getItem('drishtikon_doctor_department');

        let resolvedName = storedName;
        let resolvedHospital = storedHosp;
        let resolvedDept = storedDept;

        if (!resolvedName) {
          const upper = docId.toUpperCase();
          if (upper.includes('MANU')) {
            resolvedName = 'Dr. Manu';
            resolvedDept = 'Comprehensive Ophthalmology';
          } else if (upper.includes('KESHAV')) {
            resolvedName = 'Dr. Keshav';
            resolvedHospital = 'Apex Eye Institute';
            resolvedDept = 'Retina & Vitreous Services';
          } else if (upper.includes('TRISHA')) {
            resolvedName = 'Dr. Trisha';
            resolvedHospital = 'Community Eye Care Hospital';
            resolvedDept = 'Pediatric & Neuro-Ophthalmology';
          } else if (upper.includes('RAJESH')) {
            resolvedName = 'Dr. Rajesh Gupta';
            resolvedHospital = 'Apex Eye Institute';
            resolvedDept = 'Vitreoretinal Clinic';
          } else {
            resolvedName = 'Dr. Anita Sharma';
            resolvedHospital = 'District Hospital Eye Care Centre';
            resolvedDept = 'Rural Retinal AI Screening Unit';
          }
        }

        return {
          role: 'doctor',
          token: storedToken,
          doctor: {
            id: 1,
            doctorId: docId,
            name: resolvedName || 'Dr. Anita Sharma',
            dob: '',
            hospital: resolvedHospital || 'District Hospital Eye Care Centre',
            department: resolvedDept || 'Rural Retinal AI Screening Unit'
          }
        };
      } else if (storedToken && storedRole === 'patient' && patId) {
        const storedPatName = localStorage.getItem('drishtikon_patient_name') || 'Patient';
        const storedPatPhone = localStorage.getItem('drishtikon_patient_phone') || '';
        const storedPatAge = localStorage.getItem('drishtikon_patient_age');
        const storedPatGender = localStorage.getItem('drishtikon_patient_gender') || '';
        return {
          role: 'patient',
          token: storedToken,
          patient: {
            patientId: patId,
            name: storedPatName,
            phone: storedPatPhone,
            age: storedPatAge ? parseInt(storedPatAge, 10) : 0,
            gender: storedPatGender
          }
        };
      }
    } catch {
      // ignore storage access errors
    }
    return null;
  });

  const [portal, setPortal] = useState<PortalMode>(() => {
    if (currentUser?.role === 'patient') return 'patient';
    return 'doctor';
  });

  const [doctorTab, setDoctorTab] = useState<DoctorTab>('dashboard');
  const [patientTab, setPatientTab] = useState<PatientTab>('home');
  const [language, setLanguage] = useState<Language>('en');
  const [selectedScreeningId, setSelectedScreeningId] = useState<string>(INITIAL_SCREENINGS[0].id);
  const [currentScreening, setCurrentScreening] = useState<ScreeningRecord>(INITIAL_SCREENINGS[0]);
  const [dataVersion, setDataVersion] = useState(0);
  const refreshData = () => setDataVersion(v => v + 1);

  useEffect(() => {
    if (currentUser) {
      setAuthSession(currentUser);
    }
  }, [currentUser]);

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

  const loginDoctor = async (doctorId: string, dobPassword: string) => {
    const session = await apiService.doctorLogin(doctorId, dobPassword);
    setCurrentUser(session);
    setPortal('doctor');
    setDoctorTab('dashboard');
  };

  const loginPatient = async (identifier: string, phone?: string) => {
    const session = await apiService.patientLogin(identifier, phone);
    setCurrentUser(session);
    setPortal('patient');
    setPatientTab('home');
  };

  const logout = () => {
    apiService.logout();
    setCurrentUser(null);
    setPortal('doctor');
    setDoctorTab('dashboard');
    setPatientTab('home');
    showToast(language === 'hi' ? 'सफलतापूर्वक लॉगआउट किया गया' : 'Logged out successfully');
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
        currentUser,
        isAuthenticated: !!currentUser,
        loginDoctor,
        loginPatient,
        logout,
        dataVersion,
        refreshData,
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
