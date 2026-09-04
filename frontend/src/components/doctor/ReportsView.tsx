import React from 'react';
import { usePortal } from '../../context/PortalContext';
import { INITIAL_SCREENINGS } from '../../data/mockData';

export const ReportsView: React.FC = () => {
  const { navigateToPatientReport, showToast, language } = usePortal();

  return (
    <div className="space-y-stack-lg max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-bold">
            {language === 'hi' ? 'नैदानिक रिपोर्ट संग्रह' : 'Clinical Screening Reports'}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {language === 'hi'
              ? 'सत्यापित और निर्यात योग्य रेटिना स्क्रीनिंग रिपोर्ट'
              : 'Verified and exportable patient retinal screening summaries'}
          </p>
        </div>

        <button
          onClick={() => showToast('Exporting all clinic screening records as batch PDF...')}
          className="h-touch-target-min px-5 rounded-lg bg-primary text-white font-label-md text-sm font-semibold flex items-center gap-2 hover:bg-primary-container transition-colors shadow-sm w-fit"
        >
          <span className="material-symbols-outlined text-[20px]">download</span>
          <span>{language === 'hi' ? 'बैच निर्यात (PDF)' : 'Export Batch (PDF)'}</span>
        </button>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {INITIAL_SCREENINGS.map((report) => (
          <div
            key={report.id}
            className="bg-surface-container-lowest rounded-xl p-5 shadow-[0px_2px_8px_rgba(7,59,76,0.05)] border border-surface-container flex flex-col justify-between hover:border-primary transition-all"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-primary bg-secondary-container px-2.5 py-1 rounded-md">
                  {report.id}
                </span>
                <span className="text-xs text-on-surface-variant">{report.screeningDate}</span>
              </div>

              <h3 className="font-headline-md text-base font-bold text-on-surface mb-1">
                {report.patientName} ({report.patientAge} Y)
              </h3>
              <p className="text-xs text-on-surface-variant mb-4">Patient ID: {report.patientId}</p>

              <div className="space-y-2 text-xs border-t border-b border-surface-container py-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Diagnosis:</span>
                  <span className="font-bold text-on-surface">{report.aiResult.finding}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">AI Confidence:</span>
                  <span className="font-bold text-primary">{report.aiResult.confidence}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Verified By:</span>
                  <span className="font-medium text-on-surface">{report.review.verifiedBy || 'Pending Review'}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigateToPatientReport(report.id)}
                className="flex-1 h-10 rounded-lg bg-primary-container text-white font-label-md text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                View Report
              </button>
              <button
                onClick={() => showToast(`Downloading PDF for ${report.patientName}...`)}
                className="w-10 h-10 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container flex items-center justify-center transition-colors"
                title="Download PDF"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
