export type PortalMode = 'doctor' | 'patient';

export type DoctorTab = 
  | 'dashboard'
  | 'patient-queue'
  | 'upload-images'
  | 'ai-analysis'
  | 'reports'
  | 'help'
  | 'settings';

export type PatientTab = 
  | 'home'
  | 'my-results'
  | 'consult'
  | 'profile';

export type Language = 'en' | 'hi';

export type RiskLevel = 'high' | 'medium' | 'low' | 'normal';
export type ReviewStatus = 'verified' | 'pending' | 'review_required' | 'processing';
export type ImageQualityStatus = 'acceptable' | 'marginal' | 'insufficient';

export interface QualityMetrics {
  clarity: number; // percentage (e.g. 94)
  exposure: 'Optimal' | 'Underexposed' | 'Overexposed';
  resolution: '2K' | '1080p' | 'Low';
  blurScore: number; // percentage (e.g. 12)
  isAcceptable: boolean;
}

export interface AiDiagnosticResult {
  finding: string;
  findingHi: string;
  severity: string;
  severityHi: string;
  confidence: number; // e.g. 94
  grade: number; // e.g. 2 for Grade 2 Moderate NPDR
  riskLevel: RiskLevel;
  maculaAlert: boolean;
  maculaAlertDesc: string;
  maculaAlertDescHi: string;
  recommendation: string;
  recommendationHi: string;
}

export interface ClinicianReview {
  verified: boolean;
  verifiedBy: string;
  doctorHospital: string;
  date: string;
  notes: string;
  status: ReviewStatus;
}

export interface ScreeningRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: 'Male' | 'Female' | 'Other';
  dob: string;
  screeningDate: string;
  eye: 'Left Eye (OS)' | 'Right Eye (OD)' | 'Both Eyes';
  fundusCameraModel: string;
  quality: ImageQualityStatus;
  qualityMetrics: QualityMetrics;
  aiResult: AiDiagnosticResult;
  review: ClinicianReview;
  images: {
    original: string;
    heatmap: string;
    rightEyeOriginal?: string;
    rightEyeHeatmap?: string;
  };
}

export interface Patient {
  id: string;
  name: string;
  nameHi?: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  location: string;
  lastScreeningDate: string;
  riskLevel: RiskLevel;
  reviewStatus: ReviewStatus;
  screeningsCount: number;
  latestScreeningId: string;
}

export interface CareGuideline {
  id: string;
  title: string;
  titleHi: string;
  description: string;
  descriptionHi: string;
  icon: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorName: string;
  date: string;
  time: string;
  type: 'Teleconsultation' | 'In-Person Examination';
  status: 'Confirmed' | 'Pending' | 'Completed';
}
