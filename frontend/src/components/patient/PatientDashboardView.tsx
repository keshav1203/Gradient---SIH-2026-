import React from 'react';
import { usePortal } from '../../context/PortalContext';
import { PATIENT_PROFILE, CARE_GUIDELINES, PAST_SCANS_TIMELINE } from '../../data/mockData';

export const PatientDashboardView: React.FC = () => {
  const {
    navigateToPatientReport,
    setIsTeleconsultModalOpen,
    setIsExplainModalOpen,
    language,
    showToast,
  } = usePortal();

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* Greeting */}
      <div className="pt-2 animate-fade-in">
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface font-bold">
          {language === 'hi'
            ? `नमस्ते, ${PATIENT_PROFILE.nameHi} 👋`
            : `Namaste, ${PATIENT_PROFILE.name} 👋`}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1 text-sm">
          {language === 'hi'
            ? 'यहाँ आपका नवीनतम नेत्र स्वास्थ्य अपडेट है।'
            : 'Here is your latest health update.'}
        </p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-stack-md">
        {/* Primary Card: Latest Screening Result (8 cols) */}
        <div className="md:col-span-8 bg-surface-container-lowest rounded-xl elevation-1 p-stack-lg border border-surface-container flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                {language === 'hi' ? 'नवीनतम स्क्रीनिंग परिणाम' : 'Latest Screening Result'}
              </h2>
              <span className="text-on-surface-variant font-label-sm text-xs font-medium">
                Today, 10:45 AM
              </span>
            </div>

            <div className="bg-surface-bright rounded-xl p-stack-md border border-secondary-fixed mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* AI Result Badge - Moderate Risk Warning Amber style */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#fef08a] flex items-center justify-center flex-shrink-0 shadow-sm">
                <span
                  className="material-symbols-outlined text-[#854d0e] text-[28px] sm:text-[32px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  warning
                </span>
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-headline-md text-base sm:text-lg font-bold text-on-surface">
                    {language === 'hi' ? 'मध्यम जोखिम (Moderate Risk)' : 'Moderate Risk'}
                  </h3>
                  <span className="inline-flex items-center gap-1 bg-[#dcfce7] text-[#166534] px-2.5 py-0.5 rounded-full font-label-sm text-xs font-bold border border-[#bbf7d0]">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                    <span>{language === 'hi' ? '✓ डॉक्टर द्वारा सत्यापित' : '✓ Doctor Verified'}</span>
                  </span>
                </div>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  {language === 'hi'
                    ? 'प्रारंभिक डायबिटिक रेटिनोपैथी के लक्षण मिले हैं। डॉक्टर से परामर्श की सलाह दी जाती है।'
                    : 'Signs of early diabetic retinopathy detected. Consultation recommended.'}
                </p>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-stack-sm mt-2">
            <button
              onClick={() => navigateToPatientReport()}
              className="h-touch-target-min flex-1 bg-primary-container text-white font-label-md text-sm font-bold rounded-lg flex items-center justify-center hover:bg-primary transition-all elevation-1 active:scale-95"
            >
              {language === 'hi' ? 'पूरी रिपोर्ट देखें' : 'View Full Report'}
            </button>
            <button
              onClick={() => setIsExplainModalOpen(true)}
              className="h-touch-target-min flex-1 bg-surface-container-lowest text-primary-container border-2 border-primary-container font-label-md text-sm font-bold rounded-lg flex items-center justify-center hover:bg-secondary-fixed transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined mr-2 text-[20px]">psychology</span>
              {language === 'hi' ? 'परिणाम को समझें' : 'Explain My Result'}
            </button>
          </div>
        </div>

        {/* Secondary Section: Care Guidance (4 cols) */}
        <div className="md:col-span-4 bg-surface-container-lowest rounded-xl elevation-1 p-stack-lg border border-surface-container flex flex-col justify-between">
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold mb-stack-md">
            {language === 'hi' ? 'देखभाल मार्गदर्शन' : 'Care Guidance'}
          </h2>
          <div className="space-y-3.5 flex-1">
            {CARE_GUIDELINES.map((item) => (
              <div
                key={item.id}
                onClick={() => showToast(`${item.title}: ${item.description}`)}
                className="flex items-center gap-3.5 p-2.5 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer border border-transparent hover:border-surface-variant"
              >
                <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-primary-container flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                </div>
                <div>
                  <h4 className="font-label-md text-xs font-bold text-on-surface">
                    {language === 'hi' ? item.titleHi : item.title}
                  </h4>
                  <p className="font-label-sm text-[11px] text-on-surface-variant line-clamp-1">
                    {language === 'hi' ? item.descriptionHi : item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Talk to Doctor Card (6 cols) */}
        <div className="md:col-span-6 bg-surface-container-lowest rounded-xl elevation-1 p-stack-lg border border-surface-container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-fixed-dim flex items-center justify-center text-on-primary-fixed flex-shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[24px]">video_camera_front</span>
            </div>
            <div>
              <h3 className="font-headline-md text-base font-bold text-on-surface">
                {language === 'hi' ? 'डॉक्टर से बात करें' : 'Talk to Doctor'}
              </h3>
              <p className="font-body-md text-xs text-on-surface-variant">
                {language === 'hi' ? 'ऑनलाइन टेली-परामर्श बुक करें' : 'Schedule a tele-consultation'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsTeleconsultModalOpen(true)}
            className="h-touch-target-min px-6 w-full sm:w-auto bg-surface-container-lowest text-primary-container border border-primary-container font-label-md text-xs font-bold rounded-lg flex items-center justify-center hover:bg-secondary-fixed transition-colors active:scale-95"
          >
            {language === 'hi' ? 'अभी बुक करें' : 'Book Now'}
          </button>
        </div>

        {/* Recent Scans Card (6 cols) */}
        <div className="md:col-span-6 bg-surface-container-lowest rounded-xl elevation-1 p-stack-lg border border-surface-container">
          <div className="flex justify-between items-center mb-stack-md">
            <h2 className="font-headline-md text-base font-bold text-on-surface">
              {language === 'hi' ? 'हाल के स्कैन' : 'Recent Scans'}
            </h2>
            <button
              onClick={() => showToast('Opening complete historical retinal scan timeline...')}
              className="text-primary font-label-sm text-xs font-bold hover:underline"
            >
              {language === 'hi' ? 'सभी देखें' : 'View All'}
            </button>
          </div>
          <div className="space-y-0">
            {PAST_SCANS_TIMELINE.map((scan, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center py-2.5 border-b border-[#DCEEF3] last:border-b-0"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-outline text-[18px]">
                    description
                  </span>
                  <span className="font-body-md text-xs text-on-surface font-medium">{scan.date}</span>
                </div>
                <span className="font-label-md text-xs text-on-surface font-bold">
                  {language === 'hi' ? scan.riskHi : scan.risk}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
