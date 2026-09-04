import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { RETINAL_ASSETS } from '../../data/mockData';

export const NewScreeningView: React.FC = () => {
  const { navigateToAiAnalysis, showToast, language } = usePortal();

  const [activeEye, setActiveEye] = useState<'OS' | 'OD'>('OS');
  const [qualityMode, setQualityMode] = useState<'acceptable' | 'insufficient'>('acceptable');
  const [isUploading, setIsUploading] = useState(false);
  const [showFullSize, setShowFullSize] = useState(false);

  const handleRetake = () => {
    setIsUploading(true);
    showToast(language === 'hi' ? 'कैमरा पुनः सक्रिय किया जा रहा है...' : 'Re-initializing fundus camera...');
    setTimeout(() => {
      setIsUploading(false);
      showToast(language === 'hi' ? 'नई रेटिना छवि प्राप्त हुई' : 'New high-clarity fundus image captured');
      setQualityMode('acceptable');
    }, 900);
  };

  const handleProceed = () => {
    if (qualityMode === 'insufficient') {
      showToast('Cannot proceed with insufficient image quality. Please retake image.');
      return;
    }
    showToast(language === 'hi' ? 'एआई विश्लेषण शुरू हो रहा है...' : 'Launching deep learning XAI diagnostic pipeline...');
    navigateToAiAnalysis();
  };

  return (
    <div className="space-y-stack-lg max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-bold">
            {language === 'hi' ? 'नई स्क्रीनिंग' : 'New Screening'}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Patient ID: #8492-A · Naresh Kumar (58 Y, Male)
          </p>
        </div>

        {/* Quick Simulation Mode Switch */}
        <div className="flex items-center gap-2 bg-surface-container-low p-1 rounded-lg border border-surface-container w-fit">
          <span className="text-xs text-on-surface-variant px-2 font-medium">Quality Test:</span>
          <button
            onClick={() => setQualityMode('acceptable')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              qualityMode === 'acceptable'
                ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            Acceptable (94%)
          </button>
          <button
            onClick={() => setQualityMode('insufficient')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              qualityMode === 'insufficient'
                ? 'bg-error-container text-on-error-container border border-error/30'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            Blur / Insufficient
          </button>
        </div>
      </div>

      {/* Workflow Stepper */}
      <div className="max-w-2xl bg-surface-container-lowest p-4 rounded-xl shadow-[0px_2px_8px_rgba(7,59,76,0.05)] border border-surface-container flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-label-md text-sm font-bold shadow-sm">
            1
          </div>
          <span className="font-label-md text-sm text-primary-container font-bold">
            {language === 'hi' ? 'छवि अपलोड' : 'Image Upload'}
          </span>
        </div>
        <div className="h-px flex-grow bg-outline-variant/60 mx-4"></div>
        <div className="flex items-center gap-3 opacity-60">
          <div className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-label-md text-sm font-bold">
            2
          </div>
          <span className="font-label-md text-sm text-on-surface-variant hidden sm:inline">
            {language === 'hi' ? 'एआई मूल्यांकन' : 'AI Assessment'}
          </span>
        </div>
        <div className="h-px flex-grow bg-outline-variant/60 mx-4"></div>
        <div className="flex items-center gap-3 opacity-60">
          <div className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-label-md text-sm font-bold">
            3
          </div>
          <span className="font-label-md text-sm text-on-surface-variant hidden sm:inline">
            {language === 'hi' ? 'अंतिम रिपोर्ट' : 'Final Report'}
          </span>
        </div>
      </div>

      {/* Grid Layout for Assessment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-stack-lg">
        {/* Left Column: Image Area */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(7,59,76,0.05)] p-stack-lg border border-surface-container flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveEye('OS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeEye === 'OS'
                      ? 'bg-primary-container text-white shadow-sm'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  Left Eye (OS)
                </button>
                <button
                  onClick={() => setActiveEye('OD')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeEye === 'OD'
                      ? 'bg-primary-container text-white shadow-sm'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  Right Eye (OD)
                </button>
              </div>
              <span className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full font-label-sm text-xs font-medium">
                Fundus Camera
              </span>
            </div>

            {/* Retinal Image Container */}
            <div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden border-2 border-primary-container mb-4 group cursor-pointer shadow-inner flex items-center justify-center">
              {isUploading ? (
                <div className="flex flex-col items-center justify-center text-white gap-3">
                  <span className="material-symbols-outlined text-[36px] animate-spin text-[#BDE9FF]">
                    sync
                  </span>
                  <span className="text-xs font-medium">Capturing Retinal Frame...</span>
                </div>
              ) : (
                <>
                  <img
                    src={qualityMode === 'acceptable' ? RETINAL_ASSETS.acceptableFundusSample : RETINAL_ASSETS.acceptableFundusSample}
                    alt="Retinal Fundus Scan"
                    className={`w-full h-full object-cover transition-all duration-300 ${
                      qualityMode === 'insufficient' ? 'blur-sm brightness-75' : ''
                    }`}
                  />
                  <div className="absolute inset-0 bg-primary-container/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                    <button
                      onClick={() => setShowFullSize(true)}
                      className="bg-surface-container-lowest text-primary-container px-4 h-touch-target-min rounded-lg font-label-md text-sm font-bold shadow-lg flex items-center gap-2 hover:bg-white"
                    >
                      <span className="material-symbols-outlined text-[20px]">zoom_in</span>
                      View Full Size
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleRetake}
              className="flex-1 bg-surface-container-lowest border-2 border-primary-container text-primary-container h-touch-target-min rounded-lg font-label-md text-sm font-bold flex items-center justify-center gap-2 hover:bg-secondary-fixed transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">photo_camera</span>
              {language === 'hi' ? 'पुनः फोटो लें' : 'Retake'}
            </button>
            <button
              onClick={handleProceed}
              className="flex-1 bg-primary text-white h-touch-target-min rounded-lg font-label-md text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">upload</span>
              {language === 'hi' ? 'एआई विश्लेषण करें' : 'Proceed to AI Analysis'}
            </button>
          </div>
        </div>

        {/* Right Column: Quality Assessment Results */}
        <div className="flex flex-col gap-stack-lg">
          {/* GOOD STATE CARD */}
          <div
            className={`bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(7,59,76,0.05)] p-stack-lg border-l-4 border-[#4CAF50] transition-all ${
              qualityMode === 'acceptable' ? 'opacity-100 ring-2 ring-[#4CAF50]/20' : 'opacity-60'
            }`}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined icon-filled text-2xl">check_circle</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-[#2E7D32] font-bold">
                  {language === 'hi' ? 'छवि गुणवत्ता स्वीकार्य' : 'Image Quality Acceptable'}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1 text-sm">
                  {language === 'hi'
                    ? 'छवि एआई निदान के सभी नैदानिक मापदंडों को पूरा करती है।'
                    : 'The image meets all clinical criteria for AI analysis.'}
                </p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface p-3.5 rounded-lg flex flex-col items-center text-center border border-surface-container">
                <span className="material-symbols-outlined text-outline-variant mb-1 text-[22px]">blur_on</span>
                <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">
                  Clarity
                </span>
                <span className="font-headline-md text-lg font-bold text-on-surface">94%</span>
              </div>

              <div className="bg-surface p-3.5 rounded-lg flex flex-col items-center text-center border border-surface-container">
                <span className="material-symbols-outlined text-outline-variant mb-1 text-[22px]">lightbulb</span>
                <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">
                  Exposure
                </span>
                <span className="font-headline-md text-lg font-bold text-on-surface">Optimal</span>
              </div>

              <div className="bg-surface p-3.5 rounded-lg flex flex-col items-center text-center border border-surface-container">
                <span className="material-symbols-outlined text-outline-variant mb-1 text-[22px]">aspect_ratio</span>
                <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">
                  Resolution
                </span>
                <span className="font-headline-md text-lg font-bold text-on-surface">2K</span>
              </div>
            </div>
          </div>

          {/* POOR STATE CARD */}
          <div
            className={`bg-surface-container-lowest rounded-xl shadow-[0px_2px_8px_rgba(7,59,76,0.05)] p-stack-lg border-l-4 border-error transition-all ${
              qualityMode === 'insufficient' ? 'opacity-100 ring-2 ring-error/20' : 'opacity-50'
            }`}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined icon-filled text-2xl">warning</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-error font-bold">
                  {language === 'hi' ? 'छवि गुणवत्ता अपर्याप्त' : 'Image Quality Insufficient'}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1 text-sm">
                  {language === 'hi'
                    ? 'धुंधली छवि के कारण एआई मूल्यांकन आगे नहीं बढ़ सकता।'
                    : 'AI assessment cannot proceed due to poor image quality.'}
                </p>
              </div>
            </div>

            <div className="bg-surface p-3 rounded-lg mb-4 space-y-2 border border-surface-container">
              <div className="flex items-center gap-2 text-error text-xs font-semibold">
                <span className="material-symbols-outlined text-sm">close</span>
                <span>High Blur Detected (Confidence: 88%)</span>
              </div>
              <div className="flex items-center gap-2 text-error text-xs font-semibold">
                <span className="material-symbols-outlined text-sm">close</span>
                <span>Underexposed (Poor Lighting in Macular Zone)</span>
              </div>
            </div>

            <button
              onClick={handleRetake}
              disabled={qualityMode === 'acceptable'}
              className={`w-full h-touch-target-min rounded-lg font-label-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                qualityMode === 'insufficient'
                  ? 'bg-error text-white hover:bg-error/90 cursor-pointer shadow-sm'
                  : 'bg-surface-container-highest text-on-surface opacity-50 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              Retake Image Required
            </button>
          </div>
        </div>
      </div>

      {/* Full Size Modal */}
      {showFullSize && (
        <div 
          onClick={() => setShowFullSize(false)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
        >
          <div className="relative max-w-4xl w-full max-h-[85vh] flex items-center justify-center">
            <img
              src={RETINAL_ASSETS.acceptableFundusSample}
              alt="High Resolution Retina Full Size"
              className="max-w-full max-h-[85vh] object-contain rounded-xl border-2 border-primary-container shadow-2xl"
            />
            <button
              onClick={() => setShowFullSize(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
