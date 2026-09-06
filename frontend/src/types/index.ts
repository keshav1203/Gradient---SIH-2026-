export type PortalMode = 'doctor' | 'patient';

export type DoctorTab = 
  | 'dashboard'
  | 'patient-queue'
  | 'upload-images'
  | 'approve-reports'
  | 'reports'
  | 'help'
  | 'settings'
  | 'ai-analysis';

export type PatientTab = 
  | 'home'
  | 'my-results'
  | 'consult'
  | 'profile';

export type Language = 'en' | 'hi';

export type RiskLevel = 'high' | 'medium' | 'low' | 'normal';
export type ReviewStatus = 'verified' | 'pending' | 'review_required' | 'processing';
export type ImageQualityStatus = 'acceptable' | 'marginal' | 'insufficient';

export type WorkflowStageId = 
  | 'quality'
  | 'enhancement'
  | 'analysis'
  | 'classification'
  | 'explainability'
  | 'report';

export type WorkflowStageStatus = 'waiting' | 'processing' | 'completed' | 'failed';

export interface WorkflowStage {
  id: WorkflowStageId;
  name: string;
  nameHi: string;
  status: WorkflowStageStatus;
  detail?: string;
}

export interface DetailedQualityMetrics {
  overall: 'GOOD' | 'MARGINAL' | 'INSUFFICIENT';
  score: number; // e.g. 91
  focus: 'Good' | 'Fair' | 'Poor';
  illumination: 'Good' | 'Fair' | 'Poor';
  fieldOfView: 'Good' | 'Fair' | 'Poor';
  contrast: 'Good' | 'Fair' | 'Poor';
  ungradableReason?: string;
  recommendation?: string;
}

export interface QualityAssessmentResult {
  status: 'success' | 'rejected' | 'error';
  decision: 'Good' | 'Borderline' | 'Poor';
  score: number;
  isAcceptable: boolean;
  blurScore: number;
  illuminationScore: number;
  contrastScore: number;
  fovScore: number;
  rejectionReasons: string[];
  recommendation?: string;
  error?: string;
  imageUrl?: string;
}

export interface LesionFindings {
  microaneurysms: 'Detected' | 'Not detected';
  hemorrhages: 'Detected' | 'Not detected';
  exudates: 'Detected' | 'Not detected';
  neovascularization: 'Detected' | 'Not detected';
}

export interface QualityMetrics {
  clarity: number; // percentage (e.g. 94)
  exposure: 'Optimal' | 'Underexposed' | 'Overexposed';
  resolution: '2K' | '1080p' | 'Low';
  blurScore: number; // percentage (e.g. 12)
  isAcceptable: boolean;
  detailed?: DetailedQualityMetrics;
}

export interface AiDiagnosticResult {
  finding: string;
  findingHi: string;
  severity: string;
  severityHi: string;
  confidence: number; // e.g. 94
  grade: number; // 0 to 4
  riskLevel: RiskLevel;
  isReferable: boolean;
  maculaAlert: boolean;
  maculaAlertDesc: string;
  maculaAlertDescHi: string;
  recommendation: string;
  recommendationHi: string;
  lesions: LesionFindings;
  classProbabilities?: Record<string, number>;
  modelName?: string;
  targetLayer?: string;
  dynamicOpacity?: number;
  retinaMasked?: boolean;
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
  mediaType?: 'image' | 'video';
  status?: 'success' | 'rejected' | 'error';
  rejectionReason?: string;
  errorDetail?: string;
  recommendation?: string;
  fundusCameraModel: string;
  quality: ImageQualityStatus;
  qualityMetrics: QualityMetrics;
  aiResult: AiDiagnosticResult;
  review: ClinicianReview;
  images: {
    original: string;
    enhanced?: string;
    heatmap: string;
    overlay?: string;
    lesionOverlay?: string;
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
  doctorId?: string;
  doctorName?: string;
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

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface DoctorUser {
  id: number | string;
  doctorId: string;
  name: string;
  dob: string;
  hospital?: string;
  department?: string;
}

export interface PatientUser {
  id?: number | string;
  patientId: string;
  name: string;
  phone: string;
  age?: number;
  gender?: string;
}

export interface AuthSession {
  role: 'doctor' | 'patient';
  token: string;
  doctor?: DoctorUser;
  patient?: PatientUser;
}

export interface PatientPortalReport {
  id: string;
  screeningId: string;
  patientId: string;
  patientName: string;
  date: string;
  eye: string;
  originalImageUrl: string;
  finding: string;
  severity: string;
  reviewStatus: string;
  verifiedBy?: string;
  recommendation?: string;
  notes?: string;
}
