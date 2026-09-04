import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { apiService } from '../../services/apiService';
import { RiskLevel, ReviewStatus } from '../../types';

interface AddPatientModalProps {
  onPatientAdded?: () => void;
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({ onPatientAdded }) => {
  const { isAddPatientModalOpen, setIsAddPatientModalOpen, showToast, language } = usePortal();

  const [formData, setFormData] = useState({
    name: '',
    nameHi: '',
    age: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    phone: '',
    location: 'District Hospital OPD',
    riskLevel: 'medium' as RiskLevel,
    reviewStatus: 'pending' as ReviewStatus,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAddPatientModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.age) {
      showToast('Please fill in required fields (Name & Age)');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiService.addPatient({
        name: formData.name,
        nameHi: formData.nameHi || formData.name,
        age: parseInt(formData.age) || 45,
        gender: formData.gender,
        phone: formData.phone || '+91 98000 00000',
        location: formData.location,
        riskLevel: formData.riskLevel,
        reviewStatus: formData.reviewStatus,
      });

      showToast(language === 'hi' ? 'नया मरीज सफलतापूर्वक जोड़ा गया' : `Patient ${formData.name} added to queue`);
      setIsAddPatientModalOpen(false);
      setFormData({
        name: '',
        nameHi: '',
        age: '',
        gender: 'Male',
        phone: '',
        location: 'District Hospital OPD',
        riskLevel: 'medium',
        reviewStatus: 'pending',
      });
      if (onPatientAdded) onPatientAdded();
    } catch {
      showToast('Failed to add patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 bg-surface-bright border-b border-surface-container flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary-container text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-primary font-bold">
                {language === 'hi' ? 'नया मरीज जोड़ें' : 'Add New Patient'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {language === 'hi' ? 'नैदानिक कतार में विवरण दर्ज करें' : 'Enter clinical intake details for screening'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAddPatientModalOpen(false)}
            aria-label="Close modal"
            className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1" htmlFor="patient-name">
              Full Name *
            </label>
            <input
              id="patient-name"
              type="text"
              required
              placeholder="e.g. Ramesh Chandra"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-11 px-3.5 rounded-lg border border-secondary-fixed bg-surface text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1" htmlFor="patient-age">
                Age *
              </label>
              <input
                id="patient-age"
                type="number"
                required
                placeholder="e.g. 52"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full h-11 px-3.5 rounded-lg border border-secondary-fixed bg-surface text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1" htmlFor="patient-gender">
                Gender
              </label>
              <select
                id="patient-gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full h-11 px-3.5 rounded-lg border border-secondary-fixed bg-surface text-on-surface focus:border-primary outline-none text-sm cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1" htmlFor="patient-phone">
              Contact Number
            </label>
            <input
              id="patient-phone"
              type="tel"
              placeholder="+91 98XXX XXXXX"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full h-11 px-3.5 rounded-lg border border-secondary-fixed bg-surface text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1" htmlFor="patient-location">
              Clinic / Location Center
            </label>
            <input
              id="patient-location"
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full h-11 px-3.5 rounded-lg border border-secondary-fixed bg-surface text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1" htmlFor="patient-risk">
                Initial Risk Level
              </label>
              <select
                id="patient-risk"
                value={formData.riskLevel}
                onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value as RiskLevel })}
                className="w-full h-11 px-3.5 rounded-lg border border-secondary-fixed bg-surface text-on-surface focus:border-primary outline-none text-sm cursor-pointer"
              >
                <option value="high">High Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="low">Low Risk</option>
                <option value="normal">Normal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1" htmlFor="patient-status">
                Queue Status
              </label>
              <select
                id="patient-status"
                value={formData.reviewStatus}
                onChange={(e) => setFormData({ ...formData, reviewStatus: e.target.value as ReviewStatus })}
                className="w-full h-11 px-3.5 rounded-lg border border-secondary-fixed bg-surface text-on-surface focus:border-primary outline-none text-sm cursor-pointer"
              >
                <option value="pending">Pending AI</option>
                <option value="review_required">Review Required</option>
                <option value="verified">Verified</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setIsAddPatientModalOpen(false)}
              className="flex-1 h-11 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high font-label-md text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-11 rounded-lg bg-primary text-white hover:bg-primary-container font-label-md text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  Saving...
                </>
              ) : (
                'Add to Queue'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
