import { Patient, ScreeningRecord, ReviewStatus, Appointment, RiskLevel, LesionFindings, DetailedQualityMetrics, QualityAssessmentResult, AiDiagnosticResult, AuthSession, PatientPortalReport, AssistantMessage, DoctorUser, BookAppointmentPayload } from '../types';
import { INITIAL_PATIENTS, INITIAL_SCREENINGS, INITIAL_METRICS, RETINAL_ASSETS } from '../data/mockData';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

let currentAuthToken: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('drishtikon_auth_token') : null;
let currentDoctorId: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('drishtikon_doctor_id') : null;
let currentPatientId: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('drishtikon_patient_id') : null;

export function setAuthSession(session: AuthSession | null) {
  if (session) {
    currentAuthToken = session.token;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('drishtikon_auth_token', session.token);
      localStorage.setItem('drishtikon_auth_role', session.role);
    }
    if (session.role === 'doctor' && session.doctor) {
      currentDoctorId = session.doctor.doctorId;
      currentPatientId = null;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('drishtikon_doctor_id', session.doctor.doctorId);
        localStorage.setItem('drishtikon_doctor_name', session.doctor.name);
        localStorage.setItem('drishtikon_doctor_hospital', session.doctor.hospital || '');
        localStorage.setItem('drishtikon_doctor_department', session.doctor.department || '');
        localStorage.removeItem('drishtikon_patient_id');
      }
    } else if (session.role === 'patient' && session.patient) {
      currentPatientId = session.patient.patientId;
      currentDoctorId = null;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('drishtikon_patient_id', session.patient.patientId);
        localStorage.setItem('drishtikon_patient_name', session.patient.name);
        if (session.patient.phone) localStorage.setItem('drishtikon_patient_phone', session.patient.phone);
        if (session.patient.age) localStorage.setItem('drishtikon_patient_age', String(session.patient.age));
        if (session.patient.gender) localStorage.setItem('drishtikon_patient_gender', session.patient.gender);
        localStorage.removeItem('drishtikon_doctor_id');
        localStorage.removeItem('drishtikon_doctor_name');
        localStorage.removeItem('drishtikon_doctor_hospital');
        localStorage.removeItem('drishtikon_doctor_department');
      }
    }
  } else {
    currentAuthToken = null;
    currentDoctorId = null;
    currentPatientId = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('drishtikon_auth_token');
      localStorage.removeItem('drishtikon_auth_role');
      localStorage.removeItem('drishtikon_doctor_id');
      localStorage.removeItem('drishtikon_doctor_name');
      localStorage.removeItem('drishtikon_doctor_hospital');
      localStorage.removeItem('drishtikon_doctor_department');
      localStorage.removeItem('drishtikon_patient_id');
      localStorage.removeItem('drishtikon_patient_name');
      localStorage.removeItem('drishtikon_patient_phone');
      localStorage.removeItem('drishtikon_patient_age');
      localStorage.removeItem('drishtikon_patient_gender');
    }
  }
}

export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }
  if (currentDoctorId) {
    headers['X-Doctor-Id'] = currentDoctorId;
  }
  if (currentPatientId) {
    headers['X-Patient-Id'] = currentPatientId;
  }
  return headers;
}

// In-memory fallback stores (used if backend is offline or during testing)
let patientsStore: Patient[] = [...INITIAL_PATIENTS];
let screeningsStore: ScreeningRecord[] = [...INITIAL_SCREENINGS];
let metricsStore = { ...INITIAL_METRICS };
let appointmentsStore: Appointment[] = [
  {
    id: 'APT-101',
    appointmentId: 'APT-101',
    patientId: 'PT-8924',
    doctorName: 'Dr. Anita',
    appointmentDate: '2026-09-10',
    appointmentTime: '11:00 AM',
    date: 'Tomorrow, 11:00 AM',
    time: '11:00 AM',
    type: 'Teleconsultation',
    status: 'Confirmed'
  }
];

function getRiskLevel(classId: number): RiskLevel {
  if (classId >= 3) return 'high';
  if (classId === 2) return 'medium';
  if (classId === 1) return 'low';
  return 'normal';
}

function formatFinding(className: string): string {
  switch (className) {
    case 'No_DR': return 'No Diabetic Retinopathy Detected';
    case 'Mild': return 'Mild Non-Proliferative Diabetic Retinopathy';
    case 'Moderate': return 'Moderate Diabetic Retinopathy';
    case 'Severe': return 'Severe Non-Proliferative Diabetic Retinopathy';
    case 'Proliferative_DR': return 'Proliferative Diabetic Retinopathy';
    default: return `${className} Diabetic Retinopathy`;
  }
}

function formatFindingHi(className: string): string {
  switch (className) {
    case 'No_DR': return 'डायबिटिक रेटिनोपैथी का कोई लक्षण नहीं मिला';
    case 'Mild': return 'हल्की गैर-प्रसारक डायबिटिक रेटिनोपैथी';
    case 'Moderate': return 'मध्यम डायबिटिक रेटिनोपैथी';
    case 'Severe': return 'गंभीर गैर-प्रसारक डायबिटिक रेटिनोपैथी';
    case 'Proliferative_DR': return 'प्रसारक डायबिटिक रेटिनोपैथी';
    default: return `${className} डायबिटिक रेटिनोपैथी`;
  }
}

