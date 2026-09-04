import React, { useEffect, useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { INITIAL_METRICS } from '../../data/mockData';
import { apiService } from '../../services/apiService';

export const DashboardMetrics: React.FC = () => {
  const { setDoctorTab, language } = usePortal();
  const [metrics, setMetrics] = useState(INITIAL_METRICS);

  useEffect(() => {
    apiService.getDashboardMetrics().then((res) => {
      if (res) {
        setMetrics((prev) => ({
          ...prev,
          totalScreened: res.todaysScreenings ? 128 : prev.totalScreened,
          todaysScreenings: res.todaysScreenings ?? prev.todaysScreenings,
          pendingAnalyses: res.pendingReviews ?? prev.pendingAnalyses,
        }));
      }
    });
  }, []);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Screened */}
      <div className="bg-surface-container-lowest rounded-xl p-4 border border-surface-container shadow-xs flex flex-col justify-between min-h-[100px]">
        <div className="text-xs font-semibold text-on-surface-variant">
          {language === 'hi' ? 'कुल स्क्रीन किए गए' : 'Total Screened'}
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-primary">
          {metrics.totalScreened}
        </div>
      </div>

      {/* 2. Today's Screenings */}
      <div className="bg-surface-container-lowest rounded-xl p-4 border border-surface-container shadow-xs flex flex-col justify-between min-h-[100px]">
        <div className="text-xs font-semibold text-on-surface-variant">
          {language === 'hi' ? 'आज की स्क्रीनिंग' : "Today's Screenings"}
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-primary">
          {metrics.todaysScreenings}
        </div>
      </div>

      {/* 3. Referable Cases */}
      <div
        onClick={() => setDoctorTab('patient-queue')}
        className="bg-[#FFF8E1] rounded-xl p-4 border border-[#FFE082] shadow-xs cursor-pointer hover:shadow-sm transition-all flex flex-col justify-between min-h-[100px]"
      >
        <div className="text-xs font-bold text-[#E65100]">
          {language === 'hi' ? 'रेफरल मामले' : 'Referable Cases'}
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-[#E65100]">
          {metrics.referableCases}
        </div>
      </div>

      {/* 4. Pending */}
      <div
        onClick={() => setDoctorTab('patient-queue')}
        className="bg-surface-container-lowest rounded-xl p-4 border border-surface-container shadow-xs cursor-pointer hover:border-outline-variant transition-all flex flex-col justify-between min-h-[100px]"
      >
        <div className="text-xs font-semibold text-on-surface-variant">
          {language === 'hi' ? 'लंबित' : 'Pending'}
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-primary">
          {metrics.pendingAnalyses}
        </div>
      </div>
    </div>
  );
};
