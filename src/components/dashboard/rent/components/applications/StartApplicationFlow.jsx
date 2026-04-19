import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  validateApplicationDocument,
  validateApplicationProfile
} from '../../../../shared/utils/tenantValidation';

const INITIAL_FORM = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  sex: '',
  maritalStatus: '',
  occupants: '1',
  occupation: '',
  employed: 'yes',
  notes: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelationship: '',
  emergencyEmail: ''
};

const MAX_DOC_PREVIEW_BYTES = 350 * 1024;

const StartApplicationFlow = ({ application, onSaveDraft, onProceed, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [docs, setDocs] = useState({
    governmentIdFileName: '',
    governmentIdPreview: '',
    governmentIdMimeType: ''
  });
  const [step, setStep] = useState(Number(application?.applicationStep || 1));
  const [profileErrors, setProfileErrors] = useState({});
  const [documentErrors, setDocumentErrors] = useState({});

  useEffect(() => {
    const profile = application?.applicantProfile || {};
    setFormData({
      ...INITIAL_FORM,
      ...profile,
      fullName: profile.fullName || user?.name || '',
      email: profile.email || user?.email || '',
      phone: profile.phone || user?.phone || ''
    });
    setDocs({
      governmentIdFileName: application?.applicantDocs?.governmentIdFileName || '',
      governmentIdPreview: application?.applicantDocs?.governmentIdPreview || '',
      governmentIdMimeType: application?.applicantDocs?.governmentIdMimeType || ''
    });
    setStep(Number(application?.applicationStep || 1));
    setProfileErrors({});
    setDocumentErrors({});
  }, [application?.id, user?.name, user?.email, user?.phone]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setProfileErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleDocPick = (file) => {
    setDocumentErrors((prev) => {
      if (!prev.governmentIdFileName) return prev;
      const next = { ...prev };
      delete next.governmentIdFileName;
      return next;
    });
    if (!file) {
      setDocs((prev) => ({
        ...prev,
        governmentIdFileName: '',
        governmentIdPreview: '',
        governmentIdMimeType: ''
      }));
      return;
    }
    const baseNext = {
      governmentIdFileName: file.name || '',
      governmentIdPreview: '',
      governmentIdMimeType: file.type || ''
    };

    if (file.size > MAX_DOC_PREVIEW_BYTES) {
      setDocs((prev) => ({ ...prev, ...baseNext }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      setDocs((prev) => ({
        ...prev,
        ...baseNext,
        governmentIdPreview: dataUrl
      }));
    };
    reader.onerror = () => {
      setDocs((prev) => ({ ...prev, ...baseNext }));
    };
    reader.readAsDataURL(file);
  };

  const persistDraft = (nextStep = step) => {
    onSaveDraft?.(application.id, {
      formData,
      documents: docs,
      step: nextStep
    });
  };

  const getInputClass = (field) =>
    `mt-2 border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#0e1f42]/40 ${
      profileErrors[field] ? 'border-red-500' : 'border-gray-200'
    }`;

  const renderFieldError = (field) =>
    profileErrors[field] ? (
      <span className="mt-1 text-xs font-medium text-red-600">{profileErrors[field]}</span>
    ) : null;

  const handleProceed = () => {
    const validationErrors = validateApplicationDocument(docs);
    if (Object.keys(validationErrors).length > 0) {
      setDocumentErrors(validationErrors);
      return;
    }
    setDocumentErrors({});
    persistDraft(3);
    setStep(3);
    onProceed?.(formData);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border-color,#e2e8f0)] bg-[var(--card-bg,#ffffff)] p-4">
        <div className="relative flex items-center justify-between gap-2">
          <div className="absolute left-0 right-0 top-4 h-[2px] bg-[var(--border-color,#e2e8f0)]" />
          {[
            { id: 1, label: 'Form' },
            { id: 2, label: 'Documents' },
            { id: 3, label: 'Payment' }
          ].map((item) => {
            const isComplete = step > item.id;
            const isActive = step === item.id;
            return (
              <div key={item.id} className="relative z-[1] flex flex-col items-center gap-1 min-w-0 flex-1">
                <div
                  className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                    isComplete || isActive
                      ? 'border-[var(--accent-color,#9f7539)] bg-[var(--accent-color,#9f7539)] text-white'
                      : 'border-[var(--border-color,#e2e8f0)] bg-[var(--card-bg,#ffffff)] text-[var(--text-muted,#98a2b3)]'
                  }`}
                >
                  {item.id}
                </div>
                <div
                  className={`text-xs font-semibold ${
                    isComplete || isActive
                      ? 'text-[var(--accent-color,#9f7539)]'
                      : 'text-[var(--text-muted,#98a2b3)]'
                  }`}
                >
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 relative">

      <div className="space-y-7">
        {step === 1 && (
          <>
            <section className="space-y-4">
              <p className="text-sm font-semibold text-[#0e1f42] border-b border-[#f1f5f9] pb-3">Personal Information</p>
              <div className="grid md:grid-cols-3 gap-4">
                <label className="flex flex-col text-sm text-[#475467]">
                  Full Name
                  <input
                    value={formData.fullName}
                    onChange={(e) => handleFieldChange('fullName', e.target.value)}
                    className={getInputClass('fullName')}
                  />
                  {renderFieldError('fullName')}
                </label>
                <label className="flex flex-col text-sm text-[#475467]">
                  Email Address
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    className={getInputClass('email')}
                  />
                  {renderFieldError('email')}
                </label>
                <label className="flex flex-col text-sm text-[#475467]">
                  Phone Number
                  <input
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    placeholder="+234 000 000 0000"
                    className={getInputClass('phone')}
                  />
                  {renderFieldError('phone')}
                </label>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <label className="flex flex-col text-sm text-[#475467]">
                  Date of Birth
                  <input
                    type="date"
                    lang="en-GB"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                    className={getInputClass('dateOfBirth')}
                  />
                  {renderFieldError('dateOfBirth')}
                </label>
                <label className="flex flex-col text-sm text-[#475467]">
                  Sex
                  <select
                    value={formData.sex}
                    onChange={(e) => handleFieldChange('sex', e.target.value)}
                    className={getInputClass('sex')}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {renderFieldError('sex')}
                </label>
                <label className="flex flex-col text-sm text-[#475467]">
                  Occupation
                  <input
                    value={formData.occupation}
                    onChange={(e) => handleFieldChange('occupation', e.target.value)}
                    className={getInputClass('occupation')}
                  />
                  {renderFieldError('occupation')}
                </label>
              </div>
            </section>

            <section className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="flex flex-col text-sm text-[#475467]">
                  Marital Status
                  <select
                    value={formData.maritalStatus}
                    onChange={(e) => handleFieldChange('maritalStatus', e.target.value)}
                    className={getInputClass('maritalStatus')}
                  >
                    <option value="">Select status</option>
                    <option value="Married">Married</option>
                    <option value="Engaged">Engaged</option>
                    <option value="Single">Single</option>
                  </select>
                  {renderFieldError('maritalStatus')}
                </label>
                <label className="flex flex-col text-sm text-[#475467]">
                  Number of Occupants
                  <select
                    value={formData.occupants}
                    onChange={(e) => handleFieldChange('occupants', e.target.value)}
                    className={getInputClass('occupants')}
                  >
                    <option value="just_me">Just me</option>
                    <option value="me_and_spouse">I and my spouse</option>
                    <option value="family_1">I and family of 1</option>
                    <option value="family_2">I and family of 2</option>
                    <option value="family_3">I and family of 3</option>
                    <option value="family_4">I and family of 4</option>
                    <option value="family_5_plus">I and family of 5+</option>
                    <option value="shared_with_friend">Shared with a friend</option>
                    <option value="shared_with_relatives">Shared with relatives</option>
                  </select>
                  {renderFieldError('occupants')}
                </label>
              </div>
            </section>

            <section className="space-y-4">
              <p className="text-sm font-semibold text-[#0e1f42] border-b border-[#f1f5f9] pb-3">Emergency Contact</p>
              <div className="grid md:grid-cols-3 gap-4">
                <label className="flex flex-col text-sm text-[#475467]">
                  Full Name
                  <input
                    value={formData.emergencyName}
                    onChange={(e) => handleFieldChange('emergencyName', e.target.value)}
                    className={getInputClass('emergencyName')}
                  />
                  {renderFieldError('emergencyName')}
                </label>
                <label className="flex flex-col text-sm text-[#475467]">
                  Phone Number
                  <input
                    value={formData.emergencyPhone}
                    onChange={(e) => handleFieldChange('emergencyPhone', e.target.value)}
                    className={getInputClass('emergencyPhone')}
                  />
                  {renderFieldError('emergencyPhone')}
                </label>
                <label className="flex flex-col text-sm text-[#475467]">
                  Relationship
                  <input
                    value={formData.emergencyRelationship}
                    onChange={(e) => handleFieldChange('emergencyRelationship', e.target.value)}
                    className={getInputClass('emergencyRelationship')}
                  />
                  {renderFieldError('emergencyRelationship')}
                </label>
              </div>
              <label className="flex flex-col text-sm text-[#475467]">
                Email Address (Optional)
                <input
                  type="email"
                  value={formData.emergencyEmail}
                  onChange={(e) => handleFieldChange('emergencyEmail', e.target.value)}
                  className={getInputClass('emergencyEmail')}
                />
                {renderFieldError('emergencyEmail')}
              </label>
              <label className="flex flex-col text-sm text-[#475467]">
                Additional notes
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  rows={4}
                  className="mt-2 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#0e1f42]/40 min-h-[140px]"
                ></textarea>
              </label>
            </section>
          </>
        )}

        {step === 2 && (
          <section className="space-y-4">
            <p className="text-sm font-semibold text-[var(--text-color,#0e1f42)] border-b border-[var(--border-color,#e2e8f0)] pb-3">
              Upload Required Documents
            </p>
            <div className="rounded-2xl border border-dashed border-[var(--border-color,#d0d5dd)] bg-[var(--card-bg,#f8fafc)] p-4 md:p-5">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-[var(--text-color,#0e1f42)]">Government ID *</h3>
                <p className="text-xs text-[var(--text-muted,#667085)]">
                  Upload one valid ID: NIN slip/card, International Passport, Driver&apos;s License, or any government-issued ID.
                </p>
              </div>

              <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-[var(--border-color,#d0d5dd)] bg-[var(--surface-bg,var(--card-bg,#ffffff))] px-4 py-3 text-sm font-medium text-[var(--text-color,#0e1f42)] hover:border-[var(--accent-color,#9f7539)]">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  className="hidden"
                  onChange={(event) => handleDocPick(event.target.files?.[0] || null)}
                />
                <span>{docs.governmentIdFileName ? 'Replace ID Upload' : 'Choose Government ID File'}</span>
              </label>

              <p className="mt-2 text-xs text-[var(--text-muted,#667085)]">
                {docs.governmentIdFileName || 'No file selected'}
              </p>
              {documentErrors.governmentIdFileName ? (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {documentErrors.governmentIdFileName}
                </p>
              ) : null}

              {docs.governmentIdFileName && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--border-color,#e2e8f0)] bg-[var(--surface-bg,var(--card-bg,#ffffff))] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--text-muted,#667085)]">Uploaded file</p>
                    <p className="truncate text-sm font-medium text-[var(--text-color,#0e1f42)]">
                      {docs.governmentIdFileName}
                    </p>
                  </div>
                  <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                    <i className="fas fa-check-circle" aria-hidden="true"></i>
                    Done
                  </span>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <div className="mt-6 space-y-4 pt-4 border-t border-[var(--border-color,#e2e8f0)]">
        {step === 1 && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                const validationErrors = validateApplicationProfile(formData);
                if (Object.keys(validationErrors).length > 0) {
                  setProfileErrors(validationErrors);
                  return;
                }
                setProfileErrors({});
                persistDraft(2);
                setStep(2);
              }}
              className="px-6 py-3 rounded-2xl text-white font-semibold"
              style={{ backgroundColor: 'var(--accent-color, #0e1f42)' }}
            >
              Continue to Documents
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex justify-between">
            <button
              onClick={() => {
                persistDraft(1);
                setStep(1);
              }}
              className="px-6 py-3 rounded-2xl border border-[var(--border-color,#d0d7df)] text-[var(--text-color,#344054)] font-semibold"
            >
              Back to Form
            </button>
            <button
              onClick={handleProceed}
              className="px-6 py-3 rounded-2xl text-white font-semibold"
              style={{ backgroundColor: 'var(--accent-color, #0e1f42)' }}
            >
              Continue to Payment
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default StartApplicationFlow;
