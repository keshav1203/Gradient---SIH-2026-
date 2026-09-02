import React from 'react';
import { usePortal } from '../../context/PortalContext';
import { INITIAL_METRICS } from '../../data/mockData';

export const DashboardMetrics: React.FC = () => {
  const { setDoctorTab, language } = usePortal();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-lg">
      {/* Metric 1: Total Patients */}
      <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_8px_rgba(7,59,76,0.05)] border border-surface-container flex flex-col justify-between min-h-[128px] transition-all hover:border-outline-variant">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-outline text-[22px]">patient_list</span>
          <span className="font-label-md text-label-md">
            {language === 'hi' ? 'कुल मरीज' : 'Total Patients'}
          </span>
        </div>
        <div className="mt-4">
          <span className="font-headline-lg text-headline-lg text-primary font-bold">
            {INITIAL_METRICS.totalPatients}
          </span>
        </div>
      </div>

      {/* Metric 2: Today's Screenings */}
      <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_2px_8px_rgba(7,59,76,0.05)] border border-surface-container flex flex-col justify-between min-h-[128px] transition-all hover:border-outline-variant">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-outline text-[22px]">today</span>
          <span className="font-label-md text-label-md">
            {language === 'hi' ? 'आज की स्क्रीनिंग' : "Today's Screenings"}
          </span>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-headline-lg text-headline-lg text-primary font-bold">
            {INITIAL_METRICS.todaysScreenings}
          </span>
          <span className="font-label-sm text-label-sm text-secondary font-medium">
            {INITIAL_METRICS.todaysScreeningsDelta}
          </span>
        </div>
      </div>

      {/* Metric 3: Pending Reviews (Warning Amber styling per Stitch design) */}
      <div 
        onClick={() => setDoctorTab('patient-queue')}
        className="bg-tertiary-fixed rounded-xl p-stack-md shadow-[0_2px_8px_rgba(7,59,76,0.05)] flex flex-col justify-between min-h-[128px] relative overflow-hidden group cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md"
      >
        <div className="absolute right-[-10px] top-[-10px] opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-[100px] text-tertiary-container">
            pending_actions
          </span>
        </div>
        <div className="flex items-center gap-2 text-on-tertiary-fixed-variant relative z-10">
          <span className="material-symbols-outlined text-[22px]">pending_actions</span>
          <span className="font-label-md text-label-md font-semibold">
            {language === 'hi' ? 'लंबित समीक्षा' : 'Pending Reviews'}
          </span>
        </div>
        <div className="mt-4 relative z-10 flex items-baseline justify-between">
          <span className="font-headline-lg text-headline-lg text-on-tertiary-fixed-variant font-bold">
            {INITIAL_METRICS.pendingReviews}
          </span>
          <span className="text-xs text-on-tertiary-fixed-variant font-medium underline opacity-90 group-hover:opacity-100">
            {language === 'hi' ? 'समीक्षा करें →' : 'Review Queue →'}
          </span>
        </div>
      </div>

      {/* Metric 4: Low-Confidence Cases (Warning Amber styling per Stitch design) */}
      <div 
        onClick={() => setDoctorTab('ai-analysis')}
        className="bg-tertiary-fixed rounded-xl p-stack-md shadow-[0_2px_8px_rgba(7,59,76,0.05)] flex flex-col justify-between min-h-[128px] relative overflow-hidden group cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md"
      >
        <div className="absolute right-[-10px] top-[-10px] opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-[100px] text-tertiary-container">
            warning
          </span>
        </div>
        <div className="flex items-center gap-2 text-on-tertiary-fixed-variant relative z-10">
          <span className="material-symbols-outlined text-[22px]">warning</span>
          <span className="font-label-md text-label-md font-semibold">
            {language === 'hi' ? 'कम आत्मविश्वास मामले' : 'Low-Confidence Cases'}
          </span>
        </div>
        <div className="mt-4 relative z-10 flex items-baseline gap-2">
          <span className="font-headline-lg text-headline-lg text-on-tertiary-fixed-variant font-bold">
            {INITIAL_METRICS.lowConfidenceCases}
          </span>
          <span className="font-label-sm text-label-sm text-on-tertiary-fixed-variant opacity-85">
            {INITIAL_METRICS.lowConfidenceNote}
          </span>
        </div>
      </div>
    </div>
  );
};
