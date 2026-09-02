import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { apiService } from '../../services/apiService';
import { RETINAL_ASSETS } from '../../data/mockData';

export const AiAnalysisView: React.FC = () => {
  const { currentScreening, navigateToPatientReport, showToast, language } = usePortal();

  const [viewMode, setViewMode] = useState<'original' | 'heatmap'>('heatmap');
  const [opacity, setOpacity] = useState<number>(60);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [clinicalNotes, setClinicalNotes] = useState<string>(
    'Microaneurysms and hard exudates confirmed in nasal quadrant. Macular edema excluded. Follow up in 1 month.'
  );
  const [isApproving, setIsApproving] = useState<boolean>(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await apiService.submitClinicianReview(currentScreening.id, clinicalNotes, 'verified');
      showToast(
        language === 'hi'
          ? 'रिपोर्ट सफलतापूर्वक अनुमोदित की गई और मरीज को भेजी गई!'
          : 'Report approved by Dr. Anita and dispatched to patient portal!'
      );
      setTimeout(() => {
        navigateToPatientReport(currentScreening.id);
      }, 1000);
    } catch {
      showToast('Error approving report');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReassess = () => {
    showToast(language === 'hi' ? 'पुनर्मूल्यांकन का अनुरोध भेजा गया' : 'Reassessment requested with multi-model ensemble');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Patient Context & Header */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-label-sm text-xs text-on-surface-variant font-bold uppercase tracking-wider">
              Patient ID: {currentScreening.patientId}
            </span>
            <span className="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
            <span className="font-label-sm text-xs text-on-surface-variant">
              DOB: {currentScreening.dob} · {currentScreening.patientAge} Y, {currentScreening.patientGender}
            </span>
          </div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-bold">
            {language === 'hi' ? 'एआई विश्लेषण परिणाम' : 'AI Analysis Results'}
          </h1>
        </div>
        <button
          onClick={() => showToast('Opening historical longitudinal screening timeline...')}
          className="text-primary bg-secondary-container hover:bg-secondary-fixed-dim px-4 py-2 rounded-lg font-label-md text-sm font-semibold flex items-center gap-2 h-10 transition-colors w-fit shadow-[0px_2px_8px_rgba(7,59,76,0.05)] active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">history</span>
          <span>{language === 'hi' ? 'इतिहास देखें' : 'View History'}</span>
        </button>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Image Viewer (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(7,59,76,0.05)] overflow-hidden flex flex-col border border-surface-variant">
            {/* Viewer Toolbar */}
            <div className="flex flex-wrap items-center justify-between p-4 border-b border-surface-variant gap-4 bg-surface-bright">
              {/* Mode Switcher */}
              <div className="flex items-center space-x-1 bg-surface-container-low p-1 rounded-lg border border-surface-container">
                <button
                  onClick={() => {
                    setViewMode('original');
                    setOpacity(0);
                  }}
                  className={`px-4 py-1.5 rounded-md font-label-md text-xs font-bold transition-all ${
                    viewMode === 'original'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  Original
                </button>
                <button
                  onClick={() => {
                    setViewMode('heatmap');
                    if (opacity === 0) setOpacity(60);
                  }}
                  className={`px-4 py-1.5 rounded-md font-label-md text-xs font-bold transition-all ${
                    viewMode === 'heatmap'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  Heatmap (Grad-CAM)
                </button>
              </div>

              {/* Opacity Slider */}
              <div className="flex items-center gap-3 flex-1 max-w-xs bg-surface-container-low/50 px-3 py-1.5 rounded-lg border border-surface-container">
                <span className="material-symbols-outlined text-outline text-[20px]">layers</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={opacity}
                  onChange={(e) => {
                    setOpacity(parseInt(e.target.value));
                    if (parseInt(e.target.value) > 0) setViewMode('heatmap');
                  }}
                  aria-label="Overlay opacity slider"
                  className="flex-1"
                />
                <span className="font-label-sm text-xs font-bold text-on-surface-variant w-9 text-right">
                  {opacity}%
                </span>
              </div>

              {/* Zoom & Screen Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.25))}
                  aria-label="Zoom out"
                  className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors w-9 h-9 flex items-center justify-center border border-outline-variant"
                >
                  <span className="material-symbols-outlined text-[18px]">zoom_out</span>
                </button>
                <button
                  onClick={() => setZoomLevel(Math.min(2.5, zoomLevel + 0.25))}
                  aria-label="Zoom in"
                  className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors w-9 h-9 flex items-center justify-center border border-outline-variant"
                >
                  <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  aria-label="Toggle fullscreen"
                  className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors w-9 h-9 flex items-center justify-center border border-outline-variant ml-1"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                  </span>
                </button>
              </div>
            </div>

            {/* Image Container with Dynamic Blend */}
            <div
              className={`relative w-full aspect-square md:aspect-video bg-black overflow-hidden flex items-center justify-center group ${
                isFullscreen ? 'fixed inset-0 z-50 aspect-auto h-screen' : ''
              }`}
            >
              {isFullscreen && (
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="absolute top-4 right-4 z-20 bg-black/60 text-white p-2 rounded-full hover:bg-black"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}

              <div
                className="relative w-full h-full flex items-center justify-center transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                {/* Base Fundus Image */}
                <img
                  src={RETINAL_ASSETS.originalFundusOS}
                  alt="Original Retinal Scan"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />

                {/* Heatmap Overlay (Smooth Opacity Transition) */}
                <img
                  src={RETINAL_ASSETS.heatmapOverlayOS}
                  alt="Grad-CAM XAI Heatmap"
                  className="absolute inset-0 w-full h-full object-contain mix-blend-screen pointer-events-none transition-opacity duration-150"
                  style={{ opacity: opacity / 100 }}
                />

                {/* Reticle / Diagnostic Target Indicator */}
                <div className="absolute top-[42%] left-[48%] w-14 h-14 border-2 border-[#BDE9FF] rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-80 group-hover:scale-110 transition-all shadow-[0_0_15px_rgba(189,233,255,0.6)]">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#BDE9FF] rounded-full"></div>
                  </div>
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/75 text-[#BDE9FF] text-[10px] px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                    Exudate Cluster
                  </span>
                </div>
              </div>
            </div>

            {/* Attribution Map Legend */}
            <div className="px-4 py-3 bg-surface-bright border-t border-surface-variant flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-xs text-on-surface-variant font-bold">
                  Attribution Map:
                </span>
                <div className="h-3 w-32 rounded-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500 shadow-inner"></div>
                <span className="font-label-sm text-xs text-on-surface-variant ml-1 font-medium">
                  Low → High Impact
                </span>
              </div>
              <span className="text-[11px] text-on-surface-variant">
                Grad-CAM Layer: Layer4 Residual Blocks · Confidence: 94.2%
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI Diagnostics & Review Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* AI Diagnostics Card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(7,59,76,0.05)] p-5 border border-surface-variant">
            <h3 className="font-headline-md text-headline-md text-primary font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container">psychology</span>
              <span>{language === 'hi' ? 'एआई नैदानिक परिणाम' : 'AI Diagnostics'}</span>
            </h3>

            {/* Primary Finding Box */}
            <div className="mb-4 bg-surface-container-low p-4 rounded-lg border-l-4 border-primary">
              <p className="font-label-sm text-[11px] text-on-surface-variant mb-1 uppercase tracking-wider font-bold">
                Primary Finding
              </p>
              <p className="font-headline-md text-base font-bold text-on-surface leading-tight">
                {language === 'hi'
                  ? currentScreening.aiResult.findingHi
                  : currentScreening.aiResult.finding}
              </p>
            </div>

            {/* Key-Value Details */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-surface-variant">
                <span className="font-body-md text-sm text-on-surface-variant">Severity</span>
                <span className="font-label-md text-sm text-on-surface font-bold">
                  {currentScreening.aiResult.severity}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-surface-variant">
                <span className="font-body-md text-sm text-on-surface-variant">AI Confidence</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-surface-variant rounded-full overflow-hidden">
                    <div
                      className="w-[94%] h-full bg-primary-container rounded-full"
                      style={{ width: `${currentScreening.aiResult.confidence}%` }}
                    ></div>
                  </div>
                  <span className="font-label-md text-sm font-bold text-on-surface">
                    {currentScreening.aiResult.confidence}%
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="font-body-md text-sm text-on-surface-variant">Image Quality</span>
                <span className="inline-flex items-center gap-1 bg-[#E8F5E9] text-[#2E7D32] px-2.5 py-1 rounded-md font-label-sm text-xs font-bold border border-[#C8E6C9]">
                  <span className="material-symbols-outlined text-sm font-bold">check</span>
                  Acceptable
                </span>
              </div>
            </div>
          </div>

          {/* Amber Review Alert */}
          <div className="bg-[#FFF8E1] border-l-4 border-[#FFA000] p-4 rounded-r-xl shadow-[0px_2px_8px_rgba(7,59,76,0.05)] flex gap-3">
            <span className="material-symbols-outlined text-[#F57C00] text-[22px] flex-shrink-0">
              warning
            </span>
            <div>
              <h4 className="font-label-md text-xs font-bold text-[#E65100]">
                Review Recommended
              </h4>
              <p className="font-body-md text-xs text-[#E65100] mt-1 leading-relaxed">
                {language === 'hi'
                  ? currentScreening.aiResult.maculaAlertDescHi
                  : currentScreening.aiResult.maculaAlertDesc}
              </p>
            </div>
          </div>

          {/* Clinician Review Panel (Human-in-the-Loop) */}
          <div className="bg-surface-container-lowest rounded-xl shadow-[0px_8px_24px_rgba(7,59,76,0.10)] p-5 border border-surface-variant mt-auto">
            <h3 className="font-headline-md text-headline-md text-primary font-bold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container">fact_check</span>
              <span>{language === 'hi' ? 'डॉक्टर समीक्षा' : 'Clinician Review'}</span>
            </h3>

            <div className="mb-4">
              <label
                className="block font-label-md text-xs font-bold text-on-surface mb-1.5"
                htmlFor="clinical-notes"
              >
                Clinical Observations & Diagnosis
              </label>
              <textarea
                id="clinical-notes"
                rows={3}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Add observations or overread comments here..."
                className="w-full rounded-lg border border-secondary-fixed bg-surface-bright focus:border-primary focus:ring-1 focus:ring-primary text-xs p-3 transition-colors resize-none placeholder-outline-variant outline-none"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="w-full h-touch-target-min bg-primary text-white font-label-md text-sm font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-sm active:scale-95"
              >
                {isApproving ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">task_alt</span>
                    <span>{language === 'hi' ? 'रिपोर्ट स्वीकृत करें' : 'Approve Report'}</span>
                  </>
                )}
              </button>
              <button
                onClick={handleReassess}
                className="w-full h-touch-target-min bg-surface-bright text-on-surface font-label-md text-xs font-semibold border border-outline-variant rounded-lg flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">autorenew</span>
                <span>{language === 'hi' ? 'पुनर्मूल्यांकन का अनुरोध' : 'Request Reassessment'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
