import React, { useEffect, useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { apiService } from '../../services/apiService';

export const DashboardMetrics: React.FC = () => {
  const { setDoctorTab, language, currentUser, dataVersion } = usePortal();
  const [metrics, setMetrics] = useState({
    totalScreened: 0,
    todaysScreenings: 0,
    referableCases: 0,
    pendingAnalyses: 0,
  });

  useEffect(() => {
    let mounted = true;
    apiService.getDashboardMetrics().then((res) => {
      if (res && mounted) {
        const screenedCount = typeof res.todaysScreenings === 'number' ? res.todaysScreenings : 0;
        const totalPatientsNum = res.totalPatients ? parseInt(String(res.totalPatients).replace(/,/g, ''), 10) : 0;
        setMetrics({
          totalScreened: !isNaN(totalPatientsNum) ? totalPatientsNum : screenedCount,
          todaysScreenings: screenedCount,
          referableCases: typeof res.lowConfidenceCases === 'number' ? res.lowConfidenceCases : 0,
          pendingAnalyses: typeof res.pendingReviews === 'number' ? res.pendingReviews : 0,
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, [currentUser, dataVersion]);

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
