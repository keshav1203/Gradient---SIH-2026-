import React, { useState, useEffect } from 'react';
import { usePortal } from '../../context/PortalContext';
import { apiService } from '../../services/apiService';
import { Appointment } from '../../types';
import { getTranslation } from '../../data/translations';

export const DoctorConsultationsView: React.FC = () => {
  const { language, currentUser, navigateToApproveReport, showToast } = usePortal();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    apiService.getDoctorAppointments()
      .then((data) => {
        if (mounted) setAppointments(data);
      })
      .catch((err) => {
        console.error('Failed to load doctor appointments:', err);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, [currentUser]);

  const handleViewReport = async (appt: Appointment) => {
    if (!appt.latestScreeningId) {
      showToast(language === 'hi' ? 'कोई स्क्रीनिंग रिपोर्ट नहीं मिली' : 'No screening report linked to this patient.');
      return;
    }
    setLoadingReportId(appt.appointmentId);
    try {
      // Use consultation-specific fetch — bypasses doctor ownership filter
      const screening = await apiService.getConsultationScreening(appt.latestScreeningId);
      if (screening) {
        navigateToApproveReport(appt.latestScreeningId);
      } else {
        showToast(language === 'hi' ? 'रिपोर्ट लोड नहीं हो सकी' : 'Could not load patient report. Please try again.');
      }
    } catch {
      showToast(language === 'hi' ? 'रिपोर्ट लोड में त्रुटि' : 'Error loading patient report.');
    } finally {
      setLoadingReportId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Section */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">event_available</span>
            <h1 className="text-xl sm:text-2xl font-bold text-primary">
              {getTranslation('consultations', language)}
            </h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            {getTranslation('consultationsSub', language)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-full bg-primary-container text-white text-xs font-bold flex items-center gap-2 shadow-xs">
            <span className="material-symbols-outlined text-[16px]">person</span>
            <span>{currentUser?.doctor?.name || 'Dr. Clinician'}</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-surface-container text-primary font-bold text-xs border border-surface-container">
            {appointments.length} {language === 'hi' ? 'परामर्श बुक किए गए' : 'Booked'}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="p-12 text-center bg-surface-container-lowest rounded-2xl border border-surface-container text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
          <p className="text-xs font-medium mt-2">
            {language === 'hi' ? 'परामर्श लोड हो रहे हैं...' : 'Loading booked consultations...'}
          </p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="p-12 text-center bg-surface-container-lowest rounded-2xl border border-surface-container text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/50">calendar_today</span>
          <p className="text-sm font-bold text-primary mt-2">
            {getTranslation('noBookingsFound', language)}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            {language === 'hi'
              ? 'जब मरीज आपके साथ परामर्श बुक करेंगे, वे यहाँ दिखाई देंगे।'
              : 'Direct patient consultation requests scheduled with you will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((appt) => (
            <div
              key={appt.appointmentId}
              className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-container flex flex-col justify-between hover:shadow-md transition-all"
            >
              <div className="space-y-3">
                {/* Card Header */}
                <div className="flex items-start justify-between border-b border-surface-container pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                      #{appt.appointmentId}
                    </span>
                    <h3 className="text-base font-bold text-primary mt-1">
                      {appt.patientName || 'Patient'}
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      ID: <span className="font-semibold text-primary">{appt.patientId}</span>
                      {appt.patientAge ? ` · ${appt.patientAge} yrs` : ''}
                      {appt.patientGender ? ` · ${appt.patientGender}` : ''}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#166534] font-bold text-[11px] border border-[#BBF7D0]">
                    {appt.status}
                  </span>
                </div>

                {/* Booking details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container">
                    <span className="text-[10px] font-bold text-on-surface-variant block uppercase tracking-wider">
                      {getTranslation('preferredDate', language)}
                    </span>
                    <span className="font-semibold text-primary mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                      <span>{appt.appointmentDate}</span>
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container">
                    <span className="text-[10px] font-bold text-on-surface-variant block uppercase tracking-wider">
                      {getTranslation('preferredTime', language)}
                    </span>
                    <span className="font-semibold text-primary mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      <span>{appt.appointmentTime}</span>
                    </span>
                  </div>

                  {appt.patientPhone && (
                    <div className="col-span-2 p-2.5 rounded-xl bg-surface-container-low border border-surface-container">
                      <span className="text-[10px] font-bold text-on-surface-variant block uppercase tracking-wider">
                        {getTranslation('contactNumber', language)}
                      </span>
                      <span className="font-medium text-on-surface mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">call</span>
                        <span>{appt.patientPhone}</span>
                      </span>
                    </div>
                  )}

                  {appt.reason && (
                    <div className="col-span-2 p-2.5 rounded-xl bg-[#FFF8E1] border-l-[3px] border-[#FFA000]">
                      <span className="text-[10px] font-bold text-[#E65100] block uppercase tracking-wider">
                        {getTranslation('reasonForConsultation', language)}
                      </span>
                      <p className="text-[#795548] mt-0.5 font-medium leading-relaxed">
                        {appt.reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 mt-4 border-t border-surface-container flex items-center justify-between">
                <span className="text-[11px] text-on-surface-variant">
                  {language === 'hi' ? 'मरीज आईडी:' : 'Patient ID:'}{' '}
                  <span className="font-semibold text-primary">{appt.patientId}</span>
                </span>

                <button
                  onClick={() => handleViewReport(appt)}
                  disabled={loadingReportId === appt.appointmentId}
                  className="px-3 py-1.5 rounded-xl bg-primary text-white hover:bg-primary-container font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-60"
                >
                  {loadingReportId === appt.appointmentId
                    ? <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                    : <span className="material-symbols-outlined text-[16px]">visibility</span>
                  }
                  <span>{getTranslation('viewPatientReport', language)}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
