import React, { useState, useRef, useEffect } from 'react';
import { usePortal } from '../../context/PortalContext';
import { AssistantMessage } from '../../types';
import { getTranslation } from '../../data/translations';

export const PatientAiAssistant: React.FC = () => {
  const { currentScreening, language, showToast } = usePortal();
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialGreetingEn = `Hello! I'm your Drishtikon AI Assistant. Based on your recent screening for ${currentScreening.eye}, your result is "${currentScreening.aiResult.finding}" with ${currentScreening.aiResult.riskLevel} risk. How can I help explain your report today?`;
  const initialGreetingHi = `नमस्ते! मैं आपका दृष्टिकोण एआई सहायक हूँ। आपके ${currentScreening.eye} की हालिया जांच के आधार पर आपका परिणाम "${currentScreening.aiResult.findingHi || currentScreening.aiResult.finding}" है। आपकी रिपोर्ट को समझने में मैं कैसे मदद कर सकता हूँ?`;

  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: language === 'hi' ? initialGreetingHi : initialGreetingEn,
      timestamp: 'Just now',
    },
  ]);

  useEffect(() => {
    // Update first greeting if language changes
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 'msg-1') {
        return [{
          id: 'msg-1',
          sender: 'assistant',
          text: language === 'hi' ? initialGreetingHi : initialGreetingEn,
          timestamp: 'Just now',
        }];
      }
      return prev;
    });
  }, [language, currentScreening]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Report-aware answer generator
  const generateResponse = (question: string): string => {
    const q = question.toLowerCase();
    const isHi = language === 'hi';
    const finding = isHi ? currentScreening.aiResult.findingHi : currentScreening.aiResult.finding;
    const rec = isHi ? currentScreening.aiResult.recommendationHi : currentScreening.aiResult.recommendation;
    const verifiedBy = currentScreening.review.verifiedBy || 'Dr. Anita';

    // 1. What does my result mean?
    if (q.includes('mean') || q.includes('मतलब') || q.includes('result') || q.includes('परिणाम')) {
      if (isHi) {
        return `आपकी जांच में "${finding}" दर्ज किया गया है। इसका मतलब है कि मधुमेह के कारण रेटिना की नसों में कुछ सूक्ष्म परिवर्तन दिखे हैं। डॉ. ${verifiedBy} ने इसकी पुष्टि की है। समय पर देखभाल और रक्त शर्करा के नियंत्रण से आपकी दृष्टि सुरक्षित रह सकती है।`;
      }
      return `Your screening shows "${finding}". This means small microvascular changes caused by blood sugar levels were noticed in your retina. It has been verified by ${verifiedBy}. With timely care and good blood sugar control, your vision can be well protected.`;
    }

    // 2. What is diabetic retinopathy?
    if (q.includes('what is') || q.includes('diabetic retinopathy') || q.includes('क्या है') || q.includes('रेटिनोपैथी')) {
      if (isHi) {
        return `डायबिटिक रेटिनोपैथी एक ऐसी स्थिति है जिसमें लंबे समय तक उच्च रक्त शर्करा आंख के पिछले हिस्से (रेटिना) की छोटी रक्त वाहिकाओं को प्रभावित करती है। शुरुआती चरणों में अक्सर कोई लक्षण महसूस नहीं होते, इसीलिए नियमित एआई स्क्रीनिंग बहुत महत्वपूर्ण है।`;
      }
      return `Diabetic Retinopathy is an eye condition where prolonged elevated blood sugar affects the delicate blood vessels in the back of the eye (the retina). Early stages often have no noticeable symptoms, which is why regular AI fundus screening is so vital.`;
    }

    // 3. Why should I see an ophthalmologist?
    if (q.includes('ophthalmologist') || q.includes('doctor') || q.includes('डॉक्टर') || q.includes('नेत्र विशेषज्ञ') || q.includes('why')) {
      if (isHi) {
        return `एआई एक सहायक स्क्रीनिंग उपकरण है, अंतिम इलाज नहीं। नेत्र रोग विशेषज्ञ पुतली फैलाकर आपकी आंख की गहराई से जांच करते हैं और आवश्यकता पड़ने पर उचित ड्रॉप्स, लेजर या दवा की सलाह देते हैं।`;
      }
      return `Drishtikon AI provides automated screening triage, not medical treatment. An ophthalmologist will perform a dilated retinal exam to inspect the retina directly and recommend preventive drops, laser therapy, or medical management if required.`;
    }

    // 4. What should I do next?
    if (q.includes('next') || q.includes('आगे') || q.includes('कदम') || q.includes('do')) {
      if (isHi) {
        return `अगला कदम: ${rec} साथ ही अपनी रक्त शर्करा (HbA1c < 7%) और रक्तचाप को नियंत्रित रखें, और निर्धारित दवाएं समय पर लें।`;
      }
      return `Next Step: ${rec} In addition, monitor your blood sugar (aim for HbA1c under 7%), check blood pressure weekly, and never skip prescribed diabetes medications.`;
    }

    // General fallback
    if (isHi) {
      return `आपकी रिपोर्ट के अनुसार स्थिति ${currentScreening.aiResult.severityHi || currentScreening.aiResult.severity} है। ${rec} किसी भी विशिष्ट चिंता के लिए आप जिला अस्पताल के नेत्र विभाग से संपर्क कर सकते हैं।`;
    }
    return `According to your screening record (${currentScreening.aiResult.severity}), the key clinical advice is: "${rec}". Please consult your local PHC or ophthalmologist for tailored clinical guidance.`;
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text) return;

    const userMsg: AssistantMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Just now',
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');

    // Generate report-aware AI answer
    setTimeout(() => {
      const responseText = generateResponse(text);
      const aiMsg: AssistantMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: responseText,
        timestamp: 'Just now',
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 400);
  };

  // Voice Input using Web Speech API
  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast(language === 'hi' ? 'आपके ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है' : 'Voice input not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        showToast(language === 'hi' ? 'सुन रहे हैं... बोलिए' : 'Listening... Speak your question');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        if (transcript) {
          handleSendMessage(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        showToast('Could not recognize voice input.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      showToast('Microphone access unavailable.');
    }
  };

  const suggestedQuestions = [
    { key: 'q1', textEn: 'What does my result mean?', textHi: 'मेरे परिणाम का क्या मतलब है?' },
    { key: 'q2', textEn: 'What is diabetic retinopathy?', textHi: 'डायबिटिक रेटिनोपैथी क्या है?' },
    { key: 'q3', textEn: 'Why should I see an ophthalmologist?', textHi: 'मुझे नेत्र विशेषज्ञ से क्यों मिलना चाहिए?' },
    { key: 'q4', textEn: 'What should I do next?', textHi: 'मुझे आगे क्या करना चाहिए?' },
  ];

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-20 md:bottom-8 right-5 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open AI Assistant"
          className="h-12 px-4 rounded-full bg-primary-container text-white shadow-xl flex items-center gap-2.5 hover:bg-primary transition-all active:scale-95 border-2 border-white/20"
        >
          <span className="material-symbols-outlined text-[22px]">psychology</span>
          <span className="font-label-md text-xs sm:text-sm font-bold">
            {getTranslation('askAssistant', language)}
          </span>
          <span className="w-2 h-2 rounded-full bg-[#80e5ff] animate-ping"></span>
        </button>
      </div>

      {/* Assistant Drawer / Modal */}
      {isOpen && (
        <div className="fixed bottom-24 md:bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-[420px] max-h-[600px] h-[80vh] bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-4 bg-primary text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[20px]">smart_toy</span>
              </div>
              <div>
                <h3 className="font-headline-md text-sm font-bold leading-tight">
                  {getTranslation('askAssistant', language)}
                </h3>
                <p className="text-[11px] text-[#BDE9FF] leading-tight">
                  {getTranslation('assistantSub', language)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-surface custom-scrollbar text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-primary text-white rounded-br-xs shadow-xs'
                      : 'bg-surface-container-lowest text-on-surface border border-surface-container rounded-bl-xs shadow-sm'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[10px] text-on-surface-variant px-1 mt-0.5">
                  {m.timestamp}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Question Pills */}
          <div className="px-3 py-2 bg-surface-bright border-t border-surface-container flex gap-1.5 overflow-x-auto no-scrollbar">
            {suggestedQuestions.map((sq) => {
              const label = language === 'hi' ? sq.textHi : sq.textEn;
              return (
                <button
                  key={sq.key}
                  onClick={() => handleSendMessage(label)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface-container-low text-primary hover:bg-secondary-fixed whitespace-nowrap transition-colors border border-surface-container"
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-surface-container-lowest border-t border-surface-container">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-error text-white animate-pulse'
                    : 'bg-surface-container-low text-primary hover:bg-secondary-fixed'
                }`}
                title={isListening ? 'Stop listening' : 'Voice Input'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isListening ? 'mic' : 'mic_none'}
                </span>
              </button>

              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={getTranslation('askQuestionPlaceholder', language)}
                className="flex-1 bg-surface-bright border border-secondary-fixed rounded-lg px-3 py-2 text-xs outline-none focus:border-primary text-on-surface"
              />

              <button
                type="submit"
                disabled={!inputQuery.trim()}
                className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary-container disabled:opacity-40 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </form>

            {/* Disclaimer */}
            <p className="text-[10px] text-on-surface-variant text-center mt-2 leading-tight opacity-75">
              {getTranslation('assistantDisclaimer', language)}
            </p>
          </div>
        </div>
      )}
    </>
  );
};
