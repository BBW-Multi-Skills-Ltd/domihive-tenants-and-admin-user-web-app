import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bath, BedDouble, Building2, Calendar, Clock, FileText, Ruler } from 'lucide-react';
import { useProperties } from '../contexts/PropertiesContext';
import PropertyCard from '../components/properties/PropertyCard';
import { validateMoveInChecklist } from '../../../shared/utils/tenantValidation';

const formatNaira = (amt) => (amt || amt === 0 ? `₦${Number(amt).toLocaleString()}` : '—');

const formatDateDDMMYYYY = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());
  return `${day}/${month}/${year}`;
};

const formatHumanDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getDaysRemaining = (endDate) => {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const formatDateInputDDMMYYYY = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
};

const PropertyDashboard = () => {
  const { propertyId } = useParams();
  const location = useLocation();
  const focus = location.state?.focus;
  const navigate = useNavigate();
  const { properties, completeMoveInChecklist } = useProperties();

  const property = useMemo(
    () => properties.find((p) => p.propertyId === propertyId),
    [properties, propertyId]
  );

  const [moveInForm, setMoveInForm] = useState(
    property?.moveInChecklist || {
      keyNumber: '',
      moveInDate: ''
    }
  );
  const [moveInErrors, setMoveInErrors] = useState({});

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[#64748b]">Property not found.</p>
      </div>
    );
  }

  const showMoveInOnly = focus === 'movein' && property?.tenancyStatus === 'PENDING_MOVE_IN';
  const statusLabel =
    property.tenancyStatus === 'PENDING_MOVE_IN'
      ? 'Pending Move-in'
      : property.tenancyStatus === 'ACTIVE'
        ? 'Active'
        : 'Ended';

  const moveInDate = property.moveInChecklist?.moveInDate || property.leaseStart;
  const daysRemaining = getDaysRemaining(property.leaseEnd);
  const unitNumber = property.unitCode || property.unitNumber || '—';
  const beds = property.bedrooms ?? property.beds ?? '—';
  const baths = property.bathrooms ?? property.baths ?? '—';
  const size = property.size ?? property.sizeSqm ?? property.sqm ?? '—';

  const handleMoveInFieldChange = (field, value) => {
    setMoveInForm((prev) => ({ ...prev, [field]: value }));
    setMoveInErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleCompleteMoveIn = () => {
    const validationErrors = validateMoveInChecklist({
      keyNumber: moveInForm.keyNumber,
      moveInDate: moveInForm.moveInDate
    });
    if (Object.keys(validationErrors).length > 0) {
      setMoveInErrors(validationErrors);
      return;
    }
    setMoveInErrors({});
    completeMoveInChecklist(property.propertyId, {
      keysReceived: true,
      meterReading: moveInForm.keyNumber || '000000',
      keyNumber: moveInForm.keyNumber || '',
      moveInDate: moveInForm.moveInDate || '',
      inventoryConfirmed: !!moveInForm.keyNumber,
      moveInDateConfirmed: !!moveInForm.moveInDate
    });
    navigate('/dashboard/rent/my-properties');
  };

  const handleMoveInCardAction = (_property, action) => {
    if (action === 'movein') {
      const target = document.getElementById('movein');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const headerStatusClass =
    property.tenancyStatus === 'PENDING_MOVE_IN'
      ? 'bg-red-100 text-red-700 border border-red-200 property-status property-status--pending-move-in'
      : property.tenancyStatus === 'ACTIVE'
        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 property-status property-status--active'
        : 'bg-gray-100 text-gray-700 border border-gray-200 property-status';

  if (showMoveInOnly) {
    return (
      <div className="rent-overview-container min-h-screen p-4 md:p-6">
        <div className="bg-white rounded-lg border border-[#e2e8f0] p-6 space-y-6 max-w-4xl mx-auto">
          <div className="space-y-4">
            <button
              onClick={() => navigate('/dashboard/rent/my-properties')}
              className="text-2xl font-medium leading-none"
              style={{ color: 'var(--accent-color, #9F7539)' }}
              aria-label="Back to My Properties"
            >
              <i className="fas fa-arrow-left-long text-xl"></i>
            </button>

            <PropertyCard property={property} onAction={handleMoveInCardAction} />
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm" id="movein">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#0e1f42]">Move-in Checklist</h3>
              <button
                onClick={handleCompleteMoveIn}
                className="px-4 py-2 rounded-lg text-white font-semibold"
                style={{ backgroundColor: 'var(--accent-color, #9F7539)' }}
              >
                Submit
              </button>
            </div>
            <div className="space-y-3 text-sm text-[#475467]">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[#0e1f42]">Please confirm your key number</p>
                <input
                  type="text"
                  value={moveInForm.keyNumber || ''}
                  onChange={(e) => handleMoveInFieldChange('keyNumber', e.target.value)}
                  className={`border rounded-lg px-3 py-2 w-full bg-transparent ${
                    moveInErrors.keyNumber ? 'border-red-500' : 'border-[#e2e8f0]'
                  }`}
                  placeholder="Enter key number"
                />
                {moveInErrors.keyNumber ? (
                  <p className="text-xs font-medium text-red-600">{moveInErrors.keyNumber}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-[#0e1f42]">Move in date</p>
                <input
                  type="text"
                  value={moveInForm.moveInDate || ''}
                  onChange={(e) =>
                    handleMoveInFieldChange('moveInDate', formatDateInputDDMMYYYY(e.target.value))
                  }
                  inputMode="numeric"
                  maxLength={10}
                  className={`border rounded-lg px-3 py-2 w-full bg-transparent ${
                    moveInErrors.moveInDate ? 'border-red-500' : 'border-[#e2e8f0]'
                  }`}
                  placeholder="dd/mm/yyyy"
                />
                {moveInErrors.moveInDate ? (
                  <p className="text-xs font-medium text-red-600">{moveInErrors.moveInDate}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rent-overview-container min-h-screen p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/rent/my-properties')}
              className="p-2 hover:bg-gray-100 rounded-xl status-accent transition-all"
              aria-label="Back to My Properties"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#0e1f42]">{property.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{property.location}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${headerStatusClass}`}>
            {statusLabel}
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-[#e2e8f0] p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tenancy Summary</h3>
                <div className="p-1.5 rounded-lg bg-blue-50 status-accent">
                  <Building2 size={14} />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Move in Date</p>
                  <p className="text-sm font-bold status-success">{formatDateDDMMYYYY(moveInDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Unit Type</p>
                  <p className="text-sm font-bold text-[#0e1f42]">{property.unitType || 'Unit'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Unit Details</p>
                  <div className="flex items-center gap-3 text-xs text-[#475467]">
                    <span className="inline-flex items-center gap-1"><BedDouble className="status-accent" size={12} /> {beds}</span>
                    <span className="inline-flex items-center gap-1"><Bath className="status-accent" size={12} /> {baths}</span>
                    <span className="inline-flex items-center gap-1"><Ruler className="status-accent" size={12} /> {size} sqm</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-gray-50 p-2.5">
                  <img
                    src={property.image || 'https://via.placeholder.com/60x44?text=Unit'}
                    alt={property.name}
                    className="w-[60px] h-[44px] rounded-md object-cover border border-[#e2e8f0]"
                  />
                  <p className="text-xs text-[#475467] truncate">{unitNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rent Amount</p>
                  <p className="text-sm font-bold">
                    <span className="status-success">{formatNaira(property.rentAmount)}</span>
                    <span className="text-[#0e1f42]"> • {property.paymentPlan}</span>
                    <span className="status-success"> • Paid</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Caution Fee Deposit</p>
                  <p className="text-sm font-bold status-success">{property.cautionDepositStatus || 'Paid'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm overflow-hidden">
              <div className="p-6 flex items-center justify-between">
                <h3 className="text-base font-bold text-[#0e1f42]">Active Lease Details</h3>
                <div className="flex items-center gap-2 status-accent font-bold text-xs">
                  <Building2 size={14} />
                  {unitNumber}
                </div>
              </div>
              <div className="p-6 grid sm:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="p-3 rounded-2xl bg-gray-100 status-accent flex items-center justify-center h-fit">
                    <Calendar size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lease Start</p>
                    <p className="text-sm font-bold text-[#0e1f42]">{formatDateDDMMYYYY(property.leaseStart)}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="p-3 rounded-2xl bg-gray-100 status-accent flex items-center justify-center h-fit">
                    <Clock size={20} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lease End</p>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-[#0e1f42]">{formatDateDDMMYYYY(property.leaseEnd)}</p>
                      <button
                        onClick={() => navigate(`/dashboard/rent/my-properties/${property.propertyId}/timeline`)}
                        className="text-xs font-semibold status-accent hover:underline whitespace-nowrap"
                      >
                        View timeline
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 grid sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Calendar className="status-accent" size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Upcoming Payment</span>
                  </div>
                  {property.nextPayment ? (
                    <>
                      <p className="text-xs font-bold status-success">{formatNaira(property.nextPayment.amount)}</p>
                      <p className="text-[11px] text-gray-500">Due: {formatDateDDMMYYYY(property.nextPayment.dueDate)}</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500">No upcoming payment</p>
                  )}
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Clock className="status-accent" size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Rental Status</span>
                  </div>
                  <p className="text-sm font-bold text-[#0e1f42]">
                    {daysRemaining !== null ? `${daysRemaining} Days Remaining` : '—'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Renews on {formatHumanDate(property.leaseEnd)} or <span className="status-danger font-semibold">end lease</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-6 space-y-4 property-overview-updates">
              <h3 className="text-base font-bold text-[#0e1f42]">Updates</h3>
              <div className="p-4 rounded-xl border border-[#e2e8f0] bg-gray-50 min-h-[120px]">
                <p className="text-sm font-semibold text-[#0e1f42]">No new updates</p>
                <p className="text-xs text-[#6c757d]">We will post property announcements and service updates here.</p>
              </div>
            </div>
          </div>
        </div>

        {property.tenancyStatus === 'PENDING_MOVE_IN' && (
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm" id="movein">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#0e1f42]">Move-in Checklist</h3>
              <button
                onClick={handleCompleteMoveIn}
                className="px-4 py-2 rounded-lg text-white font-semibold"
                style={{ backgroundColor: 'var(--accent-color, #9F7539)' }}
              >
                Submit
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm text-[#475467]">
              <label className="flex items-center gap-2 sm:col-span-2">
                Please confirm your key number
                <input
                  value={moveInForm.keyNumber || ''}
                  onChange={(e) => handleMoveInFieldChange('keyNumber', e.target.value)}
                  className={`border rounded-lg px-3 py-2 flex-1 bg-transparent ${
                    moveInErrors.keyNumber ? 'border-red-500' : 'border-[#e2e8f0]'
                  }`}
                  placeholder="Enter key number"
                />
              </label>
              {moveInErrors.keyNumber ? (
                <p className="text-xs font-medium text-red-600 sm:col-span-2">{moveInErrors.keyNumber}</p>
              ) : null}
              <label className="flex items-center gap-2 sm:col-span-2">
                Move in date
                <input
                  type="text"
                  value={moveInForm.moveInDate || ''}
                  onChange={(e) =>
                    handleMoveInFieldChange('moveInDate', formatDateInputDDMMYYYY(e.target.value))
                  }
                  inputMode="numeric"
                  maxLength={10}
                  className={`border rounded-lg px-3 py-2 flex-1 bg-transparent ${
                    moveInErrors.moveInDate ? 'border-red-500' : 'border-[#e2e8f0]'
                  }`}
                  placeholder="dd/mm/yyyy"
                />
              </label>
              {moveInErrors.moveInDate ? (
                <p className="text-xs font-medium text-red-600 sm:col-span-2">{moveInErrors.moveInDate}</p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyDashboard;
