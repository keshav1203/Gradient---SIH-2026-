import React from 'react';
import { usePortal } from '../../context/PortalContext';
import { RETINAL_ASSETS } from '../../data/mockData';

export const ExplainResultModal: React.FC = () => {
  const { isExplainModalOpen, setIsExplainModalOpen, language } = usePortal();

  if (!isExplainModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-surface-bright border-b border-surface-container flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">psychology</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-primary font-bold">
                {language === 'hi' ? 'एआई परिणाम का सरल विवरण' : 'Understanding Your AI Result'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {language === 'hi' ? 'दृष्टिकोण एआई कैसे काम करता है' : 'How Drishtikon XAI examined your retinal photograph'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExplainModalOpen(false)}
            aria-label="Close modal"
            className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Visual comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container">
              <div className="flex items-center gap-2 mb-2 font-label-md text-xs text-primary font-bold">
                <span className="material-symbols-outlined text-sm">photo_camera</span>
                {language === 'hi' ? 'मूल रेटिना फोटो' : 'Original Retinal Photo'}
              </div>
              <div className="aspect-square rounded-lg overflow-hidden bg-black">
                <img
                  src={RETINAL_ASSETS.patientReportOriginal}
                  alt="Original Retina"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2">
                {language === 'hi' ? 'आंख के पिछले हिस्से की स्पष्ट डिजिटल छवि।' : 'High-resolution scan of the back of your eye.'}
              </p>
            </div>

            <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container">
              <div className="flex items-center gap-2 mb-2 font-label-md text-xs text-[#E65100] font-bold">
                <span className="material-symbols-outlined text-sm">heat_map</span>
                {language === 'hi' ? 'एआई हीटमैप (चिह्नित क्षेत्र)' : 'AI Heatmap (Identified Spots)'}
              </div>
              <div className="aspect-square rounded-lg overflow-hidden bg-black">
                <img
                  src={RETINAL_ASSETS.patientReportHeatmap}
                  alt="AI Heatmap"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2">
                {language === 'hi'
                  ? 'पीले व लाल रंग उन बिंदुओं को दर्शाते हैं जहां सूक्ष्म बदलाव दिखे हैं।'
                  : 'Warm orange/red zones show where minor microvascular changes were noted.'}
              </p>
            </div>
          </div>

          {/* Q&A section */}
          <div className="space-y-4">
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container elevation-1">
              <h4 className="text-sm font-bold text-primary mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#FFA000] text-[18px]">help</span>
                {language === 'hi' ? 'क्या इसका मतलब है कि दृष्टि जा सकती है?' : 'Does this mean I have permanent vision loss?'}
              </h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {language === 'hi'
                  ? 'नहीं। यह एक प्रारंभिक चेतावनी है। शुरुआती चरण में पकड़े जाने पर समय पर उपचार और रक्त शर्करा नियंत्रण से दृष्टि पूरी तरह सुरक्षित रहती है।'
                  : 'No! Moderate risk indicates early-stage micro-changes that can be effectively treated or arrested with timely blood sugar management and specialist care.'}
              </p>
            </div>

            <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container elevation-1">
              <h4 className="text-sm font-bold text-primary mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2E7D32] text-[18px]">verified_user</span>
                {language === 'hi' ? 'डॉक्टर की पुष्टि क्यों महत्वपूर्ण है?' : 'Why is Dr. Anita’s verification important?'}
              </h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {language === 'hi'
                  ? 'दृष्टिकोण एआई एक सहयोगी तकनीक है। प्रत्येक एआई स्कोर को जिला अस्पताल की नेत्र विशेषज्ञ डॉ. अनीता द्वारा व्यक्तिगत रूप से सत्यापित किया जाता है।'
                  : 'Drishtikon uses Explainable AI as a clinical assistant. Every automated assessment is reviewed and confirmed by an expert ophthalmologist before final advice.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-surface-bright border-t border-surface-container flex justify-end">
          <button
            type="button"
            onClick={() => setIsExplainModalOpen(false)}
            className="h-11 px-6 rounded-lg bg-primary text-white hover:bg-primary-container font-label-md text-sm transition-colors shadow-sm"
          >
            {language === 'hi' ? 'समझ आ गया' : 'Got It'}
          </button>
        </div>
      </div>
    </div>
  );
};
