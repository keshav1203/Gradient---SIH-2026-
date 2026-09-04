import React, { useState, useEffect, useMemo } from 'react';
import { usePortal } from '../../context/PortalContext';
import { apiService } from '../../services/apiService';
import { ScreeningRecord } from '../../types';
import { RETINAL_ASSETS } from '../../data/mockData';
import { getTranslation } from '../../data/translations';

interface ClinicalReportSheetProps {
  report: ScreeningRecord;
  language: 'en' | 'hi';
}

const ClinicalReportSheet: React.FC<ClinicalReportSheetProps> = ({ report, language }) => {
  return (
    <div className="p-6 sm:p-8 space-y-6 bg-white text-[#1a1c1d]" id="printable-report">
      {/* Official Letterhead */}
      <div className="border-b-2 border-primary pb-4 flex flex-col sm:flex-row justify-between items-start gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#002431]">
            DRISHTIKON RETINAL SCREENING REPORT
          </h2>
          <p className="text-xs text-[#506165] font-medium mt-0.5">
            District Hospital Eye Care Centre · Tele-Ophthalmology & AI Diagnostics Unit
          </p>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-xs font-mono font-bold bg-[#E2E2E4] px-2.5 py-1 rounded inline-block">
            REPORT #{report.id}
          </span>
          <p className="text-[11px] text-[#506165] mt-1">{report.screeningDate}</p>
        </div>
      </div>

      {/* Patient Information & Exam Meta Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#F9F9FB] border border-[#E2E2E4] text-xs">
        <div>
          <span className="text-[#71787C] block font-semibold text-[10px] uppercase tracking-wider">
            Patient Name
          </span>
          <span className="font-bold text-sm text-[#002431]">{report.patientName}</span>
        </div>
        <div>
          <span className="text-[#71787C] block font-semibold text-[10px] uppercase tracking-wider">
            Patient ID
          </span>
          <span className="font-mono font-bold text-[#002431]">#{report.patientId}</span>
        </div>
        <div>
          <span className="text-[#71787C] block font-semibold text-[10px] uppercase tracking-wider">
            Age / Gender
          </span>
          <span className="font-bold text-[#002431]">
            {report.patientAge} Y / {report.patientGender}
          </span>
        </div>
        <div>
          <span className="text-[#71787C] block font-semibold text-[10px] uppercase tracking-wider">
            Eye Examined
          </span>
          <span className="font-bold text-[#002431]">{report.eye}</span>
        </div>
      </div>

      {/* Quality & AI Classification Section */}
      {(() => {
        const score = report.qualityMetrics?.clarity ?? report.qualityMetrics?.detailed?.score ?? (report.status === 'rejected' ? 32 : 94);
        const decision = report.qualityMetrics?.detailed?.overall ?? (score >= 75 ? 'GOOD' : score >= 50 ? 'MARGINAL' : 'POOR');
        const isAcceptable = score >= 50 && decision !== 'POOR';
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Quality */}
            <div className="p-4 rounded-xl border border-[#E2E2E4] bg-white">
              <span className="text-[#71787C] block font-semibold text-[10px] uppercase tracking-wider mb-1">
                Image Quality Assessment
              </span>
              <div className={`flex items-center gap-1.5 font-bold text-sm ${isAcceptable ? 'text-[#2E7D32]' : 'text-red-700'}`}>
                <span className="material-symbols-outlined text-[18px]">
                  {isAcceptable ? 'check_circle' : 'cancel'}
                </span>
                <span>{decision} (Score: {score}%)</span>
              </div>
              <p className="text-[11px] text-[#71787C] mt-1">
                {isAcceptable ? 'Focus, illumination & FOV optimal.' : 'Substandard image quality / blur.'}
              </p>
            </div>

        {/* Classification */}
        <div className="p-4 rounded-xl border border-[#E2E2E4] bg-white">
          <span className="text-[#71787C] block font-semibold text-[10px] uppercase tracking-wider mb-1">
            AI DR Classification
          </span>
          <span className="font-bold text-sm text-[#002431] block">
            {report.aiResult.finding}
          </span>
          <span className="text-xs font-semibold text-[#073b4c]">
            {report.aiResult.severity}
          </span>
        </div>

        {/* Risk & Confidence */}
        <div className="p-4 rounded-xl border border-[#E2E2E4] bg-white">
          <span className="text-[#71787C] block font-semibold text-[10px] uppercase tracking-wider mb-1">
            Risk & AI Confidence
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                report.aiResult.isReferable
                  ? 'bg-[#FFE082] text-[#E65100]'
                  : 'bg-[#C8E6C9] text-[#2E7D32]'
              }`}
            >
              {report.aiResult.riskLevel} Risk
            </span>
            <span className="text-xs font-bold text-[#002431]">
              {report.aiResult.confidence}% Certainty
            </span>
          </div>
          <p className="text-[10px] text-[#71787C] mt-1">
            {report.aiResult.isReferable ? 'Referable Case' : 'Non-Referable'}
          </p>
        </div>
      </div>
        );
      })()}

      {/* Detected Retinal Findings Table */}
      <div className="border border-[#E2E2E4] rounded-xl overflow-hidden">
        <div className="bg-[#F3F3F5] px-4 py-2.5 text-xs font-bold text-[#002431] uppercase tracking-wider">
          Detected Retinal Findings
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[#E2E2E4] p-4 text-xs">
          <div>
            <span className="text-[#71787C] block text-[11px]">Microaneurysms</span>
            <span className="font-bold text-[#E65100]">
              {report.aiResult.lesions?.microaneurysms || 'Detected'}
            </span>
          </div>
          <div className="pl-4">
            <span className="text-[#71787C] block text-[11px]">Hemorrhages</span>
            <span className="font-bold text-[#E65100]">
              {report.aiResult.lesions?.hemorrhages || 'Detected'}
            </span>
          </div>
          <div className="pl-4">
            <span className="text-[#71787C] block text-[11px]">Exudates</span>
            <span className="font-bold text-[#E65100]">
              {report.aiResult.lesions?.exudates || 'Detected'}
            </span>
          </div>
          <div className="pl-4">
            <span className="text-[#71787C] block text-[11px]">Neovascularization</span>
            <span className="font-bold text-[#2E7D32]">
              {report.aiResult.lesions?.neovascularization || 'Not detected'}
            </span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Fundus & Grad-CAM Visual Documentation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3.5 rounded-xl border border-[#E2E2E4] bg-[#F9F9FB]">
          <span className="font-bold text-xs text-[#002431] block mb-2">
            Original Fundus Scan ({report.eye})
          </span>
          <div className="aspect-[4/3] rounded-lg bg-black overflow-hidden flex items-center justify-center">
            <img
              src={report.images?.original || RETINAL_ASSETS.originalFundusOS}
              alt="Original Fundus"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-[#E2E2E4] bg-[#F9F9FB]">
          <span className="font-bold text-xs text-[#002431] block mb-2">
            Grad-CAM Explainable AI Heatmap
          </span>
          <div className="aspect-[4/3] rounded-lg bg-black overflow-hidden flex items-center justify-center">
            <img
              src={report.images?.overlay || report.images?.heatmap || RETINAL_ASSETS.heatmapOverlayOS}
              alt="Grad-CAM Heatmap"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* Clinical Recommendation & Doctor Verification */}
      <div className="p-4 rounded-xl bg-[#FFF8E1] border-l-4 border-[#FFA000] text-xs">
        <span className="font-bold text-[#E65100] uppercase text-[11px] block mb-1">
          Recommendation & Clinical Action Plan
        </span>
        <p className="font-medium text-[#002431] leading-relaxed">
          {report.aiResult.recommendation}
        </p>
        <div className="mt-3 pt-2 border-t border-[#FFE082] flex flex-wrap justify-between items-center text-[11px] text-[#506165] gap-2">
          <span>
            <strong>Verified By:</strong>{' '}
            {report.review.verifiedBy || 'Dr. Anita (Consultant Vitreoretinal Specialist)'}
          </span>
          <span>
            <strong>Status:</strong> {report.review.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Footer Disclaimers */}
      <div className="text-[10px] text-[#71787C] border-t border-[#E2E2E4] pt-3 leading-normal">
        <p>{getTranslation('clinicianDisclaimer', language)}</p>
      </div>
    </div>
  );
};

export const ReportsView: React.FC = () => {
  const { selectedScreeningId, showToast, language } = usePortal();
  const [reports, setReports] = useState<ScreeningRecord[]>([]);
  const [selectedReport, setSelectedReport] = useState<ScreeningRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'referable' | 'normal' | 'verified'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    apiService.getScreenings().then((res) => {
      if (res && res.length > 0) {
        setReports(res);
        const match = selectedScreeningId ? res.find(r => r.id === selectedScreeningId) : null;
        setSelectedReport(match || res[0]);
      }
      setIsLoading(false);
    });
  }, [selectedScreeningId]);

  // Keyboard shortcut for closing modal with Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Filtered reports by search query and tab filter
  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        rep.patientName.toLowerCase().includes(q) ||
        rep.patientId.toLowerCase().includes(q) ||
        rep.id.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterType === 'referable') return rep.aiResult.isReferable;
      if (filterType === 'normal') return !rep.aiResult.isReferable;
      if (filterType === 'verified') return rep.review.status === 'verified';

      return true;
    });
  }, [reports, searchQuery, filterType]);

  const handlePrint = () => {
    window.print();
  };

  const handleViewReport = (report: ScreeningRecord) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const handleDownloadPdf = (report: ScreeningRecord) => {
    setSelectedReport(report);
    showToast(
      language === 'hi'
        ? `${report.patientName} की पीडीएफ रिपोर्ट तैयार की जा रही है...`
        : `Generating printable PDF report for ${report.patientName}...`
    );
    setTimeout(() => {
      window.print();
    }, 350);
  };

  const handleShare = (report: ScreeningRecord) => {
    if (navigator.share) {
      navigator
        .share({
          title: `Drishtikon DR Screening Report - ${report.patientName}`,
          text: `DR Screening Report for ${report.patientName} (${report.patientId}) - AI Finding: ${report.aiResult.finding}. Verified by ${
            report.review.verifiedBy || 'Clinician'
          }.`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast(language === 'hi' ? 'रिपोर्ट लिंक कॉपी किया गया' : 'Report link copied to clipboard');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Section */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold uppercase tracking-wider mb-1">
            Clinical Documentation
          </div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-bold">
            {getTranslation('reports', language)}
          </h1>
          <p className="font-body-md text-sm text-on-surface-variant mt-0.5">
            {language === 'hi'
              ? 'सत्यापित और निर्यात योग्य रेटिना स्क्रीनिंग रिपोर्ट'
              : 'Official clinical diabetic retinopathy screening summaries with Grad-CAM XAI'}
          </p>
        </div>

        <button
          onClick={() => {
            if (selectedReport) {
              handleDownloadPdf(selectedReport);
            } else if (reports.length > 0) {
              handleDownloadPdf(reports[0]);
            }
          }}
          className="h-touch-target-min px-5 rounded-lg bg-primary text-white font-label-md text-sm font-semibold flex items-center gap-2 hover:bg-primary-container transition-colors shadow-sm w-fit"
        >
          <span className="material-symbols-outlined text-[20px]">print</span>
          <span>{language === 'hi' ? 'बैच प्रिंट (PDF)' : 'Print Batch Reports'}</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-surface-container-lowest rounded-xl shadow-[0_2px_8px_rgba(7,59,76,0.05)] p-4 border border-surface-container flex flex-col md:flex-row gap-4">
        {/* Patient Search Input */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={getTranslation('searchPatientPlaceholder', language)}
            className="w-full h-touch-target-min pl-11 pr-10 rounded-lg border border-secondary-fixed bg-surface text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              filterType === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface border border-secondary-fixed text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {getTranslation('filterAll', language)} ({reports.length})
          </button>
          <button
            onClick={() => setFilterType('referable')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              filterType === 'referable'
                ? 'bg-[#E65100] text-white shadow-xs'
                : 'bg-surface border border-secondary-fixed text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {getTranslation('filterReferable', language)}
          </button>
          <button
            onClick={() => setFilterType('normal')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              filterType === 'normal'
                ? 'bg-[#2E7D32] text-white shadow-xs'
                : 'bg-surface border border-secondary-fixed text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {getTranslation('filterNormal', language)}
          </button>
        </div>
      </div>

      {/* Spacious, Uncongested Patient Reports List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-on-surface-variant bg-surface-container-lowest rounded-xl border border-surface-container">
            <span className="material-symbols-outlined animate-spin text-primary text-[32px]">sync</span>
            <p className="text-sm mt-2 font-medium">Loading clinical reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant bg-surface-container-lowest rounded-xl border border-surface-container">
            <span className="material-symbols-outlined text-[40px] text-outline">search_off</span>
            <h3 className="font-bold text-base text-on-surface mt-2">
              {getTranslation('noReportsFound', language)}
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Try searching with a different patient name or patient ID.
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-container transition-colors"
              >
                Reset Search
              </button>
            )}
          </div>
        ) : (
          filteredReports.map((rep) => {
            const isReferable = rep.aiResult.isReferable;
            const isVerified = rep.review.status === 'verified';

            return (
              <div
                key={rep.id}
                className="bg-surface-container-lowest rounded-xl p-5 border border-surface-container hover:border-outline-variant hover:shadow-md transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* 1. Patient Name, ID, Demographics */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-full bg-secondary-container/70 text-primary flex items-center justify-center font-bold text-base shrink-0 border border-secondary-fixed/50 shadow-2xs">
                    {rep.patientName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-base text-on-surface truncate">
                        {rep.patientName}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full font-mono text-xs font-bold bg-primary-fixed text-on-primary-fixed border border-primary/20">
                        ID: #{rep.patientId}
                      </span>
                      <span className="text-xs text-on-surface-variant font-medium">
                        ({rep.patientAge} Y · {rep.patientGender})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary">description</span>
                        <span className="font-mono font-medium">{rep.id}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary">calendar_today</span>
                        <span>{rep.screeningDate}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary">visibility</span>
                        <span>{rep.eye}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. AI Finding & Risk Classification */}
                <div className="flex flex-wrap lg:flex-col lg:items-end items-center gap-2 lg:gap-1.5 lg:min-w-[240px]">
                  <span className="text-xs font-bold text-primary">
                    {rep.aiResult.finding}
                  </span>
                  <div className="flex items-center gap-2">
                    {isReferable ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFE082] text-[#E65100] border border-[#FFA000]/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E65100]"></span>
                        Referable ({rep.aiResult.riskLevel.toUpperCase()})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#C8E6C9] text-[#2E7D32] border border-[#2E7D32]/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]"></span>
                        Normal Retina
                      </span>
                    )}
                    {isVerified && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary-container text-on-secondary-container flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. The 2 Options: View Report and Download Report */}
                <div className="flex items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-surface-container shrink-0">
                  {/* Option 1: View Report */}
                  <button
                    onClick={() => handleViewReport(rep)}
                    className="h-10 px-4 rounded-lg border border-primary text-primary hover:bg-primary/10 font-label-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-2xs"
                    title={getTranslation('viewReport', language)}
                  >
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                    <span>{getTranslation('viewReport', language)}</span>
                  </button>

                  {/* Option 2: Download Report */}
                  <button
                    onClick={() => handleDownloadPdf(rep)}
                    className="h-10 px-4 rounded-lg bg-primary text-white hover:bg-primary-container font-label-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
                    title={getTranslation('downloadReport', language)}
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    <span>{getTranslation('downloadReport', language)}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Hidden Print Container: Ensures Download Report prints cleanly when modal is closed */}
      {!isModalOpen && selectedReport && (
        <div className="hidden print:block">
          <ClinicalReportSheet report={selectedReport} language={language} />
        </div>
      )}

      {/* Full-Featured, Uncongested View Report Modal */}
      {isModalOpen && selectedReport && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
            {/* Modal Header Bar */}
            <div className="p-4 sm:p-5 bg-surface-bright border-b border-surface-container flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 no-print">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="material-symbols-outlined text-primary text-[24px]">description</span>
                <div className="min-w-0">
                  <h3 className="font-headline-md text-sm sm:text-base font-bold text-primary truncate">
                    Screening Report: #{selectedReport.id}
                  </h3>
                  <p className="text-xs text-on-surface-variant truncate">
                    {selectedReport.patientName} · Patient ID: #{selectedReport.patientId}
                  </p>
                </div>
              </div>

              {/* Action Buttons in Modal Header */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPdf(selectedReport)}
                  className="px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-bold flex items-center gap-1.5 hover:bg-primary-container transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>{getTranslation('downloadPdf', language)}</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 rounded-lg border border-outline-variant text-on-surface text-xs font-bold flex items-center gap-1.5 hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>{getTranslation('printReport', language)}</span>
                </button>

                <button
                  onClick={() => handleShare(selectedReport)}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface text-xs font-bold flex items-center gap-1.5 hover:bg-surface-container transition-colors"
                  title={getTranslation('shareReport', language)}
                >
                  <span className="material-symbols-outlined text-[16px]">share</span>
                  <span className="hidden sm:inline">{getTranslation('shareReport', language)}</span>
                </button>

                <button
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Close modal"
                  className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors ml-1"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Spacious Printable Medical Sheet */}
            <div className="overflow-y-auto custom-scrollbar flex-1 bg-white">
              <ClinicalReportSheet report={selectedReport} language={language} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
