import React, { useState, useEffect, useMemo } from 'react';
import { usePortal } from '../../context/PortalContext';
import { apiService } from '../../services/apiService';
import { ScreeningRecord } from '../../types';
import { RETINAL_ASSETS } from '../../data/mockData';
import { getTranslation } from '../../data/translations';
import { GradCamReadingBar } from '../common/GradCamReadingBar';

export const ApproveReportsView: React.FC = () => {
  const { currentScreening, selectedScreeningId, setSelectedScreeningId, setCurrentScreening, showToast, language } = usePortal();
  const [screenings, setScreenings] = useState<ScreeningRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unverified' | 'verified'>('all');

  // Review Mode state
  const [reviewingScreening, setReviewingScreening] = useState<ScreeningRecord | null>(null);
  const [activeViewerTab, setActiveViewerTab] = useState<'heatmap' | 'original' | 'enhanced' | 'lesions'>('heatmap');
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(65);
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleExitReview = () => {
    setSelectedScreeningId('');
    setReviewingScreening(null);
  };

  const fetchScreenings = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getScreenings();
      if (data && data.length > 0) {
        setScreenings(data);
      }
    } catch {
      // Fallback handled in service
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenings();
  }, []);

  useEffect(() => {
    if (selectedScreeningId && screenings.length > 0 && !reviewingScreening) {
      const match = screenings.find(s => s.id === selectedScreeningId);
      if (match) {
        handleStartReview(match);
      } else if (currentScreening && currentScreening.id === selectedScreeningId) {
        handleStartReview(currentScreening);
      }
    }
  }, [selectedScreeningId, screenings]);

  // Filtered list
  const filteredScreenings = useMemo(() => {
    return screenings.filter((s) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.patientName.toLowerCase().includes(q) ||
        s.patientId.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const isVerified = s.review.status === 'verified' || s.review.verified;
      if (statusFilter === 'unverified') return !isVerified;
      if (statusFilter === 'verified') return isVerified;

      return true;
    });
  }, [screenings, searchQuery, statusFilter]);

  const counts = useMemo(() => {
    const verified = screenings.filter((s) => s.review.status === 'verified' || s.review.verified).length;
    const unverified = screenings.length - verified;
    return { total: screenings.length, verified, unverified };
  }, [screenings]);

  // Start review
  const handleStartReview = (screening: ScreeningRecord) => {
    setReviewingScreening(screening);
    setClinicalNotes(
      screening.review.notes ||
        (screening.review.status === 'verified'
          ? 'Findings verified by clinician.'
          : 'Microaneurysms and hard exudates confirmed in nasal quadrant. Macular edema excluded. Follow up in 4 weeks with dilated exam.')
    );
    setActiveViewerTab('heatmap');
    setHeatmapOpacity(65);
  };

  // Submit approval
  const handleApproveReport = async () => {
    if (!reviewingScreening) return;
    setIsSubmitting(true);
    try {
      const updated = await apiService.submitClinicianReview(
        reviewingScreening.id,
        clinicalNotes,
        'verified'
      );
      showToast(
        language === 'hi'
          ? `${updated.patientName} की रिपोर्ट डॉक्टर अनीता द्वारा सत्यापित एवं स्वीकृत की गई!`
          : `Report for ${updated.patientName} successfully verified and approved by Dr. Anita!`
      );
      // Update local state
      setScreenings((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      setCurrentScreening(updated);
      handleExitReview();
    } catch {
      showToast('Error approving screening report');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // REVIEW MODE: Doctor reviews the AI-generated report in detail
  // -------------------------------------------------------------
  if (reviewingScreening) {
    const isVerified =
      reviewingScreening.review.status === 'verified' || reviewingScreening.review.verified;
    const lesions = reviewingScreening.aiResult.lesions || {
      microaneurysms: 'Detected',
      hemorrhages: 'Detected',
      exudates: 'Detected',
      neovascularization: 'Not detected',
    };

    return (
      <div className="space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
        {/* Navigation & Patient Bar */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExitReview}
              className="h-10 px-3.5 rounded-lg border border-secondary-fixed bg-surface hover:bg-surface-container-high text-on-surface font-label-md text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>{language === 'hi' ? 'सूची पर वापस' : 'Back to Reports List'}</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-primary">
                  {reviewingScreening.patientName}
                </h1>
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-primary-fixed text-on-primary-fixed">
                  ID: #{reviewingScreening.patientId}
                </span>
                <span className="text-xs text-on-surface-variant">
                  ({reviewingScreening.patientAge} Y · {reviewingScreening.patientGender})
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Report #{reviewingScreening.id} · Exam: {reviewingScreening.eye} · {reviewingScreening.screeningDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isVerified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8E6C9] text-[#2E7D32] text-xs font-bold border border-[#2E7D32]/30">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Verified by {reviewingScreening.review.verifiedBy || 'Dr. Anita'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE082] text-[#E65100] text-xs font-bold border border-[#FFA000]/30">
                <span className="material-symbols-outlined text-[16px]">pending_actions</span>
                Unverified · Pending Approval
              </span>
            )}
          </div>
        </div>

        {/* Two-Column Review Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Retinal Viewer with Grad-CAM & Lesions (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-surface-container overflow-hidden flex flex-col">
              {/* Viewer Tab Bar */}
              <div className="p-3.5 bg-surface-bright border-b border-surface-container flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-1 bg-surface-container-low p-1 rounded-lg border border-surface-container">
                  <button
                    onClick={() => setActiveViewerTab('heatmap')}
                    className={`px-3 py-1.5 rounded-md font-label-md text-xs font-bold transition-all ${
                      activeViewerTab === 'heatmap'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    Raw Grad-CAM
                  </button>
                  <button
                    onClick={() => setActiveViewerTab('original')}
                    className={`px-3 py-1.5 rounded-md font-label-md text-xs font-bold transition-all ${
                      activeViewerTab === 'original'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    Original Fundus
                  </button>
                  <button
                    onClick={() => setActiveViewerTab('enhanced')}
                    className={`px-3 py-1.5 rounded-md font-label-md text-xs font-bold transition-all ${
                      activeViewerTab === 'enhanced'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    Enhanced (CLAHE)
                  </button>
                  <button
                    onClick={() => setActiveViewerTab('lesions')}
                    className={`px-3 py-1.5 rounded-md font-label-md text-xs font-bold transition-all ${
                      activeViewerTab === 'lesions'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    Detected Lesions
                  </button>
                </div>

                {/* Heatmap Blend Control */}
                {activeViewerTab === 'heatmap' && (
                  <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-lg border border-surface-container text-xs">
                    <span className="material-symbols-outlined text-[16px] text-primary">opacity</span>
                    <span className="text-[11px] font-medium text-on-surface-variant">Heatmap Blend:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={heatmapOpacity}
                      onChange={(e) => setHeatmapOpacity(parseInt(e.target.value))}
                      className="w-20 accent-primary cursor-pointer"
                    />
                    <span className="font-mono text-[11px] font-bold text-primary w-7">
                      {heatmapOpacity}%
                    </span>
                  </div>
                )}
              </div>

              {/* Viewer Image Stage */}
              <div className="relative aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
                {activeViewerTab === 'original' && (
                  <img
                    src={reviewingScreening.images?.original || RETINAL_ASSETS.originalFundusOS}
                    alt="Original Fundus"
                    className="w-full h-full object-contain"
                  />
                )}

                {activeViewerTab === 'heatmap' && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={reviewingScreening.images?.original || RETINAL_ASSETS.originalFundusOS}
                      alt="Base Scan"
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    />
                    <img
                      src={reviewingScreening.images?.overlay || reviewingScreening.images?.heatmap || RETINAL_ASSETS.heatmapOverlayOS}
                      alt="Grad-CAM Overlay"
                      style={{ opacity: heatmapOpacity / 100 }}
                      className="absolute inset-0 w-full h-full object-contain transition-opacity duration-150"
                    />
                    {/* Floating Overlay Grad-CAM Reading Bar */}
                    <GradCamReadingBar
                      variant="overlay"
                      language={language}
                      className="absolute bottom-4 right-4 z-20 w-60 shadow-2xl"
                    />
                  </div>
                )}

                {activeViewerTab === 'enhanced' && (
                  <img
                    src={reviewingScreening.images?.original || RETINAL_ASSETS.originalFundusOS}
                    alt="Enhanced Scan"
                    style={{ filter: 'contrast(135%) brightness(105%)' }}
                    className="w-full h-full object-contain"
                  />
                )}

                {activeViewerTab === 'lesions' && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={reviewingScreening.images?.original || RETINAL_ASSETS.originalFundusOS}
                      alt="Retinal Lesions"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-4 left-4 right-4 bg-black/75 backdrop-blur-sm p-3 rounded-lg border border-white/20 text-white text-xs grid grid-cols-2 gap-2">
                      <div>Microaneurysms: <span className="font-bold text-amber-400">{lesions.microaneurysms}</span></div>
                      <div>Hemorrhages: <span className="font-bold text-red-400">{lesions.hemorrhages}</span></div>
                      <div>Exudates: <span className="font-bold text-amber-300">{lesions.exudates}</span></div>
                      <div>Neovascularization: <span className="font-bold text-green-400">{lesions.neovascularization}</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Attribution footnote */}
              <div className="p-3 bg-surface-bright border-t border-surface-container flex items-center justify-between text-[11px] text-on-surface-variant">
                <span>Attribution Colormap: Blue (Low impact) to Red (High diagnostic impact)</span>
                <span className="font-medium">Camera: {reviewingScreening.fundusCameraModel}</span>
              </div>
            </div>
          </div>

          {/* RIGHT: AI Diagnostic Findings & Clinician Verification Form (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* AI Classification Card */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-surface-container">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  AI DR Diagnostic Inference
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    reviewingScreening.aiResult.isReferable
                      ? 'bg-[#FFE082] text-[#E65100]'
                      : 'bg-[#C8E6C9] text-[#2E7D32]'
                  }`}
                >
                  {reviewingScreening.aiResult.riskLevel} Risk
                </span>
              </div>

              <h3 className="text-lg font-bold text-primary">
                {reviewingScreening.aiResult.finding}
              </h3>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                {reviewingScreening.aiResult.severity}
              </p>

              <div className="mt-4 pt-3 border-t border-surface-container space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">AI Model Confidence:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${reviewingScreening.aiResult.confidence}%` }}
                      />
                    </div>
                    <span className="font-bold font-mono text-primary">
                      {reviewingScreening.aiResult.confidence}%
                    </span>
                  </div>
                </div>

                {(() => {
                  const score = reviewingScreening.qualityMetrics?.clarity ?? reviewingScreening.qualityMetrics?.detailed?.score ?? (reviewingScreening.status === 'rejected' ? 32 : 94);
                  const decision = reviewingScreening.qualityMetrics?.detailed?.overall ?? (score >= 75 ? 'GOOD' : score >= 50 ? 'MARGINAL' : 'POOR');
                  const isAcceptable = score >= 50 && decision !== 'POOR';
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant">Image Quality Assessment:</span>
                      <span className={`font-bold flex items-center gap-1 ${isAcceptable ? 'text-[#2E7D32]' : 'text-red-700'}`}>
                        <span className="material-symbols-outlined text-[14px]">
                          {isAcceptable ? 'check_circle' : 'cancel'}
                        </span>
                        {decision} (Score: {score}%)
                      </span>
                    </div>
                  );
                })()}

                <div className="flex justify-between items-center text-[11px] text-outline font-mono pt-1">
                  <span>Architecture:</span>
                  <span>{reviewingScreening.aiResult.modelName || 'ResNet-18 (APTOS 2019)'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-outline font-mono">
                  <span>Grad-CAM Target Layer:</span>
                  <span>{reviewingScreening.aiResult.targetLayer || 'res5b_branch2b'}</span>
                </div>
              </div>

              {/* 5-Class Probability Distribution from Model */}
              {reviewingScreening.aiResult.classProbabilities && (
                <div className="mt-4 pt-3 border-t border-surface-container">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                      5-Class Softmax Probabilities
                    </span>
                    <span className="text-[10px] font-mono text-outline">
                      ResNet-18
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {Object.entries(reviewingScreening.aiResult.classProbabilities).map(([cName, prob]) => {
                      const pPercent = typeof prob === 'number' ? Math.round(prob * 100) : 0;
                      const isTop = (cName === 'No_DR' && reviewingScreening.aiResult.grade === 0) ||
                                    (cName === 'Mild' && reviewingScreening.aiResult.grade === 1) ||
                                    (cName === 'Moderate' && reviewingScreening.aiResult.grade === 2) ||
                                    (cName === 'Severe' && reviewingScreening.aiResult.grade === 3) ||
                                    (cName === 'Proliferative_DR' && reviewingScreening.aiResult.grade === 4);
                      const displayName = cName.replace('_', ' ');
                      return (
                        <div key={cName} className="flex items-center justify-between gap-2">
                          <span className={`w-32 truncate text-[11px] ${isTop ? 'font-bold text-primary' : 'text-on-surface-variant'}`}>
                            {displayName}
                          </span>
                          <div className="flex-1 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                            <div
                              className={`h-full ${isTop ? 'bg-primary' : 'bg-outline-variant'}`}
                              style={{ width: `${Math.max(pPercent, 2)}%` }}
                            />
                          </div>
                          <span className={`w-9 text-right font-mono text-[11px] ${isTop ? 'font-bold text-primary' : 'text-on-surface-variant'}`}>
                            {pPercent}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* AI Clinical Recommendation */}
            <div className="bg-[#FFF8E1] border-l-4 border-[#FFA000] p-4 rounded-r-xl shadow-xs">
              <span className="text-[11px] font-bold text-[#E65100] uppercase tracking-wider block mb-1">
                AI Suggested Recommendation
              </span>
              <p className="text-xs font-medium text-[#795548] leading-relaxed">
                {reviewingScreening.aiResult.recommendation}
              </p>
            </div>

            {/* Doctor Verification & Sign-Off Box */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-surface-container flex flex-col gap-3">
              <h3 className="font-bold text-sm text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
                <span>Doctor Verification & Clinical Approval</span>
              </h3>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5" htmlFor="clinical-notes">
                  Clinician Observations & Official Notes
                </label>
                <textarea
                  id="clinical-notes"
                  rows={4}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Enter your clinical observations, macular assessment, and treatment plan here..."
                  className="w-full rounded-lg border border-secondary-fixed bg-surface-bright text-xs p-3 transition-colors resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleApproveReport}
                  disabled={isSubmitting}
                  className="h-11 rounded-lg bg-primary text-white font-label-md text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                      <span>Verifying & Approving...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">verified_user</span>
                      <span>
                        {isVerified
                          ? (language === 'hi' ? 'सत्यापन अपडेट करें' : 'Update Verification & Approval')
                          : (language === 'hi' ? 'सत्यापित करें एवं रिपोर्ट स्वीकृत करें' : 'Verify & Approve Report')}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleExitReview}
                  className="h-10 rounded-lg border border-outline-variant text-on-surface font-label-md text-xs font-semibold hover:bg-surface-container transition-colors"
                >
                  {language === 'hi' ? 'रद्द करें / वापस जाएं' : 'Cancel / Return to List'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // LIST MODE: Overview of patient details & verification status
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Section */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold uppercase tracking-wider mb-1">
            Clinical Decision Support
          </div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-bold">
            {getTranslation('approveReports', language)}
          </h1>
          <p className="font-body-md text-sm text-on-surface-variant mt-0.5">
            {language === 'hi'
              ? 'मरीजों की स्क्रीनिंग रिपोर्ट की समीक्षा करें और एआई निष्कर्षों को सत्यापित करें।'
              : 'Review patient details, examine AI diagnostics with Grad-CAM explainability, and verify reports.'}
          </p>
        </div>

        {/* Quick Counters */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container shadow-2xs text-center">
            <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Pending</span>
            <span className="text-sm font-bold text-[#E65100]">{counts.unverified}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container shadow-2xs text-center">
            <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Verified</span>
            <span className="text-sm font-bold text-[#2E7D32]">{counts.verified}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container shadow-2xs text-center">
            <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Total</span>
            <span className="text-sm font-bold text-primary">{counts.total}</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-surface-container-lowest rounded-xl shadow-[0_2px_8px_rgba(7,59,76,0.05)] p-4 border border-surface-container flex flex-col md:flex-row gap-4">
        {/* Search */}
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

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface border border-secondary-fixed text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            All ({counts.total})
          </button>
          <button
            onClick={() => setStatusFilter('unverified')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'unverified'
                ? 'bg-[#E65100] text-white shadow-xs'
                : 'bg-surface border border-secondary-fixed text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Pending Approval ({counts.unverified})
          </button>
          <button
            onClick={() => setStatusFilter('verified')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'verified'
                ? 'bg-[#2E7D32] text-white shadow-xs'
                : 'bg-surface border border-secondary-fixed text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Verified ({counts.verified})
          </button>
        </div>
      </div>

      {/* Patient List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-on-surface-variant bg-surface-container-lowest rounded-xl border border-surface-container">
            <span className="material-symbols-outlined animate-spin text-primary text-[32px]">sync</span>
            <p className="text-sm mt-2 font-medium">Loading reports for approval...</p>
          </div>
        ) : filteredScreenings.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant bg-surface-container-lowest rounded-xl border border-surface-container">
            <span className="material-symbols-outlined text-[40px] text-outline">search_off</span>
            <h3 className="font-bold text-base text-on-surface mt-2">
              No reports match your filter criteria.
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Try adjusting your search or selecting a different status filter.
            </p>
          </div>
        ) : (
          filteredScreenings.map((screening) => {
            const isVerified = screening.review.status === 'verified' || screening.review.verified;
            const isReferable = screening.aiResult.isReferable;

            return (
              <div
                key={screening.id}
                className="bg-surface-container-lowest rounded-xl p-5 border border-surface-container hover:border-outline-variant hover:shadow-md transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* 1. Patient Details & Examination Meta */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-full bg-secondary-container/70 text-primary flex items-center justify-center font-bold text-base shrink-0 border border-secondary-fixed/50 shadow-2xs">
                    {screening.patientName.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-base text-on-surface truncate">
                        {screening.patientName}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full font-mono text-xs font-bold bg-primary-fixed text-on-primary-fixed border border-primary/20">
                        ID: #{screening.patientId}
                      </span>
                      <span className="text-xs text-on-surface-variant font-medium">
                        ({screening.patientAge} Y · {screening.patientGender})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary">description</span>
                        <span className="font-mono font-medium">{screening.id}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary">calendar_today</span>
                        <span>{screening.screeningDate}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary">visibility</span>
                        <span>{screening.eye}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. AI Finding & Verification Status */}
                <div className="flex flex-wrap lg:flex-col lg:items-end items-center gap-2 lg:gap-1.5 lg:min-w-[240px]">
                  <span className="text-xs font-bold text-primary">
                    {screening.aiResult.finding}
                  </span>

                  <div className="flex items-center gap-2">
                    {isReferable ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFE082] text-[#E65100] border border-[#FFA000]/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E65100]"></span>
                        Referable ({screening.aiResult.riskLevel.toUpperCase()})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#C8E6C9] text-[#2E7D32] border border-[#2E7D32]/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]"></span>
                        Normal Retina
                      </span>
                    )}

                    {/* Verification Status Badge */}
                    {isVerified ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary-container text-on-secondary-container border border-primary/20 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] fill text-primary">check_circle</span>
                        Verified
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF3E0] text-[#E65100] border border-[#FF9800]/30 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">pending_actions</span>
                        Unverified
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Review Now Action Button */}
                <div className="flex items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-surface-container shrink-0">
                  <button
                    onClick={() => handleStartReview(screening)}
                    className={`h-10 px-5 rounded-lg font-label-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs ${
                      isVerified
                        ? 'border border-primary text-primary hover:bg-primary/10'
                        : 'bg-primary text-white hover:bg-primary-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isVerified ? 'visibility' : 'rate_review'}
                    </span>
                    <span>
                      {isVerified
                        ? (language === 'hi' ? 'समीक्षा देखें' : 'View Verification')
                        : (language === 'hi' ? 'समीक्षा करें' : 'Review Now')}
                    </span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
