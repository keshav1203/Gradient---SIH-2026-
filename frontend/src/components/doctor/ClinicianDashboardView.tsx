import React from 'react';
import { usePortal } from '../../context/PortalContext';
import { DashboardMetrics } from './DashboardMetrics';
import { RecentScreeningsTable } from './RecentScreeningsTable';

export const ClinicianDashboardView: React.FC = () => {
  const { navigateToNewScreening, language, currentUser } = usePortal();

  const doctorName = currentUser?.doctor?.name || 'Dr. Anita Sharma';
  const doctorId = currentUser?.doctor?.doctorId || 'DOC-ANITA';
  const doctorHospital = currentUser?.doctor?.hospital || 'District Hospital Eye Care Centre';
  const doctorDept = currentUser?.doctor?.department || 'Rural Retinal AI Screening Unit';

  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full">
      {/* Clinician Welcome Banner */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 border border-surface-container shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-container text-white flex items-center justify-center font-bold shadow-xs flex-shrink-0">
            <span className="material-symbols-outlined text-[28px]">stethoscope</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary bg-primary-container/10 px-2.5 py-0.5 rounded-full border border-primary-container/20 font-mono">
                {doctorId}
              </span>
              <span className="text-xs text-on-surface-variant font-medium">
                {doctorDept}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl text-primary font-bold mt-1">
              {language === 'hi' ? 'स्वागत है,' : 'Welcome,'} {doctorName}
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {doctorHospital} · {language === 'hi' ? 'स्क्रीनिंग सारांश और प्राथमिकता कार्य' : 'Clinical screening overview and patient queue'}
            </p>
          </div>
        </div>

        <button
          onClick={navigateToNewScreening}
          className="h-11 px-5 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-2 hover:bg-primary-container transition-all shadow-xs w-fit active:scale-98"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>{language === 'hi' ? 'नई स्क्रीनिंग' : 'New Screening'}</span>
        </button>
      </div>

      {/* 4 Core Metrics */}
      <DashboardMetrics />

      {/* Recent Screenings Table */}
      <RecentScreeningsTable />
    </div>
  );
};
