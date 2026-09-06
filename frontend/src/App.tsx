import React, { useState } from 'react';
import { PortalProvider, usePortal } from './context/PortalContext';
import { TopAppBar } from './components/common/TopAppBar';
import { DoctorSidebar } from './components/common/DoctorSidebar';
import { PatientSidebar } from './components/common/PatientSidebar';
import { DoctorBottomNav } from './components/common/DoctorBottomNav';
import { PatientBottomNav } from './components/common/PatientBottomNav';
import { Toast } from './components/common/Toast';
import { AddPatientModal } from './components/common/AddPatientModal';
import { TeleconsultModal } from './components/common/TeleconsultModal';
import { ExplainResultModal } from './components/common/ExplainResultModal';

// Auth Views
import { LandingPageView } from './components/auth/LandingPageView';

// Doctor Views
import { ClinicianDashboardView } from './components/doctor/ClinicianDashboardView';
import { PatientQueueView } from './components/doctor/PatientQueueView';
import { NewScreeningView } from './components/doctor/NewScreeningView';
import { ApproveReportsView } from './components/doctor/ApproveReportsView';
import { AiAnalysisView } from './components/doctor/AiAnalysisView';
import { ReportsView } from './components/doctor/ReportsView';

// Patient Views (Reports section only + Groq Chatbot)
import { PatientPortalView } from './components/patient/PatientPortalView';

const AppContent: React.FC = () => {
  const { portal, doctorTab, isAuthenticated } = usePortal();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // If user is not authenticated, show the landing page
  if (!isAuthenticated) {
    return (
      <>
        <LandingPageView />
        <Toast />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col antialiased">
      {/* Universal Top App Bar */}
      <TopAppBar onToggleMobileSidebar={() => setIsMobileDrawerOpen(true)} />

      {/* Main Layout Body */}
      <div className="flex-1 flex flex-row w-full min-h-screen">
        {/* Portal-Specific Desktop & Mobile Drawer Sidebar */}
        {portal === 'doctor' ? (
          <DoctorSidebar
            isMobileDrawerOpen={isMobileDrawerOpen}
            onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
          />
        ) : (
          <PatientSidebar
            isMobileDrawerOpen={isMobileDrawerOpen}
            onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 md:ml-64 pt-20 pb-24 md:pb-12 px-4 sm:px-6 md:px-8 transition-all">
          {portal === 'doctor' ? (
            <>
              {doctorTab === 'dashboard' && <ClinicianDashboardView />}
              {doctorTab === 'patient-queue' && <PatientQueueView />}
              {doctorTab === 'upload-images' && <NewScreeningView />}
              {doctorTab === 'approve-reports' && <ApproveReportsView />}
              {doctorTab === 'ai-analysis' && <AiAnalysisView />}
              {doctorTab === 'reports' && <ReportsView />}
              {doctorTab === 'help' && <ClinicianDashboardView />}
              {doctorTab === 'settings' && <ClinicianDashboardView />}
            </>
          ) : (
            <PatientPortalView />
          )}
        </main>
      </div>

      {/* Portal-Specific Mobile Bottom Navigation Bar */}
      {portal === 'doctor' ? <DoctorBottomNav /> : <PatientBottomNav />}

      {/* Global Modals & Notifications - Only for Doctor Portal */}
      {portal === 'doctor' && (
        <>
          <AddPatientModal />
          <TeleconsultModal />
          <ExplainResultModal />
        </>
      )}
      <Toast />
    </div>
  );
};

export function App() {
  return (
    <PortalProvider>
      <AppContent />
    </PortalProvider>
  );
}

export default App;
