import React, { useState, useEffect } from 'react';
import { usePortal } from '../../context/PortalContext';
import { apiService } from '../../services/apiService';
import { Patient } from '../../types';

export const PatientQueueView: React.FC = () => {
  const {
    setIsAddPatientModalOpen,
    navigateToPatientReport,
    showToast,
    language,
  } = usePortal();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getPatients({
        search,
        riskLevel: riskFilter,
      });
      setPatients(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [search, riskFilter]);

  const handleDeletePatient = async (patient: Patient) => {
    setIsDeleting(true);
    try {
      await apiService.deletePatient(patient.id);
      setPatients(prev => prev.filter(p => p.id !== patient.id));
      showToast(
        language === 'hi'
          ? `मरीज रिकॉर्ड #${patient.id} सफलतापूर्वक हटाया गया`
          : `Patient #${patient.id} (${patient.name}) removed from queue.`
      );
      setPatientToDelete(null);
    } catch {
      showToast('Error removing patient record');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-stack-lg max-w-7xl mx-auto w-full">
      {/* Page Header & Actions */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-bold">
            {language === 'hi' ? 'मरीज कतार' : 'Patient Queue'}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {language === 'hi'
              ? 'मरीजों की स्क्रीनिंग का प्रबंधन और समीक्षा करें।'
              : 'Manage and review patient screenings.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddPatientModalOpen(true)}
            className="h-touch-target-min px-6 rounded-lg bg-primary text-white font-label-md text-label-md shadow-sm hover:bg-primary-container transition-all active:scale-95 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            <span>{language === 'hi' ? 'नया मरीज जोड़ें' : 'Add New Patient'}</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-surface-container-lowest rounded-xl shadow-[0_2px_8px_rgba(7,59,76,0.05)] p-4 border border-surface-container flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'hi' ? 'मरीज आईडी या नाम से खोजें...' : 'Search by Patient ID or Name...'}
            className="w-full h-touch-target-min pl-11 pr-4 rounded-lg border border-secondary-fixed bg-surface text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-primary"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Dropdown Filter */}
        <div className="flex flex-wrap sm:flex-nowrap gap-3">
          <div className="relative flex-1 sm:w-48">
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full h-touch-target-min px-4 appearance-none rounded-lg border border-secondary-fixed bg-surface text-on-surface focus:border-primary outline-none font-label-md text-sm pr-10 cursor-pointer"
            >
              <option value="">{language === 'hi' ? 'जोखिम: सभी' : 'Risk Level: All'}</option>
              <option value="high">{language === 'hi' ? 'उच्च जोखिम' : 'High Risk'}</option>
              <option value="medium">{language === 'hi' ? 'मध्यम जोखिम' : 'Medium Risk'}</option>
              <option value="low">{language === 'hi' ? 'कम जोखिम' : 'Low Risk'}</option>
              <option value="normal">{language === 'hi' ? 'सामान्य' : 'Normal'}</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">
              expand_more
            </span>
          </div>
        </div>
      </div>

      {/* Patient Table Card */}
      <div className="bg-surface-container-lowest rounded-xl shadow-[0_2px_8px_rgba(7,59,76,0.05)] border border-surface-container overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-secondary-fixed text-on-surface-variant font-label-md text-xs font-bold uppercase tracking-wider">
                <th className="p-4">Patient ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Age</th>
                <th className="p-4">Last Screening</th>
                <th className="p-4">Risk Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-fixed/50 font-body-md text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined animate-spin text-primary text-[28px]">
                      sync
                    </span>
                    <p className="text-xs mt-2">Loading patients...</p>
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[36px] text-outline">search_off</span>
                    <p className="font-semibold text-sm mt-1">No patients match the search criteria.</p>
                  </td>
                </tr>
              ) : (
                patients.map((patient) => {
                  const isHigh = patient.riskLevel === 'high';
                  const isMedium = patient.riskLevel === 'medium';

                  return (
                    <tr key={patient.id} className="hover:bg-surface-bright transition-colors">
                      {/* ID */}
                      <td className="p-4 font-bold text-primary">{patient.id}</td>

                      {/* Name */}
                      <td className="p-4 font-medium text-on-surface">
                        {language === 'hi' && patient.nameHi ? patient.nameHi : patient.name}
                        <div className="text-[11px] text-on-surface-variant">{patient.phone}</div>
                      </td>

                      {/* Age */}
                      <td className="p-4 text-on-surface-variant">{patient.age} yrs ({patient.gender.slice(0, 1)})</td>

                      {/* Last Screening */}
                      <td className="p-4 text-on-surface-variant">{patient.lastScreeningDate}</td>

                      {/* Risk */}
                      <td className="p-4">
                        {isHigh && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-error"></span>
                            High
                          </span>
                        )}
                        {isMedium && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF3E0] text-[#E65100] font-label-sm text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-[#FF9800]"></span>
                            Medium
                          </span>
                        )}
                        {!isHigh && !isMedium && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-surface-tint"></span>
                            Low
                          </span>
                        )}
                      </td>

                      {/* Action Buttons: Test Report + Delete */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigateToPatientReport(patient.latestScreeningId)}
                            className="h-[38px] px-3.5 rounded-lg border border-primary text-primary hover:bg-primary/10 font-label-md text-xs font-bold transition-all active:scale-95 inline-flex items-center gap-1.5 shadow-2xs"
                            title="View Test Report"
                          >
                            <span className="material-symbols-outlined text-[16px]">description</span>
                            <span>{language === 'hi' ? 'टेस्ट रिपोर्ट' : 'Test Report'}</span>
                          </button>

                          <button
                            onClick={() => setPatientToDelete(patient)}
                            className="h-[38px] w-[38px] rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white font-label-md text-xs font-bold transition-all active:scale-95 flex items-center justify-center shadow-2xs"
                            title={language === 'hi' ? 'मरीज रिकॉर्ड हटाएं' : 'Remove Patient'}
                            aria-label="Remove patient"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="border-t border-secondary-fixed/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-container-lowest">
          <span className="font-body-md text-xs text-on-surface-variant">
            Showing {patients.length > 0 ? 1 : 0} to {patients.length} of {patients.length} entries
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-9 h-9 rounded-lg border border-secondary-fixed flex items-center justify-center text-outline hover:bg-surface-container-high transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              onClick={() => setCurrentPage(1)}
              className={`w-9 h-9 rounded-lg font-label-md text-xs font-bold flex items-center justify-center ${
                currentPage === 1
                  ? 'bg-primary-container text-white shadow-sm'
                  : 'border border-secondary-fixed text-on-surface hover:bg-surface-container-high'
              }`}
            >
              1
            </button>
          </div>
        </div>
      </div>

      {/* Remove Patient Confirmation Modal */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-full">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <h3 className="font-bold text-lg text-on-surface">
                {language === 'hi' ? 'मरीज रिकॉर्ड हटाएं?' : 'Remove Patient Record?'}
              </h3>
            </div>
            
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {language === 'hi'
                ? `क्या आप वाकई मरीज ID #${patientToDelete.id} (${patientToDelete.name}) को कतार से हटाना चाहते हैं? यह कार्रवाई पूर्ववत नहीं की जा सकती।`
                : `Are you sure you want to remove Patient ID #${patientToDelete.id} (${patientToDelete.name}) from the queue? This will permanently delete all associated records.`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPatientToDelete(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container text-xs font-bold transition-colors"
              >
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDeletePatient(patientToDelete)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>{isDeleting ? (language === 'hi' ? 'हटाया जा रहा है...' : 'Removing...') : (language === 'hi' ? 'हटाएं' : 'Confirm Remove')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
