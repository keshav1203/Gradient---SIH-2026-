import React, { useState, useEffect } from 'react';
import { usePortal } from '../../context/PortalContext';
import { apiService } from '../../services/apiService';
import { ScreeningRecord } from '../../types';

export const RecentScreeningsTable: React.FC = () => {
  const { setDoctorTab, navigateToApproveReport, language } = usePortal();
  const [screenings, setScreenings] = useState<ScreeningRecord[]>([]);

  useEffect(() => {
    apiService.getScreenings().then((res) => {
      if (res && res.length > 0) setScreenings(res.slice(0, 5));
    });
  }, []);

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-surface-container overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-surface-container flex justify-between items-center">
        <h2 className="text-sm sm:text-base font-bold text-primary">
          {language === 'hi' ? 'हाल की स्क्रीनिंग' : 'Recent Screenings'}
        </h2>
        <button
          onClick={() => setDoctorTab('reports')}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {language === 'hi' ? 'सभी देखें →' : 'View All →'}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[650px]">
          <thead>
            <tr className="bg-surface-bright text-on-surface-variant border-b border-surface-container font-semibold">
              <th className="px-5 py-3">Patient</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Quality</th>
              <th className="px-5 py-3">Result</th>
              <th className="px-5 py-3">Confidence</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container text-on-surface">
            {screenings.map((screening) => {
              const isVerified = screening.review.status === 'verified';
              const isPending = screening.review.status === 'pending';

              return (
                <tr key={screening.id} className="hover:bg-surface-container-low transition-colors">
                  {/* Patient */}
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="font-semibold text-primary">{screening.patientName}</span>
                    <span className="text-[11px] text-on-surface-variant block">#{screening.patientId}</span>
                  </td>

                  {/* Date */}
                  <td className="px-5 py-3 whitespace-nowrap text-on-surface-variant">
                    {screening.screeningDate}
                  </td>

                  {/* Quality */}
                  <td className="px-5 py-3 whitespace-nowrap">
                    {screening.quality === 'acceptable' ? (
                      <span className="text-[#2E7D32] font-medium">Good</span>
                    ) : (
                      <span className="text-error font-medium">Marginal</span>
                    )}
                  </td>

                  {/* Result */}
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="font-medium text-on-surface">
                      {screening.aiResult.finding}
                    </span>
                    {screening.aiResult.isReferable && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FFE082] text-[#E65100]">
                        Referable
                      </span>
                    )}
                  </td>

                  {/* Confidence */}
                  <td className="px-5 py-3 whitespace-nowrap font-mono font-semibold">
                    {screening.aiResult.confidence}%
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3 whitespace-nowrap">
                    {isVerified ? (
                      <span className="text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded text-[11px] font-medium">
                        Verified
                      </span>
                    ) : isPending ? (
                      <span className="text-on-tertiary-fixed-variant bg-tertiary-fixed px-2 py-0.5 rounded text-[11px] font-medium">
                        Pending
                      </span>
                    ) : (
                      <span className="text-on-error-container bg-error-container px-2 py-0.5 rounded text-[11px] font-medium">
                        Review Needed
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-5 py-3 whitespace-nowrap text-right">
                    <button
                      onClick={() => (isVerified ? setDoctorTab('reports') : navigateToApproveReport(screening.id))}
                      className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors"
                    >
                      {isVerified ? 'View Report' : 'Approve Report'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