function formatSeverity(className: string, classId: number): string {
  switch (classId) {
    case 0: return 'Grade 0 (Normal Retina)';
    case 1: return 'Grade 1 (Mild NPDR)';
    case 2: return 'Grade 2 (Moderate NPDR)';
    case 3: return 'Grade 3 (Severe NPDR)';
    case 4: return 'Grade 4 (Proliferative DR)';
    default: return `Grade ${classId} (${className})`;
  }
}

function formatSeverityHi(className: string, classId: number): string {
  switch (classId) {
    case 0: return 'ग्रेड 0 (सामान्य रेटिना)';
    case 1: return 'ग्रेड 1 (हल्का एनपीडीआर)';
    case 2: return 'ग्रेड 2 (मध्यम एनपीडीआर)';
    case 3: return 'ग्रेड 3 (गंभीर एनपीडीआर)';
    case 4: return 'ग्रेड 4 (प्रोलिफ़ेरेटिव डीआर)';
    default: return `ग्रेड ${classId} (${className})`;
  }
}

function getRecommendation(classId: number): string {
  if (classId >= 3) {
    return 'Urgent: Refer immediately to a vitreoretinal specialist for anti-VEGF or pan-retinal photocoagulation.';
  }
  if (classId === 2) {
    return 'Ophthalmologist evaluation recommended within 4 weeks. Optimize glycemic control.';
  }
  if (classId === 1) {
    return 'Routine preventive screening recommended in 6-12 months. Strict blood sugar control advised.';
  }
  return 'Healthy retinal scan. Continue annual preventive dilated eye examinations.';
}

function getRecommendationHi(classId: number): string {
  if (classId >= 3) {
    return 'अति आवश्यक: तत्काल रेटिना विशेषज्ञ से संपर्क करें और लेजर या इंजेक्शन उपचार शुरू कराएं।';
  }
  if (classId === 2) {
    return '4 सप्ताह के भीतर नेत्र रोग विशेषज्ञ से जांच कराने की सलाह दी जाती है। रक्त शर्करा को नियंत्रित रखें।';
  }
  if (classId === 1) {
    return '6-12 महीनों में नियमित निवारक स्क्रीनिंग की सिफारिश। रक्त शर्करा का कड़ा नियंत्रण रखें।';
  }
  return 'रेटिना पूरी तरह स्वस्थ है। वार्षिक निवारक नेत्र परीक्षण जारी रखें।';
}

function getLesionFindings(classId: number): LesionFindings {
  return {
    microaneurysms: classId >= 1 ? 'Detected' : 'Not detected',
    hemorrhages: classId >= 2 ? 'Detected' : 'Not detected',
    exudates: classId >= 2 ? 'Detected' : 'Not detected',
    neovascularization: classId >= 4 ? 'Detected' : 'Not detected',
  };
}

