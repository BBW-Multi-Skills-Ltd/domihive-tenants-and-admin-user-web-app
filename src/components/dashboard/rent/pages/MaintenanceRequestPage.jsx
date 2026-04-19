import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useMaintenance } from '../contexts/MaintenanceContext';
import { useProperties } from '../contexts/PropertiesContext';
import { validateMaintenanceRequest } from '../../../shared/utils/tenantValidation';

const MAINTENANCE_DRAFT_KEY = 'domihive_maintenance_request_draft';

const EMPTY_FORM = {
  propertyId: '',
  title: '',
  category: '',
  urgency: '',
  preferredDate: '',
  description: '',
  contactPhone: '',
  contactWindow: '',
  allowEntry: false,
  contactEmergency: false
};

const MaintenanceRequestPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tickets, addTicket } = useMaintenance();
  const { properties } = useProperties();

  const [form, setForm] = useState(EMPTY_FORM);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [requestErrors, setRequestErrors] = useState({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MAINTENANCE_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.form && typeof parsed.form === 'object') {
          setForm((prev) => ({ ...prev, ...parsed.form }));
        }
        if (typeof parsed?.policyAgreed === 'boolean') {
          setPolicyAgreed(parsed.policyAgreed);
        }
      }
    } catch (_error) {
      // ignore malformed draft
    } finally {
      setIsDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (location.state?.propertyId) {
      setForm((prev) => ({ ...prev, propertyId: String(location.state.propertyId) }));
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (location.state?.policyAgreed) {
      setPolicyAgreed(true);
      if (location.state?.propertyId) {
        setForm((prev) => ({ ...prev, propertyId: String(location.state.propertyId) }));
      }
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!isDraftHydrated) return;
    localStorage.setItem(
      MAINTENANCE_DRAFT_KEY,
      JSON.stringify({
        form,
        policyAgreed
      })
    );
  }, [form, policyAgreed, isDraftHydrated]);

  useEffect(() => {
    if (form.propertyId) return;
    if (!properties?.length) return;
    setForm((prev) => ({
      ...prev,
      propertyId: String(prev.propertyId || properties[0]?.propertyId || '')
    }));
  }, [form.propertyId, properties]);

  const selectedProperty = useMemo(
    () => properties.find((property) => String(property.propertyId) === String(form.propertyId)) || null,
    [properties, form.propertyId]
  );

  const propertyTickets = useMemo(
    () => tickets.filter((ticket) => String(ticket.propertyId) === String(form.propertyId)),
    [tickets, form.propertyId]
  );

  const summary = useMemo(() => {
    const totalRequests = propertyTickets.length;
    const ongoing = propertyTickets.filter(
      (ticket) => !['COMPLETED', 'CANCELLED'].includes(String(ticket.status || '').toUpperCase())
    ).length;
    const completed = propertyTickets.filter(
      (ticket) => String(ticket.status || '').toUpperCase() === 'COMPLETED'
    ).length;
    return {
      totalRequests,
      ongoing,
      completed,
      ticketSlotNumber: `#${String(totalRequests + 1).padStart(3, '0')}`,
      coveredBy: 'DomiHive'
    };
  }, [propertyTickets]);

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setRequestErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = () => {
    const validationErrors = validateMaintenanceRequest({ form, policyAgreed });
    if (Object.keys(validationErrors).length > 0) {
      setRequestErrors(validationErrors);
      return;
    }
    setRequestErrors({});

    const now = new Date().toISOString();

    addTicket({
      propertyId: form.propertyId,
      propertyName: selectedProperty?.name || 'Property',
      category: form.category,
      title: form.title,
      description: form.description,
      urgency: form.urgency,
      priority: String(form.urgency).toLowerCase().includes('emergency') ? 'Emergency' : 'Normal',
      responsibility: 'Pending Assessment',
      status: 'SUBMITTED',
      createdAt: new Date().toISOString().slice(0, 10),
      updates: [{ status: 'SUBMITTED', note: 'Request submitted', at: now }]
    });

    localStorage.removeItem(MAINTENANCE_DRAFT_KEY);
    setSuccessOpen(true);
  };

  return (
    <div className="rent-overview-container bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/dashboard/rent/maintenance')}
              className="p-2 hover:bg-gray-100 rounded-xl status-accent transition-all mt-0.5"
              aria-label="Back to Maintenance"
            >
              <ArrowLeft size={22} className="return-icon-accent" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-color,#0e1f42)]">Request Maintenance</h1>
              <p className="text-sm text-[var(--text-muted,#64748b)] mt-1">Submit a maintenance request for your unit.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-4 py-1 text-sm rounded-full font-semibold whitespace-nowrap bg-emerald-100 text-emerald-700 border border-emerald-200 property-status property-status--active">
              Active
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="rounded-3xl border p-6 shadow-sm space-y-6" style={{ backgroundColor: 'var(--card-bg,#fff)', borderColor: 'var(--border-color,#e2e8f0)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted,#64748b)]">Maintenance Summary</h3>
                <div className="p-1.5 rounded-lg bg-blue-50 status-accent">
                  <i className="fas fa-tools text-xs"></i>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted,#64748b)] inline-flex items-center gap-1.5">
                    <i className="fas fa-hashtag text-[var(--accent-color,#9F7539)]"></i>
                    Number of Requests
                  </p>
                  <p className="font-semibold text-[var(--accent-color,#9F7539)]">{summary.totalRequests}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted,#64748b)] inline-flex items-center gap-1.5">
                    <i className="fas fa-spinner text-[var(--accent-color,#9F7539)]"></i>
                    Ongoing
                  </p>
                  <p className="font-semibold text-amber-600">{summary.ongoing}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted,#64748b)] inline-flex items-center gap-1.5">
                      <i className="fas fa-check-circle text-emerald-500"></i>
                      Completed
                    </p>
                    <p className="font-semibold text-emerald-600">{summary.completed}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted,#64748b)] inline-flex items-center gap-1.5">
                      <i className="fas fa-ticket-alt text-[var(--accent-color,#9F7539)]"></i>
                      Ticket Slot Number
                    </p>
                    <p className="text-[var(--text-color,#0e1f42)]">{summary.ticketSlotNumber}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted,#64748b)] inline-flex items-center gap-1.5">
                    <i className="fas fa-wallet text-[var(--accent-color,#9F7539)]"></i>
                    Maintenance Cost Covered By
                  </p>
                  <p className="font-semibold text-emerald-600">{summary.coveredBy}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border p-6 shadow-sm" style={{ backgroundColor: 'var(--card-bg,#fff)', borderColor: 'var(--border-color,#e2e8f0)' }}>
              <h3 className="text-base font-bold text-[var(--text-color,#0e1f42)] mb-4 inline-flex items-center gap-2">
                <i className="fas fa-clipboard-list text-[var(--accent-color,#9F7539)]"></i>
                Issue Details
              </h3>
              <div className="grid gap-3 text-sm text-[var(--text-color,#0e1f42)]">
                {requestErrors.propertyId ? (
                  <p className="text-xs font-medium text-red-600">{requestErrors.propertyId}</p>
                ) : null}
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    Issue Title *
                    <input
                      value={form.title}
                      onChange={(e) => updateFormField('title', e.target.value)}
                      className={`border rounded-lg px-3 py-2 ${requestErrors.title ? 'border-red-500' : ''}`}
                      style={{
                        borderColor: requestErrors.title ? '#ef4444' : 'var(--border-color,#e2e8f0)',
                        backgroundColor: 'var(--card-bg,#fff)'
                      }}
                      placeholder="Short title"
                    />
                    {requestErrors.title ? <span className="text-xs font-medium text-red-600">{requestErrors.title}</span> : null}
                  </label>
                  <label className="flex flex-col gap-1">
                    Category *
                    <select
                      value={form.category}
                      onChange={(e) => updateFormField('category', e.target.value)}
                      className={`border rounded-lg px-3 py-2 ${requestErrors.category ? 'border-red-500' : ''}`}
                      style={{
                        borderColor: requestErrors.category ? '#ef4444' : 'var(--border-color,#e2e8f0)',
                        backgroundColor: 'var(--card-bg,#fff)'
                      }}
                    >
                      <option value="">Select category</option>
                      {['Plumbing', 'Electrical', 'AC', 'Appliance', 'Structural', 'Cleaning', 'Other'].map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    {requestErrors.category ? <span className="text-xs font-medium text-red-600">{requestErrors.category}</span> : null}
                  </label>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    Urgency Level *
                    <select
                      value={form.urgency}
                      onChange={(e) => updateFormField('urgency', e.target.value)}
                      className={`border rounded-lg px-3 py-2 ${requestErrors.urgency ? 'border-red-500' : ''}`}
                      style={{
                        borderColor: requestErrors.urgency ? '#ef4444' : 'var(--border-color,#e2e8f0)',
                        backgroundColor: 'var(--card-bg,#fff)'
                      }}
                    >
                      <option value="">Select urgency</option>
                      <option>Low - can wait a few days</option>
                      <option>Medium - within 48 hours</option>
                      <option>High - within 24 hours</option>
                      <option>Emergency - immediate action</option>
                    </select>
                    {requestErrors.urgency ? <span className="text-xs font-medium text-red-600">{requestErrors.urgency}</span> : null}
                  </label>
                  <label className="flex flex-col gap-1">
                    Preferred Repair Date (optional)
                    <input
                      type="date"
                      lang="en-GB"
                      value={form.preferredDate}
                      onChange={(e) => updateFormField('preferredDate', e.target.value)}
                      className="border rounded-lg px-3 py-2"
                      style={{ borderColor: 'var(--border-color,#e2e8f0)', backgroundColor: 'var(--card-bg,#fff)' }}
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1">
                  Detailed Description *
                  <textarea
                    value={form.description}
                    onChange={(e) => updateFormField('description', e.target.value)}
                    className={`border rounded-lg px-3 py-2 ${requestErrors.description ? 'border-red-500' : ''}`}
                    style={{
                      borderColor: requestErrors.description ? '#ef4444' : 'var(--border-color,#e2e8f0)',
                      backgroundColor: 'var(--card-bg,#fff)'
                    }}
                    rows={4}
                    placeholder="Describe the issue in detail"
                  />
                  {requestErrors.description ? <span className="text-xs font-medium text-red-600">{requestErrors.description}</span> : null}
                </label>
              </div>
            </div>

            <div className="rounded-3xl border p-6 shadow-sm" style={{ backgroundColor: 'var(--card-bg,#fff)', borderColor: 'var(--border-color,#e2e8f0)' }}>
              <h3 className="text-base font-bold text-[var(--text-color,#0e1f42)] mb-4 inline-flex items-center gap-2">
                <i className="fas fa-shield-alt text-[var(--accent-color,#9F7539)]"></i>
                Uploads, Contact & Policy
              </h3>
              <div className="grid gap-3 text-sm text-[var(--text-color,#0e1f42)]">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border border-dashed rounded-xl p-3 text-center text-sm" style={{ borderColor: 'var(--border-color,#e2e8f0)', color: 'var(--text-muted,#64748b)' }}>
                    Upload Photos (optional)
                    <div className="mt-2">
                      <button className="px-3 py-2 rounded-lg border font-semibold" style={{ borderColor: 'var(--border-color,#e2e8f0)', color: 'var(--text-color,#0e1f42)' }}>
                        Add Photo
                      </button>
                    </div>
                  </div>
                  <div className="border border-dashed rounded-xl p-3 text-center text-sm" style={{ borderColor: 'var(--border-color,#e2e8f0)', color: 'var(--text-muted,#64748b)' }}>
                    Upload Videos (optional)
                    <div className="mt-2">
                      <button className="px-3 py-2 rounded-lg border font-semibold" style={{ borderColor: 'var(--border-color,#e2e8f0)', color: 'var(--text-color,#0e1f42)' }}>
                        Add Video
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    Contact Phone *
                    <input
                      value={form.contactPhone}
                      onChange={(e) => updateFormField('contactPhone', e.target.value)}
                      className={`border rounded-lg px-3 py-2 ${requestErrors.contactPhone ? 'border-red-500' : ''}`}
                      style={{
                        borderColor: requestErrors.contactPhone ? '#ef4444' : 'var(--border-color,#e2e8f0)',
                        backgroundColor: 'var(--card-bg,#fff)'
                      }}
                      placeholder="+234 ..."
                    />
                    {requestErrors.contactPhone ? <span className="text-xs font-medium text-red-600">{requestErrors.contactPhone}</span> : null}
                  </label>
                  <label className="flex flex-col gap-1">
                    Best Time to Contact (optional)
                    <select
                      value={form.contactWindow}
                      onChange={(e) => updateFormField('contactWindow', e.target.value)}
                      className="border rounded-lg px-3 py-2"
                      style={{ borderColor: 'var(--border-color,#e2e8f0)', backgroundColor: 'var(--card-bg,#fff)' }}
                    >
                      <option value="">Any time</option>
                      <option>Morning</option>
                      <option>Afternoon</option>
                      <option>Evening</option>
                    </select>
                  </label>
                </div>

                <div className="space-y-2 border rounded-lg p-3" style={{ borderColor: 'var(--border-color,#e2e8f0)' }}>
                  <p className="font-semibold text-[var(--text-color,#0e1f42)]">Please read and agree to the maintenance policy before submitting.</p>
                  <button
                    onClick={() =>
                      navigate('/dashboard/rent/maintenance/policy', {
                        state: {
                          propertyId: form.propertyId,
                          returnTo: '/dashboard/rent/maintenance/request'
                        }
                      })
                    }
                    className="font-semibold text-[var(--accent-color,#9F7539)]"
                  >
                    Read Maintenance Policy
                  </button>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.allowEntry}
                      onChange={() => updateFormField('allowEntry', !form.allowEntry)}
                    />
                    I grant permission for maintenance staff to enter the property when I'm not home
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.contactEmergency}
                      onChange={() => updateFormField('contactEmergency', !form.contactEmergency)}
                    />
                    Contact me immediately for emergency repairs
                  </label>
                  <label className={`flex items-center gap-2 ${policyAgreed ? 'text-emerald-600 font-semibold' : ''}`}>
                    <input
                      type="checkbox"
                      checked={policyAgreed}
                      onChange={() => {
                        setPolicyAgreed((prev) => !prev);
                        setRequestErrors((prev) => {
                          if (!prev.policyAgreed) return prev;
                          const next = { ...prev };
                          delete next.policyAgreed;
                          return next;
                        });
                      }}
                    />
                    I have read and agree to the maintenance policy
                  </label>
                  {requestErrors.policyAgreed ? (
                    <p className="text-xs font-medium text-red-600">{requestErrors.policyAgreed}</p>
                  ) : null}
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => navigate('/dashboard/rent/maintenance')}
                    className="px-4 py-2 rounded-full text-sm font-semibold border"
                    style={{ borderColor: 'var(--border-color,#e2e8f0)', color: 'var(--text-color,#0e1f42)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: 'var(--accent-color,#9F7539)' }}
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {successOpen && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/40 px-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-md p-6 text-center relative" style={{ backgroundColor: 'var(--card-bg,#fff)', border: '1px solid var(--border-color,#e2e8f0)' }}>
            <h3 className="text-xl font-semibold text-[var(--text-color,#0e1f42)]">Request submitted</h3>
            <p className="text-sm text-[var(--text-muted,#64748b)] mt-2">Your maintenance request was submitted successfully.</p>
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => {
                  setSuccessOpen(false);
                  navigate('/dashboard/rent/maintenance');
                }}
                className="px-4 py-2 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--accent-color,#9F7539)' }}
              >
                Back to Maintenance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceRequestPage;

