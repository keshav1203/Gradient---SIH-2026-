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

// Doctor Views
import { ClinicianDashboardView } from './components/doctor/ClinicianDashboardView';
import { PatientQueueView } from './components/doctor/PatientQueueView';
import { NewScreeningView } from './components/doctor/NewScreeningView';
import { AiAnalysisView } from './components/doctor/AiAnalysisView';
import { ReportsView } from './components/doctor/ReportsView';

// Patient Views
import { PatientDashboardView } from './components/patient/PatientDashboardView';
import { PatientReportView } from './components/patient/PatientReportView';
import { PatientProfileView } from './components/patient/PatientProfileView';

const AppContent: React.FC = () => {
  const { portal, doctorTab, patientTab } = usePortal();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

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
        <main className="flex-1 min-w-0 md:pl-64 pt-[74px] pb-24 md:pb-12 px-container-margin md:px-stack-lg transition-all">
          {portal === 'doctor' ? (
            <>
              {doctorTab === 'dashboard' && <ClinicianDashboardView />}
              {doctorTab === 'patient-queue' && <PatientQueueView />}
              {doctorTab === 'upload-images' && <NewScreeningView />}
              {doctorTab === 'ai-analysis' && <AiAnalysisView />}
              {doctorTab === 'reports' && <ReportsView />}
              {doctorTab === 'help' && <ClinicianDashboardView />}
              {doctorTab === 'settings' && <ClinicianDashboardView />}
            </>
          ) : (
            <>
              {patientTab === 'home' && <PatientDashboardView />}
              {patientTab === 'my-results' && <PatientReportView />}
              {patientTab === 'consult' && <PatientDashboardView />}
              {patientTab === 'profile' && <PatientProfileView />}
            </>
          )}
        </main>
      </div>

      {/* Portal-Specific Mobile Bottom Navigation Bar */}
      {portal === 'doctor' ? <DoctorBottomNav /> : <PatientBottomNav />}

      {/* Global Modals & Notifications */}
      <AddPatientModal />
      <TeleconsultModal />
      <ExplainResultModal />
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