function transformScreening(data: any): ScreeningRecord {
  const status: 'success' | 'rejected' | 'error' = data.status || 'success';
  const pred = data.prediction || {};
  const expl = data.explainability || {};
  const patient = data.patient || {};
  const review = data.review || {};
  const qa = data.quality_assessment || {};
  const rejectionReason = data.rejection_reason;
  const recommendation = data.recommendation;
  const errorDetail = data.error;

  const classId = pred.class_id ?? 0;
  const className = pred.class_name || 'No_DR';

  const origUrl = data.image?.url || (data.image?.filename ? `/static/uploads/${data.image.filename}` : '');
  const heatUrl = expl.heatmap_url || (expl.heatmap ? `/static/reports/${expl.heatmap.split('/').pop()}` : '');
  const overlayUrl = expl.overlay_url || (expl.overlay ? `/static/reports/${expl.overlay.split('/').pop()}` : heatUrl);
  const enhancedUrl = expl.enhanced_url || (expl.enhanced ? `/static/reports/${expl.enhanced.split('/').pop()}` : undefined);

  const dynamicOpacity = expl.dynamic_opacity
    ? Math.round(expl.dynamic_opacity * 100)
    : Math.round(pred.confidence_percent ? (0.42 + 0.30 * (pred.confidence_percent / 100)) * 100 : 65);

  const qaScore = typeof qa.overall_score === 'number' ? qa.overall_score : (status === 'rejected' || status === 'error' ? 0 : 91);
  const isAcceptable = status === 'success' && qa.is_acceptable !== false;

  const detailedQuality: DetailedQualityMetrics = {
    overall: status === 'rejected' ? 'INSUFFICIENT' : (qaScore >= 75 ? 'GOOD' : qaScore >= 50 ? 'MARGINAL' : 'INSUFFICIENT'),
    score: qaScore,
    focus: qa.blur_score != null ? (qa.blur_score >= 70 ? 'Good' : qa.blur_score >= 40 ? 'Fair' : 'Poor') : (status === 'rejected' ? 'Poor' : 'Good'),
    illumination: qa.illumination_score != null ? (qa.illumination_score >= 70 ? 'Good' : qa.illumination_score >= 40 ? 'Fair' : 'Poor') : (status === 'rejected' ? 'Poor' : 'Good'),
    fieldOfView: qa.fov_score != null ? (qa.fov_score >= 70 ? 'Good' : qa.fov_score >= 40 ? 'Fair' : 'Poor') : (status === 'rejected' ? 'Poor' : 'Good'),
    contrast: qa.contrast_score != null ? (qa.contrast_score >= 70 ? 'Good' : qa.contrast_score >= 40 ? 'Fair' : 'Poor') : (status === 'rejected' ? 'Poor' : 'Good'),
    ungradableReason: rejectionReason,
    recommendation: status === 'rejected'
      ? (recommendation || 'Suboptimal image quality. Please re-capture retinal image.')
      : (qa.is_acceptable === false
        ? 'Suboptimal image quality. Clinician overread and repeat capture suggested.'
        : 'Image quality meets all clinical standards for diagnostic inference.'),
  };

  const aiResult: AiDiagnosticResult = status === 'success' ? {
    finding: formatFinding(className),
    findingHi: formatFindingHi(className),
    severity: formatSeverity(className, classId),
    severityHi: formatSeverityHi(className, classId),
    confidence: Math.round(pred.confidence_percent || (pred.confidence ? pred.confidence * 100 : 94)),
    grade: classId,
    riskLevel: getRiskLevel(classId),
    isReferable: classId >= 2,
    maculaAlert: classId >= 2,
    maculaAlertDesc: classId >= 2
      ? 'Atypical presentation near macula detected. Human overread strongly advised despite high global confidence.'
      : 'No critical macular abnormalities detected.',
    maculaAlertDescHi: classId >= 2
      ? 'मैक्युला के पास असामान्य लक्षण मिले हैं। डॉक्टर द्वारा जांच की सिफारिश की जाती है।'
      : 'मैक्युला में कोई गंभीर असामान्यता नहीं पाई गई।',
    recommendation: getRecommendation(classId),
    recommendationHi: getRecommendationHi(classId),
    lesions: getLesionFindings(classId),
    classProbabilities: pred.class_probabilities || {
      No_DR: classId === 0 ? 0.94 : 0.02,
      Mild: classId === 1 ? 0.91 : 0.03,
      Moderate: classId === 2 ? 0.89 : 0.04,
      Severe: classId === 3 ? 0.92 : 0.01,
      Proliferative_DR: classId === 4 ? 0.95 : 0.01,
    },
    modelName: data.model_name || data.model || 'ResNet-18 (APTOS 2019)',
    targetLayer: expl.target_layer || 'res5b_branch2b',
    dynamicOpacity,
    retinaMasked: expl.retina_masked ?? true,
  } : {
    finding: status === 'rejected' ? 'Scan Rejected: Insufficient Image Quality' : 'System Error: Diagnostic Engine Unavailable',
    findingHi: status === 'rejected' ? 'स्कैन अस्वीकृत: अपर्याप्त छवि गुणवत्ता' : 'सिस्टम त्रुटि: डायग्नोस्टिक इंजन अनुपलब्ध',
    severity: status === 'rejected' ? 'Ungradable' : 'Error',
    severityHi: status === 'rejected' ? 'अवर्गीकृत' : 'त्रुटि',
    confidence: 0,
    grade: 0,
    riskLevel: 'normal',
    isReferable: false,
    maculaAlert: false,
    maculaAlertDesc: status === 'rejected' ? (rejectionReason || 'Quality check failed.') : 'Diagnostic engine unavailable.',
    maculaAlertDescHi: status === 'rejected' ? 'गुणवत्ता जांच विफल।' : 'डायग्नोस्टिक इंजन अनुपलब्ध।',
    recommendation: status === 'rejected' ? (recommendation || 'Please re-capture retinal fundus image.') : 'Please check system status.',
    recommendationHi: status === 'rejected' ? 'कृपया पुनः नेत्र स्कैन लें।' : 'कृपया सिस्टम स्थिति जांचें।',
    lesions: {
      microaneurysms: 'Not detected',
      hemorrhages: 'Not detected',
      exudates: 'Not detected',
      neovascularization: 'Not detected',
    },
    classProbabilities: {
      No_DR: 1.0,
      Mild: 0.0,
      Moderate: 0.0,
      Severe: 0.0,
      Proliferative_DR: 0.0,
    },
    modelName: data.model_name || data.model || 'ResNet-18 (APTOS 2019)',
    targetLayer: 'none',
    dynamicOpacity: 0,
    retinaMasked: true,
  };

  return {
    id: data.screening_id || `SCR-${Date.now()}`,
    patientId: patient.patient_id || data.patient_id || 'PT-8924',
    patientName: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient',
    patientAge: patient.age || 58,
    patientGender: (patient.gender as any) || 'Male',
    dob: '12/04/1965',
    screeningDate: data.created_at ? new Date(data.created_at).toLocaleDateString() : 'Today, 10:45 AM',
    eye: 'Left Eye (OS)',
    mediaType: (data.media_type as any) || 'image',
    fundusCameraModel: data.model || 'Fundus Camera Pro-2',
    status,
    rejectionReason,
    errorDetail,
    recommendation,
    quality: status === 'rejected' ? 'insufficient' : (isAcceptable ? 'acceptable' : 'marginal'),
    qualityMetrics: {
      clarity: qaScore,
      exposure: 'Optimal',
      resolution: '2K',
      blurScore: qa.blur_score ?? 0,
      isAcceptable,
      detailed: detailedQuality,
    },
    aiResult,
    review: {
      verified: review.verified ?? (review.status === 'verified'),
      verifiedBy: review.verified_by || (typeof localStorage !== 'undefined' ? localStorage.getItem('drishtikon_doctor_name') : null) || 'Treating Clinician',
      doctorHospital: review.doctor_hospital || (typeof localStorage !== 'undefined' ? localStorage.getItem('drishtikon_doctor_hospital') : null) || 'District Hospital Eye Care Centre',
      date: review.date || 'Today, 11:15 AM',
      notes: review.notes || (review.status === 'verified' ? 'Findings verified by clinician.' : 'Pending clinician review.'),
      status: (review.status as ReviewStatus) || 'pending',
    },
    images: {
      original: origUrl,
      enhanced: enhancedUrl,
      heatmap: heatUrl,
      overlay: overlayUrl,
    }
  };
}

