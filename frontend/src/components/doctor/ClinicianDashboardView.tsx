import React from 'react';
import { usePortal } from '../../context/PortalContext';
import { DashboardMetrics } from './DashboardMetrics';
import { RecentScreeningsTable } from './RecentScreeningsTable';

export const ClinicianDashboardView: React.FC = () => {
  const { navigateToNewScreening, language } = usePortal();

  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl text-primary font-bold">
            {language === 'hi' ? 'डैशबोर्ड' : 'Dashboard'}
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            {language === 'hi'
              ? 'स्क्रीनिंग सारांश और प्राथमिकता कार्य'
              : 'Clinical screening overview and priority queue.'}
          </p>
        </div>

        <button
          onClick={navigateToNewScreening}
          className="h-10 px-4 rounded-lg bg-primary text-white text-xs font-bold flex items-center gap-2 hover:bg-primary-container transition-all shadow-xs w-fit"
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
