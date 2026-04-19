import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApplications } from '../contexts/ApplicationsContext';
import ApplicationSuccessModal from '../components/applications/ApplicationSuccessModal';
import { readAdminStorage, writeAdminStorage } from '../../../../context/adminPersistence';
import { getPublishedUnitListings } from '../../../shared/services/adminListings';
import {
  validateBankTransferPayment,
  validateCardPayment
} from '../../../shared/utils/tenantValidation';
const ADMIN_APPLICATION_INBOX_KEY = 'domihive_admin_applications_inbox_v1';

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit/Debit Card', description: 'Pay securely with your card' },
  { id: 'bank', label: 'Bank Transfer', description: 'Transfer directly from your bank' }
];

const BANK_DETAILS = {
  bankName: 'Zenith Bank',
  accountNumber: '8325001746',
  accountName: 'DomiHive Elite Property Solutions Ltd',
  reference: 'DOMI-RENT-001'
};

const formatCardNumber = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const normalizeMoneyAmount = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  // In this app flow, decimal values below 1000 represent "million" shorthand from admin input.
  if (amount > 0 && amount < 1000 && !Number.isInteger(amount)) {
    return Math.round(amount * 1_000_000);
  }
  return Math.round(amount);
};

const formatNaira = (value) => `₦${normalizeMoneyAmount(value).toLocaleString()}`;

const syncSubmittedApplicationToAdmin = ({ application, applicationId, paymentSnapshot }) => {
  try {
    const adminData = readAdminStorage() || {};
    const existing = Array.isArray(adminData.applications) ? adminData.applications : [];
    const submittedAtISO = new Date().toISOString();
    const nextRow = {
      id: `tenant-${applicationId}`,
      applicant: application?.applicantName || 'Applicant',
      applicantId: application?.applicantName || 'applicant',
      propertyId: application?.property?.id || '',
      propertyTitle: application?.property?.title || 'Property',
      unitId: application?.property?.unitCode || '',
      unitNumber: application?.property?.unitCode || '—',
      submittedAt: submittedAtISO,
      status: 'Submitted',
      slaHours: 72,
      rent: Number(application?.property?.price || 0),
      priority: 'Medium',
      assignedTo: '',
      notes: 'Submitted from tenant dashboard flow.',
      inspectionDate: application?.inspectionDate || '',
      inspectionDateISO: application?.inspectionDateISO || '',
      attendees: Number(application?.attendees || 1),
      cautionFee: Number(
        application?.cautionFee ??
          application?.property?.cautionFee ??
          application?.property?.caution ??
          0
      ),
      serviceCharge: Number(
        application?.serviceCharge ?? application?.property?.serviceCharge ?? 0
      ),
      applicantProfile:
        application?.applicantProfile && typeof application.applicantProfile === 'object'
          ? { ...application.applicantProfile }
          : {},
      applicantDocs:
        application?.applicantDocs && typeof application.applicantDocs === 'object'
          ? {
              governmentIdFileName: application.applicantDocs.governmentIdFileName || '',
              // Avoid localStorage quota overflow by not persisting heavy document previews here.
              governmentIdPreview:
                typeof application.applicantDocs.governmentIdPreview === 'string' &&
                application.applicantDocs.governmentIdPreview.length < 450_000
                  ? application.applicantDocs.governmentIdPreview
                  : '',
              governmentIdMimeType: application.applicantDocs.governmentIdMimeType || ''
            }
          : { governmentIdFileName: '', governmentIdPreview: '', governmentIdMimeType: '' },
      payment:
        paymentSnapshot && typeof paymentSnapshot === 'object'
          ? { ...paymentSnapshot }
          : {
              method: application?.payment?.method || '',
              amount: Number(application?.payment?.amount || 0),
              receiptName: application?.payment?.receiptName || null
            },
      property:
        application?.property && typeof application.property === 'object'
          ? {
              ...application.property,
              price: Number(application?.property?.price || 0),
              cautionFee: Number(
                application?.property?.cautionFee ??
                  application?.property?.caution ??
                  application?.cautionFee ??
                  0
              ),
              serviceCharge: Number(
                application?.property?.serviceCharge ?? application?.serviceCharge ?? 0
              )
            }
          : null
    };

    const withoutExisting = existing.filter((item) => item.id !== nextRow.id);
    const nextApplications = [nextRow, ...withoutExisting];
    writeAdminStorage({
      ...adminData,
      applications: nextApplications
    });

    // Secondary inbox channel for reliability (same-tab and cross-tab).
    try {
      const rawInbox = localStorage.getItem(ADMIN_APPLICATION_INBOX_KEY);
      const parsedInbox = rawInbox ? JSON.parse(rawInbox) : [];
      const inbox = Array.isArray(parsedInbox) ? parsedInbox : [];
      const mergedInbox = [nextRow, ...inbox.filter((item) => item?.id !== nextRow.id)].slice(0, 300);
      localStorage.setItem(ADMIN_APPLICATION_INBOX_KEY, JSON.stringify(mergedInbox));
      window.dispatchEvent(
        new CustomEvent('domihive:admin-application-submitted', { detail: nextRow })
      );
    } catch (_inboxError) {
      // keep primary write path only
    }
  } catch (_error) {
    // Keep tenant flow resilient even if admin sync fails.
  }
};

