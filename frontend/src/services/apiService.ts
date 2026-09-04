import { Patient, ScreeningRecord, ReviewStatus, Appointment } from '../types';
import { INITIAL_PATIENTS, INITIAL_SCREENINGS, INITIAL_METRICS } from '../data/mockData';

// Local in-memory state simulating a backend REST store
let patientsStore: Patient[] = [...INITIAL_PATIENTS];
let screeningsStore: ScreeningRecord[] = [...INITIAL_SCREENINGS];
let metricsStore = { ...INITIAL_METRICS };
let appointmentsStore: Appointment[] = [
  {
    id: 'APT-101',
    patientId: 'PT-8924',
    doctorName: 'Dr. Anita',
    date: 'Tomorrow, 11:00 AM',
    time: '11:00 AM',
    type: 'Teleconsultation',
    status: 'Confirmed'
  }
];

export const apiService = {
  // --- METRICS ---
  async getDashboardMetrics() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ ...metricsStore });
      }, 100);
    });
  },

  // --- PATIENTS ---
  async getPatients(filters?: { search?: string; riskLevel?: string; reviewStatus?: string }): Promise<Patient[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
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
        resolve(result);
      }, 120);
    });
  },

  async getPatientById(id: string): Promise<Patient | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(patientsStore.find(p => p.id === id));
      }, 80);
    });
  },

  async addPatient(patientData: Omit<Patient, 'id' | 'screeningsCount' | 'latestScreeningId' | 'lastScreeningDate'>): Promise<Patient> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const nextNum = patientsStore.length + 1;
        const newPatient: Patient = {
          ...patientData,
          id: `RR-00${nextNum}`,
          lastScreeningDate: 'Just Added',
          screeningsCount: 0,
          latestScreeningId: '',
        };
        patientsStore = [newPatient, ...patientsStore];
        metricsStore.totalPatients = (parseInt(metricsStore.totalPatients.replace(',', '')) + 1).toLocaleString();
        resolve(newPatient);
      }, 200);
    });
  },

  // --- SCREENINGS ---
  async getScreenings(): Promise<ScreeningRecord[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...screeningsStore]);
      }, 100);
    });
  },

  async getScreeningById(id: string): Promise<ScreeningRecord | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(screeningsStore.find(s => s.id === id));
      }, 80);
    });
  },

  async getLatestPatientScreening(patientId: string): Promise<ScreeningRecord | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const found = screeningsStore.find(s => s.patientId === patientId);
        resolve(found || screeningsStore[0]);
      }, 80);
    });
  },

  async submitClinicianReview(screeningId: string, notes: string, status: ReviewStatus = 'verified'): Promise<ScreeningRecord> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const idx = screeningsStore.findIndex(s => s.id === screeningId);
        if (idx === -1) {
          reject(new Error('Screening not found'));
          return;
        }
        const updated: ScreeningRecord = {
          ...screeningsStore[idx],
          review: {
            ...screeningsStore[idx].review,
            verified: status === 'verified',
            verifiedBy: 'Dr. Anita',
            date: 'Today, Just now',
            notes,
            status,
          }
        };
        screeningsStore[idx] = updated;
        if (metricsStore.pendingReviews > 0) {
          metricsStore.pendingReviews -= 1;
        }
        resolve(updated);
      }, 200);
    });
  },

  async simulateImageAssessment(_fileOrUrl?: string, _eye?: string): Promise<{ clarity: number; exposure: 'Optimal' | 'Underexposed' | 'Overexposed'; resolution: '2K' | '1080p'; isAcceptable: boolean }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Return optimal quality assessment
        resolve({
          clarity: 94,
          exposure: 'Optimal',
          resolution: '2K',
          isAcceptable: true,
        });
      }, 600);
    });
  },

  // --- APPOINTMENTS ---
  async bookTeleconsultation(patientId: string, date: string, time: string): Promise<Appointment> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newAppt: Appointment = {
          id: `APT-${Date.now().toString().slice(-4)}`,
          patientId,
          doctorName: 'Dr. Anita',
          date,
          time,
          type: 'Teleconsultation',
          status: 'Confirmed'
        };
        appointmentsStore.push(newAppt);
        resolve(newAppt);
      }, 250);
    });
  },

  async getAppointments(): Promise<Appointment[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...appointmentsStore]);
      }, 80);
    });
  }
};
