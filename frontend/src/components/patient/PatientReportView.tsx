import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { RETINAL_ASSETS, DOCTOR_PROFILE } from '../../data/mockData';

export const PatientReportView: React.FC = () => {
  const { currentScreening, language, showToast } = usePortal();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleListenReport = () => {
    if ('speechSynthesis' in window) {
      if (isPlayingAudio) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
        return;
      }

      const textEn = `Your Eye Screening Report. Status: Moderate Risk, Verified by ${DOCTOR_PROFILE.name}. We found some signs that need closer attention. This does not mean you have a serious problem right now, but it is important to have a more detailed check-up with an eye specialist soon to keep your eyes healthy. Next step: Please schedule a follow-up appointment within the next 4 weeks.`;
      const textHi = `आपकी नेत्र स्क्रीनिंग रिपोर्ट। स्थिति: मध्यम जोखिम, डॉक्टर अनीता द्वारा सत्यापित। हमने कुछ ऐसे लक्षण पाए हैं जिन पर ध्यान देने की आवश्यकता है। इसका मतलब यह नहीं है कि आपको कोई गंभीर समस्या है, लेकिन आंखों को स्वस्थ रखने के लिए विशेषज्ञ डॉक्टर से जांच कराना आवश्यक है। अगला कदम: कृपया अगले 4 सप्ताह के भीतर डॉक्टर से मिलें।`;

      const speechText = language === 'hi' ? textHi : textEn;
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.rate = 0.95;
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';

      utterance.onstart = () => {
        setIsPlayingAudio(true);
        showToast(language === 'hi' ? 'रिपोर्ट ऑडियो शुरू हुआ...' : 'Playing voice summary of report...');
      };
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.speak(utterance);
    } else {
      showToast('Speech synthesis not supported on this browser.');
    }
  };

  const handleDownloadPdf = () => {
    showToast(language === 'hi' ? 'पीडीएफ रिपोर्ट तैयार की जा रही है...' : 'Generating patient PDF medical report...');
    setTimeout(() => {
      window.print();
    }, 600);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Drishtikon Eye Screening Report',
          text: `Drishtikon Eye Screening Summary for Naresh Kumar - Verified by Dr. Anita (${currentScreening.screeningDate})`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast(language === 'hi' ? 'रिपोर्ट लिंक कॉपी किया गया' : 'Report link copied to clipboard');
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* Header Section */}
      <div className="pt-2">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-primary font-bold mb-2">
          {language === 'hi' ? 'आपकी नेत्र स्क्रीनिंग रिपोर्ट' : 'Your Eye Screening Report'}
        </h1>
        <div className="inline-flex items-center gap-2 bg-[#ffdad6] text-[#93000a] px-4 py-1.5 rounded-full font-label-md text-xs sm:text-sm font-bold shadow-[0_2px_8px_rgba(7,59,76,0.05)] border border-[#ffb4ab]">
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            warning
          </span>
          <span>
            {language === 'hi'
              ? `मध्यम जोखिम - ${DOCTOR_PROFILE.name} द्वारा सत्यापित`
              : `Moderate Risk - Verified by ${DOCTOR_PROFILE.name}`}
          </span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleListenReport}
          className={`h-touch-target-min px-6 rounded-full font-label-md text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(7,59,76,0.05)] transition-all active:scale-95 ${
            isPlayingAudio
              ? 'bg-[#E65100] text-white animate-pulse'
              : 'bg-primary-container text-white hover:bg-primary'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {isPlayingAudio ? 'stop_circle' : 'volume_up'}
          </span>
          <span>
            {isPlayingAudio
              ? language === 'hi'
                ? 'रोकें (Stop)'
                : 'Stop Listening'
              : language === 'hi'
              ? 'रिपोर्ट सुनें (Audio)'
              : 'Listen to Report'}
          </span>
        </button>

        <button
          onClick={handleDownloadPdf}
          className="h-touch-target-min px-6 rounded-full border-2 border-primary-container text-primary-container font-label-md text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(7,59,76,0.05)] hover:bg-secondary-fixed transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">download</span>
          <span>{language === 'hi' ? 'पीडीएफ डाउनलोड' : 'Download PDF'}</span>
        </button>

        <button
          onClick={handleShare}
          className="h-touch-target-min px-6 rounded-full border-2 border-primary-container text-primary-container font-label-md text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(7,59,76,0.05)] hover:bg-secondary-fixed transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">share</span>
          <span>{language === 'hi' ? 'साझा करें' : 'Share Report'}</span>
        </button>
      </div>

      {/* Explanation Card */}
      <div className="bg-surface-container-lowest rounded-xl p-stack-lg shadow-[0_2px_8px_rgba(7,59,76,0.05)] border border-surface-container">
        <h2 className="font-headline-md text-headline-md text-on-surface font-bold mb-3">
          {language === 'hi' ? 'इसका क्या मतलब है?' : 'What This Means'}
        </h2>
        <p className="font-body-lg text-sm sm:text-base text-on-surface-variant mb-5 leading-relaxed">
          {language === 'hi'
            ? 'हमने आपकी आंख की जांच में कुछ ऐसे बिंदु पाए हैं जिन पर विशेष ध्यान देने की जरूरत है। इसका मतलब यह नहीं है कि आपको कोई गंभीर दृष्टि समस्या है, लेकिन आगे किसी भी जटिलता से बचने के लिए समय पर नेत्र रोग विशेषज्ञ से विस्तृत जांच कराना बहुत महत्वपूर्ण है।'
            : "We found some signs that need closer attention. This doesn't mean you have a serious problem right now, but it's important to have a more detailed check-up with an eye specialist soon to keep your eyes healthy."}
        </p>

        <div className="bg-surface-container-low p-4 rounded-xl flex items-start gap-3.5 border border-surface-container">
          <div className="w-9 h-9 rounded-full bg-primary-fixed-dim text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[20px]">info</span>
          </div>
          <div>
            <h3 className="font-label-md text-sm font-bold text-on-surface mb-0.5">
              {language === 'hi' ? 'अगला कदम' : 'Next Step'}
            </h3>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant">
              {language === 'hi'
                ? 'कृपया अगले 4 सप्ताह के भीतर नेत्र विशेषज्ञ के साथ फॉलो-अप परामर्श का समय तय करें।'
                : 'Please schedule a follow-up appointment within the next 4 weeks.'}
            </p>
          </div>
        </div>
      </div>

      {/* Visual Findings Card */}
      <div className="bg-surface-container-lowest rounded-xl p-stack-lg shadow-[0_2px_8px_rgba(7,59,76,0.05)] border border-surface-container">
        <h2 className="font-headline-md text-headline-md text-on-surface font-bold mb-4">
          {language === 'hi' ? 'दृश्य निष्कर्ष (Visual Findings)' : 'Visual Findings'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-lg">
          {/* Original */}
          <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container">
            <p className="font-label-sm text-xs font-bold text-on-surface-variant mb-2.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">photo_camera</span>
              {language === 'hi' ? 'मूल रेटिना छवि' : 'Original Retinal Image'}
            </p>
            <div className="aspect-square rounded-lg overflow-hidden bg-black shadow-inner">
              <img
                src={RETINAL_ASSETS.patientReportOriginal}
                alt="Original Retinal Image"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[11px] text-on-surface-variant mt-2 text-center">
              Left Eye (OS) · High Resolution Optical Sensor
            </p>
          </div>

          {/* AI Heatmap */}
          <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container">
            <p className="font-label-sm text-xs font-bold text-[#E65100] mb-2.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">heat_map</span>
              {language === 'hi'
                ? 'एआई हाइलाइट किए गए क्षेत्र (हीटमैप)'
                : 'AI Highlighted Areas (Heatmap)'}
            </p>
            <div className="aspect-square rounded-lg overflow-hidden bg-black shadow-inner">
              <img
                src={RETINAL_ASSETS.patientReportHeatmap}
                alt="AI Highlighted Heatmap"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[11px] text-on-surface-variant mt-2 text-center">
              Grad-CAM Explainable AI Overlay · Confidence 94%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