const ApplicationPaymentPage = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const { applications, updateApplication, addNotification } = useApplications();

  const application = useMemo(
    () => applications.find((app) => app.id === applicationId),
    [applications, applicationId]
  );
  const listingFallback = useMemo(() => {
    const listings = getPublishedUnitListings();
    const appPropertyId = String(application?.property?.id || application?.propertyId || '');
    const appUnitCode = String(application?.property?.unitCode || application?.unitCode || '');
    return (
      listings.find((item) => String(item?.id) === appPropertyId) ||
      listings.find((item) => String(item?.unitCode || '') === appUnitCode) ||
      null
    );
  }, [application?.property?.id, application?.propertyId, application?.property?.unitCode, application?.unitCode]);

  const [selectedMethod, setSelectedMethod] = useState('card');
  const [cardInfo, setCardInfo] = useState({
    number: '',
    holder: '',
    expiry: '',
    cvv: ''
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paymentErrors, setPaymentErrors] = useState({});

  if (!application) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[#64748b]">Application not found.</p>
      </div>
    );
  }

  const breakdownLines = [
    { label: 'Annual Rent', amount: normalizeMoneyAmount(application?.property?.price || 0) },
    {
      label: 'Caution Fee',
      amount: normalizeMoneyAmount(
        application?.cautionFee ??
          application?.property?.cautionFee ??
          application?.property?.caution ??
          listingFallback?.cautionFee ??
          0
      )
    },
    {
      label: 'Service Charge',
      amount: normalizeMoneyAmount(
        application?.serviceCharge ??
          application?.property?.serviceCharge ??
          listingFallback?.serviceCharge ??
          0
      )
    }
  ];
  const total = breakdownLines.reduce((sum, line) => sum + line.amount, 0);

  const handleSubmitPayment = () => {
    const validationErrors =
      selectedMethod === 'card'
        ? validateCardPayment(cardInfo)
        : validateBankTransferPayment({ receiptFile });
    if (Object.keys(validationErrors).length > 0) {
      setPaymentErrors(validationErrors);
      return;
    }
    setPaymentErrors({});

    setIsProcessing(true);

    window.setTimeout(() => {
      const paymentSnapshot = {
        method: selectedMethod,
        amount: total,
        receiptName: receiptFile?.name || null
      };
      updateApplication(applicationId, {
        status: 'APPLICATION_SUBMITTED',
        submittedAtISO: new Date().toISOString(),
        payment: paymentSnapshot
      });

      addNotification({
        type: 'application',
        title: 'Application Submitted',
        message: `${application.property.title} has been submitted successfully.`,
        cta: { label: 'Track Application', path: `/dashboard/rent/applications/${applicationId}/track` }
      });
      syncSubmittedApplicationToAdmin({ application, applicationId, paymentSnapshot });

      setIsProcessing(false);
      setShowSuccessModal(true);
    }, 1400);
  };

  const handleCopy = (value) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(value);
    }
  };

  return (
    <div className="rent-overview-container bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-4 md:p-6">
      <div className="bg-white rounded-lg shadow-md border border-[#e2e8f0] p-6 space-y-6 max-w-5xl mx-auto">
        <div className="space-y-3">
          <button
            onClick={() => navigate('/dashboard/rent/applications')}
            aria-label="Back to Applications"
            className="text-2xl font-medium leading-none"
            style={{ color: 'var(--accent-color, #9F7539)' }}
          >
            ←
          </button>
          <div className="mt-4">
            <h1 className="text-3xl font-semibold text-[#0e1f42]">Select Payment Method</h1>
            <p className="text-sm text-[#64748b]">
              Complete payment to submit your application for review.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.id}
              onClick={() => {
                setSelectedMethod(method.id);
                setPaymentErrors({});
              }}
              className={`application-payment-method p-4 rounded-2xl border transition-all text-left hover:border-[var(--accent-color,#9F7539)] hover:shadow-md ${
                selectedMethod === method.id ? 'active border-[#d97706] bg-[#fff7ed] shadow-lg' : 'border-[#e2e8f0] bg-white'
              }`}
            >
              <div className="text-sm font-semibold text-[#0e1f42]">{method.label}</div>
              <p className="text-xs text-[#475467] mt-1">{method.description}</p>
            </button>
          ))}
        </div>

        {selectedMethod === 'bank' && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[#0e1f42] border-b border-[#f1f5f9] pb-3">
              Bank Transfer Instructions
            </h2>
            <div className="space-y-3 text-sm text-[#475467]">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Bank Name</span>
                <span className="text-[#0e1f42]">{BANK_DETAILS.bankName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Account Number</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#0e1f42] font-semibold">{BANK_DETAILS.accountNumber}</span>
                  <button
                    onClick={() => handleCopy(BANK_DETAILS.accountNumber)}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs"
                    style={{ backgroundColor: 'var(--accent-color, #9F7539)', color: 'var(--white, #FFFFFF)' }}
                    aria-label="Copy account number"
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Account Name</span>
                <span className="text-[#0e1f42] font-semibold">{BANK_DETAILS.accountName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Reference</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#0e1f42] font-semibold">{BANK_DETAILS.reference}</span>
                  <button
                    onClick={() => handleCopy(BANK_DETAILS.reference)}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs"
                    style={{ backgroundColor: 'var(--accent-color, #9F7539)', color: 'var(--white, #FFFFFF)' }}
                    aria-label="Copy reference"
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Amount</span>
                <span className="text-[#0e1f42] font-semibold">{formatNaira(total)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#6c757d]">Upload Transfer Receipt</label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.pdf"
                className="w-full text-sm text-[#475467] border border-[#d0d7df] p-2 mt-3 transition-colors rounded-lg"
                onChange={(event) => {
                  setReceiptFile(event.target.files?.[0] || null);
                  setPaymentErrors((prev) => {
                    if (!prev.receipt) return prev;
                    const next = { ...prev };
                    delete next.receipt;
                    return next;
                  });
                }}
              />
              <p className="text-xs text-[#6c757d]">
                {receiptFile ? `Selected: ${receiptFile.name}` : 'Upload proof of payment after transfer.'}
              </p>
              {paymentErrors.receipt ? (
                <p className="text-xs font-medium text-red-600 mt-1">{paymentErrors.receipt}</p>
              ) : null}
            </div>
          </div>
        )}

        {selectedMethod === 'card' && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-6">
            <h2 className="text-sm font-semibold text-[#0e1f42] border-b border-[#f1f5f9] pb-3">Card Information</h2>
            <div className="space-y-4">
              <label className="flex flex-col text-sm text-[#475467]">
                Card Number
                <input
                  type="text"
                  value={cardInfo.number}
                  onChange={(event) => {
                    setCardInfo((prev) => ({ ...prev, number: formatCardNumber(event.target.value) }));
                    setPaymentErrors((prev) => {
                      if (!prev.cardNumber) return prev;
                      const next = { ...prev };
                      delete next.cardNumber;
                      return next;
                    });
                  }}
                  placeholder="1234 5678 9012 3456"
                  className={`mt-2 border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#deb887]/40 ${
                    paymentErrors.cardNumber ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                {paymentErrors.cardNumber ? (
                  <span className="mt-1 text-xs font-medium text-red-600">{paymentErrors.cardNumber}</span>
                ) : null}
              </label>
              <div className="grid md:grid-cols-3 gap-4">
                <label className="flex flex-col text-sm text-[#475467] md:col-span-1">
                  Card Holder Name
                  <input
                    type="text"
                    value={cardInfo.holder}
                    onChange={(event) => {
                      setCardInfo((prev) => ({ ...prev, holder: event.target.value }));
                      setPaymentErrors((prev) => {
                        if (!prev.cardHolder) return prev;
                        const next = { ...prev };
                        delete next.cardHolder;
                        return next;
                      });
                    }}
                    placeholder="John Doe"
                    className={`mt-2 border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#deb887]/40 ${
                      paymentErrors.cardHolder ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {paymentErrors.cardHolder ? (
                    <span className="mt-1 text-xs font-medium text-red-600">{paymentErrors.cardHolder}</span>
                  ) : null}
                </label>
                <label className="flex flex-col text-sm text-[#475467]">
                  Expiry Date
                  <input
                    type="text"
                    value={cardInfo.expiry}
                    onChange={(event) => {
                      setCardInfo((prev) => ({ ...prev, expiry: formatExpiry(event.target.value) }));
                      setPaymentErrors((prev) => {
                        if (!prev.expiry) return prev;
                        const next = { ...prev };
                        delete next.expiry;
                        return next;
                      });
                    }}
                    placeholder="MM/YY"
                    className={`mt-2 border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#deb887]/40 ${
                      paymentErrors.expiry ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {paymentErrors.expiry ? (
                    <span className="mt-1 text-xs font-medium text-red-600">{paymentErrors.expiry}</span>
                  ) : null}
                </label>
                <label className="flex flex-col text-sm text-[#475467]">
                  CVV
                  <input
                    type="text"
                    value={cardInfo.cvv}
                    onChange={(event) => {
                      setCardInfo((prev) => ({ ...prev, cvv: event.target.value.replace(/\D/g, '').slice(0, 3) }));
                      setPaymentErrors((prev) => {
                        if (!prev.cvv) return prev;
                        const next = { ...prev };
                        delete next.cvv;
                        return next;
                      });
                    }}
                    placeholder="123"
                    className={`mt-2 border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#deb887]/40 ${
                      paymentErrors.cvv ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {paymentErrors.cvv ? (
                    <span className="mt-1 text-xs font-medium text-red-600">{paymentErrors.cvv}</span>
                  ) : null}
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#0e1f42] border-b border-[#f1f5f9] pb-3">Payment Breakdown</h2>
          <div className="space-y-2 text-sm text-[#475467]">
            {breakdownLines.map((line) => (
              <div key={line.label} className="flex justify-between">
                <span>{line.label}</span>
                <span>{formatNaira(line.amount)}</span>
              </div>
            ))}
            <div className="border-t border-[#e2e8f0] pt-2 flex justify-between font-semibold text-[#0e1f42]">
              <span>Total Amount</span>
              <span>{formatNaira(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSubmitPayment}
            disabled={isProcessing}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#0e1f42] to-[#1a2d5f] text-white font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing Payment...' : 'Make Payment'}
          </button>
        </div>
      </div>

      {showSuccessModal && (
        <ApplicationSuccessModal
          application={application}
          onClose={() => setShowSuccessModal(false)}
          onDashboard={() => navigate('/dashboard/rent')}
          onTrack={() => navigate(`/dashboard/rent/applications/${applicationId}/track`)}
        />
      )}
    </div>
  );
};

export default ApplicationPaymentPage;
