import React from 'react';
import { usePortal } from '../../context/PortalContext';
import { PATIENT_PROFILE, CARE_GUIDELINES, PAST_SCANS_TIMELINE } from '../../data/mockData';
import { getTranslation } from '../../data/translations';
import { PatientAiAssistant } from './PatientAiAssistant';

export const PatientDashboardView: React.FC = () => {
  const {
    currentScreening,
    navigateToPatientReport,
    setIsTeleconsultModalOpen,
    setIsExplainModalOpen,
    language,
    toggleLanguage,
    showToast,
  } = usePortal();

  const handleDownloadReport = () => {
    showToast(language === 'hi' ? 'पीडीएफ रिपोर्ट डाउनलोड हो रही है...' : 'Downloading printable patient report...');
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const isHighRisk = currentScreening.aiResult.riskLevel === 'high';
  const isModerateRisk = currentScreening.aiResult.riskLevel === 'medium';

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* Greeting & Language Toggle Bar */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface font-bold">
            {language === 'hi'
              ? `नमस्ते, ${currentScreening.patientName || PATIENT_PROFILE.nameHi} 👋`
              : `Namaste, ${currentScreening.patientName || PATIENT_PROFILE.name} 👋`}
          </h1>
          <p className="font-body-md text-sm text-on-surface-variant mt-0.5">
            {getTranslation('latestHealthUpdate', language)}
          </p>
        </div>

        {/* Language Selection Pill */}
        <div className="flex items-center gap-2 bg-surface-container-low p-1 rounded-full border border-surface-container w-fit">
          <button
            onClick={() => language !== 'en' && toggleLanguage()}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              language === 'en'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            English
          </button>
          <span className="text-outline-variant">|</span>
          <button
            onClick={() => language !== 'hi' && toggleLanguage()}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              language === 'hi'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            हिन्दी
          </button>
        </div>
      </div>

      {/* Section 12: Primary Patient Card (Prioritizing Result, Risk, Recommendation, Date, Download) */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_4px_16px_rgba(7,59,76,0.06)] p-stack-lg border border-surface-container flex flex-col gap-5">
        <div className="flex flex-wrap justify-between items-start gap-2 border-b border-surface-container pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              {getTranslation('yourScreeningResult', language)}
            </span>
            <h2 className="font-headline-md text-xl text-primary font-bold mt-0.5">
              {currentScreening.eye}
            </h2>
          </div>
          <div className="text-right">
            <span className="text-xs text-on-surface-variant block font-medium">
              {getTranslation('screeningDate', language)}
            </span>
            <span className="text-xs font-bold text-on-surface">{currentScreening.screeningDate}</span>
          </div>
        </div>

        {/* Diagnosis & Risk Banner */}
        <div className="bg-surface-bright rounded-xl p-5 border border-secondary-fixed flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
            isHighRisk
              ? 'bg-error-container text-on-error-container'
              : isModerateRisk
              ? 'bg-[#FEF08A] text-[#854D0E]'
              : 'bg-[#DCFCE7] text-[#166534]'
          }`}>
            <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isHighRisk ? 'warning' : isModerateRisk ? 'priority_high' : 'check_circle'}
            </span>
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs text-on-surface-variant font-medium">DR Screening Result:</span>
              <h3 className="font-headline-md text-base sm:text-lg font-bold text-on-surface">
                {language === 'hi' ? currentScreening.aiResult.findingHi : currentScreening.aiResult.finding}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-xs font-bold ${
                isHighRisk
                  ? 'bg-error-container text-on-error-container'
                  : isModerateRisk
                  ? 'bg-[#FEF3C7] text-[#92400E]'
                  : 'bg-[#DCFCE7] text-[#166534]'
              }`}>
                Risk Level: {currentScreening.aiResult.riskLevel.toUpperCase()}
              </span>

              {currentScreening.review.verified && (
                <span className="inline-flex items-center gap-1 bg-[#E8F5E9] text-[#2E7D32] px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#C8E6C9]">
                  <span className="material-symbols-outlined text-[13px]">verified</span>
                  <span>{language === 'hi' ? 'डॉक्टर अनीता द्वारा सत्यापित' : 'Doctor Verified'}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Clear Recommendation Callout */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container">
          <span className="text-[11px] font-bold text-primary uppercase tracking-wider block mb-1">
            {getTranslation('recommendationTitle', language)}:
          </span>
          <p className="text-sm font-medium text-on-surface leading-relaxed">
            {language === 'hi'
              ? currentScreening.aiResult.recommendationHi
              : currentScreening.aiResult.recommendation}
          </p>
        </div>

        {/* Action CTAs per Section 12 Prompt: [ View Full Report ] [ Download Report ] */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            onClick={() => navigateToPatientReport()}
            className="h-touch-target-min flex-1 bg-primary text-white font-label-md text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-sm active:scale-98"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
            <span>{getTranslation('viewFullReport', language)}</span>
          </button>

          <button
            onClick={handleDownloadReport}
            className="h-touch-target-min flex-1 bg-surface-container-lowest text-primary-container border-2 border-primary-container font-label-md text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-secondary-fixed transition-colors active:scale-98"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>{getTranslation('downloadPdf', language)}</span>
          </button>

          <button
            onClick={() => setIsExplainModalOpen(true)}
            className="h-touch-target-min px-5 bg-surface-container-low text-on-surface font-label-md text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">psychology</span>
            <span>{getTranslation('explainMyResult', language)}</span>
          </button>
        </div>
      </div>

      {/* Secondary Grid: Care Guidance, Previous Screening History, and Doctor Consult */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
        {/* Care Guidance */}
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-surface-container shadow-xs flex flex-col justify-between">
          <h3 className="font-headline-md text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">health_and_safety</span>
            <span>{getTranslation('careGuidance', language)}</span>
          </h3>

          <div className="space-y-3 flex-1">
            {CARE_GUIDELINES.map((item) => (
              <div
                key={item.id}
                onClick={() => showToast(`${item.title}: ${item.description}`)}
                className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                </div>
                <div className="min-w-0">
                  <h4 className="font-label-md text-xs font-bold text-on-surface truncate">
                    {language === 'hi' ? item.titleHi : item.title}
                  </h4>
                  <p className="font-label-sm text-[10px] text-on-surface-variant line-clamp-1">
                    {language === 'hi' ? item.descriptionHi : item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Previous Screening History (Timeline) */}
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-surface-container shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-headline-md text-sm font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">history</span>
              <span>{language === 'hi' ? 'पिछली स्क्रीनिंग इतिहास' : 'Screening History'}</span>
            </h3>
          </div>

          <div className="space-y-2 flex-1">
            {PAST_SCANS_TIMELINE.map((scan, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center py-2 border-b border-surface-container last:border-b-0 text-xs"
              >
                <span className="font-medium text-on-surface">{scan.date}</span>
                <span className="font-bold text-primary px-2 py-0.5 rounded bg-surface-container-low">
                  {language === 'hi' ? scan.riskHi : scan.risk}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-surface-container text-[11px] text-on-surface-variant text-center">
            {language === 'hi' ? 'नियमित वार्षिक जांच महत्वपूर्ण है' : 'Consistent annual tracking helps preserve vision'}
          </div>
        </div>

        {/* Talk to Doctor & Teleconsultation */}
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-surface-container shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary-fixed-dim flex items-center justify-center text-on-primary-fixed">
                <span className="material-symbols-outlined text-[18px]">video_camera_front</span>
              </div>
              <h3 className="font-headline-md text-sm font-bold text-on-surface">
                {getTranslation('talkToDoctor', language)}
              </h3>
            </div>

            <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
              {language === 'hi'
                ? 'अपनी रिपोर्ट और उपचार पर चर्चा के लिए विशेषज्ञ डॉ. अनीता से टेली-परामर्श बुक करें।'
                : 'Connect with consultant ophthalmologist Dr. Anita for tele-consultation advice.'}
            </p>
          </div>

          <button
            onClick={() => setIsTeleconsultModalOpen(true)}
            className="w-full h-10 bg-primary-container text-white font-label-md text-xs font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-primary transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
            <span>{language === 'hi' ? 'परामर्श बुक करें' : 'Book Consultation'}</span>
          </button>
        </div>
      </div>

      {/* Patient AI Assistant Component */}
      <PatientAiAssistant />
    </div>
  );
};
