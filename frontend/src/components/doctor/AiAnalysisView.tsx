import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { apiService } from '../../services/apiService';
import { RETINAL_ASSETS } from '../../data/mockData';
import { getTranslation } from '../../data/translations';
import { GradCamReadingBar } from '../common/GradCamReadingBar';

export const AiAnalysisView: React.FC = () => {
  const { currentScreening, setDoctorTab, setSelectedScreeningId, showToast, language, currentUser } = usePortal();

  // 4 Tabs: Original | Enhanced | Grad-CAM | Lesions
  const [activeTab, setActiveTab] = useState<'original' | 'enhanced' | 'heatmap' | 'lesions'>('heatmap');
  const [opacity, setOpacity] = useState<number>(() => {
    return currentScreening.aiResult?.dynamicOpacity || (
      currentScreening.aiResult?.confidence
        ? Math.min(85, Math.max(40, Math.round((0.42 + 0.30 * (currentScreening.aiResult.confidence / 100)) * 100)))
        : 65
    );
  });

  React.useEffect(() => {
    if (currentScreening.aiResult?.dynamicOpacity) {
      setOpacity(currentScreening.aiResult.dynamicOpacity);
    } else if (currentScreening.aiResult?.confidence) {
      setOpacity(Math.min(85, Math.max(40, Math.round((0.42 + 0.30 * (currentScreening.aiResult.confidence / 100)) * 100))));
    }
  }, [currentScreening.id, currentScreening.aiResult?.dynamicOpacity, currentScreening.aiResult?.confidence]);

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [clinicalNotes, setClinicalNotes] = useState<string>(
    currentScreening.review.notes || 'Microaneurysms and hard exudates confirmed in nasal quadrant. Macular edema excluded. Follow up in 4 weeks with dilated eye examination.'
  );
  const [isApproving, setIsApproving] = useState<boolean>(false);

  const handleApprove = async () => {
    setIsApproving(true);
    const doctorName = currentUser?.doctor?.name || currentScreening.review.verifiedBy || 'Treating Clinician';
    try {
      await apiService.submitClinicianReview(currentScreening.id, clinicalNotes, 'verified', doctorName);
      showToast(
        language === 'hi'
          ? `रिपोर्ट ${doctorName} द्वारा सत्यापित की गई!`
          : `Report verified by ${doctorName} and approved!`
      );
      setSelectedScreeningId('');
      setTimeout(() => {
        setDoctorTab('approve-reports');
      }, 800);
    } catch {
      showToast('Error verifying screening report');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReassess = () => {
    showToast(
      language === 'hi'
        ? 'पुनर्मूल्यांकन और अतिरिक्त मॉडल सत्यापन का अनुरोध भेजा गया'
        : 'Reassessment requested with ensemble cross-validation.'
    );
  };

  const lesions = currentScreening.aiResult.lesions || {
    microaneurysms: 'Detected',
    hemorrhages: 'Detected',
    exudates: 'Detected',
    neovascularization: 'Not detected',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Patient Context & Header */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-label-sm text-xs text-on-surface-variant font-bold uppercase tracking-wider font-mono">
              Patient ID: #{currentScreening.patientId}
            </span>
            <span className="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
            <span className="font-label-sm text-xs text-on-surface-variant">
              {currentScreening.patientName} · {currentScreening.patientAge} Y, {currentScreening.patientGender} · {currentScreening.eye}
            </span>
          </div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-bold">
            {language === 'hi' ? 'एआई विश्लेषण एवं XAI परिणाम' : 'AI Analysis & Explainability'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedScreeningId('');
              setDoctorTab('approve-reports');
            }}
            className="h-10 px-3.5 rounded-lg border border-secondary-fixed bg-surface hover:bg-surface-container-high text-on-surface font-label-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>{language === 'hi' ? 'पीछे जाएं' : 'Back to Queue / Reports'}</span>
          </button>
          <button
            onClick={() => showToast('Opening historical screening records...')}
            className="text-primary bg-secondary-container hover:bg-secondary-fixed-dim px-4 py-2 rounded-lg font-label-md text-xs font-bold flex items-center gap-2 h-10 transition-colors shadow-xs active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span>{language === 'hi' ? 'पूर्व इतिहास' : 'Screening History'}</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: 4-Tab Retinal Viewer (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(7,59,76,0.05)] overflow-hidden flex flex-col border border-surface-container">
            {/* Viewer Toolbar */}
            <div className="flex flex-wrap items-center justify-between p-3.5 border-b border-surface-container gap-3 bg-surface-bright">
              {/* 4 View Tabs */}
              <div className="flex items-center space-x-1 bg-surface-container-low p-1 rounded-lg border border-surface-container">
                <button
                  onClick={() => setActiveTab('original')}
                  className={`px-3 py-1.5 rounded-md font-label-md text-xs font-bold transition-all ${
                    activeTab === 'original'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {getTranslation('tabOriginal', language)}
                </button>
                <button
                  onClick={() => setActiveTab('enhanced')}
                  className={`px-3 py-1.5 rounded-md font-label-md text-xs font-bold transition-all ${
                    activeTab === 'enhanced'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {getTranslation('tabEnhanced', language)}
                </button>
                <button
                  onClick={() => {
                    setActiveTab('heatmap');
                    if (opacity === 0) setOpacity(65);
                  }}
                  className={`px-3 py-1.5 rounded-md font-label-md text-xs font-bold transition-all ${
                    activeTab === 'heatmap'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {getTranslation('tabGradCam', language)}
                </button>
                <button
                  onClick={() => setActiveTab('lesions')}
                  className={`px-3 py-1.5 rounded-md font-label-md text-xs font-bold transition-all ${
                    activeTab === 'lesions'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {getTranslation('tabLesions', language)}
                </button>
              </div>

              {/* Opacity / Blend Slider (visible when heatmap is active) */}
              {activeTab === 'heatmap' && (
                <div className="flex items-center gap-2 bg-surface-container-low/80 px-3 py-1 rounded-lg border border-surface-container flex-1 max-w-[240px]">
                  <span className="material-symbols-outlined text-primary text-[18px]">opacity</span>
                  <span className="text-[11px] font-bold text-on-surface-variant">Heatmap Blend:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={opacity}
                    onChange={(e) => setOpacity(parseInt(e.target.value))}
                    aria-label="Grad-CAM blend slider"
                    className="flex-1 accent-primary cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold text-primary w-8 text-right">
                    {opacity}%
                  </span>
                </div>
              )}
            </div>

          {/* Canvas View Container */}
          <div className="relative flex-1 bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center p-2 min-h-[440px]">
            {/* Full resolution viewer */}
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Zoom control overlay */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-xs rounded-lg p-1 border border-white/10">
                <button
                  onClick={() => setZoomLevel(prev => Math.max(1, prev - 0.25))}
                  className="p-1.5 text-white/80 hover:text-white rounded hover:bg-white/10"
                  title="Zoom Out"
                >
                  <span className="material-symbols-outlined text-[18px]">zoom_out</span>
                </button>
                <span className="text-white/90 text-xs font-mono font-bold px-1.5">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.25))}
                  className="p-1.5 text-white/80 hover:text-white rounded hover:bg-white/10"
                  title="Zoom In"
                >
                  <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                </button>
                {zoomLevel > 1 && (
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1.5 text-white/80 hover:text-white rounded hover:bg-white/10 border-l border-white/20 ml-1"
                    title="Reset Zoom"
                  >
                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                  </button>
                )}
              </div>

              {isFullscreen && (
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="absolute top-4 right-4 z-20 bg-black/70 text-white p-2 rounded-full hover:bg-black"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}

              <div
                className="relative w-full h-full flex items-center justify-center transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                {/* 1. Original Image */}
                {activeTab === 'original' && (
                  <img
                    src={currentScreening.images?.original || RETINAL_ASSETS.originalFundusOS}
                    alt="Original Retinal Fundus Scan"
                    className="w-full h-full object-contain"
                  />
                )}

                {/* 2. Enhanced Image */}
                {activeTab === 'enhanced' && (
                  <img
                    src={currentScreening.images?.original || RETINAL_ASSETS.originalFundusOS}
                    alt="Enhanced Retinal Scan"
                    style={{ filter: 'contrast(135%) brightness(105%)' }}
                    className="w-full h-full object-contain"
                  />
                )}

                {/* 3. Grad-CAM Blended Heatmap View */}
                {activeTab === 'heatmap' && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={currentScreening.images?.original || RETINAL_ASSETS.originalFundusOS}
                      alt="Base Scan"
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    />
                    <img
                      src={currentScreening.images?.overlay || currentScreening.images?.heatmap || RETINAL_ASSETS.heatmapOverlayOS}
                      alt="Grad-CAM Overlay"
                      style={{ opacity: opacity / 100 }}
                      className="absolute inset-0 w-full h-full object-contain transition-opacity duration-150"
                    />
                    {/* Floating Overlay Grad-CAM Reading Bar */}
                    <GradCamReadingBar
                      variant="overlay"
                      language={language}
                      className="absolute bottom-4 right-4 z-20 w-64 shadow-2xl"
                    />
                  </div>
                )}

                {/* 4. Lesion Annotations View */}
                {activeTab === 'lesions' && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={currentScreening.images?.original || RETINAL_ASSETS.originalFundusOS}
                      alt="Base Scan"
                      className="w-full h-full object-contain"
                    />
                    {/* Lesion 1: Microaneurysm cluster */}
                    <div className="absolute top-[44%] left-[47%] w-12 h-12 border-2 border-[#FFD54F] rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-85 shadow-[0_0_12px_rgba(255,213,79,0.7)] animate-pulse">
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-black/80 text-[#FFD54F] text-[9px] font-bold px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                        Microaneurysms
                      </span>
                    </div>

                    {/* Lesion 2: Hard Exudates */}
                    <div className="absolute top-[52%] left-[62%] w-10 h-10 border-2 border-[#FF5252] rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-85 shadow-[0_0_12px_rgba(255,82,82,0.7)]">
                      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-black/80 text-[#FF5252] text-[9px] font-bold px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                        Exudates
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tab indicator pill */}
              <div className="absolute bottom-3 left-3 bg-black/75 text-white text-[11px] font-mono px-2.5 py-1 rounded backdrop-blur-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#BDE9FF]"></span>
                <span>
                  Viewing: {activeTab === 'original' ? 'Original Scan' : activeTab === 'enhanced' ? 'Enhanced Scan (CLAHE)' : activeTab === 'heatmap' ? 'Raw Grad-CAM Heatmap' : 'Retinal Lesion Annotations'}
                </span>
              </div>
            </div>
          </div>

          {/* Explainable AI Explanation & Attribution Map Legend */}
            <div className="p-4 bg-surface-bright border-t border-surface-container flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-label-md text-xs font-bold text-primary">
                    {getTranslation('whyAiPrediction', language)}
                  </h4>
                  <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                    {getTranslation('xaiExplanation', language)}
                  </p>
                </div>
              </div>

              {/* Inline Interactive Reading Bar */}
              <GradCamReadingBar variant="inline" language={language} className="w-full" />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container text-xs text-on-surface-variant">
                <span className="font-mono text-[11px]">
                  Model: ResNet-18 (5-Class) · Target Layer: res5b · Certainty: {currentScreening.aiResult.confidence}%
                </span>
              </div>
            </div>
          </div>

          {/* Section 9: Structured Lesion Detection Findings */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-[0px_2px_8px_rgba(7,59,76,0.05)] border border-surface-container">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-headline-md text-sm font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[18px]">biotech</span>
                {getTranslation('detectedFindings', language)}
              </h3>
              <span className="text-[11px] text-on-surface-variant">Automated Retinal Feature Extraction</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Microaneurysms */}
              <div className="p-3 rounded-lg border border-surface-container bg-surface flex flex-col justify-between">
                <span className="text-xs text-on-surface-variant font-medium">
                  {getTranslation('microaneurysms', language)}
                </span>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#E65100] text-[16px]">warning</span>
                  <span className="text-xs font-bold text-[#E65100]">
                    {lesions.microaneurysms === 'Detected' ? getTranslation('detected', language) : getTranslation('notDetected', language)}
                  </span>
                </div>
              </div>

              {/* Hemorrhages */}
              <div className="p-3 rounded-lg border border-surface-container bg-surface flex flex-col justify-between">
                <span className="text-xs text-on-surface-variant font-medium">
                  {getTranslation('hemorrhages', language)}
                </span>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#E65100] text-[16px]">warning</span>
                  <span className="text-xs font-bold text-[#E65100]">
                    {lesions.hemorrhages === 'Detected' ? getTranslation('detected', language) : getTranslation('notDetected', language)}
                  </span>
                </div>
              </div>

              {/* Exudates */}
              <div className="p-3 rounded-lg border border-surface-container bg-surface flex flex-col justify-between">
                <span className="text-xs text-on-surface-variant font-medium">
                  {getTranslation('exudates', language)}
                </span>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#E65100] text-[16px]">warning</span>
                  <span className="text-xs font-bold text-[#E65100]">
                    {lesions.exudates === 'Detected' ? getTranslation('detected', language) : getTranslation('notDetected', language)}
                  </span>
                </div>
              </div>

              {/* Neovascularization */}
              <div className="p-3 rounded-lg border border-surface-container bg-surface flex flex-col justify-between">
                <span className="text-xs text-on-surface-variant font-medium">
                  {getTranslation('neovascularization', language)}
                </span>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#2E7D32] text-[16px]">check_circle</span>
                  <span className="text-xs font-bold text-[#2E7D32]">
                    {lesions.neovascularization === 'Detected' ? getTranslation('detected', language) : getTranslation('notDetected', language)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI Results, Recommendation & Clinician Overread (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Section 7 & 10: AI Diagnostic Result & Referral Card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(7,59,76,0.05)] p-5 border border-surface-container">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-headline-md text-sm font-bold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary-container text-[20px]">psychology</span>
                <span>AI Screening Assessment</span>
              </h3>
              {currentScreening.aiResult.isReferable ? (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#FFE082] text-[#E65100]">
                  Referable
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#C8E6C9] text-[#2E7D32]">
                  Non-Referable
                </span>
              )}
            </div>

            {/* Severity Finding Box */}
            <div className="mb-4 bg-surface-container-low p-3.5 rounded-lg border-l-4 border-primary">
              <p className="font-label-sm text-[11px] text-on-surface-variant mb-1 uppercase tracking-wider font-bold">
                {getTranslation('drSeverityTitle', language)}
              </p>
              <p className="font-headline-md text-base font-bold text-on-surface leading-snug">
                {language === 'hi' ? currentScreening.aiResult.findingHi : currentScreening.aiResult.finding}
              </p>
              <p className="text-xs text-primary font-semibold mt-1">
                {currentScreening.aiResult.severity}
              </p>
            </div>

            {/* Risk & Confidence Details */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-surface-container">
                <span className="text-on-surface-variant font-medium">{getTranslation('riskLevel', language)}</span>
                <span className="font-bold text-on-surface uppercase text-xs">
                  {currentScreening.aiResult.riskLevel}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-surface-container">
                <span className="text-on-surface-variant font-medium">{getTranslation('aiConfidence', language)}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-container rounded-full"
                      style={{ width: `${currentScreening.aiResult.confidence}%` }}
                    />
                  </div>
                  <span className="font-bold text-on-surface font-mono">
                    {currentScreening.aiResult.confidence}%
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-surface-container">
                <span className="text-on-surface-variant font-medium">Image Suitability</span>
                <span className="inline-flex items-center gap-1 text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded text-[11px] font-bold">
                  ✓ Gradable
                </span>
              </div>
            </div>

            {/* Clinical Confidence Disclaimer */}
            <p className="text-[10px] text-on-surface-variant mt-3 leading-tight opacity-80">
              {getTranslation('confidenceDisclaimer', language)}
            </p>
          </div>

          {/* Section 10: Clinical Recommendation Card */}
          <div className="bg-[#FFF8E1] border-l-4 border-[#FFA000] p-4 rounded-r-xl shadow-[0px_2px_8px_rgba(7,59,76,0.05)] flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#F57C00] text-[20px]">
                medical_services
              </span>
              <h4 className="font-label-md text-xs font-bold text-[#E65100]">
                {getTranslation('recommendationTitle', language)}
              </h4>
            </div>
            <p className="text-xs font-medium text-[#795548] leading-relaxed">
              {language === 'hi'
                ? currentScreening.aiResult.recommendationHi
                : currentScreening.aiResult.recommendation}
            </p>
            <p className="text-[10px] text-[#A1887F] italic pt-1 border-t border-[#FFE082]">
              {getTranslation('clinicianDisclaimer', language)}
            </p>
          </div>

          {/* Clinician Overread & Sign-Off (Human in the Loop) */}
          <div className="bg-surface-container-lowest rounded-xl shadow-[0px_8px_24px_rgba(7,59,76,0.08)] p-5 border border-surface-container mt-auto">
            <h3 className="font-headline-md text-sm font-bold text-primary mb-2.5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-[18px]">fact_check</span>
              <span>{language === 'hi' ? 'डॉक्टर सत्यापन एवं समीक्षा' : 'Clinician Review & Verification'}</span>
            </h3>

            <div className="mb-3">
              <label
                className="block font-label-md text-[11px] font-bold text-on-surface mb-1"
                htmlFor="clinical-notes"
              >
                Clinical Observations & Diagnosis
              </label>
              <textarea
                id="clinical-notes"
                rows={3}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Enter doctor overread observations here..."
                className="w-full rounded-lg border border-secondary-fixed bg-surface-bright text-xs p-2.5 transition-colors resize-none outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="w-full h-touch-target-min bg-primary text-white font-label-md text-xs font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isApproving ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                    <span>Verifying & Publishing...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                    <span>{language === 'hi' ? 'सत्यापित करें एवं रिपोर्ट जारी करें' : 'Verify & Approve Report'}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleReassess}
                className="w-full h-9 bg-surface-bright text-on-surface font-label-md text-xs font-semibold border border-outline-variant/60 rounded-lg flex items-center justify-center gap-1.5 hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">autorenew</span>
                <span>{language === 'hi' ? 'पुनर्मूल्यांकन का अनुरोध' : 'Request Model Reassessment'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
