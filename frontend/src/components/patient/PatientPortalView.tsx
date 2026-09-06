import React, { useState, useEffect, useRef } from 'react';
import { usePortal } from '../../context/PortalContext';
import { apiService } from '../../services/apiService';
import { PatientPortalReport, AssistantMessage } from '../../types';

export const PatientPortalView: React.FC = () => {
  const { currentUser, language, showToast } = usePortal();

  const [reports, setReports] = useState<PatientPortalReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<PatientPortalReport | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  // Chatbot State (Groq API backend) - Compact floating widget on the right side
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<AssistantMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: language === 'hi'
        ? `नमस्ते! मैं आपका दृष्टिकोण नेत्र सहायक हूँ। मैं आपकी रेटिना रिपोर्ट और मेडिकल शब्दों को सरल और स्पष्ट भाषा में समझाने के लिए यहाँ हूँ। आप अपनी रिपोर्ट के बारे में क्या जानना चाहते हैं?`
        : `Hello! I am your Drishtikon Retinal Care Assistant. I am an experienced ophthalmologist companion here to explain your screening report and medical terms in clear, simple language. What would you like to know about your report today?`,
      timestamp: 'Just now'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Load Patient's own reports on mount
  useEffect(() => {
    let mounted = true;
    setIsLoadingReports(true);
    apiService.getPatientReports()
      .then((data) => {
        if (mounted) {
          setReports(data);
          if (data.length > 0) {
            setSelectedReport(data[0]);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load patient reports:', err);
      })
      .finally(() => {
        if (mounted) setIsLoadingReports(false);
      });

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  useEffect(() => {
    if (isChatOpen) {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const handleDownloadReport = (report: PatientPortalReport) => {
    showToast(language === 'hi' ? 'पीडीएफ रिपोर्ट तैयार की जा रही है...' : 'Preparing patient medical report for download...');
    setSelectedReport(report);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const handleSendChat = async (questionText?: string) => {
    const text = (questionText || chatInput).trim();
    if (!text || isChatLoading) return;

    const userMsg: AssistantMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Just now'
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await apiService.sendPatientChatMessage(text, chatMessages);
      const assistantMsg: AssistantMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        timestamp: 'Just now'
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const fallbackMsg: AssistantMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: language === 'hi'
          ? 'माफ़ कीजिए, सर्वर से जुड़ने में समस्या हुई। कृपया अपनी रिपोर्ट पर चर्चा करने के लिए अपने डॉक्टर से परामर्श लें।'
          : 'I could not connect to the ophthalmologist service. Please consult your treating eye specialist for guidance on your report.',
        timestamp: 'Just now'
      };
      setChatMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const suggestedQuestions = [
    { textEn: 'What does my report mean?', textHi: 'मेरी रिपोर्ट का क्या मतलब है?' },
    { textEn: 'What are microaneurysms and exudates?', textHi: 'माइक्रोएन्यूरिज्म और एक्सयूडेट्स क्या हैं?' },
    { textEn: 'What should I do next?', textHi: 'मुझे आगे क्या करना चाहिए?' },
    { textEn: 'Is diabetic retinopathy reversible?', textHi: 'क्या डायबिटिक रेटिनोपैथी ठीक हो सकती है?' },
  ];

  return (
    <div className="max-w-5xl mx-auto w-full space-y-8 pb-16">
      {/* Patient Header Section */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <span className="material-symbols-outlined text-[26px]">person</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
              {language === 'hi' ? 'मरीज पोर्टल' : 'Patient Portal'}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-primary">
              {currentUser?.patient?.name || 'Patient'}
            </h1>
            <p className="text-xs text-on-surface-variant">
              ID: <span className="font-semibold text-primary">{currentUser?.patient?.patientId || 'PT-8924'}</span> · Phone: {currentUser?.patient?.phone || '+91 98765 43210'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-1.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] text-xs font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>{language === 'hi' ? 'सत्यापित रिकॉर्ड्स' : 'Verified Records'}</span>
          </div>

          <button
            onClick={() => setIsChatOpen((prev) => !prev)}
            className="px-3.5 py-1.5 rounded-full bg-primary text-white hover:bg-primary-container text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            title={language === 'hi' ? 'एआई सहायक से चैट करें' : 'Chat with AI Assistant'}
          >
            <span className="material-symbols-outlined text-[16px]">smart_toy</span>
            <span>{language === 'hi' ? 'एआई सहायक' : 'AI Assistant'}</span>
          </button>
        </div>
      </div>

      {/* SECTION: EYE SCREENING REPORTS (Fundus Image on LEFT, Findings & Details on RIGHT) */}
      <section aria-labelledby="patient-reports-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="patient-reports-heading" className="text-lg sm:text-xl font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">description</span>
              <span>{language === 'hi' ? 'आपकी नेत्र रिपोर्ट' : 'Your Eye Screening Reports'}</span>
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {language === 'hi'
                ? 'मूल रेटिना छवि बाईं ओर और संबंधित मेडिकल विवरण दाईं ओर प्रदर्शित हैं।'
                : 'Authentic retinal fundus photograph on the left, with clinical findings and patient details on the right.'}
            </p>
          </div>
        </div>

        {isLoadingReports ? (
          <div className="p-12 text-center bg-surface-container-lowest rounded-2xl border border-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
            <p className="text-xs font-medium mt-2">Loading your screening reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center bg-surface-container-lowest rounded-2xl border border-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/60">folder_open</span>
            <p className="text-sm font-bold text-primary mt-2">No reports on file yet</p>
            <p className="text-xs text-on-surface-variant mt-1">
              Your screening records will appear here as soon as your clinician uploads them.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 shadow-sm border border-surface-container hover:shadow-md transition-shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                  {/* LEFT SIDE: Real Fundus Photograph */}
                  <div className="md:col-span-5 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                        <span>{language === 'hi' ? 'मूल रेटिना छवि' : 'Real Fundus Photograph'}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-on-surface-variant bg-surface-container px-2.5 py-0.5 rounded-full">
                        {report.eye}
                      </span>
                    </div>

                    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-inner border border-outline-variant/20 relative group">
                      <img
                        src={report.originalImageUrl}
                        alt={`Retinal Fundus Image for ${report.patientName}`}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                      <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded font-mono">
                        #{report.screeningId}
                      </div>
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-2 text-center">
                      {language === 'hi' ? 'प्राथमिक स्वास्थ्य केंद्र द्वारा ली गई डिजिटल रेटिना तस्वीर' : 'Official digital retinal scan recorded at PHC'}
                    </p>
                  </div>

                  {/* RIGHT SIDE: Findings & Patient Details */}
                  <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                    {/* Patient Information */}
                    <div>
                      <div className="flex items-start justify-between gap-3 border-b border-surface-container pb-3">
                        <div>
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                            {language === 'hi' ? 'मरीज का विवरण' : 'Patient Information'}
                          </span>
                          <h3 className="text-lg sm:text-xl font-bold text-primary">
                            {report.patientName}
                          </h3>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            ID: <span className="font-mono font-bold text-primary">#{report.patientId}</span> · Date: <span className="font-medium text-on-surface">{report.date}</span>
                          </p>
                        </div>
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed shrink-0">
                          {report.eye}
                        </span>
                      </div>

                      {/* Clinical Findings & Diagnosis */}
                      <div className="mt-3 space-y-2.5">
                        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                            {language === 'hi' ? 'जांच निष्कर्ष एवं स्थिति' : 'Screening Diagnosis & Finding'}
                          </span>
                          <div className="text-base font-bold text-primary mt-0.5">
                            {report.finding}
                          </div>
                          {report.severity && report.severity !== 'Error' && (
                            <p className="text-xs text-on-surface-variant mt-0.5 font-medium">
                              {report.severity}
                            </p>
                          )}
                        </div>

                        {report.recommendation && (
                          <div className="p-3 rounded-xl bg-[#FFF8E1] border-l-4 border-[#FFA000] text-xs">
                            <span className="font-bold text-[#E65100] block uppercase tracking-wider text-[10px]">
                              {language === 'hi' ? 'डॉक्टर की सलाह' : 'Clinical Recommendation'}
                            </span>
                            <p className="text-[#795548] mt-0.5 font-medium leading-relaxed">
                              {report.recommendation}
                            </p>
                          </div>
                        )}

                        {/* Verified By Doctor Badge */}
                        <div className="flex items-center justify-between text-xs text-on-surface-variant pt-1 px-1">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span className="material-symbols-outlined text-[#2E7D32] text-[16px]">verified</span>
                            <span>
                              {language === 'hi' ? 'सत्यापितकर्ता:' : 'Verified By:'}{' '}
                              <strong className="text-primary">{report.verifiedBy || 'Treating Clinician'}</strong>
                            </span>
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] font-bold text-[11px] border border-[#BBF7D0]">
                            {report.reviewStatus.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-surface-container">
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setIsViewModalOpen(true);
                        }}
                        className="h-10 px-4 rounded-xl bg-surface-container hover:bg-secondary-fixed text-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-colors flex-1 sm:flex-initial"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                        <span>{language === 'hi' ? 'रिपोर्ट देखें' : 'View Full Report'}</span>
                      </button>

                      <button
                        onClick={() => handleDownloadReport(report)}
                        className="h-10 px-4 rounded-xl bg-primary-container text-white hover:bg-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs flex-1 sm:flex-initial"
                      >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        <span>{language === 'hi' ? 'डाउनलोड (PDF)' : 'Download Report'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setIsChatOpen(true);
                        }}
                        className="h-10 px-3.5 rounded-xl border border-primary/20 text-primary hover:bg-primary/5 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        title={language === 'hi' ? 'इस रिपोर्ट के बारे में एआई से पूछें' : 'Ask AI about this report'}
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary">smart_toy</span>
                        <span>{language === 'hi' ? 'एआई से पूछें' : 'Ask AI'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FLOATING ICON BUTTON FOR OPENING CHATBOT (Right Side - Small & Compact) */}
      {!isChatOpen && (
        <div className="fixed bottom-20 md:bottom-8 right-4 sm:right-6 z-40">
          <button
            onClick={() => setIsChatOpen(true)}
            aria-label="Open AI Assistant"
            title={language === 'hi' ? 'नेत्र एआई सहायक' : 'Open AI Eye Assistant'}
            className="group relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary text-white shadow-lg hover:shadow-xl hover:bg-primary-container flex items-center justify-center transition-all duration-200 border border-white/30 hover:scale-110 active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px] sm:text-[22px]">smart_toy</span>
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-surface-container-lowest"></span>
            </span>
          </button>
        </div>
      )}

      {/* COMPACT FLOATING CHATBOT ASSISTANT ON THE RIGHT SIDE */}
      {isChatOpen && (
        <div className="fixed bottom-20 md:bottom-8 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[380px] md:w-[410px] h-[540px] max-h-[82vh] bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container overflow-hidden flex flex-col animate-fade-in">
          {/* Header */}
          <div className="p-3.5 bg-primary text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">smart_toy</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs sm:text-sm truncate">
                    Dr. Drishtikon
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                </div>
                <p className="text-[10px] text-[#BDE9FF] truncate">
                  {language === 'hi' ? 'ग्रॉक एलएलएम · नेत्र सहायक' : 'Powered by Groq API · Eye Care'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsChatOpen(false)}
                aria-label="Minimize assistant"
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                title="Minimize"
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <button
                onClick={() => setIsChatOpen(false)}
                aria-label="Close assistant"
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 bg-surface custom-scrollbar text-xs">
            {chatMessages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-primary text-white rounded-br-xs shadow-xs font-medium'
                      : 'bg-surface-container-lowest text-on-surface border border-surface-container rounded-bl-xs shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line text-xs">{m.text}</p>
                </div>
                <span className="text-[9px] text-on-surface-variant px-1 mt-0.5">
                  {m.timestamp}
                </span>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex items-center gap-2 text-on-surface-variant text-[11px] p-2 bg-surface-container-low rounded-xl w-fit">
                <span className="material-symbols-outlined animate-spin text-[14px] text-primary">sync</span>
                <span>{language === 'hi' ? 'सहायक सोच रहा है...' : 'AI assistant is typing...'}</span>
              </div>
            )}
            <div ref={chatMessagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-1.5 bg-surface-bright border-t border-surface-container flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {suggestedQuestions.map((sq, idx) => {
              const label = language === 'hi' ? sq.textHi : sq.textEn;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendChat(label)}
                  disabled={isChatLoading}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-surface-container-low text-primary hover:bg-secondary-fixed whitespace-nowrap transition-colors border border-surface-container disabled:opacity-50"
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Chat Input Form */}
          <div className="p-2.5 bg-surface-container-lowest border-t border-surface-container shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  language === 'hi'
                    ? 'रिपोर्ट के बारे में पूछें...'
                    : 'Ask about your eye report...'
                }
                disabled={isChatLoading}
                className="flex-1 bg-surface-bright border border-secondary-fixed rounded-xl px-3 py-2 text-xs outline-none focus:border-primary text-on-surface disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className="h-8 w-8 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-container disabled:opacity-40 transition-colors shrink-0 shadow-xs"
                aria-label="Send message"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </form>

            <p className="text-[9px] text-on-surface-variant text-center mt-1 opacity-70 truncate">
              Educational AI · Consult your ophthalmologist for medical decisions
            </p>
          </div>
        </div>
      )}

      {/* VIEW REPORT MODAL (Fundus image on LEFT, Findings & Patient Details on RIGHT) */}
      {isViewModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-surface-container p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div>
                <h3 className="text-lg font-bold text-primary">
                  {language === 'hi' ? 'नेत्र स्क्रीनिंग रिपोर्ट' : 'Retinal Screening Medical Report'}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Report #{selectedReport.screeningId} · {selectedReport.date}
                </p>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body: Left Fundus Image, Right Findings & Patient Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Left Column: Official Retinal Scan */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                  <span>Official Retinal Scan ({selectedReport.eye})</span>
                </span>
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-inner border border-outline-variant/30">
                  <img
                    src={selectedReport.originalImageUrl}
                    alt={`Retinal Scan of ${selectedReport.patientName}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant text-center">
                  Examined on {selectedReport.date} · Screening #{selectedReport.screeningId}
                </p>
              </div>

              {/* Right Column: Findings & Patient Details */}
              <div className="space-y-3 flex flex-col justify-between h-full">
                <div className="grid grid-cols-2 gap-3 text-xs bg-surface-container-low p-4 rounded-xl border border-surface-container">
                  <div>
                    <span className="text-on-surface-variant block font-medium">Patient Name:</span>
                    <span className="font-bold text-primary text-sm">{selectedReport.patientName}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block font-medium">Patient ID:</span>
                    <span className="font-bold text-primary text-sm">#{selectedReport.patientId}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block font-medium">Examined Eye:</span>
                    <span className="font-semibold text-primary">{selectedReport.eye}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block font-medium">Exam Date:</span>
                    <span className="font-semibold text-primary">{selectedReport.date}</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-surface-container">
                    <span className="text-on-surface-variant block font-medium">Screening Diagnosis:</span>
                    <span className="font-bold text-primary text-sm">{selectedReport.finding}</span>
                    <span className="text-xs text-on-surface-variant block mt-0.5">{selectedReport.severity}</span>
                  </div>
                  {selectedReport.recommendation && (
                    <div className="col-span-2 pt-2 border-t border-surface-container">
                      <span className="text-on-surface-variant block font-medium">Clinician Advice:</span>
                      <span className="font-medium text-[#B45309] block mt-0.5">{selectedReport.recommendation}</span>
                    </div>
                  )}
                  {selectedReport.verifiedBy && (
                    <div className="col-span-2 pt-2 border-t border-surface-container flex items-center justify-between text-[11px] text-on-surface-variant">
                      <span>Verified By: <strong>{selectedReport.verifiedBy}</strong></span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] font-bold text-[10px] border border-[#BBF7D0]">
                        {selectedReport.reviewStatus.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Modal Action Buttons */}
                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setIsChatOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-primary/20 text-primary hover:bg-primary/5 text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                    <span>{language === 'hi' ? 'एआई से पूछें' : 'Ask AI'}</span>
                  </button>

                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container transition-colors"
                  >
                    Close
                  </button>

                  <button
                    onClick={() => handleDownloadReport(selectedReport)}
                    className="px-5 py-2 rounded-xl bg-primary-container text-white text-xs font-bold hover:bg-primary transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>Download Report (PDF)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
