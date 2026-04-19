// src/dashboards/rent/components/book-inspection/InspectionForm.jsx
import React, { useState, useEffect } from 'react';
import { getPropertySlotAvailability } from './utils/inspectionSlots';
import { formatDateDDMMYY } from '../../../../shared/utils/dateFormat';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const InspectionForm = ({ propertyId, formValues, onFormChange, errors = {} }) => {
  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [timesByDate, setTimesByDate] = useState({});
  const [maxPeopleAllowed, setMaxPeopleAllowed] = useState(3);
  const [loadingDates, setLoadingDates] = useState(true);
  
  // Destructure form values from props
  const { inspectionDate, inspectionTime, numberOfPeople, inspectionNotes } = formValues;
  
  // Load available dates from admin-configured inspection slots
  useEffect(() => {
    const loadConfiguredSlots = () => {
      if (!propertyId) {
        setAvailableDates([]);
        setTimesByDate({});
        setMaxPeopleAllowed(3);
        setLoadingDates(false);
        return;
      }

      const {
        dates,
        timesByDate: nextTimesByDate,
        maxPeopleAllowed: nextMaxPeopleAllowed
      } = getPropertySlotAvailability(propertyId);

      const enhancedDates = dates.map((item, idx) => ({
        ...item,
        isNextDay: idx === 0
      }));

      setAvailableDates(enhancedDates);
      setTimesByDate(nextTimesByDate);
      setMaxPeopleAllowed(Number(nextMaxPeopleAllowed) || 3);
      setLoadingDates(false);
    };

    setLoadingDates(true);
    window.setTimeout(loadConfiguredSlots, 220);
  }, [propertyId]);

  useEffect(() => {
    const selected = Number(numberOfPeople);
    if (!selected || selected <= (Number(maxPeopleAllowed) || 3)) return;
    if (onFormChange) {
      onFormChange('numberOfPeople', String(maxPeopleAllowed));
    }
  }, [maxPeopleAllowed, numberOfPeople, onFormChange]);
  
  // Generate available times for selected date from configured slots
  useEffect(() => {
    if (!inspectionDate) {
      setAvailableTimes([]);
      return;
    }

    setAvailableTimes(Array.isArray(timesByDate[inspectionDate]) ? timesByDate[inspectionDate] : []);
  }, [inspectionDate, timesByDate]);
  
  const formatDateDisplay = (dateString) => {
    return formatDateDDMMYY(dateString);
  };
  
  const formatTimeDisplay = (timeString) => {
    if (String(timeString).includes(' - ')) return timeString;
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };
  
  const handleDateClick = (dateString) => {
    if (onFormChange) {
      onFormChange('inspectionDate', dateString);
    }
  };
  
  const handleTimeClick = (timeString) => {
    if (onFormChange) {
      onFormChange('inspectionTime', timeString);
    }
  };
  
  const handleNumberOfPeopleChange = (e) => {
    if (onFormChange) {
      onFormChange('numberOfPeople', e.target.value);
    }
  };
  
  const handleNotesChange = (e) => {
    if (onFormChange) {
      onFormChange('inspectionNotes', e.target.value);
    }
  };
  
  return (
    <div className="space-y-8 mb-8 pb-8 border-b border-[#e2e8f0]">
      {/* Form Section Heading */}
      <div>
        <h3 className="text-xl font-semibold text-[#0e1f42] mb-4 flex items-center gap-2">
          <div className="w-1 h-6 bg-[#9f7539] rounded"></div>
          Inspection Details
        </h3>
      </div>
      
      {/* Available Dates Calendar */}
      <div className="form-group">
        <label className="font-semibold text-[#0e1f42] mb-2 block">
          Select Available Date *
        </label>
        
        {loadingDates ? (
          <div
            className="inspection-empty themed-card flex items-center justify-center p-8 rounded-xl border border-dashed bg-[#f8fafc] border-[#e2e8f0]"
            style={{
              backgroundColor: 'var(--card-bg, #111827)',
              color: 'var(--text-color, #f8fafc)',
              borderColor: 'rgba(255,255,255,0.15)'
            }}
          >
            <i
              className="fas fa-spinner fa-spin mr-3"
              style={{ color: 'var(--accent-color, #9f7539)' }}
            ></i>
            <span style={{ color: 'var(--text-color, #f8fafc)' }}>Loading available dates...</span>
          </div>
        ) : availableDates.length === 0 ? (
          <div
            className="inspection-empty themed-card text-center p-8 rounded-xl border border-dashed bg-[#f8fafc] border-[#e2e8f0]"
            style={{
              backgroundColor: 'var(--card-bg, #111827)',
              color: 'var(--text-color, #f8fafc)',
              borderColor: 'rgba(255,255,255,0.15)'
            }}
          >
            <i
              className="fas fa-calendar-times text-3xl mb-3"
              style={{ color: 'var(--text-color, #f8fafc)' }}
            ></i>
            <h4
              className="font-semibold mb-1"
              style={{ color: 'var(--text-color, #f8fafc)' }}
            >
              No Available Dates
            </h4>
            <p style={{ color: 'var(--text-color, #f8fafc)' }}>
              Please check back later for available inspection dates
            </p>
          </div>
        ) : (
          <>
            {/* Dates Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              {availableDates.map((dateInfo) => {
                const date = dateInfo.dateObj;
                const day = date.getDate();
                const month = MONTH_SHORT[date.getMonth()];
                const weekday = WEEKDAY_SHORT[date.getDay()];
                const isSelected = inspectionDate === dateInfo.date;
                
                let statusClass = '';
                let statusBadge = '';
                
                if (dateInfo.availableSlots <= 2) {
                  statusClass = 'border-[#f59e0b] bg-[rgba(245,158,11,0.05)]';
                  statusBadge = (
                    <div className="text-xs font-bold bg-[#f59e0b] text-white px-2 py-1 rounded-full mt-1">
                      {dateInfo.availableSlots} left
                    </div>
                  );
                } else if (dateInfo.isNextDay) {
                  statusClass = 'border-[#10b981] bg-[rgba(16,185,129,0.05)]';
                  statusBadge = (
                    <div className="text-xs font-bold bg-[#10b981] text-white px-2 py-1 rounded-full mt-1">
                      Next Day
                    </div>
                  );
                }
                
                return (
                  <button
                    key={dateInfo.date}
                    type="button"
                    onClick={() => handleDateClick(dateInfo.date)}
                    className={`p-4 text-center border-2 rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                      isSelected 
                        ? 'border-[#9f7539] bg-gradient-to-br from-[#9f7539] to-[#b58a4a] text-white shadow-md' 
                        : `border-[#e2e8f0] bg-white text-[#0e1f42] ${statusClass}`
                    }`}
                  >
                    <div className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-[#0e1f42]'}`}>
                      {day}
                    </div>
                    <div className={`text-sm uppercase tracking-wide ${isSelected ? 'text-white/90' : 'text-[#64748b]'}`}>
                      {month}
                    </div>
                    <div className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-[#64748b]'}`}>
                      {weekday}
                    </div>
                    {!isSelected && statusBadge}
                  </button>
                );
              })}
            </div>
            
            {/* Selected Date Display */}
            {inspectionDate && (
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#f8fafc] to-[#f1f5f9] rounded-xl border-l-4 border-[#9f7539]">
                <i className="fas fa-calendar-check text-[#9f7539] text-lg"></i>
                <div>
                  <span className="font-semibold text-[#0e1f42]">Selected: </span>
                  <span className="text-[#334155]">{formatDateDisplay(inspectionDate)}</span>
                </div>
              </div>
            )}
            
            <input
              type="hidden"
              name="inspectionDate"
              value={inspectionDate}
              required
            />
            {errors.inspectionDate ? (
              <p className="mt-2 text-sm text-red-600 font-medium">{errors.inspectionDate}</p>
            ) : null}
          </>
        )}
      </div>
      
      {/* Available Time Slots */}
      <div className="form-group">
        <label className="font-semibold text-[#0e1f42] mb-2 block">
          Select Available Time *
        </label>
        
        {!inspectionDate ? (
          <div
            className="inspection-empty flex items-center justify-center p-8 bg-[#f8fafc] rounded-xl border border-dashed border-[#e2e8f0]"
          >
            <i className="fas fa-clock text-[#9f7539] mr-3"></i>
            <span className="text-[#64748b]">Please select a date first</span>
          </div>
        ) : availableTimes.length === 0 ? (
          <div
            className="inspection-empty text-center p-8 bg-[#f8fafc] rounded-xl border border-dashed border-[#e2e8f0]"
          >
            <i className="fas fa-clock text-3xl text-[#64748b] mb-3"></i>
            <h4 className="text-[#0e1f42] font-semibold mb-1">No Available Times</h4>
            <p className="text-[#64748b]">All time slots are booked for this date</p>
          </div>
        ) : (
          <>
            {/* Time Slots Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              {availableTimes.map((time) => {
                const isSelected = inspectionTime === time;
                
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleTimeClick(time)}
                    className={`p-4 text-center border-2 rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                      isSelected 
                        ? 'border-[#9f7539] bg-gradient-to-br from-[#9f7539] to-[#b58a4a] text-white shadow-md' 
                        : 'border-[#e2e8f0] bg-white text-[#0e1f42] hover:border-[#9f7539]'
                    }`}
                  >
                    <div className={`font-semibold ${isSelected ? 'text-white' : 'text-[#0e1f42]'}`}>
                      {formatTimeDisplay(time)}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <input
              type="hidden"
              name="inspectionTime"
              value={inspectionTime}
              required
            />
            {errors.inspectionTime ? (
              <p className="mt-2 text-sm text-red-600 font-medium">{errors.inspectionTime}</p>
            ) : null}
          </>
        )}
        
        {/* Time Slots Info */}
        <div className="inspection-note flex items-start gap-3 p-4 bg-gradient-to-r from-[rgba(159,117,57,0.08)] to-[rgba(181,138,74,0.08)] rounded-lg border-l-4 border-[#9f7539] mt-4">
          <i className="fas fa-info-circle text-[#9f7539] text-lg mt-0.5"></i>
          <div className="text-sm text-[#334155]">
            Each inspection slot is 1 hour 30 min between 9:00 AM - 5:00 PM, Monday to Friday
          </div>
        </div>
      </div>
      
      {/* Number of People */}
      <div className="form-group">
        <label htmlFor="numberOfPeople" className="font-semibold text-[#0e1f42] mb-2 block">
          Number of people attending *
        </label>
        <select
          id="numberOfPeople"
          value={numberOfPeople}
          onChange={handleNumberOfPeopleChange}
          required
          className={`w-full p-3 border rounded-lg focus:border-[#9f7539] focus:ring-2 focus:ring-[#9f7539]/20 transition-colors ${
            errors.numberOfPeople ? 'border-red-500' : 'border-[#e2e8f0]'
          }`}
        >
          <option value="">Select number</option>
          {Array.from({ length: Number(maxPeopleAllowed) || 3 }, (_, index) => {
            const value = String(index + 1);
            const label = index === 0 ? '1 person' : `${index + 1} people`;
            return (
              <option key={value} value={value}>
                {label}
              </option>
            );
          })}
        </select>
        <p className="mt-1 text-xs text-[#64748b]">
          Maximum allowed for this property: {maxPeopleAllowed} {Number(maxPeopleAllowed) === 1 ? 'person' : 'people'}
        </p>
        {errors.numberOfPeople ? (
          <p className="mt-2 text-sm text-red-600 font-medium">{errors.numberOfPeople}</p>
        ) : null}
      </div>
      
      {/* Additional Notes */}
      <div className="form-group">
        <label htmlFor="inspectionNotes" className="font-semibold text-[#0e1f42] mb-2 block">
          Additional Notes (Optional)
        </label>
        <textarea
          id="inspectionNotes"
          value={inspectionNotes}
          onChange={handleNotesChange}
          rows={4}
          placeholder="Any specific areas you'd like to focus on during the inspection..."
          className="w-full p-3 border border-[#e2e8f0] rounded-lg focus:border-[#9f7539] focus:ring-2 focus:ring-[#9f7539]/20 transition-colors resize-none"
        />
      </div>
    </div>
  );
};

export default InspectionForm;
