import React from 'react';
import { usePortal } from '../../context/PortalContext';
import { DashboardMetrics } from './DashboardMetrics';
import { RecentScreeningsTable } from './RecentScreeningsTable';

export const ClinicianDashboardView: React.FC = () => {
  const { language } = usePortal();

  return (
    <div className="space-y-stack-lg max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-bold">
            {language === 'hi' ? 'दैनिक अवलोकन' : 'Overview'}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {language === 'hi'
              ? 'दैनिक नैदानिक सारांश और प्राथमिक कार्य।'
              : 'Daily clinical summary and priority actions.'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm bg-surface-container-low px-3 py-1.5 rounded-full border border-surface-container w-fit">
          <span className="material-symbols-outlined text-[16px] text-primary">sync</span>
          <span>{language === 'hi' ? 'अंतिम सिंक: अभी' : 'Last synced: Just now'}</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <DashboardMetrics />

      {/* Recent Screenings Data Table */}
      <RecentScreeningsTable />
    </div>
  );
};
