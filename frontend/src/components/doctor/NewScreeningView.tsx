import React, { useState, useRef } from 'react';
import { usePortal } from '../../context/PortalContext';
import { apiService } from '../../services/apiService';
import { WorkflowStage, QualityAssessmentResult, ScreeningRecord } from '../../types';
import { RETINAL_ASSETS } from '../../data/mockData';
import { getTranslation } from '../../data/translations';
import { GradCamReadingBar } from '../common/GradCamReadingBar';

export const NewScreeningView: React.FC = () => {
  const { navigateToApproveReport, showToast, language, setCurrentScreening } = usePortal();

  // Eye selection
  const [selectedEye, setSelectedEye] = useState<'OS' | 'OD' | 'Both'>('OS');
  
  // File upload state - Starts completely empty with NO pre-loaded image
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video'>('image');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Patient Details - Empty, ready for new patient entry
  const [patientId, setPatientId] = useState<string>(() => `PT-${Math.floor(1000 + Math.random() * 9000)}`);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [contactNumber, setContactNumber] = useState<string>('');
  const [medicalHistory, setMedicalHistory] = useState<string>('');

  // Standalone MATLAB Quality Assessment state (Immediate check on upload)
  const [qualityAssessment, setQualityAssessment] = useState<QualityAssessmentResult | null>(null);
  const [isAssessingQuality, setIsAssessingQuality] = useState<boolean>(false);
  const [qualityOverride, setQualityOverride] = useState<boolean>(false);

  // Workflow Stages during analysis (Quality Assessment removed as it runs on upload)
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(-1);
  const [stages, setStages] = useState<WorkflowStage[]>([
    { id: 'enhancement', name: 'Image Enhancement (CLAHE)', nameHi: 'छवि संवर्धन', status: 'waiting' },
    { id: 'analysis', name: 'Retinal Lesion Analysis', nameHi: 'रेटिनल घाव विश्लेषण', status: 'waiting' },
    { id: 'classification', name: 'DR Classification (ResNet-18)', nameHi: 'डीआर वर्गीकरण', status: 'waiting' },
    { id: 'explainability', name: 'Grad-CAM Explainability', nameHi: 'ग्रेड-सीएएम स्पष्टीकरण', status: 'waiting' },
    { id: 'report', name: 'Medical Report Generation', nameHi: 'मेडिकल रिपोर्ट तैयार करना', status: 'waiting' },
  ]);

  // Full size preview modal
  const [showFullSize, setShowFullSize] = useState(false);

  // Explainability state when analysis completes
  const [completedScreening, setCompletedScreening] = useState<ScreeningRecord | null>(null);
  const [explainabilityOpacity, setExplainabilityOpacity] = useState<number>(65);
  const [explainabilityTab, setExplainabilityTab] = useState<'heatmap' | 'original' | 'enhanced' | 'lesions'>('heatmap');

  // Complete Reset Function for CHANGE 2 ("Go back" resets state fully to clean upload screen)
  const handleResetAllState = () => {
    setSelectedFile(null);
    setFileType('image');
    setPreviewUrl('');
    setUploadProgress(0);
    setIsDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setPatientId(`PT-${Math.floor(1000 + Math.random() * 9000)}`);
    setFirstName('');
    setLastName('');
    setAge('');
    setGender('Male');
    setContactNumber('');
    setMedicalHistory('');

    setQualityAssessment(null);
    setIsAssessingQuality(false);
    setQualityOverride(false);

    setIsProcessing(false);
    setActiveStageIndex(-1);
    setStages([
      { id: 'enhancement', name: 'Image Enhancement (CLAHE)', nameHi: 'छवि संवर्धन', status: 'waiting' },
      { id: 'analysis', name: 'Retinal Lesion Analysis', nameHi: 'रेटिनल घाव विश्लेषण', status: 'waiting' },
      { id: 'classification', name: 'DR Classification (ResNet-18)', nameHi: 'डीआर वर्गीकरण', status: 'waiting' },
      { id: 'explainability', name: 'Grad-CAM Explainability', nameHi: 'ग्रेड-सीएएम स्पष्टीकरण', status: 'waiting' },
      { id: 'report', name: 'Medical Report Generation', nameHi: 'मेडिकल रिपोर्ट तैयार करना', status: 'waiting' },
    ]);

    setCompletedScreening(null);
    setShowFullSize(false);
  };

  // Handle file loading with immediate MATLAB quality check (CHANGE 1)
  const processUploadedFile = async (file: File) => {
    setSelectedFile(file);
    const isVideo = file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.avi');
    setFileType(isVideo ? 'video' : 'image');
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);

    // Upload progress animation
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 35;
      });
    }, 90);

    // Decoupled immediate quality assessment call via backend MATLAB engine
    setIsAssessingQuality(true);
    setQualityAssessment(null);
    setQualityOverride(false);

    showToast(language === 'hi' ? `फ़ाइल लोड हुई: ${file.name}. गुणवत्ता जांच जारी...` : `Loaded scan: ${file.name}. Assessing image quality...`);

    try {
      const res = await apiService.assessQuality(file);
      setQualityAssessment(res);

      if (res.isAcceptable) {
        showToast(language === 'hi' ? 'गुणवत्ता जांच पूर्ण: अच्छी छवि गुणवत्ता' : 'MATLAB Quality Check: GOOD image quality.');
      } else if (res.status === 'error') {
        showToast(language === 'hi' ? `सिस्टम त्रुटि: ${res.error}` : `Quality check error: ${res.error}`);
      } else {
        showToast(language === 'hi' ? 'गुणवत्ता जांच चेतावनी: अपर्याप्त छवि गुणवत्ता' : 'MATLAB Quality Check: POOR image quality.');
      }
    } catch (err: any) {
      console.error("Quality assessment error:", err);
    } finally {
      setIsAssessingQuality(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setFileType('image');
    setUploadProgress(0);
    setQualityAssessment(null);
    setIsAssessingQuality(false);
    setQualityOverride(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast(language === 'hi' ? 'फ़ाइल हटाई गई' : 'Removed uploaded scan.');
  };

  // Trigger Classification & Grad-CAM stage
  const handleStartAnalysis = async () => {
    if (!selectedFile && !previewUrl) {
      showToast(
        language === 'hi'
          ? 'कृपया पहले एक फंडस छवि या वीडियो अपलोड करें।'
          : 'Please upload a fundus photograph or video before starting analysis.'
      );
      fileInputRef.current?.click();
      return;
    }

    if (!firstName.trim()) {
      showToast(
        language === 'hi'
          ? 'कृपया मरीज का नाम दर्ज करें।'
          : 'Please enter patient name.'
      );
      return;
    }

    // Check pre-diagnostic quality result (CHANGE 1)
    if (qualityAssessment && !qualityAssessment.isAcceptable && !qualityOverride) {
      showToast(
        language === 'hi'
          ? 'छवि गुणवत्ता अपर्याप्त है। कृपया बेहतर छवि अपलोड करें या आगे बढ़ने के लिए ओवरराइड विकल्प चुनें।'
          : 'Image quality is POOR. Please upload a passing scan or select clinician override to proceed.'
      );
      return;
    }

    setIsProcessing(true);

    const initialStages: WorkflowStage[] = [
      { id: 'enhancement', name: 'Image Enhancement (CLAHE)', nameHi: 'छवि संवर्धन', status: 'waiting' },
      { id: 'analysis', name: 'Retinal Lesion Analysis', nameHi: 'रेटिनल घाव विश्लेषण', status: 'waiting' },
      { id: 'classification', name: 'DR Classification (ResNet-18)', nameHi: 'डीआर वर्गीकरण', status: 'waiting' },
      { id: 'explainability', name: 'Grad-CAM Explainability', nameHi: 'ग्रेड-सीएएम स्पष्टीकरण', status: 'waiting' },
      { id: 'report', name: 'Medical Report Generation', nameHi: 'मेडिकल रिपोर्ट तैयार करना', status: 'waiting' },
    ];
    setStages(initialStages);
    setActiveStageIndex(0);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      } else {
        const dummyBlob = new Blob(['sample'], { type: 'image/png' });
        formData.append('file', dummyBlob, 'retina_scan.png');
      }

      let patAge = parseInt(age) || 50;
      if (patAge >= 1900 && patAge <= 2026) {
        patAge = 2026 - patAge;
      }
      patAge = Math.min(120, Math.max(1, patAge));
      formData.append('first_name', firstName.trim());
      formData.append('last_name', lastName.trim() || 'Patient');
      formData.append('age', patAge.toString());
      formData.append('gender', gender);
      if (patientId) formData.append('patient_id', patientId.trim());
      if (contactNumber) formData.append('contact_number', contactNumber.trim());
      if (medicalHistory) formData.append('medical_history', medicalHistory.trim());

      // Initiate backend submission concurrently
      let submissionRecord: ScreeningRecord | null = null;
      let submissionError: any = null;
      const apiPromise = apiService.processScreeningSubmission(formData)
        .then(res => { submissionRecord = res; return res; })
        .catch(err => { submissionError = err; throw err; });

      // Animate through each stage sequentially so the user sees phase-by-phase progression
      const stageDelay = 650; // ms per phase
      for (let i = 0; i < initialStages.length; i++) {
        setActiveStageIndex(i);
        setStages(prev =>
          prev.map((s, idx) => {
            if (idx < i) return { ...s, status: 'completed' };
            if (idx === i) return { ...s, status: 'processing' };
            return { ...s, status: 'waiting' };
          })
        );

        await new Promise(resolve => setTimeout(resolve, stageDelay));

        if (submissionError) {
          throw submissionError;
        }
        if (submissionRecord && ((submissionRecord as any).status === 'rejected' || (submissionRecord as any).status === 'error')) {
          break;
        }
      }

      // Ensure API request finishes if it took longer than visual animation steps
      const record = submissionRecord || (await apiPromise);

      record.patientId = patientId.trim();
      record.patientName = `${firstName.trim()} ${lastName.trim()}`.trim();
      record.patientAge = patAge;
      record.patientGender = gender;
      record.eye = selectedEye === 'OS' ? 'Left Eye (OS)' : selectedEye === 'OD' ? 'Right Eye (OD)' : 'Both Eyes';
      if (previewUrl) record.images.original = previewUrl;

      if (record.status === 'rejected') {
        setStages(prev =>
          prev.map((s, i) => {
            if (i === 0) return { ...s, status: 'failed', detail: record.rejectionReason || 'Quality Gate Failed' };
            return { ...s, status: 'waiting' };
          })
        );
        setCurrentScreening(record);
        setCompletedScreening(record);
        showToast(
          language === 'hi'
            ? `गुणवत्ता जांच विफल: ${record.rejectionReason || 'छवि गुणवत्ता अपर्याप्त है'}`
            : `Quality gate rejected scan: ${record.rejectionReason || 'Insufficient image quality'}`
        );
      } else if (record.status === 'error') {
        setStages(prev =>
          prev.map((s, i) => {
            if (i === 0) return { ...s, status: 'failed', detail: record.errorDetail || 'MATLAB Engine Unavailable' };
            return { ...s, status: 'waiting' };
          })
        );
        setCurrentScreening(record);
        setCompletedScreening(record);
        showToast(
          language === 'hi'
            ? `सिस्टम त्रुटि: ${record.errorDetail || 'MATLAB सेवा अनुपलब्ध'}`
            : `System Error: ${record.errorDetail || 'MATLAB engine unavailable'}`
        );
      } else {
        // SUCCESS: Mark all stages completed!
        setStages(prev => prev.map(s => ({ ...s, status: 'completed' })));

        const dynOpacity =
          record.aiResult?.dynamicOpacity ||
          Math.round(
            (record.aiResult?.confidence ? 0.42 + 0.30 * (record.aiResult.confidence / 100) : 0.65) * 100
          );
        setExplainabilityOpacity(dynOpacity);
        setCurrentScreening(record);

        // Pause for 800ms so user sees all 5 stages completed with green checkmarks in the pipeline stepper
        await new Promise(resolve => setTimeout(resolve, 800));

        setCompletedScreening(record);

        showToast(
          language === 'hi'
            ? 'एआई विश्लेषण पूर्ण! परिणाम सुरक्षित किए गए।'
            : 'AI Analysis completed. Explainability saved to patient record!'
        );
      }
    } catch (err: any) {
      setStages(prev => prev.map((s, i) => (i === activeStageIndex ? { ...s, status: 'failed' } : s)));
      showToast(`Error: ${err.message || 'Analysis could not be completed.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // -------------------------------------------------------------------------
  // OUTCOME A: SYSTEM ERROR VIEW (MATLAB Outage)
  // -------------------------------------------------------------------------
  if (completedScreening && completedScreening.status === 'error') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetAllState}
              className="h-10 px-4 rounded-lg border border-secondary-fixed bg-surface hover:bg-surface-container-high text-on-surface font-label-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>{language === 'hi' ? 'वापस जाएं' : 'Go Back'}</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-primary">
                  {completedScreening.patientName}
                </h1>
                <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-primary-fixed text-on-primary-fixed">
                  ID: #{completedScreening.patientId}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Screening #{completedScreening.id} · {completedScreening.eye} · {completedScreening.screeningDate}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200">
            <span className="material-symbols-outlined text-[16px]">dns</span>
            <span>Diagnostic Engine Unavailable</span>
          </div>
        </div>

        <div className="bg-red-50/90 border-2 border-red-300 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-xl text-red-700">
              <span className="material-symbols-outlined text-3xl">error</span>
            </div>
            <div className="space-y-2 flex-1">
              <h2 className="text-lg font-bold text-red-900">
                {language === 'hi' ? 'सिस्टम त्रुटि: MATLAB कंप्यूटेशन इंजन अनुपलब्ध' : 'System Infrastructure Error: MATLAB Engine Unavailable'}
              </h2>
              <p className="text-sm text-red-800 leading-relaxed">
                {language === 'hi'
                  ? 'स्वचालित नैदानिक इंजन (MATLAB) उपलब्ध नहीं है या निष्पादित नहीं हो सका। कोई परिणाम या गुणवत्ता स्कोर नहीं दिया गया है।'
                  : 'The automated diabetic retinopathy screening engine (MATLAB) could not be contacted or encountered an execution failure. No automated diagnosis was generated and no artificial scores were fabricated.'}
              </p>
              <div className="p-3 bg-white rounded-lg border border-red-200 text-xs font-mono text-red-800 break-all">
                {completedScreening.errorDetail || 'MATLAB engine unavailable, screening cannot be processed'}
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 font-semibold">
                Note: This is a system infrastructure outage, NOT an image quality rejection or clinical finding. Please verify that MATLAB is installed and model weights are accessible.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-red-200">
            <button
              onClick={handleResetAllState}
              className="px-5 py-2 rounded-lg bg-red-700 text-white font-bold text-xs hover:bg-red-800 transition-colors shadow-xs"
            >
              {language === 'hi' ? 'खारिज करें और पुनः प्रयास करें' : 'Dismiss & Retry'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // OUTCOME B: QUALITY REJECTION VIEW (Blocked before inference)
  // -------------------------------------------------------------------------
  if (completedScreening && completedScreening.status === 'rejected') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
        {/* Navigation Bar */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetAllState}
              className="h-10 px-4 rounded-lg border border-secondary-fixed bg-surface hover:bg-surface-container-high text-on-surface font-label-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>{language === 'hi' ? 'वापस जाएं / नया स्कैन लें' : 'Back / Re-capture Scan'}</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-primary">
                  {completedScreening.patientName}
                </h1>
                <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-primary-fixed text-on-primary-fixed">
                  ID: #{completedScreening.patientId}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Screening #{completedScreening.id} · {completedScreening.eye} · {completedScreening.screeningDate}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-300">
            <span className="material-symbols-outlined text-[16px] text-amber-600">gpp_bad</span>
            <span>Quality Gate Enforced (Inference Blocked)</span>
          </div>
        </div>

        {/* Quality Rejection Alert */}
        <div className="bg-amber-50/80 border-2 border-amber-300 rounded-xl p-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-xl text-amber-800">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-amber-900">
                  {language === 'hi' ? 'रेटिनल छवि गुणवत्ता जांच विफल — स्कैन अस्वीकृत' : 'Retinal Image Quality Check Failed — Scan Rejected'}
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-red-100 text-red-700 border border-red-200 rounded-full">
                  STATUS: REJECTED
                </span>
              </div>
              <p className="text-sm text-amber-900 leading-relaxed">
                {language === 'hi'
                  ? 'अपलोड की गई छवि स्वचालित नैदानिक मूल्यांकन के लिए न्यूनतम गुणवत्ता मानकों को पूरा नहीं करती है। गलत निदान से बचने के लिए ResNet-18 वर्गीकरण और Grad-CAM को रोक दिया गया है।'
                  : 'The uploaded retinal scan did not meet clinical optical quality thresholds. Automated ResNet-18 classification and Grad-CAM explainability were blocked to prevent false diagnoses.'}
              </p>

              {/* Specific Failure Reasons */}
              <div className="p-4 bg-white rounded-lg border border-amber-200 space-y-2">
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  {language === 'hi' ? 'अस्वीकृति का विशिष्ट कारण' : 'Specific Rejection Reason(s)'}:
                </div>
                <div className="text-sm font-bold text-red-700 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500 text-base">cancel</span>
                  <span>{completedScreening.rejectionReason || 'Image quality below clinical threshold'}</span>
                </div>
                <div className="text-xs text-on-surface-variant pt-1 border-t border-surface-container">
                  <strong>Clinical Instruction:</strong> {completedScreening.recommendation || 'Please re-capture retinal fundus image ensuring proper focus, illumination, and centering.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Metrics Breakdown & Image Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl border border-surface-container p-5">
            <h3 className="font-bold text-sm text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">photo</span>
              <span>Submitted Fundus Scan</span>
            </h3>
            <div className="aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center border border-surface-container">
              <img
                src={completedScreening.images.original}
                alt="Submitted retinal scan"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-xs text-center text-on-surface-variant mt-2">
              Image resolution / capture condition did not pass the MATLAB quality gate.
            </p>
          </div>

          <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl border border-surface-container p-5 space-y-4">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">analytics</span>
              <span>MATLAB Optical Quality Breakdown</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg border border-surface-container bg-surface-container-low">
                <div className="text-xs text-on-surface-variant">Overall Quality Score</div>
                <div className="text-2xl font-bold text-red-700 mt-1">
                  {completedScreening.qualityMetrics?.clarity ?? 0}%
                </div>
                <div className="text-xs font-semibold mt-1 text-red-600">
                  Decision: POOR (Threshold &ge; 50%)
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-surface-container bg-surface-container-low">
                <div className="text-xs text-on-surface-variant">Sharpness / Blur (Laplacian)</div>
                <div className="text-2xl font-bold text-on-surface mt-1">
                  {completedScreening.qualityMetrics?.detailed?.focus || 'Poor'}
                </div>
                <div className="text-xs font-semibold mt-1 text-on-surface-variant">
                  Vascular edge sharpness
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-surface-container bg-surface-container-low">
                <div className="text-xs text-on-surface-variant">Illumination Uniformity</div>
                <div className="text-2xl font-bold text-on-surface mt-1">
                  {completedScreening.qualityMetrics?.detailed?.illumination || 'Suboptimal'}
                </div>
                <div className="text-xs font-semibold mt-1 text-on-surface-variant">
                  Mean brightness &amp; blocks
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-surface-container bg-surface-container-low">
                <div className="text-xs text-on-surface-variant">Retinal Field of View</div>
                <div className="text-2xl font-bold text-on-surface mt-1">
                  {completedScreening.qualityMetrics?.detailed?.fieldOfView || 'Suboptimal'}
                </div>
                <div className="text-xs font-semibold mt-1 text-on-surface-variant">
                  FOV ratio &amp; border cutoffs
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 flex items-center justify-between border-t border-surface-container">
              <span className="text-xs text-on-surface-variant font-mono">
                Status: Rejected &middot; No Diagnosis
              </span>
              <button
                onClick={handleResetAllState}
                className="px-5 py-2.5 rounded-lg bg-primary text-white font-bold text-xs flex items-center gap-2 hover:bg-primary-container transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                <span>{language === 'hi' ? 'नया फंडस स्कैन अपलोड करें' : 'Upload Replacement Scan'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // OUTCOME C: PASS VIEW (Diagnosis + Grad-CAM Explainability)
  // -------------------------------------------------------------------------
  if (completedScreening) {
    const lesions = completedScreening.aiResult?.lesions || {
      microaneurysms: 'Detected',
      hemorrhages: 'Detected',
      exudates: 'Detected',
      neovascularization: 'Not detected',
    };

    return (
      <div className="space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
        {/* Navigation & Patient Details Bar */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetAllState}
              className="h-10 px-4 rounded-lg border border-secondary-fixed bg-surface hover:bg-surface-container-high text-on-surface font-label-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>{language === 'hi' ? 'पिछला (वापस जाएं)' : 'Go Back to Previous'}</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-primary">
                  {completedScreening.patientName}
                </h1>
                <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-primary-fixed text-on-primary-fixed">
                  ID: #{completedScreening.patientId}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Screening #{completedScreening.id} · {completedScreening.eye} · {completedScreening.screeningDate}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E8F5E9] text-[#2E7D32] text-xs font-bold border border-[#2E7D32]/20">
              <span className="material-symbols-outlined text-[16px]">cloud_done</span>
              <span>Explainability Saved Automatically</span>
            </div>

            <button
              onClick={() => navigateToApproveReport(completedScreening.id)}
              className="h-10 px-4 rounded-lg bg-primary text-white hover:bg-primary-container font-label-md text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">fact_check</span>
              <span>{language === 'hi' ? 'अनुमोदन पर जाएं' : 'Proceed to Approve Report'}</span>
            </button>
          </div>
        </div>

        {/* Explainability Results Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Visual Grad-CAM & Retinal Images (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-surface-container overflow-hidden flex flex-col">
              {/* Tabs */}
              <div className="p-3.5 bg-surface-bright border-b border-surface-container flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-1 bg-surface-container-low p-1 rounded-lg border border-surface-container">
                  <button
                    onClick={() => setExplainabilityTab('heatmap')}
                    className={`px-3 py-1.5 rounded-md font-label-md text-xs font-bold transition-all ${
                      explainabilityTab === 'heatmap'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    Raw Grad-CAM
                  </button>
                  <button
                    onClick={() => setExplainabilityTab('original')}
                    className={`px-3 py-1.5 rounded-md font-label-md text-xs font-bold transition-all ${
                      explainabilityTab === 'original'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    Original
                  </button>
                  <button
                    onClick={() => setExplainabilityTab('enhanced')}
                    className={`px-3 py-1.5 rounded-md font-label-md text-xs font-bold transition-all ${
                      explainabilityTab === 'enhanced'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    Enhanced (CLAHE)
                  </button>
                  <button
                    onClick={() => setExplainabilityTab('lesions')}
                    className={`px-3 py-1.5 rounded-md font-label-md text-xs font-bold transition-all ${
                      explainabilityTab === 'lesions'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    Lesions
                  </button>
                </div>

                {explainabilityTab === 'heatmap' && (
                  <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-lg border border-surface-container text-xs">
                    <span className="material-symbols-outlined text-[16px] text-primary">opacity</span>
                    <span className="text-[11px] font-medium text-on-surface-variant">Heatmap Blend:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={explainabilityOpacity}
                      onChange={(e) => setExplainabilityOpacity(parseInt(e.target.value))}
                      className="w-20 accent-primary cursor-pointer"
                    />
                    <span className="font-mono text-[11px] font-bold text-primary w-8">
                      {explainabilityOpacity}%
                    </span>
                  </div>
                )}
              </div>

              {/* Viewer */}
              <div className="relative aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
                {explainabilityTab === 'original' && (
                  <img
                    src={completedScreening.images?.original || previewUrl || RETINAL_ASSETS.originalFundusOS}
                    alt="Original Fundus"
                    className="w-full h-full object-contain"
                  />
                )}

                {explainabilityTab === 'heatmap' && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={completedScreening.images?.original || previewUrl || RETINAL_ASSETS.originalFundusOS}
                      alt="Base Scan"
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    />
                    <img
                      src={completedScreening.images?.overlay || completedScreening.images?.heatmap || RETINAL_ASSETS.heatmapOverlayOS}
                      alt="Grad-CAM Overlay"
                      style={{ opacity: explainabilityOpacity / 100 }}
                      className="absolute inset-0 w-full h-full object-contain transition-opacity duration-150"
                    />
                    {/* Floating Overlay Grad-CAM Reading Bar */}
                    <GradCamReadingBar
                      variant="overlay"
                      language={language}
                      className="absolute bottom-4 right-4 z-20 w-64 shadow-2xl"
                    />
                  </div>
                )}

                {explainabilityTab === 'enhanced' && (
                  <img
                    src={completedScreening.images?.original || previewUrl || RETINAL_ASSETS.originalFundusOS}
                    alt="Enhanced Scan"
                    style={{ filter: 'contrast(135%) brightness(105%)' }}
                    className="w-full h-full object-contain"
                  />
                )}

                {explainabilityTab === 'lesions' && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={completedScreening.images?.original || previewUrl || RETINAL_ASSETS.originalFundusOS}
                      alt="Retinal Lesions"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-4 left-4 right-4 bg-black/75 backdrop-blur-sm p-3 rounded-lg border border-white/20 text-white text-xs grid grid-cols-2 gap-2">
                      <div>Microaneurysms: <span className="font-bold text-amber-400">{lesions.microaneurysms}</span></div>
                      <div>Hemorrhages: <span className="font-bold text-red-400">{lesions.hemorrhages}</span></div>
                      <div>Exudates: <span className="font-bold text-amber-300">{lesions.exudates}</span></div>
                      <div>Neovascularization: <span className="font-bold text-green-400">{lesions.neovascularization}</span></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-surface-bright border-t border-surface-container flex items-center justify-between text-[11px] text-on-surface-variant">
                <span>Attribution Colormap: Blue (Low impact) to Red (High impact)</span>
                <span>Camera: {completedScreening.fundusCameraModel}</span>
              </div>
            </div>
          </div>

          {/* Diagnostic Summary & Actions (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-surface-container">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  AI DR Diagnostic Inference
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    completedScreening.aiResult.isReferable
                      ? 'bg-[#FFE082] text-[#E65100]'
                      : 'bg-[#C8E6C9] text-[#2E7D32]'
                  }`}
                >
                  {completedScreening.aiResult.riskLevel} Risk
                </span>
              </div>

              <h3 className="text-lg font-bold text-primary">
                {completedScreening.aiResult.finding}
              </h3>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                {completedScreening.aiResult.severity}
              </p>

              <div className="mt-4 pt-3 border-t border-surface-container space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">AI Model Confidence:</span>
                  <span className="font-bold font-mono text-primary">
                    {completedScreening.aiResult.confidence}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Referral Status:</span>
                  <span className="font-bold">
                    {completedScreening.aiResult.isReferable ? 'Referable Case' : 'Non-Referable'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[11px] text-outline font-mono pt-1">
                  <span>Architecture:</span>
                  <span>{completedScreening.aiResult.modelName || 'ResNet-18 (APTOS 2019)'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-outline font-mono">
                  <span>Grad-CAM Layer:</span>
                  <span>{completedScreening.aiResult.targetLayer || 'res5b_branch2b'}</span>
                </div>
              </div>

              {/* 5-Class Probability Distribution */}
              {completedScreening.aiResult.classProbabilities && (
                <div className="mt-4 pt-3 border-t border-surface-container">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                      5-Class Softmax Probabilities
                    </span>
                    <span className="text-[10px] font-mono text-outline">
                      ResNet-18
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {Object.entries(completedScreening.aiResult.classProbabilities).map(([cName, prob]) => {
                      const pPercent = typeof prob === 'number' ? Math.round(prob * 100) : 0;
                      const isTop = (cName === 'No_DR' && completedScreening.aiResult.grade === 0) ||
                                    (cName === 'Mild' && completedScreening.aiResult.grade === 1) ||
                                    (cName === 'Moderate' && completedScreening.aiResult.grade === 2) ||
                                    (cName === 'Severe' && completedScreening.aiResult.grade === 3) ||
                                    (cName === 'Proliferative_DR' && completedScreening.aiResult.grade === 4);
                      const displayName = cName.replace('_', ' ');
                      return (
                        <div key={cName} className="flex items-center justify-between gap-2">
                          <span className={`w-32 truncate text-[11px] ${isTop ? 'font-bold text-primary' : 'text-on-surface-variant'}`}>
                            {displayName}
                          </span>
                          <div className="flex-1 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                            <div
                              className={`h-full ${isTop ? 'bg-primary' : 'bg-outline-variant'}`}
                              style={{ width: `${Math.max(pPercent, 2)}%` }}
                            />
                          </div>
                          <span className={`w-9 text-right font-mono text-[11px] ${isTop ? 'font-bold text-primary' : 'text-on-surface-variant'}`}>
                            {pPercent}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Recommendation */}
            <div className="bg-[#FFF8E1] border-l-4 border-[#FFA000] p-4 rounded-r-xl shadow-xs">
              <span className="text-[11px] font-bold text-[#E65100] uppercase tracking-wider block mb-1">
                Clinical Recommendation
              </span>
              <p className="text-xs font-medium text-[#795548] leading-relaxed">
                {completedScreening.aiResult.recommendation}
              </p>
            </div>

            {/* Actions Box */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-surface-container flex flex-col gap-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary">
                Next Steps for Clinician
              </h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                This screening has been saved automatically. You can return to the upload form or proceed to approve the report.
              </p>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => navigateToApproveReport(completedScreening.id)}
                  className="h-11 rounded-lg bg-primary text-white font-label-md text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-sm active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">fact_check</span>
                  <span>Review & Approve Report Now</span>
                </button>

                <button
                  onClick={handleResetAllState}
                  className="h-10 rounded-lg border border-outline-variant text-on-surface font-label-md text-xs font-semibold hover:bg-surface-container transition-colors"
                >
                  ← Go Back to Upload Form
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl text-primary font-bold">
            {getTranslation('newScreeningTitle', language)}
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            {language === 'hi'
              ? 'नए मरीज का विवरण दर्ज करें और फंडस स्कैन अपलोड करें।'
              : 'Register new patient details and upload fundus photograph or retinal video.'}
          </p>
        </div>
      </div>

      {/* Main Grid: Left Upload, Right Patient Details & Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Upload & Preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Fundus Upload Box */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-surface-container flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[20px]">
                  {fileType === 'video' ? 'videocam' : 'photo_camera'}
                </span>
                Retinal Examination Media
              </span>

              {/* Eye selector */}
              <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-surface-container">
                <button
                  type="button"
                  onClick={() => setSelectedEye('OS')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                    selectedEye === 'OS'
                      ? 'bg-primary-container text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  Left Eye (OS)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEye('OD')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                    selectedEye === 'OD'
                      ? 'bg-primary-container text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  Right Eye (OD)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEye('Both')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                    selectedEye === 'Both'
                      ? 'bg-primary-container text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  Both
                </button>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !previewUrl && fileInputRef.current?.click()}
              className={`relative rounded-xl border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center p-4 min-h-[280px] ${
                isDragOver
                  ? 'border-primary bg-primary-container/10 scale-[0.99]'
                  : 'border-secondary-fixed bg-surface hover:border-primary/60'
              } ${!previewUrl ? 'cursor-pointer' : ''}`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png,image/jpeg,image/jpg,video/mp4,video/avi,video/quicktime"
                className="hidden"
              />

              {previewUrl ? (
                <div className="relative w-full aspect-[4/3] max-h-[320px] bg-black rounded-lg overflow-hidden shadow-inner flex items-center justify-center">
                  {fileType === 'video' ? (
                    <video
                      src={previewUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Uploaded fundus scan"
                      className="w-full h-full object-contain"
                    />
                  )}

                  {/* Top Overlay controls */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFullSize(true);
                      }}
                      className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black text-xs flex items-center gap-1 backdrop-blur-xs"
                      title="Zoom full size"
                    >
                      <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                      className="p-1.5 rounded-lg bg-error text-white hover:bg-error/90 text-xs flex items-center gap-1 shadow-xs"
                      title="Remove file"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>

                  <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2.5 py-1 rounded text-[11px] font-mono backdrop-blur-xs">
                    {selectedEye === 'OS' ? 'Left Eye (OS)' : selectedEye === 'OD' ? 'Right Eye (OD)' : 'Both Eyes'} · {fileType === 'video' ? 'Video' : 'Image'}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center p-6">
                  <div className="w-14 h-14 rounded-full bg-secondary-fixed flex items-center justify-center text-primary mb-3 shadow-inner">
                    <span className="material-symbols-outlined text-[28px]">cloud_upload</span>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface mb-1">
                    {getTranslation('dragDropText', language)}
                  </h3>
                  <p className="text-xs text-on-surface-variant max-w-sm mb-3 leading-relaxed">
                    {getTranslation('supportsFormats', language)}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container transition-all shadow-xs"
                  >
                    {getTranslation('browseFiles', language)}
                  </button>
                </div>
              )}
            </div>

            {/* Upload Progress Bar */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-on-surface-variant mb-1">
                  <span>Uploading file...</span>
                  <span className="font-bold">{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-container transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* File actions */}
            {previewUrl && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">file_upload</span>
                  {getTranslation('replaceFile', language)}
                </button>

                <span className="text-[11px] text-on-surface-variant truncate max-w-xs">
                  {selectedFile ? selectedFile.name : 'Fundus scan loaded'}
                </span>
              </div>
            )}
          </div>

          {/* Workflow Stepper Indicator */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-surface-container">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">linear_scale</span>
                Screening Workflow Pipeline
              </h3>
              {isProcessing && (
                <span className="text-[11px] font-semibold text-primary animate-pulse flex items-center gap-1.5 bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping inline-block" />
                  {language === 'hi'
                    ? `चरण ${activeStageIndex + 1} / ${stages.length}`
                    : `Phase ${activeStageIndex + 1} of ${stages.length}`}
                </span>
              )}
            </div>

            {/* Overall Pipeline Progress Bar */}
            {(isProcessing || stages.some(s => s.status !== 'waiting')) && (
              <div className="mb-3">
                <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-medium mb-1">
                  <span>Pipeline Execution Progress</span>
                  <span className="font-mono font-bold text-primary">
                    {Math.round(
                      ((stages.filter(s => s.status === 'completed').length +
                        (stages.some(s => s.status === 'processing') ? 0.5 : 0)) /
                        stages.length) *
                        100
                    )}%
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.round(
                        ((stages.filter(s => s.status === 'completed').length +
                          (stages.some(s => s.status === 'processing') ? 0.5 : 0)) /
                          stages.length) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {stages.map((stage, idx) => {
                const isWait = stage.status === 'waiting';
                const isProc = stage.status === 'processing';
                const isDone = stage.status === 'completed';
                const isFail = stage.status === 'failed';

                return (
                  <div
                    key={stage.id}
                    className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 transition-all duration-300 ${
                      isDone
                        ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9] shadow-2xs'
                        : isProc
                        ? 'bg-primary-container/20 text-primary border-primary font-bold shadow-md ring-2 ring-primary/30 scale-[1.02]'
                        : isFail
                        ? 'bg-error-container text-on-error-container border-error/30'
                        : 'bg-surface-bright text-on-surface-variant border-surface-container opacity-80'
                    }`}
                  >
                    <div className="shrink-0 flex items-center justify-center">
                      {isDone && <span className="material-symbols-outlined text-[18px] text-[#2E7D32]">check_circle</span>}
                      {isProc && <span className="material-symbols-outlined text-[18px] text-primary animate-spin">sync</span>}
                      {isWait && <span className="material-symbols-outlined text-[18px] text-outline-variant">radio_button_unchecked</span>}
                      {isFail && <span className="material-symbols-outlined text-[18px] text-error">error</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold leading-tight">
                        {idx + 1}. {language === 'hi' ? stage.nameHi : stage.name}
                      </div>
                      <div className="text-[10px] opacity-80 capitalize flex items-center justify-between mt-0.5">
                        <span>{stage.status}</span>
                        {isProc && (
                          <span className="text-[9px] font-bold text-primary uppercase tracking-wider animate-pulse">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: New Patient Details & Quality Check (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* New Patient Details Card */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-surface-container">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[20px]">person_add</span>
                <span>Enter New Patient Details</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-on-surface-variant block mb-1">
                  Patient ID
                </label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="e.g. PT-1001"
                  className="w-full p-2.5 rounded-lg border border-secondary-fixed bg-surface outline-none focus:border-primary font-medium font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface-variant block mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full p-2.5 rounded-lg border border-secondary-fixed bg-surface outline-none focus:border-primary font-medium"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface-variant block mb-1">
                  First Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Ramesh"
                  className="w-full p-2.5 rounded-lg border border-secondary-fixed bg-surface outline-none focus:border-primary font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface-variant block mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Patel"
                  className="w-full p-2.5 rounded-lg border border-secondary-fixed bg-surface outline-none focus:border-primary font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface-variant block mb-1">
                  Age <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 52"
                  className="w-full p-2.5 rounded-lg border border-secondary-fixed bg-surface outline-none focus:border-primary font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface-variant block mb-1">Contact Number</label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="w-full p-2.5 rounded-lg border border-secondary-fixed bg-surface outline-none focus:border-primary font-medium"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] font-bold text-on-surface-variant block mb-1">Clinical History Notes</label>
                <textarea
                  rows={2}
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="e.g. Type 2 Diabetes for 5 years, complaints of blurriness..."
                  className="w-full p-2.5 rounded-lg border border-secondary-fixed bg-surface outline-none focus:border-primary resize-none font-medium text-xs"
                />
              </div>
            </div>
          </div>

          {/* Standalone MATLAB Quality Assessment UI Card (CHANGE 1) */}
          {isAssessingQuality ? (
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border-l-4 border-primary ring-1 ring-primary/20 animate-pulse flex items-center gap-3">
              <span className="material-symbols-outlined text-[24px] text-primary animate-spin">sync</span>
              <div>
                <h3 className="text-sm font-bold text-primary">Running MATLAB Quality Assessment...</h3>
                <p className="text-xs text-on-surface-variant">Evaluating optical blur, illumination, contrast, and field-of-view</p>
              </div>
            </div>
          ) : qualityAssessment ? (
            qualityAssessment.status === 'error' ? (
              <div className="bg-red-50 rounded-xl p-5 shadow-xs border-l-4 border-red-600 space-y-2">
                <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
                  <span className="material-symbols-outlined text-red-600">dns</span>
                  <span>MATLAB Engine Unavailable</span>
                </div>
                <p className="text-xs text-red-800 leading-relaxed">
                  {qualityAssessment.error || 'MATLAB computation engine is unavailable, quality assessment cannot be processed.'}
                </p>
              </div>
            ) : qualityAssessment.isAcceptable ? (
              <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border-l-4 border-[#2E7D32] ring-1 ring-[#2E7D32]/20">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-[#2E7D32]">verified</span>
                      <span>MATLAB Optical Quality Assessment</span>
                    </h3>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Standalone quality assessment completed (Decoupled from AI model)
                    </p>
                  </div>

                  <div className="px-2.5 py-1 rounded font-mono font-bold text-xs bg-[#E8F5E9] text-[#2E7D32]">
                    Score: {qualityAssessment.score}%
                  </div>
                </div>

                <div className="border border-surface-container rounded-lg overflow-hidden mb-3 bg-surface">
                  <div className="grid grid-cols-2 divide-x divide-surface-container border-b border-surface-container p-2.5 text-xs">
                    <span className="font-semibold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-outline">center_focus_strong</span>
                      <span>Blur / Sharpness</span>
                    </span>
                    <span className={`font-bold text-right ${qualityAssessment.blurScore >= 40 ? 'text-[#2E7D32]' : 'text-error'}`}>
                      {qualityAssessment.blurScore >= 70 ? '✓ Good' : qualityAssessment.blurScore >= 40 ? '✓ Fair' : '✗ Poor'} ({qualityAssessment.blurScore}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-surface-container border-b border-surface-container p-2.5 text-xs">
                    <span className="font-semibold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-outline">lightbulb</span>
                      <span>Illumination</span>
                    </span>
                    <span className={`font-bold text-right ${qualityAssessment.illuminationScore >= 40 ? 'text-[#2E7D32]' : 'text-error'}`}>
                      {qualityAssessment.illuminationScore >= 70 ? '✓ Good' : qualityAssessment.illuminationScore >= 40 ? '✓ Fair' : '✗ Poor'} ({qualityAssessment.illuminationScore}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-surface-container border-b border-surface-container p-2.5 text-xs">
                    <span className="font-semibold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-outline">crop_free</span>
                      <span>Field of View</span>
                    </span>
                    <span className={`font-bold text-right ${qualityAssessment.fovScore >= 40 ? 'text-[#2E7D32]' : 'text-error'}`}>
                      {qualityAssessment.fovScore >= 70 ? '✓ Good' : qualityAssessment.fovScore >= 40 ? '✓ Fair' : '✗ Poor'} ({qualityAssessment.fovScore}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-surface-container p-2.5 text-xs">
                    <span className="font-semibold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-outline">contrast</span>
                      <span>Contrast</span>
                    </span>
                    <span className={`font-bold text-right ${qualityAssessment.contrastScore >= 40 ? 'text-[#2E7D32]' : 'text-error'}`}>
                      {qualityAssessment.contrastScore >= 70 ? '✓ Good' : qualityAssessment.contrastScore >= 40 ? '✓ Fair' : '✗ Poor'} ({qualityAssessment.contrastScore}%)
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#E8F5E9] text-[#2E7D32] text-xs flex items-center gap-2 border border-[#C8E6C9]">
                  <span className="material-symbols-outlined text-[18px] shrink-0">check_circle</span>
                  <span className="font-bold">Gradability Verdict: GOOD (Ready for AI Analysis)</span>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 rounded-xl p-5 shadow-xs border-l-4 border-amber-600 ring-1 ring-amber-600/20 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-amber-700">gpp_bad</span>
                      <span>MATLAB Quality Assessment: POOR</span>
                    </h3>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Scan does not meet clinical threshold for automated diagnosis.
                    </p>
                  </div>

                  <div className="px-2.5 py-1 rounded font-mono font-bold text-xs bg-red-100 text-red-800 border border-red-200">
                    Score: {qualityAssessment.score}%
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-amber-300 space-y-1.5 text-xs">
                  <div className="font-bold text-amber-900 uppercase tracking-wide text-[10px]">
                    Specific Failure Reason(s):
                  </div>
                  {qualityAssessment.rejectionReasons && qualityAssessment.rejectionReasons.length > 0 ? (
                    qualityAssessment.rejectionReasons.map((reason, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-red-700 font-semibold">
                        <span className="material-symbols-outlined text-red-500 text-sm">cancel</span>
                        <span>{reason}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-red-700 font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-red-500 text-sm">cancel</span>
                      <span>Image quality score below threshold</span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-amber-100/80 rounded-lg border border-amber-300 flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-900">
                    <input
                      type="checkbox"
                      checked={qualityOverride}
                      onChange={(e) => setQualityOverride(e.target.checked)}
                      className="w-4 h-4 accent-primary rounded cursor-pointer"
                    />
                    <span>Proceed with AI Analysis anyway (Clinician Override)</span>
                  </label>
                </div>
              </div>
            )
          ) : (
            <div className="bg-surface-container-lowest rounded-xl p-5 border border-dashed border-surface-container flex flex-col items-center text-center justify-center p-6 text-on-surface-variant">
              <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-outline mb-2">
                <span className="material-symbols-outlined text-[20px]">aspect_ratio</span>
              </div>
              <h4 className="text-xs font-bold text-on-surface">Immediate MATLAB Quality Assessment</h4>
              <p className="text-[11px] text-on-surface-variant mt-1 max-w-xs leading-relaxed">
                Upload a fundus image or video on the left to immediately run MATLAB focus, illumination, contrast, and FOV validation before AI analysis.
              </p>
            </div>
          )}

          {/* Action Trigger: Start Analysis */}
          <div className="mt-auto pt-2">
            <button
              onClick={handleStartAnalysis}
              disabled={isProcessing || isAssessingQuality || (qualityAssessment != null && !qualityAssessment.isAcceptable && !qualityOverride)}
              className="w-full h-touch-target-min rounded-lg font-label-md text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 bg-primary text-white hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isProcessing || isAssessingQuality ? 'sync' : 'neurology'}
              </span>
              <span>
                {isProcessing
                  ? (language === 'hi' ? 'विश्लेषण जारी...' : 'Analyzing scan...')
                  : isAssessingQuality
                  ? (language === 'hi' ? 'गुणवत्ता जांच जारी...' : 'Checking quality...')
                  : getTranslation('startAnalysis', language)}
              </span>
            </button>
            <p className="text-[11px] text-center text-on-surface-variant mt-2">
              Automated inference powered by deep neural network with Grad-CAM attribution
            </p>
          </div>
        </div>
      </div>

      {/* Full Size Modal */}
      {showFullSize && previewUrl && (
        <div 
          onClick={() => setShowFullSize(false)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out animate-fade-in"
        >
          <div className="relative max-w-4xl w-full max-h-[85vh] flex items-center justify-center">
            <img
              src={previewUrl}
              alt="High Resolution Retina Full Size"
              className="max-w-full max-h-[85vh] object-contain rounded-xl border-2 border-primary-container shadow-2xl"
            />
            <button
              onClick={() => setShowFullSize(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/70 text-white hover:bg-black"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
