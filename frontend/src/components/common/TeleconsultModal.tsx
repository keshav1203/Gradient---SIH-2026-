import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { apiService } from '../../services/apiService';
import { DOCTOR_PROFILE } from '../../data/mockData';

export const TeleconsultModal: React.FC = () => {
  const { isTeleconsultModalOpen, setIsTeleconsultModalOpen, showToast, language } = usePortal();
  const [selectedDate, setSelectedDate] = useState('Tomorrow, Sep 02');
  const [selectedSlot, setSelectedSlot] = useState('11:00 AM');
  const [isBooking, setIsBooking] = useState(false);

  if (!isTeleconsultModalOpen) return null;

  const dates = ['Today, 04:30 PM', 'Tomorrow, 11:00 AM', 'Thursday, 02:00 PM', 'Friday, 10:00 AM'];
  const slots = ['10:00 AM', '11:00 AM', '02:30 PM', '04:00 PM', '05:30 PM'];

  const handleBooking = async () => {
    setIsBooking(true);
    try {
      await apiService.bookTeleconsultation('PT-8924', selectedDate, selectedSlot);
      showToast(language === 'hi' ? 'टेली-परामर्श सफलतापूर्वक बुक किया गया!' : 'Teleconsultation booked successfully with Dr. Anita!');
      setIsTeleconsultModalOpen(false);
    } catch {
      showToast('Booking failed. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-surface-bright border-b border-surface-container flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-container text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">video_camera_front</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-primary font-bold">
                {language === 'hi' ? 'डॉक्टर से बात करें' : 'Talk to Doctor'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {language === 'hi' ? 'टेली-परामर्श स्लॉट चुनें' : 'Schedule a remote video consultation'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsTeleconsultModalOpen(false)}
            aria-label="Close modal"
            className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Doctor Summary */}
        <div className="p-5 border-b border-surface-container flex items-center gap-3 bg-surface-container-low/60">
          <img
            src={DOCTOR_PROFILE.avatar}
            alt="Doctor"
            className="w-12 h-12 rounded-full object-cover border-2 border-primary-container"
          />
          <div>
            <h4 className="text-sm font-bold text-primary">{DOCTOR_PROFILE.name}</h4>
            <p className="text-xs text-on-surface-variant">{DOCTOR_PROFILE.title} · {DOCTOR_PROFILE.hospital}</p>
            <span className="inline-flex items-center gap-1 text-[11px] text-[#2E7D32] mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]"></span>
              Available for Online Consult
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-2">
              {language === 'hi' ? 'परामर्श दिवस' : 'Select Day'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {dates.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`p-2.5 rounded-lg text-xs font-label-md transition-all border text-left ${
                    selectedDate === d
                      ? 'bg-primary text-white border-primary shadow-sm font-bold'
                      : 'bg-surface border-secondary-fixed text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-2">
              {language === 'hi' ? 'समय स्लॉट' : 'Available Time Slots'}
            </label>
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSlot(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    selectedSlot === s
                      ? 'bg-primary-container text-white border-primary-container font-bold shadow-sm'
                      : 'bg-surface border-secondary-fixed text-on-surface hover:bg-secondary-fixed/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-low p-3 rounded-lg flex items-start gap-2.5 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">info</span>
            <p>
              {language === 'hi'
                ? 'परामर्श लिंक एसएमएस द्वारा भेजा जाएगा। कृपया स्क्रीनिंग रिपोर्ट तैयार रखें।'
                : 'A video consultation link will be sent via SMS. Please have your recent retinal report accessible.'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 bg-surface-bright border-t border-surface-container flex gap-3">
          <button
            type="button"
            onClick={() => setIsTeleconsultModalOpen(false)}
            className="flex-1 h-11 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high font-label-md text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleBooking}
            disabled={isBooking}
            className="flex-1 h-11 rounded-lg bg-primary-container text-white hover:bg-primary font-label-md text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            {isBooking ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                Booking...
              </>
            ) : (
              'Confirm Booking'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
