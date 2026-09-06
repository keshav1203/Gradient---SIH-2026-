import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { DrishtikonLogo } from '../common/DrishtikonLogo';

export const LandingPageView: React.FC = () => {
  const { loginDoctor, loginPatient, language, toggleLanguage, showToast } = usePortal();

  const [activeTab, setActiveTab] = useState<'doctor' | 'patient'>('doctor');

  // Doctor credentials
  const [doctorId, setDoctorId] = useState('');
  const [doctorPassword, setDoctorPassword] = useState('');
  const [showDoctorPassword, setShowDoctorPassword] = useState(false);

  // Patient credentials
  const [patientIdentifier, setPatientIdentifier] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!doctorId.trim()) {
      setErrorMessage(language === 'hi' ? 'कृपया डॉक्टर आईडी दर्ज करें।' : 'Please enter your Doctor ID.');
      return;
    }
    if (!doctorPassword.trim()) {
      setErrorMessage(language === 'hi' ? 'कृपया जन्मतिथि (पासवर्ड) दर्ज करें।' : 'Please enter your password (Date of Birth DDMMYYYY).');
      return;
    }

    setIsLoading(true);
    try {
      await loginDoctor(doctorId.trim(), doctorPassword.trim());
      showToast(language === 'hi' ? 'डॉक्टर पोर्टल में आपका स्वागत है' : 'Welcome to Clinician Dashboard');
    } catch (err: any) {
      const msg = err?.message || 'Login failed. Please verify Doctor ID and Date of Birth.';
      if (language === 'hi') {
        if (msg.toLowerCase().includes('date of birth') || msg.toLowerCase().includes('format')) {
          setErrorMessage('अमान्य डॉक्टर आईडी या जन्मतिथि (पासवर्ड DDMMYYYY प्रारूप में होना चाहिए)।');
        } else if (msg.toLowerCase().includes('invalid doctor id') || msg.toLowerCase().includes('doctor login failed') || msg.toLowerCase().includes('password')) {
          setErrorMessage('अमान्य डॉक्टर आईडी या पासवर्ड।');
        } else if (msg.toLowerCase().includes('connect') || msg.toLowerCase().includes('network')) {
          setErrorMessage('सर्वर से कनेक्ट करने में असमर्थ। कृपया अपना नेटवर्क जांचें।');
        } else {
          setErrorMessage(msg);
        }
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!patientIdentifier.trim()) {
      setErrorMessage(
        language === 'hi'
          ? 'कृपया अपनी मरीज आईडी या पंजीकृत फोन नंबर दर्ज करें।'
          : 'Please enter your Patient ID or registered phone number.'
      );
      return;
    }

    setIsLoading(true);
    try {
      await loginPatient(patientIdentifier.trim());
      showToast(language === 'hi' ? 'मरीज पोर्टल में आपका स्वागत है' : 'Welcome to Patient Portal');
    } catch (err: any) {
      const msg = err?.message || 'Login failed. Please check your Patient ID or Phone Number.';
      if (language === 'hi') {
        if (msg.toLowerCase().includes('no patient record') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('patient login failed') || msg.toLowerCase().includes('phone number does not match')) {
          setErrorMessage('इस मरीज आईडी या फोन नंबर से कोई मरीज रिकॉर्ड नहीं मिला।');
        } else if (msg.toLowerCase().includes('connect') || msg.toLowerCase().includes('network')) {
          setErrorMessage('सर्वर से कनेक्ट करने में असमर्थ। कृपया अपना नेटवर्क जांचें।');
        } else {
          setErrorMessage(msg);
        }
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col justify-between items-center p-4 sm:p-6 md:p-8 antialiased">
      {/* Top Bar with Language Switcher */}
      <header className="w-full max-w-5xl flex justify-between items-center py-2">
        <div className="flex items-center gap-3">
          <DrishtikonLogo size={36} />
        </div>
        <button
          onClick={toggleLanguage}
          aria-label="Switch language between English and Hindi"
          className="flex items-center gap-1.5 bg-surface-container-low hover:bg-surface-container-high px-3 py-1.5 rounded-full transition-colors text-primary border border-outline-variant/30 text-xs font-semibold"
        >
          <span className="material-symbols-outlined text-[18px]">language</span>
          <span>{language === 'en' ? 'EN / हिन्दी' : 'हिन्दी / EN'}</span>
        </button>
      </header>

      {/* Main Login Card Container */}
      <div className="w-full max-w-md my-auto py-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
            {language === 'hi' ? 'दृष्टिकोण पोर्टल' : 'Drishtikon Health Portal'}
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            {language === 'hi'
              ? 'एआई-संचालित डायबिटिक रेटिनोपैथी स्क्रीनिंग एवं मरीज पोर्टल'
              : 'AI-assisted Diabetic Retinopathy Screening & Patient Reports'}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container overflow-hidden">
          <div className="grid grid-cols-2 p-1.5 bg-surface-container-low border-b border-surface-container">
            <button
              type="button"
              onClick={() => {
                setActiveTab('doctor');
                setErrorMessage(null);
              }}
              className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                activeTab === 'doctor'
                  ? 'bg-primary-container text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">stethoscope</span>
              <span>{language === 'hi' ? 'डॉक्टर लॉगिन' : 'Doctor Login'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('patient');
                setErrorMessage(null);
              }}
              className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                activeTab === 'patient'
                  ? 'bg-primary-container text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
              <span>{language === 'hi' ? 'मरीज लॉगिन' : 'Patient Login'}</span>
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8">
            {errorMessage && (
              <div className="mb-5 p-3 rounded-xl bg-error-container/40 border border-error/30 text-error text-xs flex items-start gap-2 animate-fade-in">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <span className="font-medium leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {activeTab === 'doctor' ? (
              /* Doctor Login Form */
              <form onSubmit={handleDoctorSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="doctor-id"
                    className="block text-xs font-bold text-primary uppercase tracking-wider mb-1.5"
                  >
                    {language === 'hi' ? 'डॉक्टर आईडी (Doctor ID)' : 'Doctor ID'}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[20px]">
                      badge
                    </span>
                    <input
                      id="doctor-id"
                      type="text"
                      autoComplete="username"
                      required
                      value={doctorId}
                      onChange={(e) => setDoctorId(e.target.value)}
                      placeholder="e.g. DOC-ANITA"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-secondary-fixed bg-surface text-on-surface outline-none focus:border-primary font-medium text-sm transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="current-password"
                    className="block text-xs font-bold text-primary uppercase tracking-wider mb-1.5"
                  >
                    {language === 'hi' ? 'पासवर्ड (जन्मतिथि DDMMYYYY)' : 'Password (Date of Birth DDMMYYYY)'}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[20px]">
                      lock
                    </span>
                    <input
                      id="current-password"
                      type={showDoctorPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={doctorPassword}
                      onChange={(e) => setDoctorPassword(e.target.value)}
                      placeholder="DDMMYYYY (e.g. 15081980)"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-secondary-fixed bg-surface text-on-surface outline-none focus:border-primary font-medium text-sm transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDoctorPassword(!showDoctorPassword)}
                      className="absolute right-3 top-2.5 text-on-surface-variant hover:text-primary transition-colors"
                      title={showDoctorPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showDoctorPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1.5 leading-tight">
                    {language === 'hi'
                      ? 'पासवर्ड आपकी जन्मतिथि (DDMMYYYY प्रारूप) है।'
                      : 'Password is your date of birth formatted as DDMMYYYY.'}
                  </p>
                </div>


                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 mt-2 rounded-xl bg-primary-container text-white font-bold text-sm hover:bg-primary transition-all duration-150 flex items-center justify-center gap-2 shadow-sm active:scale-98 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                  ) : (
                    <>
                      <span>{language === 'hi' ? 'क्लीनिशियन डैशबोर्ड में प्रवेश करें' : 'Sign In as Clinician'}</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Patient Login Form */
              <form onSubmit={handlePatientSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="patient-identifier"
                    className="block text-xs font-bold text-primary uppercase tracking-wider mb-1.5"
                  >
                    {language === 'hi' ? 'मरीज आईडी या पंजीकृत फोन नंबर' : 'Patient ID or Phone Number'}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[20px]">
                      badge
                    </span>
                    <input
                      id="patient-identifier"
                      type="text"
                      autoComplete="username"
                      required
                      value={patientIdentifier}
                      onChange={(e) => setPatientIdentifier(e.target.value)}
                      placeholder={language === 'hi' ? 'उदा. PT-8924 या 98765 43210' : 'e.g. PT-8924 or 98765 43210'}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-secondary-fixed bg-surface text-on-surface outline-none focus:border-primary font-medium text-sm transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1.5 leading-tight">
                    {language === 'hi'
                      ? 'अपनी मरीज आईडी या पंजीकृत मोबाइल नंबर दर्ज करें। पासवर्ड की आवश्यकता नहीं है।'
                      : 'Enter your Patient ID or registered mobile number. No password required.'}
                  </p>
                </div>

                {/* Demo Patient credentials quick pick */}
                <div className="pt-1 pb-1">
                  <span className="text-[11px] text-on-surface-variant font-semibold block mb-1.5">
                    Demo Patient Account:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPatientIdentifier('PT-8924');
                    }}
                    className="text-[11px] font-semibold bg-surface-container hover:bg-secondary-fixed text-primary px-2.5 py-1 rounded-lg border border-outline-variant/30 transition-colors"
                  >
                    Naresh Kumar (PT-8924 / 98765 43210)
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 mt-2 rounded-xl bg-primary-container text-white font-bold text-sm hover:bg-primary transition-all duration-150 flex items-center justify-center gap-2 shadow-sm active:scale-98 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                  ) : (
                    <>
                      <span>{language === 'hi' ? 'अपनी रिपोर्ट देखें' : 'View My Reports'}</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-on-surface-variant mt-6 opacity-75">
          Drishtikon Rural Retinal AI Screening System · MoHFW Tele-Ophthalmology Initiative
        </p>
      </div>

      <footer className="w-full max-w-5xl text-center py-2 text-[11px] text-on-surface-variant">
        Protected Health Information (PHI) encrypted & HIPAA/DISHA compliant
      </footer>
    </div>
  );
};
