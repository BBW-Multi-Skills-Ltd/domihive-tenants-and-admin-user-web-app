// src/dashboards/rent/components/book-inspection/BookInspectionPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { useApplications } from '../../contexts/ApplicationsContext';
import PropertySummary from './PropertySummary';
import InspectionForm from './InspectionForm';
import TermsAndConditions from './TermsAndConditions';
import UserContextBanner from './UserContextBanner';
import SuccessModal from './SuccessModal';
import FloatingCallButton from '../property-details/components/FloatingCallButton';
import {
  readInspectionBookings,
  writeInspectionBookings,
  dedupeInspectionBookings,
  INSPECTION_BOOKING_STATUSES
} from '../../../../shared/utils/inspectionBookings';
import { validateBookInspection } from '../../../../shared/utils/tenantValidation';

const BookInspectionPage = ({ propertyId, propertyData, onBack }) => {
  const { user } = useAuth();
  const { createApplicationFromBooking } = useApplications();
  const resolvedPropertyId = propertyData?.propertyId || propertyId;
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
  // Form state managed in parent
  const [formValues, setFormValues] = useState({
    inspectionDate: '',
    inspectionTime: '',
    numberOfPeople: '',
    inspectionNotes: ''
  });

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const handleFormChange = (field, value) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleInspectionFormSubmit = () => {
    const errors = validateBookInspection({ formValues, agreeTerms });
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    const completeFormData = {
      ...formValues,
      agreeTerms,
      propertyId: resolvedPropertyId,
      bookingId: 'DOMI-INSP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      bookingDate: new Date().toISOString(),
      inspectionStatus: INSPECTION_BOOKING_STATUSES.PENDING_CONFIRMATION,
      status: INSPECTION_BOOKING_STATUSES.PENDING_CONFIRMATION,
      applicantName: user?.name || 'Applicant',
      applicantPhone: user?.phone || '',
      applicantEmail: user?.email || '',
      propertyTitle: propertyData?.title || 'Selected Property',
      unitCode: propertyData?.unitCode || propertyData?.unitNumber || '—',
      location: propertyData?.location || 'Lagos, Nigeria',
      unitDescription: propertyData?.description || ''
    };
    
    // Save to localStorage
    let persistedBooking = completeFormData;
    try {
      const bookings = readInspectionBookings();
      const identityMatch = (existing) =>
        String(existing?.applicantName || '').trim().toLowerCase() ===
          String(completeFormData?.applicantName || '').trim().toLowerCase() &&
        String(existing?.propertyId || '') === String(completeFormData?.propertyId || '') &&
        String(existing?.unitCode || existing?.unitNumber || '').trim().toLowerCase() ===
          String(completeFormData?.unitCode || completeFormData?.unitNumber || '').trim().toLowerCase();

      const matchedIndex = bookings.findIndex(identityMatch);
      let nextBookings;
      if (matchedIndex >= 0) {
        const existing = bookings[matchedIndex];
        const preservedId = existing?.bookingId || existing?.id || completeFormData.bookingId;
        const updated = {
          ...existing,
          ...completeFormData,
          bookingId: preservedId
        };
        nextBookings = [...bookings];
        nextBookings[matchedIndex] = updated;
        persistedBooking = updated;
      } else {
        nextBookings = [completeFormData, ...bookings];
        persistedBooking = completeFormData;
      }

      writeInspectionBookings(dedupeInspectionBookings(nextBookings));
      sessionStorage.setItem('domihive_current_booking', JSON.stringify(persistedBooking));
    } catch (error) {
      console.error('Error saving booking:', error);
    }

    setShowSuccessModal(true);

    const fallbackProperty = {
      id: propertyId || 'PROP-UNKNOWN',
      title: 'Luxury 3-Bedroom Apartment in Ikoyi',
      location: 'Ikoyi, Lagos Island',
      price: 4500000,
      image: '/ASSECT/3d-rendering-modern-dining-room-living-room-with-luxury-decor (1).jpg'
    };

    createApplicationFromBooking({
      booking: persistedBooking,
      property: propertyData || fallbackProperty,
      applicantName: user?.name
    });
  };

  const handleTermsChange = (e) => {
    setAgreeTerms(e.target.checked);
    if (e.target.checked) {
      setFormErrors((prev) => {
        if (!prev.terms) return prev;
        const next = { ...prev };
        delete next.terms;
        return next;
      });
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
  };

  // Demo property data for SuccessModal (should come from PropertySummary)
  const demoProperty = {
    title: propertyData?.title || "Luxury 3-Bedroom Apartment in Ikoyi",
    location: propertyData?.location || "Ikoyi, Lagos Island"
  };

  return (
    <div className="book-inspection-page min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Main Content */}
      <div className="property-details-content p-4 md:p-6">
        <div className="book-inspection-card bg-white rounded-lg shadow-md border border-[#e2e8f0] p-4 md:p-6">
          {/* Back to Browse Navigation - Top */}
          <div className="mb-6">
            <button
              onClick={handleBackClick}
              className="property-back-btn flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 hover:text-gray-900"
            >
              <i className="fas fa-arrow-left"></i>
              <span className="font-medium">Back to Browse</span>
            </button>
          </div>

          {/* Property Summary Section */}
          <PropertySummary propertyData={propertyData} />

          {/* Inspection Form Section */}
          <section className="mt-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#0e1f42] mb-2">
                Schedule Your Inspection
              </h2>
              <p className="text-[#64748b] mb-8">
                Choose a convenient date and time for your property viewing
              </p>

              {/* User Context Banner */}
              <UserContextBanner />

              <form 
                id="inspectionBookingForm" 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleInspectionFormSubmit();
                }}
                className="space-y-8"
              >
                {/* Inspection Details */}
                <InspectionForm 
                  propertyId={resolvedPropertyId}
                  formValues={formValues}
                  onFormChange={handleFormChange}
                  errors={formErrors}
                />

                {/* Terms and Conditions Section */}
                {/* We need to pass the checked state to TermsAndConditions */}
                <div className="terms-section">
                  <TermsAndConditions 
                    checked={agreeTerms}
                    onChange={handleTermsChange}
                  />
                  {formErrors.terms ? (
                    <p className="mt-2 text-sm text-red-600 font-medium">{formErrors.terms}</p>
                  ) : null}
                </div>

                {/* Form Actions */}
                <div className="pt-8 border-t border-[#e2e8f0] flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <button
                    type="button"
                    onClick={handleBackClick}
                    className="px-6 py-3 bg-[#f8fafc] border border-[#e2e8f0] text-[#0e1f42] font-semibold rounded-lg hover:bg-[#e2e8f0] transition-all duration-300 flex items-center gap-2 w-full sm:w-auto justify-center"
                  >
                    <i className="fas fa-arrow-left"></i>
                    Back to Browse
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-[#9f7539] to-[#b58a4a] text-white font-semibold rounded-lg hover:from-[#b58a4a] hover:to-[#9f7539] transition-all duration-300 flex items-center gap-2 w-full sm:w-auto justify-center hover:shadow-[0_8px_25px_rgba(159,117,57,0.3)] hover:-translate-y-0.5"
                  >
                    <i className="fas fa-calendar-check"></i>
                    Book Inspection
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>

      {/* Floating Call Button */}
      <FloatingCallButton phoneNumber="+2349010851071" />

      {/* Success Modal */}
      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        bookingData={{
          ...formValues,
          propertyTitle: demoProperty.title,
          location: demoProperty.location,
          numberOfPeople: formValues.numberOfPeople || '2',
          unitCode: propertyData?.unitCode || ''
        }}
      />
    </div>
  );
};

export default BookInspectionPage;
