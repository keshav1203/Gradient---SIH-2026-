import React from 'react';
import { usePortal } from '../../context/PortalContext';
import { INITIAL_SCREENINGS } from '../../data/mockData';

export const RecentScreeningsTable: React.FC = () => {
  const { setDoctorTab, navigateToAiAnalysis, navigateToPatientReport, language } = usePortal();

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-[0_2px_8px_rgba(7,59,76,0.05)] border border-surface-container overflow-hidden">
      {/* Table Header */}
      <div className="p-stack-md border-b border-surface-container flex justify-between items-center bg-surface-bright">
        <h2 className="font-headline-md text-headline-md text-primary font-bold">
          {language === 'hi' ? 'हाल की स्क्रीनिंग' : 'Recent Screenings'}
        </h2>
        <button
          onClick={() => setDoctorTab('patient-queue')}
          className="font-label-sm text-label-sm text-primary-container hover:text-primary flex items-center gap-1 hover:underline min-h-[48px] px-2 transition-colors"
        >
          <span>{language === 'hi' ? 'सभी देखें' : 'View All'}</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </div>

      {/* Responsive Table wrapper */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-surface-bright font-label-sm text-label-sm text-outline border-b border-surface-container">
              <th className="p-4 font-semibold whitespace-nowrap">
                {language === 'hi' ? 'मरीज आईडी' : 'Patient'}
              </th>
              <th className="p-4 font-semibold whitespace-nowrap">
                {language === 'hi' ? 'दिनांक' : 'Date'}
              </th>
              <th className="p-4 font-semibold whitespace-nowrap">
                {language === 'hi' ? 'छवि गुणवत्ता' : 'Image Quality'}
              </th>
              <th className="p-4 font-semibold whitespace-nowrap">
                {language === 'hi' ? 'एआई परिणाम' : 'AI Result'}
              </th>
              <th className="p-4 font-semibold whitespace-nowrap">
                {language === 'hi' ? 'विश्वसनीयता' : 'Confidence'}
              </th>
              <th className="p-4 font-semibold whitespace-nowrap">
                {language === 'hi' ? 'समीक्षा स्थिति' : 'Review Status'}
              </th>
              <th className="p-4 font-semibold whitespace-nowrap text-right">
                {language === 'hi' ? 'कार्रवाई' : 'Action'}
              </th>
            </tr>
          </thead>
          <tbody className="font-body-md text-body-md text-on-surface divide-y divide-surface-container">
            {INITIAL_SCREENINGS.map((screening) => {
              const isUrgent = screening.quality === 'marginal' || screening.review.status === 'review_required';
              const isVerified = screening.review.status === 'verified';
              const isPending = screening.review.status === 'pending';

              return (
                <tr key={screening.id} className="hover:bg-surface-container-low transition-colors">
                  {/* Patient ID */}
                  <td className="p-4 whitespace-nowrap font-semibold text-primary">
                    {screening.patientId}
                  </td>

                  {/* Date */}
                  <td className="p-4 whitespace-nowrap text-on-surface-variant text-sm">
                    {screening.screeningDate}
                  </td>

                  {/* Quality */}
                  <td className="p-4 whitespace-nowrap">
                    {screening.quality === 'acceptable' ? (
                      <div className="flex items-center gap-1 text-primary-container text-sm font-medium">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        <span>{language === 'hi' ? 'उत्कृष्ट' : 'Good'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-error text-sm font-medium">
                        <span className="material-symbols-outlined text-[18px]">error</span>
                        <span>{language === 'hi' ? 'सीमांत (जांचें)' : 'Marginal'}</span>
                      </div>
                    )}
                  </td>

                  {/* AI Result */}
                  <td className="p-4 whitespace-nowrap font-medium">
                    {language === 'hi' ? screening.aiResult.findingHi : screening.aiResult.finding}
                  </td>

                  {/* Confidence Bar */}
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isUrgent ? 'bg-error' : isVerified ? 'bg-secondary' : 'bg-primary-container'
                          }`}
                          style={{ width: `${screening.aiResult.confidence}%` }}
                        />
                      </div>
                      <span className={`font-label-sm text-label-sm font-bold ${isUrgent ? 'text-error' : 'text-on-surface'}`}>
                        {screening.aiResult.confidence}%
                      </span>
                    </div>
                  </td>

                  {/* Review Status Badge */}
                  <td className="p-4 whitespace-nowrap">
                    {isPending && (
                      <span className="inline-flex items-center gap-1 bg-tertiary-fixed text-on-tertiary-fixed-variant px-2.5 py-1 rounded font-label-sm text-label-sm font-semibold">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        <span>{language === 'hi' ? 'लंबित' : 'Pending'}</span>
                      </span>
                    )}
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 text-outline bg-surface-container-high px-2.5 py-1 rounded font-label-sm text-label-sm font-semibold">
                        <span className="material-symbols-outlined text-[14px]">done_all</span>
                        <span>{language === 'hi' ? 'सत्यापित' : 'Verified'}</span>
                      </span>
                    )}
                    {isUrgent && (
                      <span className="inline-flex items-center gap-1 bg-error-container text-on-error-container px-2.5 py-1 rounded font-label-sm text-label-sm font-semibold">
                        <span className="material-symbols-outlined text-[14px]">priority_high</span>
                        <span>{language === 'hi' ? 'तत्काल जांच' : 'Urgent Check'}</span>
                      </span>
                    )}
                  </td>

                  {/* Action Button */}
                  <td className="p-4 whitespace-nowrap text-right">
                    {isVerified ? (
                      <button
                        onClick={() => navigateToPatientReport(screening.id)}
                        className="min-h-[40px] px-4 border border-outline-variant text-primary rounded-lg font-label-sm text-label-sm hover:bg-surface-container-high transition-colors active:scale-95"
                      >
                        {language === 'hi' ? 'देखें' : 'View'}
                      </button>
                    ) : (
                      <button
                        onClick={() => navigateToAiAnalysis(screening.id)}
                        className="min-h-[40px] px-4 bg-primary-container text-white rounded-lg font-label-sm text-label-sm hover:bg-primary transition-all shadow-sm active:scale-95"
                      >
                        {language === 'hi' ? 'समीक्षा करें' : 'Review'}
                      </button>
                    )}
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