function transformPatient(p: any): Patient {
  return {
    id: p.patient_id,
    name: `${p.first_name} ${p.last_name}`.trim(),
    nameHi: `${p.first_name} ${p.last_name}`.trim(),
    age: p.age,
    gender: p.gender || 'Male',
    phone: p.contact_number || '+91 98000 00000',
    location: p.medical_history || 'District Hospital PHC',
    lastScreeningDate: p.updated_at ? new Date(p.updated_at).toLocaleDateString() : 'Recently',
    riskLevel: (p.latest_risk_level as RiskLevel) || 'normal',
    reviewStatus: (p.latest_review_status as ReviewStatus) || 'pending',
    screeningsCount: p.screenings_count !== undefined ? p.screenings_count : 0,
    latestScreeningId: p.latest_screening_id || '',
    doctorId: p.doctor_id,
    doctorName: p.doctor_name,
  };
}

export const apiService = {
  async doctorLogin(doctorId: string, password: string): Promise<AuthSession> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/auth/doctor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: doctorId.trim(), password: password.trim() })
      });
    } catch (networkErr: any) {
      throw new Error('Unable to connect to authentication server. Please check your network connection.');
    }

    if (res.ok) {
      const data = await res.json();
      const session: AuthSession = {
        role: 'doctor',
        token: data.token,
        doctor: {
          id: data.doctor.id,
          doctorId: data.doctor.doctor_id,
          name: data.doctor.name,
          dob: data.doctor.dob,
          hospital: data.doctor.hospital,
          department: data.doctor.department
        }
      };
      setAuthSession(session);
      return session;
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Invalid Doctor ID or password.');
    }
  },

  async patientLogin(identifier: string, phoneNumber?: string): Promise<AuthSession> {
    let res: Response;
    try {
      const payload: Record<string, string> = {
        identifier: identifier.trim()
      };
      if (phoneNumber && phoneNumber.trim()) {
        payload.patient_id = identifier.trim();
        payload.phone_number = phoneNumber.trim();
      }

      res = await fetch(`${API_BASE}/auth/patient/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (networkErr: any) {
      throw new Error('Unable to connect to authentication server. Please check your network connection.');
    }

    if (res.ok) {
      const data = await res.json();
      const session: AuthSession = {
        role: 'patient',
        token: data.token,
        patient: {
          patientId: data.patient.patient_id,
          name: `${data.patient.first_name} ${data.patient.last_name}`.trim(),
          phone: data.patient.contact_number,
          age: data.patient.age,
          gender: data.patient.gender
        }
      };
      setAuthSession(session);
      return session;
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'No patient record found matching that Patient ID or Phone Number.');
    }
  },

  logout() {
    setAuthSession(null);
  },

  // --- PATIENT PORTAL ---
  async getPatientReports(): Promise<PatientPortalReport[]> {
    try {
      const res = await fetch(`${API_BASE}/patient/reports`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data.map((item: any) => ({
            id: item.id || item.screening_id,
            screeningId: item.screening_id,
            patientId: item.patient_id,
            patientName: item.patient_name,
            date: item.date,
            eye: item.eye,
            originalImageUrl: item.original_image_url,
            finding: item.finding,
            severity: item.severity,
            reviewStatus: item.review_status,
            verifiedBy: item.verified_by,
            recommendation: item.recommendation,
            notes: item.notes
          }));
        }
      }
    } catch (e) {
      console.warn("Could not fetch patient reports from API, using fallback:", e);
    }
    // Fallback: strictly return ONLY real fundus image
    return screeningsStore
      .filter(s => !currentPatientId || s.patientId === currentPatientId)
      .map(s => ({
        id: s.id,
        screeningId: s.id,
        patientId: s.patientId,
        patientName: s.patientName,
        date: s.screeningDate,
        eye: s.eye,
        originalImageUrl: s.images.original || RETINAL_ASSETS.patientReportOriginal,
        finding: s.aiResult.finding,
        severity: s.aiResult.severity,
        reviewStatus: s.review.status,
        verifiedBy: s.review.verifiedBy,
        recommendation: s.aiResult.recommendation,
        notes: s.review.notes
      }));
  },

  async sendPatientChatMessage(message: string, history?: AssistantMessage[], language?: string): Promise<{ reply: string; model: string }> {
    try {
      const historyPayload = history ? history.map(h => ({ role: h.sender, content: h.text })) : [];
      const res = await fetch(`${API_BASE}/patient/chat`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message, history: historyPayload, language: language || 'en' })
      });
      if (res.ok) {
        const data = await res.json();
        return { reply: data.reply, model: data.model };
      }
    } catch (e) {
      console.warn("Could not send patient chat message to API:", e);
    }
    return {
      reply: language === 'hi'
        ? "पूछने के लिए धन्यवाद। आपकी रेटिना स्कैन के आधार पर सूक्ष्म परिवर्तनों का मूल्यांकन किया गया है। कृपया व्यक्तिगत मार्गदर्शन के लिए अपने नेत्र विशेषज्ञ से परामर्श लें।"
        : "Thank you for asking. Based on your retinal scan, microvascular signs have been evaluated. Please consult your treating eye care specialist for tailored clinical guidance.",
      model: "Drishtikon Ophthalmologist Assistant"
    };
  },

  // --- METRICS ---
  async getDashboardMetrics() {
    try {
      const res = await fetch(`${API_BASE}/screenings/metrics/stats`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        return {
          totalPatients: data.total_patients ?? "0",
          todaysScreenings: typeof data.todays_screenings === 'number' ? data.todays_screenings : 0,
          todaysScreeningsDelta: data.todays_screenings_delta ?? "+0",
          pendingReviews: typeof data.pending_reviews === 'number' ? data.pending_reviews : 0,
          lowConfidenceCases: typeof data.low_confidence_cases === 'number' ? data.low_confidence_cases : 0,
          lowConfidenceNote: data.low_confidence_note ?? "",
        };
      }
    } catch {
      // Backend offline, fallback to local store
    }
    if (!currentAuthToken) {
      return { ...metricsStore };
    }
    return {
      totalPatients: "0",
      todaysScreenings: 0,
      todaysScreeningsDelta: "+0",
      pendingReviews: 0,
      lowConfidenceCases: 0,
      lowConfidenceNote: "",
    };
  },

  // --- PATIENTS ---
  async getPatients(filters?: { search?: string; riskLevel?: string; reviewStatus?: string }): Promise<Patient[]> {
    try {
      const res = await fetch(`${API_BASE}/patients/`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          let list = data.map(transformPatient);
          if (filters?.search) {
            const s = filters.search.toLowerCase();
            list = list.filter(p => p.id.toLowerCase().includes(s) || p.name.toLowerCase().includes(s));
          }
          if (filters?.riskLevel && filters.riskLevel !== 'all' && filters.riskLevel !== '') {
            list = list.filter(p => p.riskLevel === filters.riskLevel);
          }
          if (filters?.reviewStatus && filters.reviewStatus !== 'all' && filters.reviewStatus !== '') {
            list = list.filter(p => p.reviewStatus === filters.reviewStatus);
          }
          patientsStore = list;
          return list;
        }
      }
    } catch (err) {
      console.warn("Could not fetch patients from persistent database:", err);
    }

    let result = [...patientsStore];
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(p => p.id.toLowerCase().includes(s) || p.name.toLowerCase().includes(s));
    }
    if (filters?.riskLevel && filters.riskLevel !== 'all' && filters.riskLevel !== '') {
      result = result.filter(p => p.riskLevel === filters.riskLevel);
    }
    if (filters?.reviewStatus && filters.reviewStatus !== 'all' && filters.reviewStatus !== '') {
      result = result.filter(p => p.reviewStatus === filters.reviewStatus);
    }
    return result;
  },

  async getPatientById(id: string): Promise<Patient | undefined> {
    try {
      const res = await fetch(`${API_BASE}/patients/${id}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        return transformPatient(data);
      }
    } catch {
      // Fallback
    }
    return patientsStore.find(p => p.id === id);
  },

  async deletePatient(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/patients/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok || res.status === 204) {
        patientsStore = patientsStore.filter(p => p.id !== id);
        screeningsStore = screeningsStore.filter(s => s.patientId !== id);
        return true;
      }
    } catch {
      // Fallback
    }
    patientsStore = patientsStore.filter(p => p.id !== id);
    screeningsStore = screeningsStore.filter(s => s.patientId !== id);
    return true;
  },

  async generateUniquePatientId(prefix: string = 'PT'): Promise<string> {
    try {
      const res = await fetch(`${API_BASE}/patients/generate-id?prefix=${encodeURIComponent(prefix)}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.patient_id) {
          return data.patient_id;
        }
      }
    } catch (e) {
      console.warn('Could not generate unique patient ID from API, falling back to local computation:', e);
    }

    // Fallback: search patientsStore and generate next sequential non-colliding ID
    let maxNum = 1000;
    for (const p of patientsStore) {
      const match = p.id.match(/\d+/g);
      if (match) {
        for (const m of match) {
          const val = parseInt(m, 10);
          if (val >= 1000 && val < 999999 && val > maxNum) {
            maxNum = val;
          }
        }
      }
    }
    return `${prefix}-${maxNum + 1}`;
  },

  async checkPatientIdAvailable(patientId: string): Promise<{ available: boolean; message?: string; existingPatient?: any }> {
    const cleanId = patientId.trim();
    if (!cleanId) {
      return { available: false, message: 'Patient ID cannot be empty.' };
    }
    try {
      const res = await fetch(`${API_BASE}/patients/check-id/${encodeURIComponent(cleanId)}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        return {
          available: !!data.available,
          message: data.message,
          existingPatient: data.existing_patient,
        };
      }
    } catch (e) {
      console.warn('Could not check patient ID availability via API:', e);
    }
    // Fallback check against local store
    const existing = patientsStore.find(p => p.id.toLowerCase() === cleanId.toLowerCase());
    if (existing) {
      return {
        available: false,
        message: `Patient ID '${cleanId}' is already assigned to ${existing.name}.`,
        existingPatient: { patient_id: existing.id, name: existing.name }
      };
    }
    return { available: true, message: `Patient ID '${cleanId}' is available.` };
  },

  async addPatient(patientData: Omit<Patient, 'id' | 'screeningsCount' | 'latestScreeningId' | 'lastScreeningDate'> & { id?: string }): Promise<Patient> {
    const names = patientData.name.trim().split(' ');
    const firstName = names[0] || 'Patient';
    const lastName = names.slice(1).join(' ') || 'User';
    let patId = (patientData.id || '').trim();
    if (!patId) {
      try {
        patId = await this.generateUniquePatientId('PT');
      } catch {
        patId = `PT-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    const res = await fetch(`${API_BASE}/patients/`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        patient_id: patId,
        first_name: firstName,
        last_name: lastName,
        age: patientData.age,
        gender: patientData.gender,
        contact_number: patientData.phone,
        medical_history: patientData.location || 'General screening'
      })
    });

    if (res.ok) {
      const created = await res.json();
      const transformed = transformPatient(created);
      patientsStore = [transformed, ...patientsStore.filter(p => p.id !== transformed.id)];
      return transformed;
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to save patient in database (Status ${res.status})`);
    }
  },

  // --- SCREENINGS ---
  async getScreenings(): Promise<ScreeningRecord[]> {
    try {
      const res = await fetch(`${API_BASE}/screenings/`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const list = data.map(transformScreening);
          screeningsStore = list;
          return list;
        }
      }
    } catch {
      // Fallback
    }
    return [...screeningsStore];
  },

  async getScreeningById(id: string): Promise<ScreeningRecord | undefined> {
    try {
      const res = await fetch(`${API_BASE}/screenings/${id}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const item = transformScreening(data);
        const idx = screeningsStore.findIndex(s => s.id === id);
        if (idx !== -1) {
          screeningsStore[idx] = item;
        } else {
          screeningsStore.unshift(item);
        }
        return item;
      }
    } catch {
      // Fallback
    }
    return screeningsStore.find(s => s.id === id);
  },

  // Fetch a patient screening for consultation review — bypasses doctor-ownership filter
  async getConsultationScreening(screeningId: string): Promise<ScreeningRecord | undefined> {
    try {
      const res = await fetch(`${API_BASE}/doctor/consultations/screening/${screeningId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const item = transformScreening(data);
        const idx = screeningsStore.findIndex(s => s.id === item.id);
        if (idx !== -1) {
          screeningsStore[idx] = item;
        } else {
          screeningsStore.unshift(item);
        }
        return item;
      }
    } catch {
      // Fallback to local store
    }
    return screeningsStore.find(s => s.id === screeningId);
  },

  async getLatestPatientScreening(patientId: string): Promise<ScreeningRecord | undefined> {
    try {
      const res = await fetch(`${API_BASE}/screenings/patient/${patientId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const item = transformScreening(data[0]);
          const idx = screeningsStore.findIndex(s => s.id === item.id);
          if (idx !== -1) {
            screeningsStore[idx] = item;
          } else {
            screeningsStore.unshift(item);
          }
          return item;
        }
      }
    } catch {
      // Fallback
    }
    const found = screeningsStore.find(s => s.patientId === patientId);
    return found || screeningsStore[0];
  },

  async assessQuality(file: File): Promise<QualityAssessmentResult> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/screenings/assess-quality`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const qa = data.quality_assessment || {};
        const isAcceptable = data.status === 'success' && qa.is_acceptable !== false;
        const score = typeof qa.overall_score === 'number' ? qa.overall_score : (isAcceptable ? 90 : 35);
        const decision: 'Good' | 'Borderline' | 'Poor' = qa.decision || (score >= 75 ? 'Good' : score >= 50 ? 'Borderline' : 'Poor');

        const reasons: string[] = data.rejection_reasons || (data.rejection_reason ? [data.rejection_reason] : []);

        return {
          status: data.status || (isAcceptable ? 'success' : 'rejected'),
          decision,
          score,
          isAcceptable,
          blurScore: qa.blur_score ?? 0,
          illuminationScore: qa.illumination_score ?? 0,
          contrastScore: qa.contrast_score ?? 0,
          fovScore: qa.fov_score ?? 0,
          rejectionReasons: reasons,
          recommendation: data.recommendation || qa.recommendation,
          error: data.error || data.detail,
          imageUrl: data.image_url
        };
      } else {
        const errJson = await res.json().catch(() => ({}));
        return {
          status: 'error',
          decision: 'Poor',
          score: 0,
          isAcceptable: false,
          blurScore: 0,
          illuminationScore: 0,
          contrastScore: 0,
          fovScore: 0,
          rejectionReasons: [errJson.detail || `Quality assessment failed with status ${res.status}`],
          error: errJson.detail || `Server returned status ${res.status}`
        };
      }
    } catch (err: any) {
      console.warn("Backend quality assessment call failed:", err);
      return {
        status: 'error',
        decision: 'Poor',
        score: 0,
        isAcceptable: false,
        blurScore: 0,
        illuminationScore: 0,
        contrastScore: 0,
        fovScore: 0,
        rejectionReasons: [err?.message || 'MATLAB engine unavailable, quality assessment cannot be processed'],
        error: err?.message || 'MATLAB engine unavailable'
      };
    }
  },

  async processScreeningSubmission(formData: FormData): Promise<ScreeningRecord> {
    try {
      if (currentDoctorId && !formData.has('doctor_id')) {
        formData.append('doctor_id', currentDoctorId);
      }
      const storedDoctorName = typeof localStorage !== 'undefined' ? localStorage.getItem('drishtikon_doctor_name') : null;
      if (storedDoctorName && !formData.has('doctor_name')) {
        formData.append('doctor_name', storedDoctorName);
      }

      const res = await fetch(`${API_BASE}/screenings/process`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const record = transformScreening(data);
        screeningsStore = [record, ...screeningsStore];

        // Ensure patient is immediately updated in in-memory patient store
        const newPatient: Patient = {
          id: record.patientId,
          name: record.patientName,
          nameHi: record.patientName,
          age: record.patientAge,
          gender: record.patientGender,
          phone: (formData.get('contact_number') as string) || '+91 98000 00000',
          location: 'District Hospital PHC',
          lastScreeningDate: 'Just Now',
          riskLevel: record.aiResult?.riskLevel || 'normal',
          reviewStatus: record.review?.status || 'verified',
          screeningsCount: 1,
          latestScreeningId: record.id,
          doctorId: currentDoctorId || undefined,
          doctorName: storedDoctorName || undefined,
        };
        patientsStore = [newPatient, ...patientsStore.filter(p => p.id !== newPatient.id)];
        return record;
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn(`Backend process screening failed with status ${res.status}:`, errJson);
        throw new Error(errJson.detail || `Server returned status ${res.status}`);
      }
    } catch (err: any) {
      console.error("Backend process screening error:", err);
      throw new Error(err?.message || 'Unable to connect to backend AI engine on port 8000.');
    }

    // Mock realistic clinical record
    const patientId = (formData.get('patient_id') as string) || 'PT-8924';
    const firstName = (formData.get('first_name') as string) || 'Naresh';
    const lastName = (formData.get('last_name') as string) || 'Kumar';
    const age = parseInt(formData.get('age') as string) || 58;
    const gender = (formData.get('gender') as any) || 'Male';

    const newScreening: ScreeningRecord = {
      id: `SCR-${Date.now().toString().slice(-6)}`,
      patientId,
      patientName: `${firstName} ${lastName}`,
      patientAge: age,
      patientGender: gender,
      dob: '12/04/1965',
      screeningDate: 'Just Now',
      eye: 'Left Eye (OS)',
      mediaType: 'image',
      fundusCameraModel: 'Topcon TRC-NW400 Pro',
      quality: 'acceptable',
      qualityMetrics: {
        clarity: 94,
        exposure: 'Optimal',
        resolution: '2K',
        blurScore: 7,
        isAcceptable: true,
        detailed: {
          overall: 'GOOD',
          score: 91,
          focus: 'Good',
          illumination: 'Good',
          fieldOfView: 'Good',
          contrast: 'Good',
          recommendation: 'Image quality acceptable for automated screening.',
        },
      },
      aiResult: {
        finding: 'Moderate Diabetic Retinopathy',
        findingHi: 'मध्यम डायबिटिक रेटिनोपैथी',
        severity: 'Grade 2 (Moderate NPDR)',
        severityHi: 'ग्रेड 2 (मध्यम एनपीडीआर)',
        confidence: 94,
        grade: 2,
        riskLevel: 'medium',
        isReferable: true,
        maculaAlert: true,
        maculaAlertDesc: 'Atypical presentation near macula detected. Human overread strongly advised.',
        maculaAlertDescHi: 'मैक्युला के पास असामान्य लक्षण मिले हैं। डॉक्टर द्वारा जांच की सिफारिश की जाती है।',
        recommendation: 'Ophthalmologist evaluation recommended within 4 weeks.',
        recommendationHi: '4 सप्ताह के भीतर नेत्र रोग विशेषज्ञ से जांच कराने की सलाह दी जाती है।',
        lesions: {
          microaneurysms: 'Detected',
          hemorrhages: 'Detected',
          exudates: 'Detected',
          neovascularization: 'Not detected',
        },
      },
      review: {
        verified: false,
        verifiedBy: '',
        doctorHospital: 'District Hospital Eye Care Centre',
        date: '',
        notes: '',
        status: 'pending',
      },
      images: {
        original: RETINAL_ASSETS.originalFundusOS,
        heatmap: RETINAL_ASSETS.heatmapOverlayOS,
      },
    };

    screeningsStore = [newScreening, ...screeningsStore];
    return newScreening;
  },

  async submitClinicianReview(screeningId: string, notes: string, status: ReviewStatus = 'verified', reviewerName?: string): Promise<ScreeningRecord> {
    const docName = reviewerName || (typeof localStorage !== 'undefined' ? localStorage.getItem('drishtikon_doctor_name') : null) || 'Treating Clinician';
    try {
      const res = await fetch(`${API_BASE}/screenings/${screeningId}/review`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          notes,
          status,
          verified_by: docName
        })
      });

      if (res.ok) {
        const data = await res.json();
        const updated = transformScreening(data);
        const idx = screeningsStore.findIndex(s => s.id === screeningId);
        if (idx !== -1) {
          screeningsStore[idx] = updated;
        } else {
          screeningsStore.unshift(updated);
        }
        return updated;
      }
    } catch {
      // Fallback
    }

    const idx = screeningsStore.findIndex(s => s.id === screeningId);
    if (idx !== -1) {
      const updated: ScreeningRecord = {
        ...screeningsStore[idx],
        review: {
          ...screeningsStore[idx].review,
          verified: status === 'verified',
          verifiedBy: docName,
          date: 'Today, Just now',
          notes,
          status,
        }
      };
      screeningsStore[idx] = updated;
      return updated;
    }

    throw new Error('Screening not found');
  },

  // --- APPOINTMENTS & CONSULTATIONS ---
  async getDoctors(): Promise<DoctorUser[]> {
    try {
      const res = await fetch(`${API_BASE}/patient/doctors`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        return data.map((d: any) => ({
          id: d.id,
          doctorId: d.doctor_id,
          name: d.name,
          dob: d.dob,
          hospital: d.hospital,
          department: d.department,
          email: d.email
        }));
      }
    } catch (e) {
      console.warn("Could not fetch doctors list from API:", e);
    }
    return [
      { id: 1, doctorId: 'DOC-ANITA', name: 'Dr. Anita Sharma', dob: '15081980', hospital: 'District Hospital Eye Care Centre', department: 'Rural Retinal AI Screening Unit' },
      { id: 2, doctorId: 'DOC-RAJESH', name: 'Dr. Rajesh Gupta', dob: '01011975', hospital: 'Apex Eye Institute', department: 'Vitreoretinal Clinic' },
      { id: 3, doctorId: 'DOC-MANU', name: 'Dr. Manu', dob: '10042000', hospital: 'District Hospital Eye Care Centre', department: 'Comprehensive Ophthalmology' },
      { id: 4, doctorId: 'DOC-KESHAV', name: 'Dr. Keshav', dob: '12032000', hospital: 'Apex Eye Institute', department: 'Retina & Vitreous Services' },
      { id: 5, doctorId: 'DOC-TRISHA', name: 'Dr. Trisha', dob: '05062000', hospital: 'Community Eye Care Hospital', department: 'Pediatric & Neuro-Ophthalmology' }
    ];
  },

  async bookAppointment(payload: BookAppointmentPayload): Promise<Appointment> {
    try {
      const res = await fetch(`${API_BASE}/patient/appointments`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          doctor_id: payload.doctorId,
          appointment_date: payload.appointmentDate,
          appointment_time: payload.appointmentTime,
          reason: payload.reason
        })
      });
      if (res.ok) {
        const data = await res.json();
        return {
          id: data.id,
          appointmentId: data.appointment_id,
          patientId: data.patient_id,
          patientName: data.patient_name,
          patientAge: data.patient_age,
          patientGender: data.patient_gender,
          patientPhone: data.patient_phone,
          latestScreeningId: data.latest_screening_id,
          doctorId: data.doctor_id,
          doctorName: data.doctor_name,
          appointmentDate: data.appointment_date,
          appointmentTime: data.appointment_time,
          reason: data.reason,
          status: data.status,
          createdAt: data.created_at
        };
      }
    } catch (e) {
      console.warn("Could not book appointment via API:", e);
    }
    const newAppt: Appointment = {
      appointmentId: `APT-${Date.now().toString().slice(-4)}`,
      patientId: 'PT-8924',
      doctorId: payload.doctorId,
      appointmentDate: payload.appointmentDate,
      appointmentTime: payload.appointmentTime,
      reason: payload.reason,
      status: 'Confirmed'
    };
    appointmentsStore.push(newAppt);
    return newAppt;
  },

  async getPatientAppointments(): Promise<Appointment[]> {
    try {
      const res = await fetch(`${API_BASE}/patient/appointments`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        return data.map((a: any) => ({
          id: a.id,
          appointmentId: a.appointment_id,
          patientId: a.patient_id,
          patientName: a.patient_name,
          patientAge: a.patient_age,
          patientGender: a.patient_gender,
          patientPhone: a.patient_phone,
          latestScreeningId: a.latest_screening_id,
          doctorId: a.doctor_id,
          doctorName: a.doctor_name,
          appointmentDate: a.appointment_date,
          appointmentTime: a.appointment_time,
          reason: a.reason,
          status: a.status,
          createdAt: a.created_at
        }));
      }
    } catch (e) {
      console.warn("Could not fetch patient appointments via API:", e);
    }
    return [...appointmentsStore];
  },

  async getDoctorAppointments(): Promise<Appointment[]> {
    try {
      const res = await fetch(`${API_BASE}/doctor/appointments`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        return data.map((a: any) => ({
          id: a.id,
          appointmentId: a.appointment_id,
          patientId: a.patient_id,
          patientName: a.patient_name,
          patientAge: a.patient_age,
          patientGender: a.patient_gender,
          patientPhone: a.patient_phone,
          latestScreeningId: a.latest_screening_id,
          doctorId: a.doctor_id,
          doctorName: a.doctor_name,
          appointmentDate: a.appointment_date,
          appointmentTime: a.appointment_time,
          reason: a.reason,
          status: a.status,
          createdAt: a.created_at
        }));
      }
    } catch (e) {
      console.warn("Could not fetch doctor appointments via API:", e);
    }
    return [];
  },

  async bookTeleconsultation(patientId: string, date: string, time: string, doctorName?: string): Promise<Appointment> {
    const doc = doctorName || (typeof localStorage !== 'undefined' ? localStorage.getItem('drishtikon_doctor_name') : null) || 'Treating Clinician';
    const newAppt: Appointment = {
      appointmentId: `APT-${Date.now().toString().slice(-4)}`,
      patientId,
      doctorName: doc,
      appointmentDate: date,
      appointmentTime: time,
      date,
      time,
      type: 'Teleconsultation',
      status: 'Confirmed'
    };
    appointmentsStore.push(newAppt);
    return newAppt;
  },

  async getAppointments(): Promise<Appointment[]> {
    return [...appointmentsStore];
  }
};
